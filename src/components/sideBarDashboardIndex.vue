<script setup>
  import { ref, onMounted, computed, onUnmounted } from 'vue';
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

  const recentActivity = ref([]);
  const activityLoading = ref(false);
  let refreshInterval = null;

  // Calculate dashboard metrics
  const calculateDashboardData = async () => {
    try {
      dashboardData.value.loading = true;
      
      // Get current month start and end dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Format dates for database query
      const monthStartStr = currentMonthStart.toISOString().split('T')[0];
      const monthEndStr = currentMonthEnd.toISOString().split('T')[0];
      
      // Get all inventory data
      const { data: allInventoryData, error: inventoryError } = await supabase
        .from('dump_inventory')
        .select('*');
      
      let quantitiesDepositedThisMonth = 0;
      let quantityRemainingThisMonth = 0;
      let totalSuppliedAmountCAC = 0;
      
      if (!inventoryError && allInventoryData) {
        // Filter data for current month
        const thisMonthData = allInventoryData.filter(item => {
          const itemDate = new Date(item.date || item.created_at);
          const isInCurrentMonth = itemDate >= currentMonthStart && itemDate <= currentMonthEnd;
          return isInCurrentMonth;
        });
        
        // Calculate quantities deposited (sum of all quantity_deposited from dump_inventory table)
        quantitiesDepositedThisMonth = allInventoryData.reduce((sum, item) => 
          sum + (parseFloat(item.quantity_deposited) || 0), 0
        );
        
        // Calculate quantity remaining for current month only
        // Since quantity_remaining is mostly null, calculate as quantity_supplied - quantity_deposited
        quantityRemainingThisMonth = thisMonthData.reduce((sum, item) => {
          const supplied = parseFloat(item.quantity_supplied) || 0;
          const deposited = parseFloat(item.quantity_deposited) || 0;
          const calculated_remaining = Math.max(0, supplied - deposited); // Ensure non-negative
          return sum + calculated_remaining;
        }, 0);
        
        // Calculate CAC total (sum of total_amount_supplied for current month with CAC status only)
        const cacTotalCurrentMonth = thisMonthData
          .filter(item => item.status && item.status.toLowerCase().includes('cac'))
          .reduce((sum, item) => {
            const totalSupplied = parseFloat(item.total_amount_supplied) || 0;
            return sum + totalSupplied;
          }, 0);
        
        totalSuppliedAmountCAC = cacTotalCurrentMonth;
        
        // Get containers delivered from tracking data (sum of all containers_delivered)
        let totalContainersDelivered = 0;
        
        try {
          // First, let's try to get all columns to see what's available
          const { data: trackingData, error: trackingError } = await supabase
            .from('tracking_batch_data')
            .select('*')
            .limit(5);
          
          if (trackingError) {
            console.error('Error fetching tracking data:', trackingError);
          } else if (trackingData && trackingData.length > 0) {
            // Now get all data and sum containers_delivered
            const { data: allTrackingData, error: allDataError } = await supabase
              .from('tracking_batch_data')
              .select('containers_delivered');
            
            if (!allDataError && allTrackingData) {
              totalContainersDelivered = allTrackingData.reduce((sum, item) => 
                sum + (parseInt(item.containers_delivered) || 0), 0
              );
             
            } else {
              console.error('Error fetching all tracking data:', allDataError);
            }
          } else {
            console.log('No tracking data found in tracking_batch_data table');
          }
        } catch (err) {
          console.error('Exception while fetching tracking data:', err);
          totalContainersDelivered = 0;
        }
        
        dashboardData.value = {
          totalItems: quantitiesDepositedThisMonth,
          totalRevenue: totalContainersDelivered,
          stockDelivered: quantityRemainingThisMonth,
          supplyBacklog: totalSuppliedAmountCAC,
          loading: false
        };
        
      } else {
        console.error('Error fetching inventory data:', inventoryError);
      }
    } catch (error) {
      console.error('Failed to calculate dashboard data:', error);
      dashboardData.value.loading = false;
    }
  };

  // Fetch recent activity from database
  const fetchRecentActivity = async () => {
    try {
      activityLoading.value = true;
      
      const { data, error } = await supabase
        .from('dump_inventory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1); // Show only the most recent activity
      
      if (!error && data) {
        recentActivity.value = data.map((item, index) => ({
          id: item.id,
          serialNumber: index + 1,
          dumpName: capitalizeName(item.dump_name) || 'No Name',
          deposit: item.deposit,
          date: item.date,
          rate: item.rate,
          quantity: item.quantity_deposited,
          totalAmount: (parseFloat(item.deposit) || 0) * (parseFloat(item.quantity_deposited) || 0),
          status: item.status || 'Active',
          createdAt: item.created_at
        }));
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      activityLoading.value = false;
    }
  };

  // Capitalize first letter of each word
  const capitalizeName = (name) => {
    if (!name) return '';
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Auto-refresh function
  const startAutoRefresh = () => {
    // Refresh every 30 seconds
    refreshInterval = setInterval(async () => {
      await Promise.all([
        calculateDashboardData(),
        fetchRecentActivity()
      ]);
    }, 30000);
  };

  // Stop auto-refresh
  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
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

  // Format currency for table display
  const formatTableCurrency = (amount) => {
    if (!amount) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('NGN', '₦');
  };

  // Format compact number (K, M, B)
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

  // Format regular numbers with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in stock':
        return 'bg-green-100 text-green-800';
      case 'low stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out of stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  onMounted(async () => {
    await Promise.all([
      calculateDashboardData(),
      fetchRecentActivity()
    ]);
    startAutoRefresh();
  });

  onUnmounted(() => {
    stopAutoRefresh();
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
              <p class="text-sm font-medium text-gray-600 pt-2">Number of Containers Paid for</p>
              <p class="text-2xl font-bold text-green-600 mt-2">{{ formatNumber(dashboardData.totalItems) }}</p>
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
              <p class="text-sm font-medium text-gray-600 pt-2">Number of Containers Carried</p>
              <p class="text-xl font-bold text-blue-600 mt-2">{{ formatNumber(dashboardData.totalRevenue) }}</p>
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
              <p class="text-sm font-medium text-gray-600 pt-2">Number of Containers Remaining</p>
              <p class="text-2xl font-bold text-yellow-600 mt-2">{{ formatNumber(dashboardData.stockDelivered) }}</p>
              <p class="text-xs text-gray-500 mt-1">Containers remaining</p>
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
              <p class="text-sm font-medium text-gray-600 pt-2">CAC</p>
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
              <template v-if="activityLoading">
                <tr class="hover:bg-gray-50 transition-colors duration-200">
                  <td colspan="8" class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading recent activity...
                    </div>
                  </td>
                </tr>
              </template>
              <template v-else-if="recentActivity.length > 0">
                <tr v-for="(activity, index) in recentActivity" :key="activity.id || index" class="hover:bg-gray-50 transition-colors duration-200">
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ activity.serialNumber }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ activity.dumpName || 'N/A' }}</div>
                    <div class="text-sm text-gray-500 sm:hidden">{{ formatDate(activity.date) || 'N/A' }}</div>
                  </td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatTableCurrency(activity.deposit) }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{{ formatDate(activity.date) || 'N/A' }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">{{ formatTableCurrency(activity.rate) }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">{{ activity.quantity || 0 }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">{{ formatTableCurrency(activity.totalAmount) }}</td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusClass(activity.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {{ activity.status || 'Active' }}
                    </span>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr class="hover:bg-gray-50 transition-colors duration-200">
                  <td colspan="8" class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    <div class="text-gray-500">
                      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                      </svg>
                      No recent inventory activity found.
                      <br>
                      <span class="text-xs">Add inventory items to see activity here.</span>
                    </div>
                  </td>
                </tr>
              </template>
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