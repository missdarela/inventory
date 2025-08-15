<template class="font-mont">
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center mb-6">
        <button @click="goBack" class="flex items-center text-blue-600 hover:text-blue-800">
          <span class="mr-2">←</span> Back to Reports
        </button>
      </div>
      <h1 class="text-3xl text-blue-700 font-bold mb-6">Tracking Reports</h1>
      
      <div v-if="reportStore.loading" class="text-center py-8">
        Loading reports...
      </div>
      
      <div v-else-if="trackingReports.length === 0" class="text-center py-8 text-gray-500">
        <p class="mb-4">No reports have been generated yet.</p>
        <p class="text-sm">Reports are automatically generated when you use the tracking system.</p>
      </div>
      
      <div v-else class="space-y-4">
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
              <div class="mt-4 flex justify-end space-x-2">
                <button 
                  @click="downloadReport(report)"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                >
                  <span class="mr-2">📥</span> Download
                </button>
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
import { useReportStore } from '../stores/reportStore';
import { useRouter } from 'vue-router';
import { onMounted, computed, ref } from 'vue';

const trackingDumpStore = useTrackingDumpStore();
const reportStore = useReportStore();
const router = useRouter();
const expandedDates = ref(new Set());

onMounted(async () => {
  await reportStore.fetchReports();
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

function downloadReport(report) {
  // Create HTML content for download
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tracking Report - ${formatDate(report.created_at)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
          }
          .report-header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .report-date {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
          }
          h3 {
            color: #2563eb;
            margin-top: 0;
          }
          ul {
            list-style-type: disc;
            margin-left: 20px;
          }
          li {
            margin: 8px 0;
          }
          hr {
            border: 1px solid #e5e7eb;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Tracking Report</h1>
          <div class="report-date">Generated at: ${formatDate(report.created_at)}</div>
        </div>
        ${report.content}
      </body>
    </html>
  `;

  // Create and download the file
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tracking-report-${new Date(report.created_at).toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
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

// Get tracking reports from the store
const trackingReports = computed(() => {
  if (reportStore.Reports) {
    // Filter for tracking reports only
    return reportStore.Reports.filter(report => 
      report.type === 'tracking' || (report.content && report.content.includes('Tracking Report'))
    );
  }
  return [];
});

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
</script>