<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header Section -->
      <div class="mb-8">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Monthly Tracking Reports</h1>
              <p class="mt-2 text-sm text-gray-600">View delivery tracking data organized by month</p>
            </div>
            
            <div class="mt-4 sm:mt-0">
              <div class="flex items-center space-x-2 text-sm text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span>Last updated: {{ new Date().toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="trackingDumpStore.loading" class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Loading monthly reports...</p>
        </div>
      </div>

      <!-- Monthly Reports -->
      <div v-else-if="Object.keys(monthlyReports).length > 0" class="space-y-6">
        <div 
          v-for="[monthKey, monthData] in Object.entries(monthlyReports)" 
          :key="monthKey"
          class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <!-- Month Header -->
          <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-gray-900">{{ monthData.monthName }}</h2>
                <p class="text-sm text-gray-600 mt-1">{{ monthData.deliveries.length }} deliveries recorded</p>
              </div>
              
              <!-- Month Statistics Cards -->
              <div class="flex items-center space-x-4">
                <div class="bg-white rounded-lg px-3 py-2 shadow-sm border border-blue-200">
                  <p class="text-lg font-bold text-blue-600">{{ formatNumber(monthData.totalContainers) }}</p>
                  <p class="text-xs text-gray-500">Containers</p>
                </div>
                <div class="bg-white rounded-lg px-3 py-2 shadow-sm border border-green-200">
                  <p class="text-lg font-bold text-green-600">{{ monthData.uniqueDrivers }}</p>
                  <p class="text-xs text-gray-500">Drivers</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Deliveries Summary -->
          <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-gray-700">Delivery Records</span>
              <span class="text-gray-500">{{ monthData.deliveries.length }} total</span>
            </div>
          </div>

          <!-- Deliveries List -->
          <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            <div 
              v-for="(delivery, index) in monthData.deliveries" 
              :key="`${monthKey}-${index}`"
              class="p-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4"></path>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-3 mb-2">
                    <h3 class="text-base font-semibold text-gray-900">{{ delivery.container_no || `Delivery #${index + 1}` }}</h3>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ delivery.dumpName }}
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span class="text-gray-500">Date:</span>
                      <span class="ml-1 font-medium text-gray-900">{{ formatDate(delivery.date) }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Driver:</span>
                      <span class="ml-1 font-medium text-gray-900">{{ delivery.driver || 'N/A' }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Containers:</span>
                      <span class="ml-1 font-medium text-blue-600">{{ formatNumber(delivery.containers_delivered) }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Status:</span>
                      <span 
                        :class="{
                          'text-green-600': delivery.status === 'Delivered',
                          'text-red-600': delivery.status === 'Failed',
                          'text-yellow-600': delivery.status === 'Pending',
                          'text-gray-600': !delivery.status
                        }"
                        class="ml-1 font-medium"
                      >
                        {{ delivery.status || 'Recorded' }}
                      </span>
                    </div>
                  </div>
                  
                  <div v-if="delivery.vessel_details || delivery.comments" class="mt-2 pt-2 border-t border-gray-100">
                    <div v-if="delivery.vessel_details" class="text-sm text-gray-700 mb-1">
                      <span class="font-medium">Vessel:</span> {{ delivery.vessel_details }}
                    </div>
                    <div v-if="delivery.comments" class="text-sm text-gray-700">
                      <span class="font-medium">Comments:</span> {{ delivery.comments }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Monthly Reports Available</h3>
          <p class="text-gray-600">No delivery data found to generate monthly reports.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTrackingDumpStore } from '../stores/trackingDump';

const router = useRouter();
const trackingDumpStore = useTrackingDumpStore();

// Get monthly reports from store
const monthlyReports = computed(() => trackingDumpStore.deliveriesByMonth);

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Format numbers with commas
const formatNumber = (value) => {
  if (!value) return '0';
  return new Intl.NumberFormat('en-US').format(value);
};

// Go back
const goBack = () => {
  router.push('/dashboard/dump/trackingDump');
};

// Initialize data when component mounts
onMounted(async () => {
  await trackingDumpStore.initialize();
});
</script>

<style scoped>
.font-mont {
  font-family: 'Montserrat', sans-serif;
}
</style>
