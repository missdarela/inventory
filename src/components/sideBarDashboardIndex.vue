<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { supabase } from '../supabase';
  import { useInventoryDumpStore } from '../stores/inventoryDumpStore';
  import { useReportStore } from '../stores/reportStore';
  import totalItemsIcon from '../assets/icons/totalItemsIcon.vue';
  import lowStorageIcon from '../assets/icons/lowStorageIcon.vue';
  import outOfStockIcon from '../assets/icons/outOfStockIcon.vue';
  import totalRevenueIcon from '../assets/icons/totalRevenueIcon.vue';

  const inventoryStore = useInventoryDumpStore();
  const reportStore = useReportStore();
  
  const dashboardData = ref({
    totalItems: 0,
    totalRevenue: 0,
    stockDelivered: 0,
    supplyBacklog: 0,
    loading: true
  });

  // Calculate dashboard metrics
  const calculateDashboardData = async () => {
    try {
      dashboardData.value.loading = true;
      
      // Get all inventory data to calculate total items
      let totalRecords = 0;
      let totalDeposits = 0;
      let totalRemaining = 0;
      
      // Fetch data from all dumps
      const { data: allInventoryData, error: inventoryError } = await supabase
        .from('dump_inventory')
        .select('*');
      
      if (!inventoryError && allInventoryData) {
        totalRecords = allInventoryData.length;
        totalDeposits = allInventoryData.reduce((sum, item) => sum + (parseFloat(item.deposit) || 0), 0);
        totalRemaining = allInventoryData.reduce((sum, item) => sum + (parseFloat(item.amount_remaining) || 0), 0);
      }
      
      // Get total containers delivered from tracking data (all time)
      const { data: trackingData, error: trackingError } = await supabase
        .from('table_batch_data')
        .select('containers_delivered')
        .order('date', { ascending: false });
      
      const totalContainersDelivered = trackingData?.reduce((sum, item) => sum + (parseInt(item.containers_delivered) || 0), 0) || 0;
      
      dashboardData.value = {
        totalItems: totalRecords,
        totalRevenue: totalDeposits,
        stockDelivered: totalContainersDelivered,
        supplyBacklog: totalRemaining,
        loading: false
      };
      
    } catch (error) {
      console.error('Failed to calculate dashboard data:', error);
      dashboardData.value.loading = false;
    }
  };

  // Format currency with compact notation (K, M, B)
  const formatCurrency = (amount) => {
    if (amount >= 1000000000) {
      return `₦${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}K`;
    } else {
      return `₦${amount}`;
    }
  };

  // Format number with compact notation (K, M, B)
  const formatCompactNumber = (num) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };

  // Format regular numbers with commas (for items count)
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  onMounted(async () => {
    await calculateDashboardData();
  });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header Section -->
      <div class="mb-8">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
              <p class="mt-2 text-sm text-gray-600">Monitor your inventory performance and key metrics</p>
            </div>
            
            <div class="mt-4 sm:mt-0">
              <div class="flex items-center space-x-2 text-sm text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Last updated: {{ new Date().toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <!-- Total Items -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <totalItemsIcon class="text-white w-5 h-5"/>
            </div>
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-600 pt-2">Total Items</p>
              <p class="text-2xl font-bold text-green-600 mt-2">{{ formatNumber(dashboardData.totalItems) }}</p>
              <p class="text-xs text-gray-500 mt-1">+12% from last month</p>
            </div>
           
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" style="width: 75%"></div>
            </div>
          </div>
        </div>

        <!-- Total Revenue -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <totalRevenueIcon class="text-white w-5 h-5"/>
            </div>
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-600 pt-2">Total Revenue</p>
              <p class="text-xl font-bold text-blue-600 mt-2">{{ formatCurrency(dashboardData.totalRevenue) }}</p>
              <p class="text-xs text-gray-500 mt-1">+8% from last month</p>
            </div>
            
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500" style="width: 60%"></div>
            </div>
          </div>
        </div>

        <!-- Stock Delivered -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <lowStorageIcon class="text-white w-5 h-5"/>
            </div>
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-600 pt-2">Stock Delivered</p>
              <p class="text-2xl font-bold text-yellow-600 mt-2">{{ formatNumber(dashboardData.stockDelivered) }}</p>
              <p class="text-xs text-gray-500 mt-1">Containers delivered</p>
            </div>
           
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500" style="width: 40%"></div>
            </div>
          </div>
        </div>

        <!-- Supply Backlog -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <outOfStockIcon class="text-white w-5 h-5"/>
            </div>
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-600 pt-2">Supply Backlog</p>
              <p class="text-xl font-bold text-red-600 mt-2">{{ formatCurrency(dashboardData.supplyBacklog) }}</p>
              <p class="text-xs text-gray-500 mt-1">Pending items</p>
            </div>
           
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500" style="width: 25%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Table -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div class="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Recent Inventory Activity</h2>
          <p class="text-sm text-gray-600">Latest inventory transactions and updates</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dump Name</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deposit</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Rate</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Quantity</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Total Amount</th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr class="hover:bg-gray-50 transition-colors duration-200">
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">1</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">Heartland</div>
                  <div class="text-sm text-gray-500 sm:hidden">24-12-2024</div>
                </td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦20,000</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">01-01-2025</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">₦80,000</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">230</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">₦11,680,000</td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    In Stock
                  </span>
                </td>
              </tr>
              <!-- Add more rows as needed -->
            </tbody>
          </table>
        </div>
        
        <div class="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p class="text-xs text-gray-500">Showing recent inventory activity. Visit the Inventory Table for complete records.</p>
        </div>
      </div>
    </div>
  </div>
</template>