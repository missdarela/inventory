<script setup>
import { useReportStore } from '../stores/reportStore';
import { useRouter } from 'vue-router';
import { onMounted, computed, ref } from 'vue';

const reportStore = useReportStore();
const router = useRouter();
const expandedDates = ref(new Set());

onMounted(() => {
  reportStore.fetchReports();
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
        <title>Inventory Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
          }
          .report-date {
            color: #444;
            margin-bottom: 20px;
          }
          ul {
            list-style-type: disc;
            margin-left: 20px;
          }
          li {
            margin: 8px 0;
          }
          @media print {
            body {
              padding: 0;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-date">
          Generated at: ${formatDate(report.created_at)}
        </div>
        ${report.content}
      </body>
    </html>
  `);
  
  // Close the document writing and trigger print
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

const groupedReports = computed(() => {
  const groups = {};
  if (reportStore.Reports) {
    // Filter for inventory reports only (exclude tracking reports)
    const inventoryReports = reportStore.Reports.filter(report => 
      report.content && !report.content.includes('Tracking Report')
    );
    
    inventoryReports.forEach(report => {
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
</script>

<template class="font-mont">
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center mb-6">
        <button @click="goBack" class="flex items-center text-blue-600 hover:text-blue-800">
          <span class="mr-2">←</span> Back to Reports
        </button>
      </div>
      <h1 class="text-3xl text-green-700 font-bold mb-6">Inventory Reports</h1>
      
      <div v-if="reportStore.loading" class="text-center py-8">
        Loading reports...
      </div>
      
      <div v-else-if="reportStore.Reports.length === 0" class="text-center py-8 text-gray-500">
        No reports have been generated yet.
      </div>
      
      <div v-else class="space-y-4">
        <div v-for="date in sortedDates" :key="date" class="border rounded-lg overflow-hidden">
          <button 
            @click="toggleDate(date)"
            class="w-full px-6 py-4 bg-green-50 hover:bg-green-100 flex justify-between items-center border-b"
          >
            <h2 class="text-lg font-semibold text-green-800">{{ date }}</h2>
            <span class="text-green-700">
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
                <h3 class="text-md font-medium text-green-800">
                  Generated at {{ new Date(report.created_at).toLocaleTimeString() }}
                </h3>
              </div>
              <div class="text-sm text-gray-700 bg-gray-50 p-4 rounded" v-html="report.content"></div>
              <div class="mt-4 flex justify-end">
                <button 
                  @click="printReport(report)"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
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
