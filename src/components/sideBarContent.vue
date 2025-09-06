<script setup>
import DashboardIcon from "../assets/icons/dashboardIcon.vue";
import InventoryIcon from "../assets/icons/dashboardInventoryIcon.vue";
import ReportIcon from "../assets/icons/dashboardReportIcon.vue";
import TrackingIcon from "../assets/icons/dashboardTrackingIcon.vue";
import DumpIcon from "../assets/icons/dumpIcon.vue";
import { useAuthStore } from '../authStore';
import { computed } from 'vue';

// Define emit for navigation events
const emit = defineEmits(['navigate']);

// Initialize auth store
const authStore = useAuthStore();

// Computed property to check if user is CEO
const isCEO = computed(() => authStore.isCEO);

// Handle navigation click
const handleNavigation = () => {
  emit('navigate');
};
</script>

<template>
  <section class="flex flex-col gap-6 px-3 font-semibold">
    <router-link
      to="/dashboard"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 md:mt-2 mt-12 rounded transition-colors duration-200"
     
    >
      <DashboardIcon class="w-5 h-5" />
      <span>Dashboard</span>
    </router-link>

    <router-link
      to="/dashboard/inventory"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 my-4 rounded transition-colors duration-200"
    >
      <InventoryIcon class="w-5 h-5" />
      <span>Inventory</span>
    </router-link>

    <router-link
      to="/dashboard/dump"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 rounded transition-colors duration-200"
    >
      <DumpIcon class="w-5 h-5" />
      <span>Dumps</span>
    </router-link>

    <router-link
      to="/dashboard/report"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 my-4 rounded transition-colors duration-200"
     
    >
      <ReportIcon class="w-5 h-5" />
      <span>Report</span>
    </router-link>

    <router-link
      to="/dashboard/tracking"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 rounded transition-colors duration-200"
      
    >
      <TrackingIcon class="w-5 h-5" />
      <span>Tracking</span>
    </router-link>

    <!-- Users Management (Only visible to CEO) -->
    <router-link
      v-if="isCEO"
      to="/dashboard/users"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 my-4 rounded transition-colors duration-200 bg-yellow-100 text-yellow-800"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <span>Users</span>
    </router-link>

    <!-- Sign Up User (Only visible to CEO) -->
    <router-link
      v-if="isCEO"
      to="/"
      @click="handleNavigation"
      class="flex items-center gap-3 p-2 rounded transition-colors duration-200 bg-green-100 text-green-800"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
      <span>Sign Up User</span>
    </router-link>

  </section>
</template>
