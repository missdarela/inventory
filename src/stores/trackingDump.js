import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

export const useTrackingDumpStore = defineStore('trackingDump', () => {
  // State
  const trackingDumps = ref([])

  const deliveries = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const activeDumps = computed(() => 
    trackingDumps.value.filter(dump => dump.status === 'Active')
  )

  const totalDumps = computed(() => trackingDumps.value.length)

  const totalDeliveries = computed(() => deliveries.value.length)

  const totalContainers = computed(() => {
    return deliveries.value.reduce((sum, delivery) => {
      return sum + (parseInt(delivery.containers_delivered) || 0);
    }, 0);
  });

  const uniqueDriversCount = computed(() => {
    const drivers = deliveries.value
      .map(delivery => delivery.driver)
      .filter(driver => driver && driver.trim() !== '');
    return new Set(drivers).size;
  });

  const getDumpById = computed(() => (id) => 
    trackingDumps.value.find(dump => dump.id === parseInt(id))
  )

  const getDumpByName = computed(() => (name) => 
    trackingDumps.value.find(dump => dump.name === name)
  )

  const deliveriesByMonth = computed(() => {
    const grouped = {};
    
    // Use the deliveries array from Supabase, not dump.deliveries
    deliveries.value.forEach(delivery => {
      if (delivery.date) {
        const date = new Date(delivery.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            monthName,
            deliveries: [],
            totalContainers: 0,
            uniqueDrivers: new Set()
          };
        }
        
        grouped[monthKey].deliveries.push(delivery);
        grouped[monthKey].totalContainers += parseInt(delivery.containers_delivered) || 0;
        if (delivery.driver) {
          grouped[monthKey].uniqueDrivers.add(delivery.driver);
        }
      }
    });
    
    // Convert Set to count and sort by month
    Object.keys(grouped).forEach(key => {
      grouped[key].uniqueDrivers = grouped[key].uniqueDrivers.size;
    });
    
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
    );
  });

  // Actions
  async function fetchAllDeliveries() {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tracking_batch_data')
        .select('*')
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      deliveries.value = data || []
      await updateDumpCounts()
      
    } catch (err) {
      error.value = err.message
      console.error('Error fetching deliveries:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchDeliveriesByDump(dumpName) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tracking_batch_data')
        .select('*')
        .eq('dump', dumpName)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      return data || []
      
    } catch (err) {
      error.value = err.message
      console.error('Error fetching deliveries by dump:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addDelivery(deliveryData) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: insertError } = await supabase
        .from('tracking_batch_data')
        .insert([deliveryData])
        .select()

      if (insertError) throw insertError

      // Add to local deliveries array
      if (data && data.length > 0) {
        deliveries.value.unshift(data[0])
      }

      // Update dump counts
      await updateDumpCounts()
      
      return data[0]
      
    } catch (err) {
      error.value = err.message
      console.error('Error adding delivery:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateDelivery(id, updates) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: updateError } = await supabase
        .from('tracking_batch_data')
        .update(updates)
        .eq('id', id)
        .select()

      if (updateError) throw updateError

      // Update local deliveries array
      const index = deliveries.value.findIndex(delivery => delivery.id === id)
      if (index !== -1 && data && data.length > 0) {
        deliveries.value[index] = data[0]
      }

      // Update dump counts
      await updateDumpCounts()
      
      return data[0]
      
    } catch (err) {
      error.value = err.message
      console.error('Error updating delivery:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteDelivery(id) {
    loading.value = true
    error.value = null
    
    try {
      const { error: deleteError } = await supabase
        .from('tracking_batch_data')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Remove from local deliveries array
      deliveries.value = deliveries.value.filter(delivery => delivery.id !== id)

      // Update dump counts
      await updateDumpCounts()
      
    } catch (err) {
      error.value = err.message
      console.error('Error deleting delivery:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateDumpCounts() {
    try {
      // Get delivery counts and last updated dates for each dump
      const { data, error: fetchError } = await supabase
        .from('tracking_batch_data')
        .select('dump, containers_delivered, date')

      if (fetchError) throw fetchError

      // Calculate counts and last updated dates for each dump
      const dumpStats = {}
      
      data?.forEach(delivery => {
        const dumpName = delivery.dump
        if (!dumpStats[dumpName]) {
          dumpStats[dumpName] = {
            count: 0,
            totalContainers: 0,
            lastUpdated: null
          }
        }
        
        dumpStats[dumpName].count += 1
        dumpStats[dumpName].totalContainers += delivery.containers_delivered || 0
        
        const deliveryDate = new Date(delivery.date)
        if (!dumpStats[dumpName].lastUpdated || deliveryDate > new Date(dumpStats[dumpName].lastUpdated)) {
          dumpStats[dumpName].lastUpdated = delivery.date
        }
      })

      // Update tracking dumps with real data
      trackingDumps.value = trackingDumps.value.map(dump => ({
        ...dump,
        itemCount: dumpStats[dump.name]?.count || 0,
        totalContainers: dumpStats[dump.name]?.totalContainers || 0,
        lastUpdated: dumpStats[dump.name]?.lastUpdated || null
      }))

      // Save to localStorage
      localStorage.setItem('trackingDumps', JSON.stringify(trackingDumps.value))
      
    } catch (err) {
      console.error('Error updating dump counts:', err)
    }
  }

  async function getDumpStatistics(dumpName) {
    try {
      const { data, error: fetchError } = await supabase
        .from('tracking_batch_data')
        .select('*')
        .eq('dump', dumpName)

      if (fetchError) throw fetchError

      const deliveries = data || []
      const totalDeliveries = deliveries.length
      const totalContainers = deliveries.reduce((sum, delivery) => sum + (delivery.containers_delivered || 0), 0)
      const uniqueDrivers = [...new Set(deliveries.map(delivery => delivery.driver).filter(Boolean))].length
      
      // Monthly deliveries (current month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyDeliveries = deliveries.filter(delivery => {
        const deliveryDate = new Date(delivery.date)
        return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear
      }).length

      return {
        totalDeliveries,
        totalContainers,
        uniqueDrivers,
        monthlyDeliveries,
        deliveries
      }
      
    } catch (err) {
      console.error('Error getting dump statistics:', err)
      return {
        totalDeliveries: 0,
        totalContainers: 0,
        uniqueDrivers: 0,
        monthlyDeliveries: 0,
        deliveries: []
      }
    }
  }

  async function addDump(dumpData) {
    loading.value = true;
    error.value = null;
    
    try {
      // Generate a unique batch_id using timestamp and random string
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const batchId = `BATCH-${timestamp}-${randomStr}`;
      const currentDate = new Date().toISOString().split('T')[0];
      
      // 1. First create the batch entry in tracking_batches
      const batchEntry = {
        batch_id: batchId,
        batch_name: dumpData.name,
        created_at: new Date().toISOString(),
        created_by: 'system', // You might want to replace this with actual user ID
        status: 'active',
        description: dumpData.comments || `Batch for ${dumpData.name}`,
        total_containers: dumpData.containersDelivered || 0
      };

      console.log('Creating batch in tracking_batches:', batchEntry);
      
      const { data: batchData, error: batchError } = await supabase
        .from('tracking_batches')
        .insert([batchEntry])
        .select();

      if (batchError) {
        console.error('Error creating batch:', batchError);
        throw batchError;
      }
      
      console.log('Batch created successfully:', batchData);
      
      // 2. Then create the data entry in tracking_batch_data
      const dumpEntry = {
        batch_id: batchId,
        dump: dumpData.name,
        date: currentDate,
        container_no: dumpData.containerNo || '',
        driver: dumpData.driver || '',
        containers_delivered: dumpData.containersDelivered || 0,
        vessel_details: dumpData.vesselDetails || '',
        comments: dumpData.comments || ''
      };

      console.log('Saving to tracking_batch_data:', dumpEntry);

      const { data, error: dataError } = await supabase
        .from('tracking_batch_data')
        .insert([dumpEntry])
        .select();

      if (dataError) {
        console.error('Error saving batch data:', dataError);
        // Consider rolling back the batch creation if data save fails
        throw dataError;
      }

      console.log('Successfully saved dump data:', data);
      
      // 3. Update local state
      if (data && data[0]) {
        const newDump = {
          id: batchData[0]?.id || Date.now(),
          name: data[0].dump,
          status: 'Active',
          lastUpdated: currentDate,
          itemCount: 1, // Since we're adding one entry
          deliveries: [data[0]]
        };
        
        trackingDumps.value.push(newDump);
        return newDump;
      }
      
      return null;
      
    } catch (err) {
      console.error('Failed to add dump:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('trackingDumps')
    if (saved) {
      try {
        const parsedData = JSON.parse(saved)
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          trackingDumps.value = parsedData
        }
      } catch (err) {
        console.error('Error loading tracking dumps from localStorage:', err)
      }
    }
    // If no valid data in localStorage, keep the default trackingDumps
    console.log('Tracking dumps loaded:', trackingDumps.value.length)
  }

  // Delete dump function
  async function deleteDump(dumpId) {
    try {
      loading.value = true;
      
      // Remove dump from local state
      const dumpIndex = trackingDumps.value.findIndex(dump => dump.id === dumpId);
      if (dumpIndex > -1) {
        trackingDumps.value.splice(dumpIndex, 1);
        
        // Save updated dumps to localStorage
        localStorage.setItem('trackingDumps', JSON.stringify(trackingDumps.value));
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting dump:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null
  }

  // Initialize store
  async function initialize() {
    try {
      loading.value = true;
      
      // Load dumps from Supabase
      const { data: dumpsData, error: dumpsError } = await supabase
        .from('tracking_dumps')
        .select('*')
        .order('id', { ascending: true });
      
      if (dumpsError) throw dumpsError;
      
      // If we have dumps in the database, use them
      if (dumpsData && dumpsData.length > 0) {
        trackingDumps.value = dumpsData.map(dump => ({
          id: dump.id,
          name: dump.name,
          status: dump.status || 'Active',
          lastUpdated: dump.last_updated || new Date().toISOString().split('T')[0],
          itemCount: dump.item_count || 0,
          deliveries: []
        }));
      } else {
        // If no dumps in database, use default dumps
        const defaultDumps = [
          { name: 'Osazz' },
          { name: 'CAC' },
          { name: 'Igwe' },
          { name: 'More Grace' },
          { name: 'Ebuka' },
          { name: 'Papa' },
          { name: 'France' },
          { name: 'Victor' },
          { name: 'Iyawo' }
        ];
        
        // Insert default dumps into the database
        for (const dump of defaultDumps) {
          const newDump = {
            name: dump.name,
            status: 'Active',
            last_updated: new Date().toISOString().split('T')[0],
            item_count: 0,
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('tracking_dumps')
            .insert([newDump])
            .select();
            
          if (error) throw error;
          
          // Add to local state
          if (data && data[0]) {
            trackingDumps.value.push({
              id: data[0].id,
              name: data[0].name,
              status: data[0].status,
              lastUpdated: data[0].last_updated,
              itemCount: data[0].item_count,
              deliveries: []
            });
          }
        }
      }
      
      // Load deliveries
      await fetchAllDeliveries();
      
    } catch (error) {
      console.error('Failed to initialize tracking dump store:', error);
      error.value = error.message;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    trackingDumps,
    deliveries,
    loading,
    error,
    
    // Getters
    activeDumps,
    totalDumps,
    totalDeliveries,
    totalContainers,
    uniqueDriversCount,
    getDumpById,
    getDumpByName,
    deliveriesByMonth,
    
    // Actions
    fetchAllDeliveries,
    fetchDeliveriesByDump,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    updateDumpCounts,
    getDumpStatistics,
    loadFromLocalStorage,
    addDump,
    deleteDump,
    clearError,
    initialize
  }
})