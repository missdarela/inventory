<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { supabase } from '../supabase' // adjust path to your Supabase client

const form = ref({ email: '' })
const isLoading = ref(false)
const resetForm = ref()

const rules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Invalid email address', trigger: 'blur' }
  ]
}

const handleReset = () => {
  resetForm.value.validate(async (valid) => {
    if (valid) {
      isLoading.value = true
      const { error } = await supabase.auth.resetPasswordForEmail(form.value.email, {
        redirectTo: 'http://localhost:5173/update-password' // Change to your real app URL
      })

      if (error) {
        ElMessage.error(error.message)
      } else {
        ElMessage.success('Check your email for the reset link')
      }

      isLoading.value = false
    }
  })
};
</script>

<template>
    <div class="max-w-md mt-28 mx-auto p-6 bg-white rounded shadow">
      <img src="/src/assets/images/logoBg.png" alt="" class="w-36 !rounded-s-2xl">
      <h2 class="text-xl font-semibold mb-4">Reset Password</h2>
      <el-form :model="form" :rules="rules" ref="resetForm">
        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" placeholder="johndoe@gmail.com" />
        </el-form-item>
        <el-form-item>
          <el-button
            :loading="isLoading"
            @click="handleReset"
            class="w-full  !bg-[#247a4d] hover:!bg-green-800 !text-white"
          >
            Send Reset Link
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </template>
  
 
  