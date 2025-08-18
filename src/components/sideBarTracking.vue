<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase';
import { ElMessage } from 'element-plus';
import { useReportStore } from '../stores/reportStore';

const EDIT_WINDOW_MINUTES = 5;
const batches = ref([]);
const currentBatch = ref(null);
const currentBatchData = ref([]);
const loading = ref(false);
const hasGeneratedReport = ref(false);
const showBatchModal = ref(false);

// Capitalize first letter of each word
const capitalizeName = (name) => {
  if (!name) return '';
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Batch configuration
const batchConfig = ref({
  month: '',
  year: new Date().getFullYear(),
  bookingNo: '',
  nxpNo: ''
});

// Auto-generated counters
const batchCounter = ref(1);
const washingCounter = ref(100);

onMounted(async () => {
  await loadBatches();
  await loadCounters();
});

// Load existing batches
async function loadBatches() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('tracking_batches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    batches.value = data || [];
  } catch (error) {
    ElMessage.error('Failed to load batches: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// Load counters from localStorage or initialize
async function loadCounters() {
  const savedBatchCounter = localStorage.getItem('batchCounter');
  const savedWashingCounter = localStorage.getItem('washingCounter');
  
  if (savedBatchCounter) {
    batchCounter.value = parseInt(savedBatchCounter);
  }
  if (savedWashingCounter) {
    washingCounter.value = parseInt(savedWashingCounter);
  }
}

// Save counters to localStorage
function saveCounters() {
  localStorage.setItem('batchCounter', batchCounter.value.toString());
  localStorage.setItem('washingCounter', washingCounter.value.toString());
}

// Generate batch number (VW0018 format)
function generateBatchNumber() {
  const paddedNumber = batchCounter.value.toString().padStart(4, '0');
  return `VW${paddedNumber}`;
}

// Generate washing number
function generateWashingNumber() {
  return washingCounter.value.toString();
}

// Generate table name from batch number
function generateTableName(batchNumber, month, year) {
  const batchNum = parseInt(batchNumber.replace('VW', '')); // Convert to integer to remove leading zeros
  const numSuffix = getOrdinalSuffix(batchNum);
  return `${batchNum}${numSuffix} Batch Of ${month} ${year}`;
}

// Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

// Create new batch
async function createBatch() {
  if (!batchConfig.value.month || !batchConfig.value.bookingNo || !batchConfig.value.nxpNo) {
    ElMessage.error('Please fill in all required fields');
    return;
  }

  loading.value = true;
  try {
    const batchNumber = generateBatchNumber();
    const washingNumber = generateWashingNumber();
    const tableName = generateTableName(batchNumber, batchConfig.value.month, batchConfig.value.year);
    
    // First create the batch entry in tracking_batches
    const { data: batchData, error: batchError } = await supabase
      .from('tracking_batches')
      .insert([{
        batch_number: batchNumber,
        washing_number: washingNumber,
        booking_no: batchConfig.value.bookingNo,
        nxp_no: batchConfig.value.nxpNo,
        table_name: tableName,
        month: batchConfig.value.month,
        year: batchConfig.value.year,
        status: 'Active',
        created_at: new Date().toISOString()
      }])
      .select();

    if (batchError) throw batchError;
    
    // Then create the data entries in tracking_batch_data
    const batchRows = [];
    for (let i = 1; i <= 10; i++) {
      batchRows.push({
        batch_id: batchData[0].id,
        serial_number: i,
        date: null,
        container_no: '',
        driver: '',
        dump: '',
        containers_delivered: 0,
        vessel_details: '',
        comments: '',
        editable_until: null
      });
    }

    const { error: rowsError } = await supabase
      .from('tracking_batch_data')
      .insert(batchRows);

    if (rowsError) throw rowsError;

    // Update counters
    batchCounter.value++;
    washingCounter.value++;
    saveCounters();

    // Refresh batches and select the new one
    await loadBatches();
    currentBatch.value = batchData[0];
    await loadBatchData(batchData[0].id);
    
    showBatchModal.value = false;
    resetBatchConfig();
    ElMessage.success('Batch created successfully!');
  } catch (error) {
    ElMessage.error('Failed to create batch: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// Reset batch configuration
function resetBatchConfig() {
  batchConfig.value = {
    month: '',
    year: new Date().getFullYear(),
    bookingNo: '',
    nxpNo: ''
  };
}

// Load batch data
async function loadBatchData(batchId) {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('tracking_batch_data')
      .select('*')
      .eq('batch_id', batchId)
      .order('serial_number');

    if (error) throw error;
    
    // Always ensure exactly 10 rows are displayed
    const batchData = [];
    for (let i = 1; i <= 10; i++) {
      const existingRow = data?.find(item => item.serial_number === i);
      
      if (existingRow) {
        // Use existing row data
        batchData.push({ ...existingRow, isEditing: false });
      } else {
        // Create empty row for missing serial numbers
        batchData.push({
          id: null, // No database ID yet
          batch_id: batchId,
          serial_number: i,
          date: null,
          container_no: '',
          driver: '',
          dump: '',
          containers_delivered: 0,
          vessel_details: '',
          comments: '',
          editable_until: null,
          isEditing: false
        });
      }
    }
    
    currentBatchData.value = batchData;
    console.log(`Loaded batch data: ${data?.length || 0} existing rows, displaying 10 total rows`);
    
  } catch (error) {
    ElMessage.error('Failed to load batch data: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// Select batch
async function selectBatch(batch) {
  currentBatch.value = batch;
  await loadBatchData(batch.id);
}

// Check if row can be edited
function canEdit(row) {
  // If row is empty (no data), it's always editable
  const isEmpty = !row.date && !row.container_no && !row.driver && !row.dump && 
                  (!row.containers_delivered || row.containers_delivered === 0) && 
                  !row.vessel_details && !row.comments;
  
  if (isEmpty) {
    return true;
  }
  
  // If row has data, check the edit window
  if (row.editable_until === null) {
    return true; // First time editing
  }
  
  const now = new Date();
  return now < new Date(row.editable_until);
}

// Edit row
function editRow(row) {
  if (canEdit(row)) row.isEditing = true;
}

// Save row
async function saveRow(row) {
  row.isEditing = false;
  loading.value = true;

  try {
    const now = new Date();
    const newEditableUntil = new Date(now.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
    
    // Ensure proper data types and handle null values
    const rowData = {
      batch_id: parseInt(row.batch_id),
      serial_number: parseInt(row.serial_number),
      date: row.date || null,
      container_no: row.container_no || '',
      driver: row.driver || '',
      dump: row.dump || '',
      containers_delivered: parseInt(row.containers_delivered) || 0,
      vessel_details: row.vessel_details || '',
      comments: row.comments || '',
      editable_until: newEditableUntil.toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Saving row data:', rowData); // Debug log

    let result;
    if (row.id === null || row.id === undefined) {
      // Insert new row
      console.log('Inserting new row for serial_number:', row.serial_number);
      result = await supabase
        .from('tracking_batch_data')
        .insert([rowData])
        .select();
      
      if (result.error) throw result.error;
      
      // Update local row with database ID
      const index = currentBatchData.value.findIndex(item => item.serial_number === row.serial_number);
      if (index !== -1) {
        currentBatchData.value[index].id = result.data[0].id;
        currentBatchData.value[index].editable_until = newEditableUntil.toISOString();
        console.log('Updated local row with new ID:', result.data[0].id);
      }
    } else {
      // Update existing row
      console.log('Updating existing row with ID:', row.id);
      result = await supabase
        .from('tracking_batch_data')
        .update(rowData)
        .eq('id', row.id);
      
      if (result.error) throw result.error;
      
      // Update local row
      const index = currentBatchData.value.findIndex(item => item.id === row.id);
      if (index !== -1) {
        currentBatchData.value[index].editable_until = newEditableUntil.toISOString();
      }
    }

    ElMessage.success('Row saved successfully!');
    
  } catch (error) {
    console.error('Save row error:', error);
    console.error('Row data that failed:', row);
    ElMessage.error('Failed to save row: ' + error.message);
    row.isEditing = true;
  } finally {
    loading.value = false;
  }
}

// Delete row (reset to empty)
async function deleteRow(row) {
  if (canEdit(row)) {
    if (window.confirm('Are you sure you want to clear this row?')) {
      loading.value = true;
      try {
        const clearedData = {
          date: null,
          container_no: '',
          driver: '',
          dump: '',
          containers_delivered: 0,
          vessel_details: '',
          comments: '',
          editable_until: null,
          updated_at: new Date().toISOString()
        };

        // Only update database if row has a valid ID
        if (row.id !== null && row.id !== undefined) {
          const { error } = await supabase
            .from('tracking_batch_data')
            .update(clearedData)
            .eq('id', row.id);

          if (error) throw error;
        }
        // If row.id is null, it doesn't exist in database yet, so just clear local data

        // Update local data using serial_number to find the row
        const index = currentBatchData.value.findIndex(item => item.serial_number === row.serial_number);
        if (index !== -1) {
          // Keep the structure but clear the data
          Object.assign(currentBatchData.value[index], {
            ...clearedData,
            id: row.id, // Keep existing ID (could be null)
            batch_id: row.batch_id,
            serial_number: row.serial_number,
            isEditing: false
          });
        }

        ElMessage.success('Row cleared successfully!');
      } catch (error) {
        console.error('Delete row error:', error);
        ElMessage.error('Failed to clear row: ' + error.message);
      } finally {
        loading.value = false;
      }
    }
  }
}

// Generate Report
const reportStore = useReportStore();

async function handleGenerateReport() {
  if (!currentBatch.value) {
    ElMessage.error('Please select a batch first');
    return;
  }

  try {
    const currentDate = new Date().toLocaleString();
    const filledRows = currentBatchData.value.filter(row => 
      row.date || row.container_no || row.driver || row.dump || row.containers_delivered > 0
    );
    
    // Calculate totals
    const totalContainers = currentBatchData.value.reduce((sum, item) => {
      return sum + (parseInt(item.containers_delivered) || 0);
    }, 0);

    // Create a summary header
    const summary = [
      `<h2 class="text-lg font-bold">Tracking Report - ${currentDate}</h2>`,
      `<h3 class="text-sm font-bold">Batch: ${currentBatch.value.table_name}</h3>`,
      `<h3 class="text-sm font-bold">Batch Number: ${currentBatch.value.batch_number}</h3>`,
      `<h3 class="text-sm font-bold">Washing Number: ${currentBatch.value.washing_number}</h3>`,
      `<h3 class="text-sm font-bold">Booking No: ${currentBatch.value.booking_no}</h3>`,
      `<h3 class="text-sm font-bold">NXP No: ${currentBatch.value.nxp_no}</h3>`,
      `<h3 class="text-sm font-bold">Total Records: ${filledRows.length}/10</h3>`,
      '<h3 class="text-sm font-bold mb-2">Detailed Records:</h3>'
    ].join('\n');

    // Create detailed records
    const details = filledRows.map((item) => {
      return [
        `<h3 class="text-sm font-bold">Record #${item.serial_number}:</h3>`,
        `<ul class="list-disc pl-6 py-2">
           <li class="font-medium">Date:<b> ${item.date || 'Not specified'}</b></li>
           <li class="font-medium my-2">Container No:<b> ${item.container_no || 'Not specified'}</b></li>
           <li class="font-medium">Driver:<b> ${item.driver || 'Not specified'}</b></li>
           <li class="font-medium my-2">Dump:<b> ${capitalizeName(item.dump) || 'Not specified'}</b></li>
           <li class="font-medium">Containers Delivered:<b> ${item.containers_delivered}</b></li>
           <li class="font-medium my-2">Vessel Details:<b> ${item.vessel_details || 'Not specified'}</b></li>
           <li class="font-medium">Comments:<b> ${item.comments || 'None'}</b></li>
          </ul>`,
        '-------------------'
      ].join('\n');
    }).join('\n');

    // Add totals summary at the end
    const totals = [
      '<div class="mt-4 border-t-2 border-gray-300 pt-4">',
      '<h3 class="text-sm font-bold">Summary Totals:</h3>',
      `<ul class="list-none pl-6 py-2">
        <li class="font-medium text-green-800">Total Containers Delivered:<b> ${totalContainers}</b></li>
        <li class="font-medium text-blue-800 mt-2">Completed Records:<b> ${filledRows.length} out of 10</b></li>
       </ul>`,
      '</div>'
    ].join('\n');

    const report = `${summary}${details}${totals}`;

    await reportStore.setReport(report);
    hasGeneratedReport.value = true;
    ElMessage.success('Report generated successfully!');
  } catch (error) {
    ElMessage.error('Failed to generate report: ' + error.message);
  }
}

// Close Account
function closeAccount() {
  if (!hasGeneratedReport.value) {
    ElMessage.error('Please generate a report before closing the account');
    return;
  }

  if (window.confirm('Are you sure you want to close the current batch?')) {
    // Mark current batch as closed
    if (currentBatch.value) {
      supabase
        .from('tracking_batches')
        .update({ status: 'Closed' })
        .eq('id', currentBatch.value.id)
        .then(() => {
          currentBatch.value = null;
          currentBatchData.value = [];
          hasGeneratedReport.value = false;
          loadBatches();
          ElMessage.success('Batch closed successfully. You can now create a new batch.');
        });
    }
  }
}

// Months array for dropdown
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Header Section -->
        <div class="mb-8">
          <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Batch Tracking System</h1>
                <p class="mt-2 text-sm text-gray-600">Manage and track container delivery batches</p>
              </div>
              
              <div class="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
                <button 
                  @click="showBatchModal = true" 
                  class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Batch
                </button>
                <button 
                  @click="handleGenerateReport" 
                  :disabled="!currentBatch"
                  class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Generate Report
                </button>
                <button 
                  @click="closeAccount" 
                  :disabled="!currentBatch"
                  class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  Close Account
                </button>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Batches List -->
        <div class="mb-8">
          <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Batches</h2>
            <div v-if="batches.filter(batch => batch.status === 'Active').length === 0" class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No active batches</h3>
              <p class="mt-1 text-sm text-gray-500">Get started by creating a new batch.</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="batch in batches.filter(batch => batch.status === 'Active')" 
                :key="batch.id"
                @click="selectBatch(batch)"
                class="cursor-pointer border rounded-lg p-4 hover:shadow-md transition-shadow"
                :class="currentBatch?.id === batch.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-medium text-gray-900">{{ batch.batch_number }}</h3>
                  <span 
                    class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800"
                  >
                    {{ batch.status }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-1">{{ batch.table_name }}</p>
                <p class="text-xs text-gray-500">Washing: {{ batch.washing_number }}</p>
                <p class="text-xs text-gray-500">Booking: {{ batch.booking_no }}</p>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Current Batch Data Table -->
        <div v-if="currentBatch" class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">{{ currentBatch.table_name }}</h2>
            <div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span><strong>Batch:</strong> {{ currentBatch.batch_number }}</span>
              <span><strong>Washing:</strong> {{ currentBatch.washing_number }}</span>
              <span><strong>Booking:</strong> {{ currentBatch.booking_no }}</span>
              <span><strong>NXP:</strong> {{ currentBatch.nxp_no }}</span>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full table-fixed">
              <thead class="bg-blue-800 text-white text-sm">
                <tr>
                  <th class="px-2 py-2 w-12 border border-blue-200 text-center">S/N</th>
                  <th class="px-2 py-2 w-28 border border-blue-200 text-center">DATE</th>
                  <th class="px-2 py-2 w-32 border border-blue-200 text-center">CONTAINER NO.</th>
                  <th class="px-2 py-2 w-32 border border-blue-200 text-center">DRIVER</th>
                  <th class="px-2 py-2 w-32 border border-blue-200 text-center">DUMP</th>
                  <th class="px-2 py-2 w-32 border border-blue-200 text-center">CONTAINERS DELIVERED</th>
                  <th class="px-2 py-2 w-40 border border-blue-200 text-center">VESSEL DETAILS</th>
                  <th class="px-2 py-2 w-40 border border-blue-200 text-center">COMMENTS</th>
                  <th class="px-2 py-2 w-32 border border-blue-200 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in currentBatchData" :key="row.id" class="hover:bg-blue-50 even:bg-blue-50/50">
                  <td class="px-2 py-2 border border-blue-200 text-xs text-center">{{ row.serial_number }}</td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.date" type="date" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ row.date || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.container_no" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ row.container_no || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.driver" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ row.driver || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.dump" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ capitalizeName(row.dump) || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.containers_delivered" type="number" min="0" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ row.containers_delivered || 0 }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <input v-if="row.isEditing && canEdit(row)" v-model="row.vessel_details" class="border rounded px-1 py-0.5 w-full text-sm" />
                    <span v-else>{{ row.vessel_details || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <textarea v-if="row.isEditing && canEdit(row)" v-model="row.comments" class="border rounded px-1 py-0.5 w-full text-sm resize-none" rows="2"></textarea>
                    <span v-else>{{ row.comments || '-' }}</span>
                  </td>
                  <td class="px-2 py-2 border border-blue-200 text-center">
                    <button v-if="!row.isEditing && canEdit(row)" class="text-blue-600 hover:underline mr-2 text-sm" @click="editRow(row)">Edit</button>
                    <button v-if="row.isEditing && canEdit(row)" class="text-green-600 hover:underline mr-2 text-sm" @click="saveRow(row)">Save</button>
                    <button v-if="canEdit(row)" class="text-red-600 hover:underline text-sm" @click="deleteRow(row)">Clear</button>
                    <span v-if="!canEdit(row)" class="text-gray-400 text-xs">Locked</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p class="text-xs text-gray-500">* Rows are editable for {{ EDIT_WINDOW_MINUTES }} minutes after first save.</p>
          </div>
        </div>
  
        <!-- Add Batch Modal -->
        <div v-if="showBatchModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Batch</h3>
              
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                <select v-model="batchConfig.month" class="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">Select Month</option>
                  <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
                </select>
              </div>
              
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input v-model="batchConfig.year" type="number" min="2020" max="2030" class="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Booking No. *</label>
                <input v-model="batchConfig.bookingNo" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">NXP No. *</label>
                <input v-model="batchConfig.nxpNo" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              
              <div class="mb-4 p-3 bg-gray-50 rounded-md">
                <p class="text-sm text-gray-600 mb-2"><strong>Preview:</strong></p>
                <p class="text-xs text-gray-500">Batch Number: {{ generateBatchNumber() }}</p>
                <p class="text-xs text-gray-500">Washing Number: {{ generateWashingNumber() }}</p>
                <p class="text-xs text-gray-500" v-if="batchConfig.month">
                  Table Name: {{ generateTableName(generateBatchNumber(), batchConfig.month, batchConfig.year) }}
                </p>
              </div>
              
              <div class="flex justify-end space-x-3">
                <button 
                  @click="showBatchModal = false; resetBatchConfig();" 
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  @click="createBatch" 
                  :disabled="loading"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ loading ? 'Creating...' : 'Create Batch' }}
                </button>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Loading Overlay -->
        <div v-if="loading" class="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
          <div class="text-center">
            <svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  </template>