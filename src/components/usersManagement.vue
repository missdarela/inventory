<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';
import { useAuthStore } from '../authStore';
import { ElMessage, ElMessageBox } from 'element-plus';

const users = ref([]);
const loading = ref(false);
const authStore = useAuthStore();

// Fetch all users on component mount
onMounted(async () => {
  await fetchUsers();
});

// Fetch all users from the database
async function fetchUsers() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    users.value = data;
  } catch (error) {
    console.error('Error fetching users:', error.message);
    ElMessage.error('Failed to load users');
  } finally {
    loading.value = false;
  }
}

// Delete a user
async function deleteUser(userId) {
  // Don't allow deleting yourself
  if (userId === authStore.user.id) {
    ElMessage.warning('You cannot delete your own account');
    return;
  }

  // Confirm deletion
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this user? This action cannot be undone.',
      'Warning',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );

    loading.value = true;

    // Use the authStore method to delete the user
    await authStore.deleteUser(userId);
    
    ElMessage.success('User deleted successfully');
    
    // Refresh the users list
    await fetchUsers();
  } catch (error) {
    if (error === 'cancel') return; // User cancelled the confirmation dialog
    console.error('Error deleting user:', error.message);
    ElMessage.error('Failed to delete user: ' + (error.message || 'Unknown error'));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">User Management</h1>
    
    <div class="mb-6 flex justify-between items-center">
      <p class="text-gray-600">Manage system users (CEO access only)</p>
      <router-link 
        to="/" 
        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
      >
        Add New User
      </router-link>
    </div>

    <el-card class="w-full" v-loading="loading">
      <div v-if="users.length === 0 && !loading" class="text-center py-8">
        <p class="text-gray-500">No users found</p>
      </div>

      <el-table v-else :data="users" style="width: 100%">
        <el-table-column prop="firstname" label="First Name" />
        <el-table-column prop="lastname" label="Last Name" />
        <el-table-column prop="username" label="Username" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role" label="Role">
          <template #default="{row}">
            <el-tag 
              :type="row.role === 'CEO' ? 'danger' : 'success'"
              effect="dark"
            >
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120">
          <template #default="{row}">
            <el-button 
              type="danger" 
              size="small" 
              @click="deleteUser(row.id)"
              :disabled="row.id === authStore.user?.id || row.role === 'CEO'"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>