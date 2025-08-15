<script setup>
import DashboardIcon from "../assets/icons/dashboardIcon.vue";
import InventoryIcon from "../assets/icons/dashboardInventoryIcon.vue";
import ReportIcon from "../assets/icons/dashboardReportIcon.vue";
import TrackingIcon from "../assets/icons/dashboardTrackingIcon.vue";
import DumpIcon from "../assets/icons/dumpIcon.vue";

// Define emit for navigation events
const emit = defineEmits(['navigate']);

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

  </section>
</template>
