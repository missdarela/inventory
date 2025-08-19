<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTrackingDumpStore } from '../stores/trackingDump';
import { ElNotification } from 'element-plus';
import { supabase } from '../supabase';

const router = useRouter();
const trackingDumpStore = useTrackingDumpStore();
const showAddModal = ref(false);
const newDumpName = ref('');
const searchQuery = ref('');
const loading = ref(false);
const dumps = ref([]);

// Get consistent dump ID based on dump name (case-insensitive)
const getDumpIdByName = (dumpName) => {
  const dumpMapping = {
    // Removed predefined dump mapping
  };
  
  // Normalize dump name to lowercase for consistent mapping
  const normalizedName = dumpName.toLowerCase().trim();
  
  // Return predefined ID or generate new ID for custom dumps
  return Object.keys(dumpMapping).length + 1;
};

// Normalize dump name for consistent capitalization
const normalizeDumpName = (dumpName) => {
  if (!dumpName) return '';
  
  // Convert to proper case (first letter of each word capitalized)
  return dumpName
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases
      if (word === 'cac') return 'CAC';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Initialize dumps from database only - no predefined dumps
const initializeDumps = async () => {
  try {
    loading.value = true;
    
    // Start with empty dump list - no predefined dumps
    const allDumps = new Map();
    let nextId = 1; // Start IDs from 1
    
    // Load all dumps from tracking_dumps table only - optimized query
    try {
      const { data: customDumps, error: dumpsError } = await supabase
        .from('tracking_dumps')
        .select('id, name, created_at, updated_at')
        .order('id', { ascending: true });
      
      if (dumpsError) {
        console.error('Error loading tracking dumps:', dumpsError);
      } else if (customDumps && customDumps.length > 0) {
        customDumps.forEach((dump) => {
          const normalizedName = normalizeDumpName(dump.name);
          const lowerKey = normalizedName.toLowerCase();
          
          allDumps.set(lowerKey, {
            id: nextId++, // Sequential ID assignment
            name: normalizedName,
            status: 'Active',
            lastUpdated: dump.updated_at?.split('T')[0] || dump.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            itemCount: 0,
            containerCount: 0,
            dbId: dump.id // Store database ID for reference
          });
        });
      }
    } catch (dbError) {
      console.error('Database query failed for tracking_dumps:', dbError);
    }
    
    // Only check tracking_batch_data if we have no dumps from tracking_dumps
    if (allDumps.size === 0) {
      try {
        const { data: trackingData, error: trackingError } = await supabase
          .from('tracking_batch_data')
          .select('dump')
          .not('dump', 'is', null)
          .order('created_at', { ascending: true });
        
        if (trackingError) {
          console.error('Database query failed for tracking_batch_data:', trackingError);
        } else if (trackingData && trackingData.length > 0) {
          // Get unique dump names in order they were created
          const uniqueDumps = [];
          const seen = new Set();
          
          trackingData.forEach(item => {
            if (item.dump && !seen.has(item.dump.toLowerCase())) {
              seen.add(item.dump.toLowerCase());
              uniqueDumps.push(item.dump);
            }
          });
          
          uniqueDumps.forEach(dumpName => {
            const normalizedName = normalizeDumpName(dumpName);
            const lowerKey = normalizedName.toLowerCase();
            
            allDumps.set(lowerKey, {
              id: nextId++,
              name: normalizedName,
              status: 'Active',
              lastUpdated: new Date().toISOString().split('T')[0],
              itemCount: 0,
              containerCount: 0,
              dbId: null
            });
          });
        }
      } catch (dbError) {
        console.error('Database query failed for tracking_batch_data:', dbError);
      }
    }
    
    const dumpsArray = Array.from(allDumps.values());
    
    // Sort by ID to maintain consistent order
    dumpsArray.sort((a, b) => a.id - b.id);
    
    return dumpsArray;
    
  } catch (error) {
    console.error('Failed to initialize tracking dumps:', error);
    return []; // Return empty array instead of predefined dumps
  } finally {
    loading.value = false;
  }
};

// Load dumps when component initializes
const loadDumps = async () => {
  dumps.value = await initializeDumps();
  await updateAllDumpCounts();
};

// Update all dump counts from database
const updateAllDumpCounts = async () => {
  try {
    // Fetch all tracking data in one query
    const { data: allTrackingData, error } = await supabase
      .from('tracking_batch_data')
      .select('dump, containers_delivered')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching tracking data:', error);
      return;
    }
    
    // Count deliveries by dump name (case-insensitive)
    const dumpCounts = {};
    allTrackingData.forEach(item => {
      if (item.dump) {
        const normalizedName = normalizeDumpName(item.dump);
        const lowerKey = normalizedName.toLowerCase();
        
        if (!dumpCounts[lowerKey]) {
          dumpCounts[lowerKey] = {
            name: normalizedName,
            count: 0,
            containers: 0
          };
        }
        
        dumpCounts[lowerKey].count++;
        dumpCounts[lowerKey].containers += parseInt(item.containers_delivered) || 0;
      }
    });
    
    // Update dump counts
    dumps.value.forEach(dump => {
      const lowerKey = dump.name.toLowerCase();
      const oldCount = dump.itemCount;
      
      if (dumpCounts[lowerKey]) {
        dump.itemCount = dumpCounts[lowerKey].count;
        dump.containerCount = dumpCounts[lowerKey].containers;
      } else {
        dump.itemCount = 0;
        dump.containerCount = 0;
      }
      
      if (oldCount !== dump.itemCount) {
        console.log(`Updated "${dump.name}" count: ${oldCount} → ${dump.itemCount}`);
      }
    });
    
  } catch (error) {
    console.error('Error updating dump counts:', error);
  }
};

const filteredDumps = computed(() => {
  if (!searchQuery.value) return dumps.value;
  return dumps.value.filter(dump => 
    dump.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const goBack = () => {
  router.push('/dashboard/dump');
};

const navigateToDumpDetails = (dumpId) => {
  router.push(`/dashboard/dump/trackingDump/${dumpId}`);
};

// Add new dump function
const addNewDump = async () => {
  if (!newDumpName.value.trim()) {
    ElNotification({
      title: 'Error',
      message: 'Please enter a dump name',
      type: 'error'
    });
    return;
  }
  
  try {
    loading.value = true;
    
    const normalizedName = normalizeDumpName(newDumpName.value.trim());
    
    // Check if dump already exists (case-insensitive)
    const existingDump = dumps.value.find(dump => 
      dump.name.toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (existingDump) {
      ElNotification({
        title: 'Error',
        message: `Dump "${normalizedName}" already exists`,
        type: 'error'
      });
      return;
    }
    
    // Save to tracking_dumps table for cross-device persistence
    const dumpEntry = {
      name: normalizedName
    };
    
    const { data, error } = await supabase
      .from('tracking_dumps')
      .insert(dumpEntry)
      .select()
      .single();
    
    if (error) throw error;
    
    // Calculate the next sequential ID immediately
    const nextId = Math.max(...dumps.value.map(d => d.id), 0) + 1;
    
    // Add to local dumps array with immediate ID assignment
    const newDump = {
      id: nextId, // Use calculated sequential ID
      name: data.name,
      status: 'Active',
      lastUpdated: data.last_updated || data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      itemCount: 0,
      containerCount: 0,
      dbId: data.id // Store database ID separately
    };
    
    dumps.value.push(newDump);
    
    // Sort dumps by ID to maintain order
    dumps.value.sort((a, b) => a.id - b.id);
    
    // Force Vue reactivity update
    dumps.value = [...dumps.value];
    
    newDumpName.value = '';
    showAddModal.value = false;
    
    console.log(`Added new dump: ${normalizedName} with ID ${nextId}`);
    
    ElNotification({
      title: 'Success',
      message: `Dump "${normalizedName}" added successfully with ID ${nextId}!`,
      type: 'success'
    });
    
    // Skip full refresh since we already updated local state optimistically
    // await refreshDumpData();
    
  } catch (error) {
    console.error('Error adding dump:', error);
    ElNotification({
      title: 'Error',
      message: 'Failed to add dump: ' + error.message,
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  showAddModal.value = false;
  newDumpName.value = '';
};

// Delete dump function
const deleteDump = async (dumpId, dumpName, event) => {
  // Prevent card click event when delete button is clicked
  event.stopPropagation();
  
  // Show confirmation dialog
  const confirmed = window.confirm(`Are you sure you want to delete "${dumpName}"?\n\nWarning: This will also delete all tracking data associated with this dump. This action cannot be undone.`);
  
  if (!confirmed) {
    return;
  }
  
  try {
    loading.value = true;
    
    console.log(`Starting deletion process for dump: "${dumpName}" (ID: ${dumpId})`);
    
    // First, check how many records exist for this dump
    const { data: existingData, error: checkError } = await supabase
      .from('tracking_batch_data')
      .select('id, dump')
      .ilike('dump', dumpName);
    
    if (checkError) {
      console.error('Error checking existing data:', checkError);
    } else {
      console.log(`Found ${existingData?.length || 0} existing records for dump "${dumpName}":`, existingData);
    }
    
    // Delete all tracking data for this dump from database (case-insensitive)
    const { data: deletedData, error: trackingError } = await supabase
      .from('tracking_batch_data')
      .delete()
      .ilike('dump', dumpName)
      .select(); // Return deleted records
    
    if (trackingError) {
      console.error('Error deleting tracking data:', trackingError);
      ElNotification({
        title: 'Error',
        message: 'Failed to delete tracking data for this dump: ' + trackingError.message,
        type: 'error'
      });
      return;
    }
    
    console.log(`Successfully deleted ${deletedData?.length || 0} tracking records for dump "${dumpName}"`);
    
    // Delete from tracking_dumps table
    const { error: dumpTableError } = await supabase
      .from('tracking_dumps')
      .delete()
      .ilike('name', dumpName);
    
    if (dumpTableError) {
      console.error('Error deleting from tracking_dumps table:', dumpTableError);
      ElNotification({
        title: 'Error',
        message: 'Failed to delete dump from database: ' + dumpTableError.message,
        type: 'error'
      });
      return;
    }
    
    // Remove from local state
    const dumpIndex = dumps.value.findIndex(dump => dump.id === dumpId);
    if (dumpIndex > -1) {
      dumps.value.splice(dumpIndex, 1);
    }
    
    ElNotification({
      title: 'Success',
      message: `Dump "${dumpName}" deleted successfully! (${deletedData?.length || 0} records deleted)`,
      type: 'success'
    });
    
    // Refresh data to update counts and sync across devices
    await refreshDumpData();
    
  } catch (error) {
    console.error('Error deleting tracking dump:', error);
    ElNotification({
      title: 'Error',
      message: 'Failed to delete tracking dump: ' + error.message,
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// Refresh dump data
const refreshDumpData = async () => {
  await updateAllDumpCounts();
  ElNotification({
    title: 'Success',
    message: 'Tracking data refreshed successfully',
    type: 'success'
  });
};

// Initialize component when mounted
onMounted(async () => {
  try {
    await loadDumps();
  } catch (error) {
    console.error('Failed to initialize tracking dumps:', error);
    ElNotification({
      title: 'Error',
      message: 'Failed to load tracking dumps',
      type: 'error'
    });
  }
});

const totalDeliveries = computed(() => {
  const dumps = trackingDumpStore.trackingDumps;
  if (!Array.isArray(dumps)) return 0;

  return dumps.reduce((sum, d) => {
    const count = Array.isArray(d.deliveries) ? d.deliveries.length : 0;
    return sum + count;
  }, 0);
});

</script>

<template class="font-mont">
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header Section -->
      <div class="mb-8">
        <button 
          @click="goBack" 
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 mb-4"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Dumps
        </button>
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Tracking Dumps</h1>
            <p class="mt-2 text-sm text-gray-600">Manage and view your tracking dump locations</p>
          </div>
          <div class="flex items-center justify-end gap-4">
            <button 
              @click="showAddModal = true"
              class="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add New Dump
            </button>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-8">
        <div class="relative max-w-full sm:max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search dumps..."
            class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          >
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Dumps</dt>
                  <dd class="text-2xl font-bold text-gray-900">{{ dumps?.length || 0 }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div class="p-6">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Active Dumps</span>
              <span class="font-bold text-gray-900 text-2xl">{{ dumps?.filter(d => d.status === 'Active').length || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{{ totalDeliveries }}</h3>
                  <p class="text-sm text-gray-500">Total Items</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dumps Grid -->
      <div v-if="!loading.value" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Add New Dump Card -->
        <div 
          @click="showAddModal = true"
          class="group bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-dashed border-blue-300 hover:border-blue-500 flex items-center justify-center min-h-[200px]"
        >
          <div class="text-center p-6">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4 group-hover:bg-green-200 transition-colors duration-200">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-200">Add New Dump</h3>
            <p class="text-sm text-gray-500 mt-1">Create a new tracking location</p>
          </div>
        </div>

        <!-- Existing Dumps -->
        <div 
          v-for="dump in filteredDumps" 
          :key="dump.id"
          @click="navigateToDumpDetails(dump.id)"
          class="group bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-200 hover:border-blue-300"
        >
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{{ dump.name }}</h3>
                  <p class="text-sm text-gray-500">ID: {{ dump.id }}</p>
                </div>
              </div>
              
              <div class="flex items-center">
                <button 
                  @click="deleteDump(dump.id, dump.name, $event)"
                  class="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200"
                  title="Delete dump"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Items</span>
                <span class="font-medium text-gray-900">{{ dump.itemCount || 0 }}</span>
              </div>
              
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Last Updated</span>
                <span class="font-medium text-gray-900">{{ dump.lastUpdated }}</span>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">View Details</span>
                <svg class="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredDumps.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.06 9.06 0 01-8.925 0 5.5 5.5 0 00-1.5 2.12c0 2.969 2.235 5.356 5.137 5.356A5.5 5.5 0 0012 21a5.5 5.5 0 005.5-5.5c0-1.86.236-3.626.659-5.252a15.758 15.758 0 008.917 0 5.5 5.5 0 00-1.5 2.12 5.5 5.5 0 00-1.5-2.12z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No dumps found</h3>
        <p class="mt-1 text-sm text-gray-500">{{ searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating a new dump.' }}</p>
      </div>
    </div>

    <!-- Add New Dump Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div class="relative p-8 bg-white w-full max-w-md m-auto rounded-xl shadow-2xl">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          
          <h3 class="text-lg font-medium text-gray-900 mb-2">Add New Dump</h3>
          <p class="text-sm text-gray-500 mb-6">Enter a name for your new inventory dump location.</p>
          
          <div class="mb-6">
            <input 
              v-model="newDumpName"
              type="text" 
              placeholder="Enter dump name..."
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
              @keyup.enter="addNewDump"
            >
          </div>
          
          <div class="flex space-x-3">
            <button 
              @click="closeModal"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button 
              @click="addNewDump"
              :disabled="!newDumpName.trim() || loading.value"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Add Dump
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>