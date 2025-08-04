<script setup>
import { useRouter } from 'vue-router'
import { supabase } from '../supabase' // adjust path to where you initialized Supabase
import { ElMessage } from 'element-plus'

const router = useRouter()

const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error('Logout failed:', error.message)
        ElMessage.error('Logout failed. Please try again.')
    } else {
        ElMessage.success('Logged out successfully!')
        router.push('/login') // redirect to login page
    }
};
</script>
<template>
    <p @click="handleLogout">Logout</p>
</template>