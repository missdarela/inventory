import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

export const useTrackingDumpStore = defineStore('trackingDump', () => {
  // State
  const trackingDumps = ref([
    { id: 1, name: 'Osazz', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 2, name: 'CAC', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 3, name: 'Igwe', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 4, name: 'More Grace', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 5, name: 'Ebuka', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 6, name: 'Papa', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 7, name: 'France', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 8, name: 'Victor', status: 'Active', itemCount: 0, lastUpdated: null },
    { id: 9, name: 'Iyawo', status: 'Active', itemCount: 0, lastUpdated: null }
  ])

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

  function clearError() {
    error.value = null
  }

  // Initialize store
  async function initialize() {
    loadFromLocalStorage()
    await fetchAllDeliveries()
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
    clearError,
    initialize
  }
})