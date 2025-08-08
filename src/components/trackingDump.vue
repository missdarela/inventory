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

const filteredDumps = computed(() => {
  if (!searchQuery.value) return trackingDumpStore.trackingDumps;
  return trackingDumpStore.trackingDumps.filter(dump => 
    dump.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const goBack = () => {
  router.push('/dashboard/dump');
};

const navigateToDumpDetails = (dumpId) => {
  router.push(`/dashboard/dump/trackingDump/${dumpId}`);
};

const addNewDump = async () => {
  if (newDumpName.value.trim()) {
    try {
      loading.value = true;
      const dumpName = newDumpName.value.trim();
      
      console.log('Adding new dump with name:', dumpName);
      
      // Use the store's addDump method which handles batch_id generation
      const newDump = await trackingDumpStore.addDump(dumpName);
      
      if (newDump) {
        console.log('New dump created:', newDump);
        
        // Reset form and close modal
        newDumpName.value = '';
        showAddModal.value = false;
        
        // Show success message
        ElNotification({
          title: 'Success',
          message: `New tracking dump "${dumpName}" added successfully!`,
          type: 'success',
        });
      }
      
    } catch (error) {
      console.error('Failed to add new tracking dump:', error);
      const errorMessage = error.message || 'An unknown error occurred';
      
      ElNotification({
        title: 'Error',
        message: `Failed to add tracking dump: ${errorMessage}`,
        type: 'error',
        duration: 5000
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

// Initialize store when component mounts
onMounted(async () => {
  try {
    await trackingDumpStore.initialize();
    console.log('Tracking dumps loaded:', trackingDumpStore.trackingDumps.length);
  } catch (error) {
    console.error('Error initializing tracking dumps:', error);
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
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Tracking Dumps</h1>
            <p class="mt-2 text-sm text-gray-600">Manage and view your tracking dump locations</p>
          </div>
          <!-- <button 
            @click="exportTrackingData"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Export Data
          </button> -->
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
                  <dd class="text-2xl font-bold text-gray-900">{{ trackingDumpStore.trackingDumps?.length || 0 }}</dd>
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
                  <dd class="text-2xl font-bold text-gray-900">{{ trackingDumpStore.trackingDumps?.filter(d => d.status === 'Active').length || 0 }}</dd>
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd class="text-2xl font-bold text-gray-900">{{ totalDeliveries }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dumps Grid -->
      <div v-if="!trackingDumpStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <!-- Add New Dump Card -->
        <div 
          @click="showAddModal = true"
          class="group bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-dashed border-blue-300 hover:border-blue-500 flex items-center justify-center min-h-[200px]"
        >
          <div class="text-center p-6">
            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 transition-colors duration-200">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              :disabled="!newDumpName.trim() || loading"
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