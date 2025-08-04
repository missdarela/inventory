<script setup>
import DashboardIcon from "../assets/icons/dashboardIcon.vue";
import InventoryIcon from "../assets/icons/dashboardInventoryIcon.vue";
import ReportIcon from "../assets/icons/dashboardReportIcon.vue";
import TrackingIcon from "../assets/icons/dashboardTrackingIcon.vue";
import DumpIcon from "../assets/icons/dumpIcon.vue";
</script>

<template>
  <section class="flex flex-col gap-6 px-3 font-semibold">
    <router-link
      to="/dashboard"
      class="flex items-center gap-3 p-2 md:mt-2 mt-12 rounded transition-colors duration-200"
     
    >
      <DashboardIcon class="w-5 h-5" />
      <span>Dashboard</span>
    </router-link>

    <router-link
      to="/dashboard/inventory"
      class="flex items-center gap-3 p-2 my-4 rounded transition-colors duration-200"
    >
      <InventoryIcon class="w-5 h-5" />
      <span>Inventory</span>
    </router-link>

    <router-link
      to="/dashboard/dump"
      class="flex items-center gap-3 p-2 rounded transition-colors duration-200"
    >
      <DumpIcon class="w-5 h-5" />
      <span>Dumps</span>
    </router-link>

    <router-link
      to="/dashboard/report"
      class="flex items-center gap-3 p-2 my-4 rounded transition-colors duration-200"
     
    >
      <ReportIcon class="w-5 h-5" />
      <span>Report</span>
    </router-link>

    <router-link
      to="/dashboard/tracking"
      class="flex items-center gap-3 p-2 rounded transition-colors duration-200"
      
    >
      <TrackingIcon class="w-5 h-5" />
      <span>Tracking</span>
    </router-link>

  </section>


  
</template>
