<script setup>
import Logout from "./dashboardLogoutButton.vue";
import { useAuthStore } from '../authStore';

const auth = useAuthStore();
</script>

<template>
  <main class="font-mont font-light">
    <section class=" px-16 py-3">
      <figure class="flex justify-end items-center gap-2">
        <el-avatar class="!text-xl !font-bold">
          <template v-if="auth.user && auth.user.username">
            {{ auth.userProfile.username.charAt(0).toUpperCase() }}
          </template>
          <template v-else>
            <span class="text-xs">User</span>
          </template>
        </el-avatar>
        <figcaption>
          <el-dropdown>
            <div class="cursor-pointer">
              <p class="hover:!text-green-600 !text-lg !font-semibold">
                {{ auth.userProfile?.username || 'Loading...' }}
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
          <small class="block -mt-1 font-semibold text-gray-500">Admin</small>
        </figcaption>
      </figure>
    </section>
  </main>



</template>

<style scoped>
/* .example-showcase .el-dropdown-link {
  cursor: pointer;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
} */

</style>
