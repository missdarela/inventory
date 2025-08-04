<script setup>
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { supabase } from '../supabase' // adjust path to your Supabase client
  import { useRouter } from 'vue-router'
  
  const form = ref({ password: '' })
  const passwordForm = ref()
  const isLoading = ref(false)
  const router = useRouter()
  
  const rules = {
    password: [
      { required: true, message: 'Password is required', trigger: 'blur' },
      { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
    ]
  }
  
  const updatePassword = () => {
    passwordForm.value.validate(async (valid) => {
      if (valid) {
        isLoading.value = true
        const { error } = await supabase.auth.updateUser({ password: form.value.password })
  
        if (error) {
          ElMessage.error(error.message)
        } else {
          ElMessage.success('Password updated successfully')
          router.push('/login')
        }
  
        isLoading.value = false
      }
    })
  };

  </script>
<template>
    <div class="max-w-md mt-44 mx-auto p-6 bg-white rounded shadow">
      <h2 class="text-xl font-semibold mb-4">Set New Password</h2>
      <el-form :model="form" :rules="rules" ref="passwordForm">
        <el-form-item label="New Password" prop="password">
          <el-input type="password" v-model="form.password" placeholder="Enter your new password" />
        </el-form-item>
        <el-form-item>
          <el-button
            :loading="isLoading"
            @click="updatePassword"
            show-password
            class="w-full  !bg-[#247a4d] hover:!bg-green-800 !text-white"
          >
            Update Password
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </template>
  
  
  