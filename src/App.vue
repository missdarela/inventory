<script setup>
import { RouterView } from 'vue-router'
import { onMounted } from 'vue';
import { useAuthStore } from './authStore';
import { supabase } from './supabase';

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
  <RouterView />
</template>


