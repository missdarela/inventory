<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template class="font-mont">
  <div class="flex flex-col gap-6 p-4 bg-gray-50 min-h-screen">
    <div class="flex flex-col gap-6 items-center justify-center">
      <router-link to="/dashboard/report/inventory-report" class="max-w-md w-full">
        <div class="bg-gradient-to-br from-blue-500 to-green-400 shadow-lg rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105">
          <h2 class="text-2xl font-bold text-white mb-2">Inventory Reports</h2>
          <p class="text-white/80 text-center">View and analyze your inventory data summaries.</p>
        </div>
      </router-link>
      <router-link to="/dashboard/report/tracking-report" class="max-w-md w-full">
        <div class="bg-gradient-to-br from-green-500 to-blue-400 shadow-lg rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105">
          <h2 class="text-2xl font-bold text-white mb-2">Exports Tracking Reports</h2>
          <p class="text-white/80 text-center">Monitor supply chain and item movement with detailed tracking reports.</p>
        </div>
      </router-link>
    </div>
  </div>
</template>
