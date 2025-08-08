<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryDumpStore } from '../stores/inventoryDumpStore';
import { ElNotification } from 'element-plus';

const router = useRouter();
const inventoryDumpStore = useInventoryDumpStore();
const dumpData = ref([]);
const showAddModal = ref(false);
const newDumpName = ref('');
const searchQuery = ref('');
const loading = ref(false);

// Initialize dumps from localStorage or default data
const initializeDumps = () => {
  const savedDumps = localStorage.getItem('inventoryDumps');
  if (savedDumps) {
    return JSON.parse(savedDumps);
  }
  
  // Default dumps
  return [
    { id: 1, name: 'Heartland', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 },
    { id: 2, name: 'Wireline', status: 'Active', lastUpdated: '2024-12-23', itemCount: 0 },
    { id: 3, name: 'Ada', status: 'Active', lastUpdated: '2024-12-20', itemCount: 0 },
    { id: 4, name: 'Oga Remy', status: 'Active', lastUpdated: '2024-12-22', itemCount: 0 },
    { id: 5, name: 'Pastor (Remy)', status: 'Active', lastUpdated: '2024-12-21', itemCount: 0 },
    { id: 6, name: 'Ebuka', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 },
    { id: 7, name: 'More Grace', status: 'Active', lastUpdated: '2024-12-23', itemCount: 0 },
    { id: 8, name: 'Ndony', status: 'Active', lastUpdated: '2024-12-19', itemCount: 0 },
    { id: 9, name: 'Papa', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 },
    { id: 10, name: 'Nkechi', status: 'Active', lastUpdated: '2024-12-22', itemCount: 0 },
    { id: 11, name: 'Rugged Pastor', status: 'Active', lastUpdated: '2024-12-21', itemCount: 0 },
    { id: 12, name: 'Madam Iyawo', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 },
    { id: 13, name: 'Azuke', status: 'Active', lastUpdated: '2024-12-18', itemCount: 0 },
    { id: 14, name: 'Chigozie', status: 'Active', lastUpdated: '2024-12-23', itemCount: 0 },
    { id: 15, name: 'Francis FM', status: 'Active', lastUpdated: '2024-12-22', itemCount: 0 },
    { id: 16, name: 'Igwe', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 },
    { id: 17, name: 'Victor Amadi', status: 'Active', lastUpdated: '2024-12-21', itemCount: 0 },
    { id: 18, name: 'Madam Joy', status: 'Active', lastUpdated: '2024-12-23', itemCount: 0 },
    { id: 19, name: 'CAC', status: 'Active', lastUpdated: '2024-12-24', itemCount: 0 }
  ];
};

const dumps = ref(initializeDumps());

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

// Save dumps to localStorage
const saveDumps = () => {
  localStorage.setItem('inventoryDumps', JSON.stringify(dumps.value));
};

// Fetch real item count from Supabase for a dump
const fetchDumpItemCount = async (dumpName) => {
  try {
    const data = await inventoryDumpStore.fetchDumpsByName(dumpName);
    return data ? data.length : 0;
  } catch (error) {
    console.error(`Failed to fetch item count for ${dumpName}:`, error);
    return 0;
  }
};

// Update all dump item counts from Supabase
const updateAllDumpCounts = async () => {
  loading.value = true;
  try {
    for (const dump of dumps.value) {
      const itemCount = await fetchDumpItemCount(dump.name);
      dump.itemCount = itemCount;
      
      // Update last updated date if there are items
      if (itemCount > 0) {
        const data = await inventoryDumpStore.fetchDumpsByName(dump.name);
        if (data && data.length > 0) {
          // Find the most recent entry
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          dump.lastUpdated = new Date(sortedData[0].created_at).toISOString().split('T')[0];
        }
      }
    }
    saveDumps(); // Save updated counts to localStorage
  } catch (error) {
    console.error('Failed to update dump counts:', error);
  } finally {
    loading.value = false;
  }
};

const addNewDump = async () => {
  if (newDumpName.value.trim()) {
    try {
      loading.value = true;
      
      // Capitalize the dump name
      const capitalizedName = inventoryDumpStore.capitalizeDumpName(newDumpName.value.trim());
      
      // Create a new dump object
      const newId = Math.max(...dumps.value.map(d => d.id)) + 1;
      const newDump = {
        id: newId,
        name: capitalizedName,
        status: 'Active',
        lastUpdated: new Date().toISOString().split('T')[0],
        itemCount: 0
      };
      
      // Save to database
      await inventoryDumpStore.saveDumpMetadata(newDump);
      
      // Add to local state
      dumps.value.push(newDump);
      saveDumps(); // Save to localStorage
      
      // Reset form and close modal
      newDumpName.value = '';
      showAddModal.value = false;
      
      // Show success message
      ElNotification({
        title: 'Success',
        message: `Dump "${capitalizedName}" added successfully!`,
        type: 'success',
      });
      
      // Refresh the dump counts
      await updateAllDumpCounts();
      
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

// Load real data when component mounts
onMounted(async () => {
  await updateAllDumpCounts();
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
          
          <div class="mt-4 sm:mt-0">
            <button 
              @click="showAddModal = true"
              :disabled="loading"
              class="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <span 
                  :class="{
                    'bg-green-100 text-green-800': dump.status === 'Active',
                    'bg-red-100 text-red-800': dump.status === 'Inactive'
                  }"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ dump.status }}
                </span>
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