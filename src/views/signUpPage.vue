<script setup>
import { reactive, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from '../authStore';
import { supabase } from '../supabase';

const router = useRouter();
const form = ref();
const auth = useAuthStore();

const signupForm = reactive({
  firstname: "",
  lastname: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "user", // Default role is user
});

// Check if this is the first user (for initial CEO setup)
const isFirstUser = ref(false);

// Check if any users exist in the database
onMounted(async () => {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count === 0) {
      // If no users exist, this is the first user (CEO)
      isFirstUser.value = true;
      signupForm.role = "CEO";
    }
  } catch (error) {
    console.error('Error checking users:', error);
  }
});

const rules = {
  firstname: [
    { required: true, message: "Firstname is required", trigger: "blur" },
  ],
  username: [
    { required: true, message: "Username is required", trigger: "blur" }
  ],
  email: [
    { required: true, message: "Email is required", trigger: "blur" },
    { type: "email", message: "Please enter a valid email", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Password is required", trigger: "blur" },
    {
      min: 6,
      max: 20,
      message: "Passwords must be between 6 and 20 characters",
      trigger: "blur",
    },
  ],
  confirmPassword: [
    {
      required: true,
      message: "Please confirm your password",
      trigger: "blur",
    },
    {
      validator: (rule, value, callback) => {
        if (value !== signupForm.password) {
          callback(new Error("Passwords do not match"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

const submitForm = async () => {
  form.value.validate(async (valid) => {
    if (valid) {
      try {
        await auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
          firstname: signupForm.firstname,
          lastname: signupForm.lastname,
          username: signupForm.username,
          role: signupForm.role, // Pass the role to signUp method
        });
        ElMessage.success("Sign-up successful! Please login");
        router.push("/login");
      } catch (error) {
        ElMessage.error(auth.error || "An error occurred during sign-up.");
      }
    } else {
      ElMessage.error("Please fix the errors above");
    }
  });
};

</script>

<template class="bg-gray-400">
  <main
    class="w-full min-h-screen bg-white/50"
  >
    <div class="">
      <img src="/src/assets/images/logoBg.png" alt="" class="w-36 !rounded-s-2xl">
    </div>
    <div class="md:flex items-center justify-center">
      <el-card
        class="!w-[435px] bg-gradient-to-r from-[#0b2c24] to-[#247a4d] !border-none 
        max-w-lg border-e-0 shadow-xl rounded-xl"
      >
        <h2 class="text-2xl font-bold text-white mb-6 text-center">
          Create an Account
        </h2>

        <el-form
          :model="signupForm"
          :rules="rules"
          ref="form"
          label-position="top"
          class="!text-white"
          @submit.prevent="submitForm"
        >
          <el-form-item
            class="!text-red-500"
            label="Firstname"
            prop="firstname"
            :label-style="{ color: 'red' }"
          >
            <el-input
              type="text"
              v-model="signupForm.firstname"
              placeholder="Firstname"
            />
          </el-form-item>

          <el-form-item label="Lastname" prop="lastname">
            <el-input
              type="text"
              v-model="signupForm.lastname"
              placeholder="lastname"
            />
          </el-form-item>

          <el-form-item label="Email Address" prop="email">
            <el-input
              type="email"
              v-model="signupForm.email"
              placeholder="Email Address"
            />
            <div class="text-xs text-white/80 mt-1" v-if="!isFirstUser">
              <i class="el-icon-info"></i>
              Note: Emails containing 'primepower200' will automatically be granted CEO privileges.
            </div>
          </el-form-item>

          <el-form-item label="Username" prop="username">
            <el-input
              type="text"
              v-model="signupForm.username"
              placeholder="Username"
            />
          </el-form-item>

          <el-form-item label="Password" prop="password">
            <el-input
              v-model="signupForm.password"
              type="password"
              placeholder="Password"
              show-password
            />
          </el-form-item>

          <el-form-item label="Confirm Password" prop="confirmPassword">
            <el-input
              v-model="signupForm.confirmPassword"
              type="password"
              placeholder="Confirm Password"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              class="!bg-green-900 !text-white hover:!bg-white
               hover:!text-green-900 hover:transition w-full"
              @click="submitForm"
              :loading="auth.loading"
            >
              Sign Up
            </el-button>
          </el-form-item>
   
        </el-form>

        <p class="text-sm text-center mt-2 text-white">
          Already have an account?
          <router-link to="/login" class="text-blue-700 underline">Login here</router-link>
        </p>
      </el-card>
    </div>
  </main>
</template>



<style scoped>
.el-card {
  border-radius: 1rem;
}
/* in your main.css or tailwind.css */
.el-form-item__label {
  @apply text-green-700 font-medium;
}
</style>
