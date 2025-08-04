<script setup>
import { ref,reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { supabase } from "../supabase.js"; // Import supabase client

const router = useRouter();
const formValidate = ref()
const isLoading = ref(false); // Loading state for the button
const form = reactive({
  email: "",
  password: "",
});
const rules = {
  email: [
    { required: true, message: "Email field cannot empty", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Password field cannot be empty", trigger: "blur" },
  ],
};

// const login = async () => {
//   if (!navigator.onLine) {
//     ElMessage.error("No internet connection. Please check your network.");
//     return;
//   }
// }

const handleLogin = () => {
  formValidate.value.validate(async (valid) => {
    if (valid) {
      isLoading.value = true; // Start loading
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) {
          ElMessage.error(error.message || "Login failed");
        } else {
          ElMessage.success("Login successful!");
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Login error:", err);
        ElMessage.error("Something went wrong. Please try again.");
      }finally {
      isLoading.value = false; // Stop loading
    }
    } else {
      ElMessage.error("Invalid email or password!");
      console.error("Validation failed:", formValidate.value);
    }
  });
};

</script>

<template>
 <div class="relative flex justify-center items-center h-screen bg">
    <div class="absolute inset-0 bg-black/55"></div>
    <div class="relative bg-white/85 text-black  p-8 py-5 rounded-lg shadow-lg w-96">
      <div class="w-38">
      <img src="/src/assets/images/logoBg.png" alt="" class="w-32 mx-auto">

      </div>
      <h2 class="text-2xl font-bolder text-center mb-6 text-black">Welcome Back</h2>

      <el-form 
      :model="form" 
      :rules="rules"
      ref="formValidate"
      label-width="80px"
      class="text-white"
      @submit.prevent="handleLogin"
      label-position="top"
      
      >
        <el-form-item label="Email" 
        label-style="color: #10b981!important; font-weight: bold;"
        prop="email"
        >
          <el-input 
          v-model="form.email" 
          placeholder="johndoe@gmail.com"
          type="email"

          ></el-input>
        </el-form-item>

        <el-form-item label="Password"
        prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            placeholder="********"
            show-password
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-button 
          @click="handleLogin" 
          class="w-full !bg-[#247a4d] hover:!bg-green-800 !text-white"
          :loading="isLoading"
          >
            Login
          </el-button>
        </el-form-item>
        <router-link to="/forgot-password" class="text-blue-700 italic text-sm hover:underline">
          Can't Remember Password?</router-link>

      </el-form>
    </div>
  </div>
</template>

<style scoped>
.bg{
    background-image: url("/src/assets/images/loginBg.jpg");
    background-size: cover;
    background-position: center;
    /* background-color:white ; */
}

</style>