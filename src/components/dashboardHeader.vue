<script setup>
import Logout from "./dashboardLogoutButton.vue";
import { useAuthStore } from '../authStore';

const auth = useAuthStore();
</script>

<template>
  <main class="font-mont font-light">
    <section class="px-4 sm:px-8 md:px-16 py-3">
      <figure class="flex justify-between sm:justify-end items-center gap-2">
        <!-- Mobile menu indicator -->
        <div class="flex sm:hidden items-center">
          <span class="text-sm font-medium text-gray-600">Dashboard</span>
        </div>
        
        <!-- User profile section -->
        <div class="flex items-center gap-2">
          <el-avatar class="!text-base sm:!text-xl !font-bold !w-8 !h-8 sm:!w-10 sm:!h-10">
            <template v-if="auth.userProfile && auth.userProfile.length > 0 && auth.userProfile[0].username">
              {{ auth.userProfile[0].username.charAt(0).toUpperCase() }}
            </template>
            <template v-else>
              <span class="text-xs">U</span>
            </template>
          </el-avatar>
          <figcaption class="hidden xs:block">
            <el-dropdown>
              <div class="cursor-pointer">
                <p class="hover:!text-green-600 !text-sm sm:!text-lg !font-semibold truncate max-w-[120px] sm:max-w-none">
                  {{ auth.isCEO ? 'CEO' : (auth.userProfile && auth.userProfile.length > 0 ? auth.userProfile[0].username : 'Loading...') }}
                </p>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item class="!text-red-600">
                    <span>
                      <Logout/>
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <small class="block -mt-1 font-semibold text-gray-500 text-xs">{{ auth.isCEO ? 'CEO' : 'Admin' }}</small>
          </figcaption>
          
          <!-- Mobile dropdown (avatar only) -->
          <div class="xs:hidden">
            <el-dropdown>
              <div class="cursor-pointer p-1">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    <span class="text-sm font-medium">{{ auth.isCEO ? 'CEO' : (auth.userProfile?.username || 'User') }}</span>
                  </el-dropdown-item>
                  <el-dropdown-item class="!text-red-600">
                    <span>
                      <Logout/>
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </figure>
    </section>
  </main>
</template>

<style scoped>
/* Custom responsive breakpoint for extra small screens */
@media (min-width: 480px) {
  .xs\:block {
    display: block;
  }
  .xs\:hidden {
    display: none;
  }
}

@media (max-width: 479px) {
  .xs\:block {
    display: none;
  }
  .xs\:hidden {
    display: block;
  }
}
</style>
