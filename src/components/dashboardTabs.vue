<script setup>
import SidebarContent from "../components/sideBarContent.vue";
import DashboardHeader from "../components/dashboardHeader.vue";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from '../authStore';
import { supabase } from '../supabase';

const route = useRoute();
const drawerVisible = ref(false);

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value;
};

const closeDrawer = () => {
  drawerVisible.value = false;
};

const auth = useAuthStore();
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    auth.user = user;
    await auth.fetchUserProfile();
  }
});
</script>
<template>
  <main>
    <section class="font-mont font-normal">
      <div class="common-layout">
        <el-container class="h-screen">
          <!-- Hamburger button for mobile -->
          <button
            @click="toggleDrawer"
            class="md:hidden fixed top-4 left-4 z-50 text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 p-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            aria-label="Toggle menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          <!-- Mobile drawer -->
          <el-drawer
            v-model="drawerVisible"
            class="md:hidden"
            direction="ltr"
            size="280px"
            :with-header="false"
            :modal="true"
            :close-on-click-modal="true"
            @close="closeDrawer"
          >
            <div class="bg-gradient-to-br from-[#235f53] to-[#21b597] text-white h-full">
              <!-- Close button -->
              <div class="flex justify-end p-4">
                <button
                  @click="closeDrawer"
                  class="text-white hover:text-gray-200 transition-colors duration-200"
                  aria-label="Close menu"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div class="px-5 pb-5">
                <SidebarContent @navigate="closeDrawer" />
              </div>
            </div>
          </el-drawer>

          <!-- Desktop sidebar -->
          <el-aside
            width="250px"
            class="hidden md:flex bg-gradient-to-br from-[#235f53] to-[#21b597] text-white px-5 py-28"
          >
            <SidebarContent />
          </el-aside>

          <el-container>
            <el-header class="bg-[#f2f4fa] shadow-sm">
              <DashboardHeader />
            </el-header>
            <el-main class="flex-1 overflow-auto bg-gray-50 md:bg-gray-200">
              <div class="pt-16 md:pt-0">
                <router-view />
              </div>
            </el-main>
          </el-container>
        </el-container>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Ensure proper mobile spacing */
@media (max-width: 768px) {
  .el-main {
    padding: 0;
  }
}

/* Custom drawer styles */
:deep(.el-drawer) {
  border-radius: 0 16px 16px 0;
}

:deep(.el-drawer__body) {
  padding: 0;
}
</style>