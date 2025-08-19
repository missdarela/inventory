<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryDumpStore } from '../stores/inventoryDumpStore';
import { ElNotification } from 'element-plus';
import { supabase } from '../supabase';

const router = useRouter();
const inventoryDumpStore = useInventoryDumpStore();
const dumpData = ref([]);
const showAddModal = ref(false);
const newDumpName = ref('');
const searchQuery = ref('');
const loading = ref(false);

// Get consistent dump ID based on dump name (case-insensitive)
const getDumpIdByName = (dumpName) => {
  const dumpMapping = {
    
  };
  
  // Normalize dump name to lowercase for consistent mapping
  const normalizedName = dumpName.toLowerCase().trim();
  
  // Return predefined ID or generate new ID for custom dumps
  return dumpMapping[normalizedName] || (Object.keys(dumpMapping).length + 1);
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
      if (word === 'fm') return 'FM';
      if (word === 'cac') return 'CAC';
      if (word.includes('(') || word.includes(')')) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
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
    
    // Load all dumps from dumps table only - optimized query
    try {
      const { data: customDumps, error: dumpsError } = await supabase
        .from('dumps')
        .select('id, dump_name, created_at, updated_at')
        .order('id', { ascending: true });
      
      if (dumpsError) {
        console.error('Error loading dumps:', dumpsError);
      } else if (customDumps && customDumps.length > 0) {
        console.log(`Loading ${customDumps.length} dumps from dumps table`);
        
        customDumps.forEach((dump) => {
          const normalizedName = normalizeDumpName(dump.dump_name);
          const lowerKey = normalizedName.toLowerCase();
          
          allDumps.set(lowerKey, {
            id: nextId++, // Sequential ID assignment
            name: normalizedName,
            status: 'Active',
            lastUpdated: dump.updated_at?.split('T')[0] || dump.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            itemCount: 0,
            dbId: dump.id // Store database ID for reference
          });
        });
      }
    } catch (dbError) {
      console.warn('Database query failed for dumps, starting with empty list:', dbError);
    }
    
    // Only check dump_inventory if we have no dumps from dumps table
    if (allDumps.size === 0) {
      try {
        console.log('No dumps in dumps table, checking dump_inventory...');
        
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('dump_inventory')
          .select('dump_name')
          .not('dump_name', 'is', null)
          .order('created_at', { ascending: true });
        
        if (!inventoryError && inventoryData && inventoryData.length > 0) {
          console.log(`Found ${inventoryData.length} inventory records`);
          
          // Get unique dump names in order they were created
          const uniqueDumps = [];
          const seen = new Set();
          
          inventoryData.forEach(item => {
            if (item.dump_name && !seen.has(item.dump_name.toLowerCase())) {
              seen.add(item.dump_name.toLowerCase());
              uniqueDumps.push(item.dump_name);
            }
          });
          
          console.log(`Found ${uniqueDumps.length} unique dumps in inventory data`);
          
          uniqueDumps.forEach(dumpName => {
            const normalizedName = normalizeDumpName(dumpName);
            const lowerKey = normalizedName.toLowerCase();
            
            allDumps.set(lowerKey, {
              id: nextId++,
              name: normalizedName,
              status: 'Active',
              lastUpdated: new Date().toISOString().split('T')[0],
              itemCount: 0,
              dbId: null
            });
          });
        }
      } catch (dbError) {
        console.warn('Database query failed for dump_inventory:', dbError);
      }
    }
    
    const dumpsArray = Array.from(allDumps.values());
    
    // Sort by ID to maintain consistent order
    dumpsArray.sort((a, b) => a.id - b.id);
    
    console.log(`Loaded ${dumpsArray.length} inventory dumps from database:`, 
      dumpsArray.map(d => `${d.name} (ID: ${d.id})`));
    
    return dumpsArray;
    
  } catch (error) {
    console.error('Failed to initialize inventory dumps:', error);
    return []; // Return empty array instead of predefined dumps
  } finally {
    loading.value = false;
  }
};

// Get default dump list
const getDefaultDumps = () => {
  return [];
};

const dumps = ref([]);

// Remove localStorage dependency - load from database only
const loadDumps = async () => {
  dumps.value = await initializeDumps();
  await updateAllDumpCounts();
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

const navigateToDumpDetails = async (dumpId) => {
  const selectedDump = dumps.value.find(d => d.id === dumpId);
  if (selectedDump) {
    try {
      const data = await inventoryDumpStore.fetchDumpsByName(selectedDump.name);
      dumpData.value = data;
      router.push(`/dashboard/dump/inventory/${dumpId}`);
    } catch (error) {
      console.error('Failed to fetch dump data:', error);
    }
  }
};

// Optimized function to update all dump counts in one query
const updateAllDumpCounts = async () => {
  loading.value = true;
  try {
    // Fetch all dump inventory data in one query
    const { data: allInventoryData, error } = await supabase
      .from('inventory')
      .select('dump_name, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching dump data:', error);
      return;
    }
    
    // Group data by dump name and count items
    const dumpCounts = {};
    const dumpLastUpdated = {};
    
    if (allInventoryData) {
      allInventoryData.forEach(item => {
        const dumpName = item.dump_name;
        if (dumpName) {
          // Count items
          dumpCounts[dumpName] = (dumpCounts[dumpName] || 0) + 1;
          
          // Track most recent update (first item due to ordering)
          if (!dumpLastUpdated[dumpName]) {
            dumpLastUpdated[dumpName] = new Date(item.created_at).toISOString().split('T')[0];
          }
        }
      });
    }
    
    // Update dump counts and last updated dates
    dumps.value.forEach(dump => {
      dump.itemCount = dumpCounts[dump.name] || 0;
      if (dumpLastUpdated[dump.name]) {
        dump.lastUpdated = dumpLastUpdated[dump.name];
      }
    });
    
    console.log('Updated dump counts:', dumpCounts);
    
  } catch (error) {
    console.error('Failed to update dump counts:', error);
  } finally {
    loading.value = false;
  }
};

// Add new dump with optimistic updates
const addNewDump = async () => {
  if (newDumpName.value.trim()) {
    try {
      loading.value = true;
      
      // Normalize the dump name
      const normalizedName = normalizeDumpName(newDumpName.value.trim());
      
      // Check for duplicates (case-insensitive)
      const existingDump = dumps.value.find(d => 
        d.name.toLowerCase() === normalizedName.toLowerCase()
      );
      
      if (existingDump) {
        ElNotification({
          title: 'Duplicate Dump',
          message: `Dump "${normalizedName}" already exists!`,
          type: 'warning',
        });
        return;
      }
      
      // Save to dumps table
      const { data, error } = await supabase
        .from('dumps')
        .insert([{
          dump_name: normalizedName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Calculate next sequential ID based on current local state
      const nextId = Math.max(...dumps.value.map(d => d.id), 0) + 1;
      
      // Add to local state immediately (optimistic update)
      const newDump = {
        id: nextId, // Sequential ID for UI consistency
        name: normalizedName,
        status: 'Active',
        lastUpdated: new Date().toISOString().split('T')[0],
        itemCount: 0,
        dbId: data.id // Store database ID for reference
      };
      
      dumps.value.push(newDump);
      
      // Force Vue reactivity
      dumps.value = [...dumps.value];
      
      // Reset form and close modal
      newDumpName.value = '';
      showAddModal.value = false;
      
      // Show success message
      ElNotification({
        title: 'Success',
        message: `Dump "${normalizedName}" (ID: ${nextId}) added successfully!`,
        type: 'success',
      });
      
      console.log(`Added new dump: ${normalizedName} with ID ${nextId} (DB ID: ${data.id})`);
      
    } catch (error) {
      console.error('Failed to add new dump:', error);
      ElNotification({
        title: 'Error',
        message: `Failed to add dump: ${error.message}`,
        type: 'error',
      });
    } finally {
      loading.value = false;
    }
  }
};

const closeModal = () => {
  showAddModal.value = false;
  newDumpName.value = '';
};

const refreshDumpData = async () => {
  await updateAllDumpCounts();
};

// Delete dump function - optimized for speed
const deleteDump = async (dumpId, dumpName, event) => {
  // Prevent card click event when delete button is clicked
  event.stopPropagation();
  
  // Show confirmation dialog
  const confirmed = window.confirm(`Are you sure you want to delete "${dumpName}"?\n\nWarning: This will also delete all inventory data associated with this dump. This action cannot be undone.`);
  
  if (!confirmed) {
    return;
  }
  
  try {
    loading.value = true;
    
    console.log(`Deleting dump: "${dumpName}" (ID: ${dumpId})`);
    
    // Optimized: Delete operations in parallel for better performance
    const [inventoryResult, dumpResult] = await Promise.allSettled([
      // Delete all inventory data for this dump (case-insensitive)
      supabase
        .from('dump_inventory')
        .delete()
        .ilike('dump_name', dumpName)
        .select('id'), // Only select id for count
      
      // Delete from dumps table
      supabase
        .from('dumps')
        .delete()
        .ilike('dump_name', dumpName)
    ]);
    
    // Check for errors
    if (inventoryResult.status === 'rejected') {
      console.error('Error deleting inventory data:', inventoryResult.reason);
      ElNotification({
        title: 'Error',
        message: 'Failed to delete inventory data: ' + inventoryResult.reason.message,
        type: 'error'
      });
      return;
    }
    
    if (dumpResult.status === 'rejected') {
      console.error('Error deleting from dumps table:', dumpResult.reason);
      ElNotification({
        title: 'Error',
        message: 'Failed to delete dump: ' + dumpResult.reason.message,
        type: 'error'
      });
      return;
    }
    
    // Get count of deleted records
    const deletedCount = inventoryResult.value?.data?.length || 0;
    console.log(`Successfully deleted ${deletedCount} inventory records for dump "${dumpName}"`);
    
    // Optimized: Remove from local state immediately (optimistic update)
    const dumpIndex = dumps.value.findIndex(dump => dump.id === dumpId);
    if (dumpIndex > -1) {
      dumps.value.splice(dumpIndex, 1);
    }
    
    // Show success notification
    ElNotification({
      title: 'Success',
      message: `Dump "${dumpName}" deleted successfully! (${deletedCount} records deleted)`,
      type: 'success'
    });
    
    // Optional: Skip full reload for better performance - data is already updated optimistically
    // await loadDumps(); // Commented out for speed - uncomment if cross-device sync is critical
    
  } catch (error) {
    console.error('Error deleting inventory dump:', error);
    ElNotification({
      title: 'Error',
      message: 'Failed to delete inventory dump: ' + error.message,
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// Load real data when component mounts
onMounted(async () => {
  await loadDumps();
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
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Dumps</h1>
            <p class="mt-2 text-sm text-gray-600">Manage and view your inventory dump locations</p>
            <div v-if="loading" class="flex items-center mt-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              <span class="text-sm text-blue-600">Updating dump data...</span>
            </div>
          </div>
          
          <div class="mt-4 sm:mt-0 flex space-x-3">
            <button 
              @click="refreshDumpData"
              :disabled="loading"
              class="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh dump data"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="{ 'animate-spin': loading }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ loading ? 'Refreshing...' : 'Refresh' }}
            </button>
            <button 
              @click="showAddModal = true"
              :disabled="loading"
              class="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              <svg class="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <dd class="text-2xl font-bold text-gray-900">{{ dumps.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Active Dumps</dt>
                  <dd class="text-2xl font-bold text-gray-900">{{ dumps.filter(d => d.status === 'Active').length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd class="text-2xl font-bold text-gray-900">{{ dumps.reduce((sum, d) => sum + d.itemCount, 0) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dumps Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <span class="font-medium text-gray-900">{{ dump.itemCount }}</span>
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
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
              :disabled="!newDumpName.trim()"
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