<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header Section -->
      <div class="mb-8">
        <button 
          @click="goBack" 
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200 mb-6"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Dumps
        </button>
        
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
          <div class="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{{ dumpName }}</h1>
              <p class="text-base sm:text-lg text-gray-600 mt-1">Inventory Details & History</p>
              <div class="flex flex-col sm:flex-row sm:items-center mt-2 space-y-2 sm:space-y-0 sm:space-x-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                  Active
                </span>
                <span class="text-sm text-gray-500">
                  {{ dumpData.length }} {{ dumpData.length === 1 ? 'record' : 'records' }} found
                </span>
                <span v-if="loading" class="flex items-center text-sm text-blue-600">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-1"></div>
                  Loading...
                </span>
                <button 
                  @click="exportDumpData" 
                  class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export to CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Loading dump data...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && dumpData.length === 0" class="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
          <p class="text-gray-600">No inventory records found for {{ dumpName }}. Start by adding some inventory data.</p>
        </div>
      </div>

      <!-- Summary Statistics -->
      <div v-if="!loading && dumpData.length > 0" class="mb-8">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">Summary Statistics</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Total Amount Supplied -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-600">Total Amount Supplied</p>
                  <p class="text-2xl font-bold text-blue-900">{{ formatLargeNumber(totalAmountSupplied) }}</p>
                </div>
              </div>
            </div>
            
            <!-- Total Amount Remaining -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-green-600">Amount Remaining</p>
                  <p class="text-2xl font-bold text-green-900">{{ formatLargeNumber(totalAmountRemaining) }}</p>
                </div>
              </div>
            </div>
            
            <!-- Total Quantity Supplied -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-purple-600">Quantity Supplied</p>
                  <p class="text-2xl font-bold text-purple-900">{{ formatNumber(totalQuantitySupplied) }}</p>
                </div>
              </div>
            </div>
            
            <!-- Total Quantity Remaining -->
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-orange-600">Quantity Remaining</p>
                  <p class="text-2xl font-bold text-orange-900">{{ formatNumber(totalQuantityRemaining) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Cards -->
      <div v-if="!loading && dumpData.length > 0" class="space-y-6">
        <div 
          v-for="(item, index) in dumpData" 
          :key="item.id || index"
          class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
        >
          <div class="p-6">
            <!-- Card Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Record #{{ index + 1 }}</h3>
                  <p class="text-sm text-gray-500">{{ item.date || 'No date specified' }}</p>
                </div>
              </div>
            </div>

            <!-- Card Content Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <!-- Financial Information -->
              <div class="space-y-4">
                <h4 class="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">Financial</h4>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Deposit</span>
                    <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(item.deposit) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Rate</span>
                    <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(item.rate) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Total Amount Supplied</span>
                    <span class="text-sm font-semibold text-blue-600">{{ formatLargeNumber(item.total_amount_supplied) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Amount Remaining</span>
                    <span class="text-sm font-semibold text-green-600">{{ formatLargeNumber(item.amount_remaining) }}</span>
                  </div>
                </div>
              </div>

              <!-- Quantity Information -->
              <div class="space-y-4">
                <h4 class="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">Quantities</h4>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Quantity Deposited</span>
                    <span class="text-sm font-semibold text-gray-900">{{ formatNumber(item.quantity_deposited) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Quantity Supplied</span>
                    <span class="text-sm font-semibold text-blue-600">{{ formatNumber(item.quantity_supplied) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Quantity Remaining</span>
                    <span class="text-sm font-semibold text-green-600">{{ formatNumber(item.quantity_remaining) }}</span>
                  </div>
                </div>
              </div>

              <!-- Progress Visualization -->
              <div class="space-y-4">
                <h4 class="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">Progress</h4>
                
                <div class="space-y-4">
                  <!-- Quantity Progress -->
                  <div>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-gray-600">Quantity Used</span>
                      <span class="text-gray-900">{{ getUsagePercentage(item.quantity_deposited, item.quantity_remaining) }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        :style="{ width: getUsagePercentage(item.quantity_deposited, item.quantity_remaining) + '%' }"
                      ></div>
                    </div>
                  </div>
          
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryDumpStore } from '../stores/inventoryDumpStore';
import { ElNotification } from 'element-plus';

const route = useRoute();
const router = useRouter();
const inventoryDumpStore = useInventoryDumpStore();

const dumpData = ref([]);
const loading = ref(false);

// Get dumps from localStorage or default data (same as inventoryDump.vue)
const getDumps = () => {
  const savedDumps = localStorage.getItem('inventoryDumps');
  if (savedDumps) {
    return JSON.parse(savedDumps);
  }
  
  // Default dumps - fallback if no localStorage data
  return [
    { id: 1, name: 'Heartland' },
    { id: 2, name: 'Wireline' },
    { id: 3, name: 'Ada' },
    { id: 4, name: 'Oga Remy' },
    { id: 5, name: 'Pastor (Remy)' },
    { id: 6, name: 'Ebuka' },
    { id: 7, name: 'More Grace' },
    { id: 8, name: 'Ndony' },
    { id: 9, name: 'Papa' },
    { id: 10, name: 'Nkechi' },
    { id: 11, name: 'Rugged Pastor' },
    { id: 12, name: 'Madam Iyawo' },
    { id: 13, name: 'Azuke' },
    { id: 14, name: 'Chigozie' },
    { id: 15, name: 'Francis FM' },
    { id: 16, name: 'Igwe' },
    { id: 17, name: 'Victor Amadi' },
    { id: 18, name: 'Madam Joy' },
    { id: 19, name: 'CAC' }
  ];
};

const dumps = ref(getDumps());

// Get dump name from route parameter
const dumpName = computed(() => {
  const dumpId = parseInt(route.params.id);
  const dump = dumps.value.find(d => d.id === dumpId);
  return dump ? dump.name : 'Unknown Dump';
});

// Fetch dump data when component mounts
const fetchDumpData = async () => {
  if (!dumpName.value || dumpName.value === 'Unknown Dump') return;
  
  loading.value = true;
  try {
    const data = await inventoryDumpStore.fetchDumpsByName(dumpName.value);
    dumpData.value = data || [];
    console.log(`Loaded ${data?.length || 0} records for ${dumpName.value}`);
  } catch (error) {
    console.error('Failed to fetch dump data:', error);
    dumpData.value = [];
  } finally {
    loading.value = false;
  }
};

// Go back to inventory dump list
const goBack = () => {
  router.push('/dashboard/dump/inventoryDump');
};

// Export dump data to CSV
const exportDumpData = () => {
  try {
    // Create CSV content with summary header
    let csvContent = `${dumpName.value} Inventory Export Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Records: ${dumpData.value.length}\n`;
    csvContent += `Total Amount Supplied: ${formatLargeNumber(totalAmountSupplied.value)}\n`;
    csvContent += `Total Amount Remaining: ${formatLargeNumber(totalAmountRemaining.value)}\n`;
    csvContent += `Total Quantity Supplied: ${formatNumber(totalQuantitySupplied.value)}\n`;
    csvContent += `Total Quantity Remaining: ${formatNumber(totalQuantityRemaining.value)}\n\n`;
    
    // Add inventory details header
    csvContent += 'Date,Deposit,Rate,Quantity Deposited,Total Amount Supplied,Quantity Supplied,Amount Remaining,Quantity Remaining,Status\n';
    
    // Add inventory data
    dumpData.value.forEach(item => {
      csvContent += `"${item.date || ''}","${item.deposit || ''}","${item.rate || ''}",${item.quantity_deposited || 0},"${item.total_amount_supplied || ''}",${item.quantity_supplied || 0},"${item.amount_remaining || ''}",${item.quantity_remaining || 0},"${item.status || ''}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dumpName.value}_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Show success notification
    ElNotification({
      title: 'Export Successful',
      message: `${dumpName.value} inventory data exported successfully!`,
      type: 'success',
      duration: 3000
    });
  } catch (error) {
    console.error('Export error:', error);
    ElNotification({
      title: 'Export Failed',
      message: 'Failed to export inventory data',
      type: 'error',
      duration: 3000
    });
  }
};

// Format currency values
const formatCurrency = (value) => {
  if (!value) return '';
  // Remove any existing currency symbols and formatting
  const numericValue = value.toString().replace(/[^\d.-]/g, '');
  if (!numericValue || isNaN(numericValue)) return value;
  
  // Format as Nigerian Naira
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(parseFloat(numericValue));
};

// Format large numbers with K, M, B notation (3 significant figures)
const formatLargeNumber = (value) => {
  if (!value) return '₦0';
  const numericValue = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
  if (!numericValue || isNaN(numericValue)) return '₦0';
  
  const absValue = Math.abs(numericValue);
  const sign = numericValue < 0 ? '-' : '';
  
  if (absValue >= 1000000000) {
    // Billions
    const billions = absValue / 1000000000;
    return `${sign}₦${billions.toPrecision(3)}B`;
  } else if (absValue >= 1000000) {
    // Millions
    const millions = absValue / 1000000;
    return `${sign}₦${millions.toPrecision(3)}M`;
  } else if (absValue >= 1000) {
    // Thousands
    const thousands = absValue / 1000;
    return `${sign}₦${thousands.toPrecision(3)}K`;
  } else {
    // Less than 1000, show full number with Naira symbol
    return `${sign}₦${absValue.toFixed(0)}`;
  }
};

// Format regular numbers with commas
const formatNumber = (value) => {
  if (!value) return '';
  const numericValue = value.toString().replace(/[^\d.-]/g, '');
  if (!numericValue || isNaN(numericValue)) return value;
  
  return new Intl.NumberFormat('en-US').format(parseFloat(numericValue));
};

// Calculate usage percentage
const getUsagePercentage = (deposited, remaining) => {
  if (!deposited || !remaining) return 0;
  const depositedNum = parseFloat(deposited.toString().replace(/[^\d.-]/g, '')) || 0;
  const remainingNum = parseFloat(remaining.toString().replace(/[^\d.-]/g, '')) || 0;
  
  if (depositedNum === 0) return 0;
  const used = depositedNum - remainingNum;
  return Math.round((used / depositedNum) * 100);
};

// Computed properties for summary statistics
const totalAmountSupplied = computed(() => {
  return dumpData.value.reduce((sum, item) => {
    const amount = parseFloat(item.total_amount_supplied) || 0;
    return sum + amount;
  }, 0);
});

const totalAmountRemaining = computed(() => {
  return dumpData.value.reduce((sum, item) => {
    const amount = parseFloat(item.amount_remaining) || 0;
    return sum + amount;
  }, 0);
});

const totalQuantitySupplied = computed(() => {
  return dumpData.value.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity_supplied) || 0;
    return sum + quantity;
  }, 0);
});

const totalQuantityRemaining = computed(() => {
  return dumpData.value.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity_remaining) || 0;
    return sum + quantity;
  }, 0);
});

const totalDeposit = computed(() => {
  return dumpData.value.reduce((sum, item) => {
    const deposit = parseFloat(item.deposit) || 0;
    return sum + deposit;
  }, 0);
});

const overallProgress = computed(() => {
  if (totalAmountSupplied.value === 0) return 0;
  const used = totalAmountSupplied.value - totalAmountRemaining.value;
  return Math.round((used / totalAmountSupplied.value) * 100);
});

onMounted(() => {
  fetchDumpData();
});
</script>