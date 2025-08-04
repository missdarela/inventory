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
          <!-- Hamburger button and drawer for mobile (outside el-aside) -->
          <button
            @click="toggleDrawer"
            class="md:hidden fixed top-4 left-4 z-50 text-white bg-teal-600 p-2 rounded"
          >
            ☰
          </button>
          <el-drawer
            v-model="drawerVisible"
            class="md:hidden bg-gradient-to-r from-[#235f53] to-[#21b597] text-white w-2/3"
            direction="ltr"
            size="250px"
            :with-header="false"
          >
            <SidebarContent />
          </el-drawer>

          <!-- Desktop sidebar -->
          <el-aside
            width="250px"
            class="hidden md:flex bg-gradient-to-r from-[#235f53] to-[#21b597] text-white px-5 py-28"
          >
            <SidebarContent />
          </el-aside>

          <el-container>
            <el-header class="bg-[#f2f4fa]">
              <DashboardHeader />
            </el-header>
            <el-main class="flex-1 overflow-auto bg-gray-200">
              <!-- <component :is="tabComponents[activeTab]"/> -->
              <router-view />
            </el-main>
          </el-container>
        </el-container>
      </div>
    </section>
  </main>
</template>