<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header Section -->
      <div class="mb-8">
        <button 
          @click="goBack" 
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 mb-6"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Tracking Dumps
        </button>
        
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
          <div class="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{{ dumpName }}</h1>
              <p class="text-base sm:text-lg text-gray-600 mt-1">Delivery Tracking Overview</p>
              <div class="flex flex-col sm:flex-row sm:items-center mt-2 space-y-2 sm:space-y-0 sm:space-x-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                  Active Location
                </span>
                <span class="text-sm text-gray-500">
                  {{ deliveries.length }} {{ deliveries.length === 1 ? 'delivery' : 'deliveries' }} recorded
                </span>
                <span v-if="trackingDumpStore.loading" class="flex items-center text-sm text-blue-600">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-1"></div>
                  Loading...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="trackingDumpStore.loading" class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Loading delivery data...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!trackingDumpStore.loading && deliveries.length === 0" class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Deliveries Found</h3>
          <p class="text-gray-600">No deliveries found for {{ dumpName }}. Deliveries will appear here once they are recorded in the system.</p>
        </div>
      </div>

      <!-- Statistics Dashboard -->
      <div v-if="!trackingDumpStore.loading && deliveries.length > 0" class="mb-8">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Delivery Statistics</h2>
            <div class="text-sm text-gray-500">
              Last updated: {{ new Date().toLocaleDateString() }}
            </div>
          </div>
          
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Deliveries -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-600">Total Deliveries</p>
                  <p class="text-2xl font-bold text-blue-900">{{ dumpStats.totalDeliveries }}</p>
                </div>
                <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Total Containers -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-green-600">Total Containers</p>
                  <p class="text-2xl font-bold text-green-900">{{ formatNumber(dumpStats.totalContainers) }}</p>
                </div>
                <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Unique Drivers -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-purple-600">Unique Drivers</p>
                  <p class="text-2xl font-bold text-purple-900">{{ dumpStats.uniqueDrivers }}</p>
                </div>
                <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- This Month -->
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-orange-600">This Month</p>
                  <p class="text-2xl font-bold text-orange-900">{{ dumpStats.monthlyDeliveries }}</p>
                </div>
                <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delivery Records -->
      <div v-if="!trackingDumpStore.loading && deliveries.length > 0">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Delivery Records</h2>
              <div class="text-sm text-gray-500">
                {{ deliveries.length }} total records
              </div>
              <button @click="exportDeliveries" class="text-sm text-blue-600 hover:text-blue-900 transition-colors duration-200">
                Export to CSV
              </button>
            </div>
          </div>
          
          <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            <div 
              v-for="(delivery, index) in deliveries" 
              :key="delivery.id || index"
              class="p-6 hover:bg-gray-50 transition-colors duration-200"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4">
                  <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-3 mb-2">
                      <h3 class="text-lg font-semibold text-gray-900">{{ delivery.container_no || `Delivery #${index + 1}` }}</h3>
                      <span 
                        :class="{
                          'bg-green-100 text-green-800 border-green-200': delivery.status === 'Delivered',
                          'bg-red-100 text-red-800 border-red-200': delivery.status === 'Failed',
                          'bg-yellow-100 text-yellow-800 border-yellow-200': delivery.status === 'Pending',
                          'bg-gray-100 text-gray-800 border-gray-200': !delivery.status
                        }"
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                      >
                        {{ delivery.status || 'Recorded' }}
                      </span>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500">Date:</span>
                        <span class="ml-2 font-medium text-gray-900">{{ formatDate(delivery.date) || 'Not specified' }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Driver:</span>
                        <span class="ml-2 font-medium text-gray-900">{{ delivery.driver || 'N/A' }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Containers:</span>
                        <span class="ml-2 font-medium text-blue-600">{{ formatNumber(delivery.containers_delivered) }}</span>
                      </div>
                    </div>
                    
                    <div v-if="delivery.vessel_details || delivery.comments" class="mt-3 pt-3 border-t border-gray-100">
                      <div v-if="delivery.vessel_details" class="mb-2">
                        <span class="text-xs text-gray-500 uppercase tracking-wide">Vessel Details:</span>
                        <p class="text-sm text-gray-700 mt-1">{{ delivery.vessel_details }}</p>
                      </div>
                      <div v-if="delivery.comments">
                        <span class="text-xs text-gray-500 uppercase tracking-wide">Comments:</span>
                        <p class="text-sm text-gray-700 mt-1">{{ delivery.comments }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTrackingDumpStore } from '../stores/trackingDump';
import { ElMessage, ElNotification } from 'element-plus';

const route = useRoute();
const router = useRouter();
const trackingDumpStore = useTrackingDumpStore();

const deliveries = ref([]);
const dumpName = computed(() => {
  const dumpId = parseInt(route.params.id);
  const dump = trackingDumpStore.getDumpById(dumpId);
  return dump ? dump.name : 'Unknown Dump';
});

const dumpStats = ref({
  totalDeliveries: 0,
  totalContainers: 0,
  uniqueDrivers: 0,
  monthlyDeliveries: 0
});

const fetchDumpData = async () => {
  if (!dumpName.value || dumpName.value === 'Unknown Dump') return;
  
  try {
    const stats = await trackingDumpStore.getDumpStatistics(dumpName.value);
    deliveries.value = stats.deliveries;
    dumpStats.value = {
      totalDeliveries: stats.totalDeliveries,
      totalContainers: stats.totalContainers,
      uniqueDrivers: stats.uniqueDrivers,
      monthlyDeliveries: stats.monthlyDeliveries
    };
    console.log(`Loaded ${stats.deliveries.length} deliveries for ${dumpName.value}`);
  } catch (error) {
    console.error('Failed to fetch dump data:', error);
    deliveries.value = [];
  }
};

const goBack = () => {
  router.push('/dashboard/dump/trackingDump');
};

const exportDeliveries = () => {
  try {
    // Create CSV content with statistics header
    let csvContent = `${dumpName.value} Deliveries Export Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Deliveries: ${deliveries.value.length}\n`;
    csvContent += `Total Containers: ${dumpStats.value.totalContainers}\n`;
    csvContent += `Unique Drivers: ${dumpStats.value.uniqueDrivers}\n\n`;
    
    // Add delivery details header
    csvContent += 'Date,Container No,Driver,Containers Delivered,Vessel Details,Comments\n';
    
    // Add delivery data
    deliveries.value.forEach(delivery => {
      csvContent += `"${delivery.date || ''}","${delivery.container_no || ''}","${delivery.driver || ''}",${delivery.containers_delivered || 0},"${delivery.vessel_details || ''}","${delivery.comments || ''}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${dumpName.value}_deliveries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElNotification({
      title: 'Export Successful',
      message: `${dumpName.value} deliveries exported successfully!`,
      type: 'success',
      duration: 3000
    });
  } catch (error) {
    console.error('Export error:', error);
    ElNotification({
      title: 'Export Failed',
      message: 'Failed to export deliveries data',
      type: 'error',
      duration: 3000
    });
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatNumber = (value) => {
  if (!value) return '0';
  return new Intl.NumberFormat('en-US').format(value);
};

onMounted(async () => {
  await trackingDumpStore.initialize();
  await fetchDumpData();
});
</script>
