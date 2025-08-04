<template class="font-mont">
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center mb-6">
        <button @click="goBack" class="flex items-center text-blue-600 hover:text-blue-800">
          <span class="mr-2">←</span> Back to Reports
        </button>
      </div>
      <h1 class="text-3xl text-blue-700 font-bold mb-6">Tracking Reports</h1>
      
      <div v-if="trackingDumpStore.loading" class="text-center py-8">
        Loading reports...
      </div>
      
      <div v-else-if="trackingReports.length === 0" class="text-center py-8 text-gray-500">
        <p class="mb-4">No reports have been generated yet.</p>
        <button 
          @click="generateReport"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate First Report
        </button>
      </div>
      
      <div v-else class="space-y-4">
        <div class="mb-4 flex justify-end">
          <button 
            @click="generateReport"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate New Report
          </button>
        </div>
        
        <div v-for="date in sortedDates" :key="date" class="border rounded-lg overflow-hidden">
          <button 
            @click="toggleDate(date)"
            class="w-full px-6 py-4 bg-blue-50 hover:bg-blue-100 flex justify-between items-center border-b"
          >
            <h2 class="text-lg font-semibold text-blue-800">{{ date }}</h2>
            <span class="text-blue-700">
              {{ groupedReports[date].length }} report(s)
              {{ expandedDates.has(date) ? '▼' : '▶' }}
            </span>
          </button>
          
          <div v-if="expandedDates.has(date)" class="divide-y">
            <div 
              v-for="report in groupedReports[date]" 
              :key="report.id"
              class="bg-white p-6"
            >
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-md font-medium text-blue-800">
                  Generated at {{ new Date(report.created_at).toLocaleTimeString() }}
                </h3>
              </div>
              <div class="text-sm text-gray-700 bg-gray-50 p-4 rounded" v-html="report.content"></div>
              <div class="mt-4 flex justify-end">
                <button 
                  @click="printReport(report)"
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <span class="mr-2">🖨️</span> Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTrackingDumpStore } from '../stores/trackingDump';
import { useRouter } from 'vue-router';
import { onMounted, computed, ref } from 'vue';

const trackingDumpStore = useTrackingDumpStore();
const router = useRouter();
const expandedDates = ref(new Set());

// Sample tracking reports data (similar to inventory reports)
const trackingReports = ref([
  {
    id: 1,
    created_at: '2024-01-15T10:30:00Z',
    content: `
      <h3>Weekly Tracking Summary</h3>
      <p><strong>Period:</strong> January 8-14, 2024</p>
      <p><strong>Total Deliveries:</strong> 45</p>
      <p><strong>Total Containers:</strong> 180</p>
      <p><strong>Active Dumps:</strong> 9</p>
      <p><strong>Unique Drivers:</strong> 12</p>
      <hr>
      <h4>Top Performing Dumps:</h4>
      <ul>
        <li>Osazz - 8 deliveries, 32 containers</li>
        <li>CAC - 7 deliveries, 28 containers</li>
        <li>Igwe - 6 deliveries, 24 containers</li>
      </ul>
    `
  },
  {
    id: 2,
    created_at: '2024-01-01T09:15:00Z',
    content: `
      <h3>Monthly Tracking Report</h3>
      <p><strong>Period:</strong> December 2023</p>
      <p><strong>Total Deliveries:</strong> 156</p>
      <p><strong>Total Containers:</strong> 624</p>
      <p><strong>Active Dumps:</strong> 9</p>
      <p><strong>Unique Drivers:</strong> 18</p>
      <hr>
      <h4>Monthly Statistics:</h4>
      <ul>
        <li>Average deliveries per day: 5.2</li>
        <li>Average containers per delivery: 4.0</li>
        <li>Most active driver: John Smith (23 deliveries)</li>
      </ul>
    `
  },
  {
    id: 3,
    created_at: '2024-01-01T14:45:00Z',
    content: `
      <h3>End of Day Summary</h3>
      <p><strong>Date:</strong> January 1, 2024</p>
      <p><strong>Daily Deliveries:</strong> 8</p>
      <p><strong>Daily Containers:</strong> 32</p>
      <p><strong>Active Drivers:</strong> 5</p>
      <hr>
      <h4>Delivery Breakdown by Dump:</h4>
      <ul>
        <li>Osazz - 2 deliveries</li>
        <li>CAC - 2 deliveries</li>
        <li>More Grace - 1 delivery</li>
        <li>Papa - 2 deliveries</li>
        <li>Victor - 1 delivery</li>
      </ul>
    `
  }
]);

onMounted(async () => {
  await trackingDumpStore.initialize();
});

const goBack = () => {
  router.push('/dashboard/report');
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateKey(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function printReport(report) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  // Add content and styling to the new window
  printWindow.document.write(`
    <html>
      <head>
        <title>Tracking Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
          }
          h1, h2, h3 { color: #2563eb; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
          .content { margin: 20px 0; }
          ul { margin: 10px 0; padding-left: 20px; }
          hr { margin: 15px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tracking Report</h1>
          <p>Generated on: ${formatDate(report.created_at)}</p>
        </div>
        <div class="content">
          ${report.content}
        </div>
      </body>
    </html>
  `);
  
  // Close the document and print
  printWindow.document.close();
  printWindow.print();
}

// Group reports by date
const groupedReports = computed(() => {
  const groups = {};
  if (trackingReports.value && trackingReports.value.length > 0) {
    trackingReports.value.forEach(report => {
      const dateKey = formatDateKey(report.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(report);
    });
  }
  return groups;
});

function toggleDate(date) {
  if (expandedDates.value.has(date)) {
    expandedDates.value.delete(date);
  } else {
    expandedDates.value.add(date);
  }
}

const sortedDates = computed(() => {
  return Object.keys(groupedReports.value).sort((a, b) => 
    new Date(b) - new Date(a)
  );
});

// Generate new report function
const generateReport = async () => {
  try {
    await trackingDumpStore.fetchAllDeliveries();
    
    const newReport = {
      id: trackingReports.value.length + 1,
      created_at: new Date().toISOString(),
      content: `
        <h3>Generated Tracking Report</h3>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Deliveries:</strong> ${trackingDumpStore.totalDeliveries}</p>
        <p><strong>Total Containers:</strong> ${trackingDumpStore.totalContainers}</p>
        <p><strong>Total Dumps:</strong> ${trackingDumpStore.trackingDumps?.length || 0}</p>
        <p><strong>Unique Drivers:</strong> ${trackingDumpStore.uniqueDriversCount}</p>
        <hr>
        <h4>Active Dumps:</h4>
        <ul>
          ${trackingDumpStore.trackingDumps?.map(dump => 
            `<li>${dump.name} - ${dump.status}</li>`
          ).join('') || '<li>No dumps available</li>'}
        </ul>
      `
    };
    
    trackingReports.value.unshift(newReport);
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
</script>