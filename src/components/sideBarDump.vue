<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const navigateToInventoryDump = () => {
  router.push('/dashboard/dump/inventoryDump');
};

const navigateToTrackingDump = () => {
  router.push('/dashboard/dump/trackingDump');
};
</script>

<template class="font-mont">
  <div class="flex flex-col gap-6 p-4 bg-gray-50 min-h-screen">
    <div class="flex flex-col md:flex-row gap-6 items-center justify-center">
      <!-- Inventory Dump Box -->
      <div 
        @click="navigateToInventoryDump"
        class="w-full md:w-1/2 max-w-md cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="bg-gradient-to-br from-blue-500 to-green-400 rounded-2xl shadow-xl overflow-hidden">
          <div class="p-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-white">Inventory Dump</h2>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p class="text-white/90 text-lg mb-4">Manage and track your inventory dumps</p>
            <ul class="text-white/80 space-y-2">

              <li class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                Track inventory status
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tracking Dump Box -->
      <div 
        @click="navigateToTrackingDump"
        class="w-full md:w-1/2 max-w-md cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl overflow-hidden">
          <div class="p-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-white">Tracking Dump</h2>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p class="text-white/90 text-lg mb-4">Monitor and manage tracking dumps</p>
            <ul class="text-white/80 space-y-2">
              <li class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                Track delivery status
              </li>
            </ul>
          </div>
      
        </div>
      </div>
    </div>
  </div>
</template>