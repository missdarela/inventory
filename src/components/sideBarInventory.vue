<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase';
import { ElMessage, ElNotification } from 'element-plus';
import { useReportStore } from '../stores/reportStore';

const EDIT_WINDOW_MINUTES = 5;
const inventory = ref([]);
const loading = ref(false);
const hasGeneratedReport = ref(false);

onMounted(async () => {
  // Clear cache for fresh cross-device data
  await clearCache();
  
  // Load initial set of data (most recent first)
  await fetchCurrentSet();
});

// Clear cache for cross-device sync
const clearCache = () => {
  try {
    const keysToRemove = [
      'currentSetId', 'inventory_cache', 'inventory_data', 
      'cached_inventory', 'sidebar_inventory'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log('✅ sideBarInventory cache cleared for cross-device sync');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

async function fetchCurrentSet() {
  loading.value = true;
  
  try {
    // Optimized query: Select only essential fields with limit
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id, dump_name, deposit, date, rate, 
        quantity_deposited, quantity_supplied, 
        status, editable_until, created_at, updated_at
      `)
      .order('created_at', { ascending: true }) // Changed to ascending order (oldest first)
      .limit(200); // Load up to 200 most recent records
    
    if (error) throw error;
    
    inventory.value = data.map(item => ({ ...item, isEditing: false }));
    console.log(`✅ Loaded ${data?.length || 0} inventory records`);
    
  } catch (error) {
    console.error('Failed to fetch inventory:', error.message);
    ElMessage.error('Failed to load inventory data. Please refresh the page.');
  } finally {
    loading.value = false;
  }
}

// Modified addRow function to ensure cross-device sync
async function addRow() {
  const now = new Date();
  
  const newRow = {
    dump_name: '',
    deposit: 0,
    date: now.toISOString().split('T')[0],
    rate: 0,
    quantity_deposited: 0,
    quantity_supplied: 0,
    status: 'In supply',
    editable_until: null, // New rows start as editable (null means always editable until first save)
  };
  
  loading.value = true;
  try {
    // Save to database immediately
    const { data, error: inventoryError } = await supabase
      .from('inventory')
      .insert(newRow)
      .select();
    
    if (inventoryError) throw inventoryError;

    // Add to local array with isEditing: true so user can immediately edit
    inventory.value.push({ ...data[0], isEditing: true });
    ElMessage.success('New row added! Fill in the data and click Save.');
  } catch (error) {
    ElMessage.error('Failed to add row: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// Modified saveRow function with robust schema inspection to handle inventory_id column errors
async function saveRow(row) {
  row.isEditing = false;
  
  const now = new Date();
  const newEditableUntil = new Date(now.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  console.log(`Setting 5-minute lock for row ${row.id}:`, {
    now: now.toISOString(),
    editableUntil: newEditableUntil,
    lockDurationMinutes: EDIT_WINDOW_MINUTES
  });

  const updates = {
    id: row.id,
    dump_name: capitalizeName(row.dump_name),
    deposit: parseFloat(row.deposit?.toString().replace(/[^\d.]/g, '')) || 0,
    date: row.date,
    rate: parseFloat(row.rate?.toString().replace(/[^\d.]/g, '')) || 0,
    quantity_deposited: row.quantity_deposited,
    quantity_supplied: row.quantity_supplied,
    status: row.status,
    editable_until: newEditableUntil,
    updated_at: new Date().toISOString()
  };

  // Update main inventory table
  const { data: inventoryData, error: inventoryError } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', row.id)
    .select();

  if (inventoryError) {
    console.error('Inventory update error:', inventoryError);
    ElMessage.error('Failed to save row: ' + inventoryError.message);
    return;
  }

  // Update local state to reflect the changes
  const index = inventory.value.findIndex(item => item.id === row.id);
  if (index !== -1) {
    inventory.value[index] = { ...inventory.value[index], ...updates };
  }

  // Also save calculated fields to dump_inventory table for dashboard metrics
  // First, let's check what columns are available in dump_inventory table
  try {
    // Get table schema information
    const dumpInventoryColumns = await inspectDumpInventorySchema();
    
    if (!dumpInventoryColumns) {
      console.warn('Schema inspection failed, skipping dump_inventory update');
      ElMessage.success('Row saved successfully!');
      return;
    }
    
    // Determine which columns are available in the table
    const availableColumns = dumpInventoryColumns;
    console.log('Available columns in dump_inventory:', availableColumns);
    
    // Only proceed with dump_inventory upsert if we have column information
    if (availableColumns.length > 0) {
      // Build dumpUpdates object based on available columns
      const dumpUpdates = {
        updated_at: new Date().toISOString()
      };
      
      // Add date field if column exists (it's required)
      if (availableColumns.includes('date')) {
        dumpUpdates.date = row.date;
      }
      
      // Add set_id field if column exists (likely required)
      if (availableColumns.includes('set_id')) {
        dumpUpdates.set_id = 1; // Default set_id value
      }
      
      // Only add inventory_id if the column exists
      if (availableColumns.includes('inventory_id')) {
        dumpUpdates.inventory_id = row.id;
      } else if (availableColumns.includes('id')) {
        // Fallback to 'id' column if 'inventory_id' doesn't exist
        dumpUpdates.id = row.id;
      }
      
      // Add dump_name if column exists
      if (availableColumns.includes('dump_name')) {
        dumpUpdates.dump_name = capitalizeName(row.dump_name);
      }
      
      // Add basic fields if columns exist
      if (availableColumns.includes('deposit')) {
        dumpUpdates.deposit = parseFloat(row.deposit?.toString().replace(/[^\d.]/g, '')) || 0;
      }
      
      if (availableColumns.includes('rate')) {
        dumpUpdates.rate = parseFloat(row.rate?.toString().replace(/[^\d.]/g, '')) || 0;
      }
      
      if (availableColumns.includes('quantity_deposited')) {
        dumpUpdates.quantity_deposited = row.quantity_deposited;
      }
      
      if (availableColumns.includes('quantity_supplied')) {
        dumpUpdates.quantity_supplied = row.quantity_supplied;
      }
      
      // Only add calculated fields if their columns exist
      if (availableColumns.includes('total_amount_supplied')) {
        dumpUpdates.total_amount_supplied = parseFloat(getTotalSuppliedAmount(row).replace(/[^\d.]/g, '')) || 0;
      }
      
      if (availableColumns.includes('quantity_remaining')) {
        dumpUpdates.quantity_remaining = parseInt(getQuantityRemaining(row)) || 0;
      }
      
      if (availableColumns.includes('amount_remaining')) {
        dumpUpdates.amount_remaining = parseFloat(getAmountRemaining(row).replace(/[^\d.]/g, '')) || 0;
      }
      
      if (availableColumns.includes('status')) {
        dumpUpdates.status = row.status || 'In supply'; // Add fallback value for status
      }
      
      // Determine onConflict column based on available columns
      let onConflictColumn = 'id'; // default fallback
      if (availableColumns.includes('inventory_id')) {
        onConflictColumn = 'inventory_id';
      } else if (availableColumns.includes('id')) {
        onConflictColumn = 'id';
      }
      
      console.log('Upserting to dump_inventory with onConflict column:', onConflictColumn);
      
      // Try to upsert the data
      const { error: dumpError } = await supabase
        .from('dump_inventory')
        .upsert(dumpUpdates, { onConflict: onConflictColumn });
      
      if (dumpError) {
        console.warn('Dump inventory upsert failed:', dumpError);
        // Don't fail the main save if dump inventory fails
      }
    } else {
      console.warn('No columns found in dump_inventory table, skipping update');
    }
  } catch (schemaError) {
    console.warn('Could not inspect dump_inventory schema, skipping dump inventory update:', schemaError.message);
    // Continue without updating dump_inventory if schema inspection fails
  }

  ElMessage.success('Row saved successfully!');
}

// Modified deleteRow function to ensure cross-device sync
async function deleteRow(row) {
  if (canEdit(row)) {
    if (window.confirm('Are you sure you want to delete this row?')) {
      loading.value = true;
      try {
        // Delete from main inventory table
        const { error: inventoryError } = await supabase
          .from('inventory')
          .delete()
          .eq('id', row.id);
        
        if (inventoryError) throw inventoryError;
        
        // Also delete from dump_inventory table
        const { error: dumpError } = await supabase
          .from('dump_inventory')
          .delete()
          .eq('inventory_id', row.id);
        
        if (dumpError) throw dumpError;
        
        // Remove from local state
        inventory.value = inventory.value.filter(r => r.id !== row.id);
        ElMessage.success('Row deleted!');
      } catch(error) {
        ElMessage.error('Failed to delete row: ' + error.message);
      } finally {
        loading.value = false;
      }
    }
  }
}

// Modified closeAccount function with robust schema inspection to handle inventory_id column errors
async function closeAccount() {
  if (!hasGeneratedReport.value) {
    ElMessage.error('Please generate a report before closing the account');
    return;
  }

  if (window.confirm('Are you sure you want to close the current set of data? This will delete all inventory records across all devices.')) {
    loading.value = true;
    try {
      // Delete all records from inventory table for cross-device sync
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .neq('id', 0); // Delete all records (neq to a non-existent condition to delete all)
      
      if (inventoryError) throw inventoryError;
      
      // Clear local state
      inventory.value = [];
      hasGeneratedReport.value = false;
      
      ElMessage.success('Account closed and all data cleared across all devices!');
    } catch (error) {
      ElMessage.error('Failed to close account: ' + error.message);
    } finally {
      loading.value = false;
    }
  }
}

async function markAccountAsClosed() {
  console.log('Skipping markAccountAsClosed - no inventory_metadata table exists');
  // No inventory_metadata table exists, so we skip this operation
  // This function is kept for backward compatibility but does nothing
}

// Check if account is closed across devices
async function checkAccountClosed() {
  console.log('Skipping checkAccountClosed - no inventory_metadata table exists');
  // No inventory_metadata table exists, so we skip this operation
  // This function is kept for backward compatibility but does nothing
}

function canEdit(row) {
  if (row.editable_until === null) {
    console.log(`Row ${row.id} is always editable (editable_until is null)`);
    return true;
  }
  
  // Use server time for more accurate comparison
  const now = new Date();
  const editableUntil = new Date(row.editable_until);
  
  // Add a small buffer (5 seconds) to account for network delays and timing discrepancies
  const bufferMs = 5000; // 5 seconds buffer
  const canEditResult = (now.getTime() + bufferMs) < editableUntil.getTime();
  
  const minutesRemaining = Math.max(0, Math.round((editableUntil.getTime() - now.getTime()) / (1000 * 60)));
  const secondsRemaining = Math.max(0, Math.round((editableUntil.getTime() - now.getTime()) / 1000));
  
  console.log(`Row ${row.id} edit check:`, {
    now: now.toISOString(),
    editableUntil: editableUntil.toISOString(),
    canEdit: canEditResult,
    minutesRemaining: minutesRemaining,
    secondsRemaining: secondsRemaining,
    timeDifferenceMs: editableUntil.getTime() - now.getTime()
  });
  
  return canEditResult;
}

function editRow(row) {
  if (canEdit(row)) row.isEditing = true;
}

function getTotalSuppliedAmount(row) {
  const rate = parseFloat(row.rate?.toString().replace(/[^\d.]/g, '')) || 0;
  const quantitySupplied = parseFloat(row.quantity_supplied?.toString().replace(/[^\d.]/g, '')) || 0;
  const total = rate * quantitySupplied;
  return total > 0 ? total.toString() : '0';
}

function getAmountRemaining(row) {
  const deposit = parseFloat(row.deposit?.toString().replace(/[^\d.]/g, '')) || 0;
  const totalSupplied = parseFloat(getTotalSuppliedAmount(row)) || 0;
  const remaining = deposit - totalSupplied;
  return remaining >= 0 ? remaining.toString() : '0';
}

function getQuantityRemaining(row) {
  const quantityDeposited = parseFloat(row.quantity_deposited?.toString().replace(/[^\d.]/g, '')) || 0;
  const quantitySupplied = parseFloat(row.quantity_supplied?.toString().replace(/[^\d.]/g, '')) || 0;
  const remaining = quantitySupplied - quantityDeposited;
  return remaining >= 0 ? remaining.toString() : '0';
}

const reportStore = useReportStore();

async function handleGenerateReport() {
  try {
    const currentDate = new Date().toLocaleString();
    const totalItems = inventory.value.length;
    
    // Calculate totals
    const totalDeposit = inventory.value.reduce((sum, item) => {
      const deposit = parseFloat(item.deposit?.toString().replace(/[^\d.]/g, '')) || 0;
      return sum + deposit;
    }, 0);

    const totalAmountRemaining = inventory.value.reduce((sum, item) => {
      const remaining = parseFloat(getAmountRemaining(item)) || 0;
      return sum + remaining;
    }, 0);

    // Create a summary header
    const summary = [
      `<h2 class="text-lg font-bold">Inventory Report - ${currentDate}</h2>`,
      `<h3 class="text-sm font-bold">Total Records: ${totalItems}</h3>`,
      '<h3 class="text-sm font-bold mb-2">Detailed Records:</h3>'
    ].join('\n');

    // Create detailed records with natural language format
    const details = inventory.value.map((item, index) => {
      const quantityRemaining = getQuantityRemaining(item);
      
      return [
        `<h3 class="text-sm font-bold">Record #${index + 1}:</h3>`,
        `<ul class="list-disc pl-6 py-2">
           <li class="font-medium">Dump Name:<b> ${capitalizeName(item.dump_name)}</b></li>
           <li class="font-medium my-2">Date:<b> ${item.date}</b></li>
           <li class="font-medium">Deposit Made:<b> ${formatMoney(item.deposit)}</b></li>
           <li class="font-medium my-2">Container Deposited:<b> ${item.quantity_deposited}</b></li>
           <li class="font-medium">Container Supplied:<b> ${item.quantity_supplied}</b></li>
           <li class="font-medium my-2">Container Remaining:<b> ${quantityRemaining}</b></li>
           <li class="font-medium">Amount Remaining:<b> ${formatMoney(getAmountRemaining(item))}</b></li>
           <li class="font-medium my-2">Status:<b> ${item.status}</b></li>
          </ul>`,
        '-------------------'
      ].join('\n');
    }).join('\n');

    // Add totals summary at the end
    const totals = [
      '<div class="mt-4 border-t-2 border-gray-300 pt-4">',
      '<h3 class="text-sm font-bold">Summary Totals:</h3>',
      `<ul class="list-none pl-6 py-2">
        <li class="font-medium text-green-800">Total Deposits Made:<b> ${formatMoney(totalDeposit.toString())}</b></li>
        <li class="font-medium text-red-800 mt-2">Total Amount Remaining:<b> ${formatMoney(totalAmountRemaining.toString())}</b></li>
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

const exportInventory = () => {
  try {
    // Helper function to format money for CSV (replace ₦ with NGN)
    const formatMoneyForCSV = (amount) => {
      if (!amount) return '';
      const formatted = formatMoney(amount);
      return formatted.replace('₦', 'NGN ');
    };

    // Create CSV content with summary header
    let csvContent = `Inventory Export Report\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Records: ${inventory.value.length}\n`;
    csvContent += `Total Amount Supplied: ${formatMoneyForCSV(inventory.value.reduce((sum, item) => sum + (getTotalSuppliedAmount(item) || 0), 0))}\n`;
    csvContent += `Total Amount Remaining: ${formatMoneyForCSV(inventory.value.reduce((sum, item) => sum + (getAmountRemaining(item) || 0), 0))}\n`;
    csvContent += `Total Quantity Supplied: ${inventory.value.reduce((sum, item) => sum + (parseFloat(item.quantity_supplied) || 0), 0)}\n`;
    csvContent += `Total Quantity Remaining: ${inventory.value.reduce((sum, item) => sum + (getQuantityRemaining(item) || 0), 0)}\n\n`;
    
    // Add inventory details header
    csvContent += 'S/N,Dump Name,Deposit,Date,Rate,Quantity Deposited,Total Amount Supplied,Quantity Supplied,Amount Remaining,Quantity Remaining,Status\n';
    
    // Add inventory data
    inventory.value.forEach((item, index) => {
      csvContent += `${index + 1},"${capitalizeName(item.dump_name || '')}","${formatMoneyForCSV(item.deposit)}","${item.date || ''}","${formatMoneyForCSV(item.rate)}",${item.quantity_deposited || 0},"${formatMoneyForCSV(getTotalSuppliedAmount(item))}",${item.quantity_supplied || 0},"${formatMoneyForCSV(getAmountRemaining(item))}",${getQuantityRemaining(item) || 0},"${item.status || ''}"\n`;
    });
    
    // Add UTF-8 BOM for proper encoding
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create and download file with proper UTF-8 encoding
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Show success notification
    ElNotification({
      title: 'Export Successful',
      message: 'Inventory data has been exported to CSV with proper formatting',
      type: 'success',
    });
  } catch (error) {
    console.error('Export error:', error);
    ElNotification({
      title: 'Export Failed',
      message: 'Failed to export inventory data',
      type: 'error',
    });
  }
};

// Format money values
function formatMoney(value) {
  if (!value) return '0';
  const numericValue = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
  return numericValue.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}

// Capitalize name function
function capitalizeName(name) {
  if (!name) return '';
  return name.toString()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateNumericInput(event) {
  const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (!allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

function validateDateInput(event) {
  const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (!allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

const statusColorMap = {
  'In supply': 'bg-blue-500 text-white',
  'CAC': 'bg-green-500 text-white'
};

// Function to inspect dump_inventory table schema
async function inspectDumpInventorySchema() {
  try {
    console.log('🔍 Inspecting dump_inventory table schema...');
    
    // First try to get table information from existing data
    const { data, error } = await supabase
      .from('dump_inventory')
      .select('*')
      .limit(1);
    
    if (error) {
      console.warn('❌ dump_inventory table schema inspection failed:', error.message);
      return null;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('✅ dump_inventory table columns from data:', columns);
      return columns;
    } else {
      console.log('⚠️ dump_inventory table exists but is empty, trying alternative approach...');
      
      // For empty tables, we'll define the expected schema based on what we know
      // This is a fallback approach when the table is empty
      const expectedColumns = [
        'id',
        'inventory_id', 
        'dump_name',
        'deposit',
        'rate',
        'quantity_deposited',
        'quantity_supplied',
        'total_amount_supplied',
        'quantity_remaining',
        'amount_remaining',
        'status',
        'date',
        'created_at',
        'updated_at'
      ];
      
      // Try to insert a test record to verify which columns exist
      try {
        console.log('🧪 Testing dump_inventory table structure with minimal insert...');
        
        // Try inserting a minimal record to test the table structure
        // Include all likely required fields based on the error
        const testRecord = {
          dump_name: 'TEST_SCHEMA_CHECK',
          date: new Date().toISOString().split('T')[0], // Add date field (YYYY-MM-DD format)
          set_id: 1, // Add set_id field (likely required)
          deposit: 0,
          rate: 0,
          quantity_deposited: 0,
          quantity_supplied: 0,
          status: 'Test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('dump_inventory')
          .insert(testRecord)
          .select();
        
        if (!insertError && insertData && insertData.length > 0) {
          const columns = Object.keys(insertData[0]);
          console.log('✅ dump_inventory table columns from test insert:', columns);
          
          // Clean up the test record
          await supabase
            .from('dump_inventory')
            .delete()
            .eq('dump_name', 'TEST_SCHEMA_CHECK');
          
          return columns;
        } else {
          console.warn('Test insert failed:', insertError?.message);
          // Return a basic set of columns that should work
          return ['id', 'dump_name', 'date', 'created_at', 'updated_at'];
        }
      } catch (testError) {
        console.warn('Schema test failed:', testError.message);
        // Return a basic set of columns that should work
        return ['id', 'dump_name', 'date', 'created_at', 'updated_at'];
      }
    }
  } catch (err) {
    console.error('💥 Error during dump_inventory schema inspection:', err.message);
    // Return a basic set of columns as fallback
    return ['id', 'dump_name', 'date', 'created_at', 'updated_at'];
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg shadow bg-white p-4 relative">
    <div class="py-2 text-right">
      <button @click="handleGenerateReport" class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">Generate Report</button>
      <button @click="exportInventory" class="mx-3 px-2 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-800">Export to CSV</button>
      <button class="mx-3 px-2 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-800" @click="closeAccount">Close Account</button>
    </div>
    <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
      <p>Loading...</p>
    </div>
    <div class="rounded-lg overflow-scroll">
      <table class="min-w-full table-fixed">
        <thead class="bg-blue-800 text-white text-sm">
          <tr>
            <th class="px-2 py-2 w-8 border border-blue-200 text-center">S/N</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Dump Name</th>
            <th class="px-2 py-2 w-24 border border-blue-200 text-center">Deposit</th>
            <th class="px-2 py-2 w-28 border border-blue-200 text-center">Date</th>
            <th class="px-2 py-2 w-24 border border-blue-200 text-center">Rate</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Quantity Deposited</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Quantity Supplied</th>
            <th class="px-2 py-2 w-40 border border-blue-200 text-center">Total Supplied Amount</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Amount Remaining</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Quantity Remaining</th>
            <th class="px-2 py-2 w-24 border border-blue-200 text-center">Status</th>
            <th class="px-2 py-2 w-32 border border-blue-200 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in inventory" :key="row.id" class="hover:bg-blue-50 even:bg-blue-50/50">
            <td class="px-2 py-2 border border-blue-200 text-xs text-center">{{ index + 1 }}</td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.dump_name" class="border rounded px-1 py-0.5 w-full text-sm" />
              <span v-else>{{ capitalizeName(row.dump_name) }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.deposit" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ formatMoney(row.deposit) }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.date" type="date" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateDateInput" />
              <span v-else>{{ row.date }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.rate" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ formatMoney(row.rate) }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.quantity_deposited" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.quantity_deposited }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.quantity_supplied" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.quantity_supplied }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ formatMoney(getTotalSuppliedAmount(row)) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ formatMoney(getAmountRemaining(row)) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ getQuantityRemaining(row) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <select v-if="row.isEditing && canEdit(row)" v-model="row.status" class="border rounded px-1 py-0.5 w-full text-center text-sm">
                <option value="In supply">In supply</option>
                <option value="CAC">CAC</option>
              </select>
              <span v-else class="block text-center px-2 py-1 rounded font-semibold text-sm"
                :class="statusColorMap[row.status]"
              >
                {{ row.status }}
              </span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <button v-if="!row.isEditing && canEdit(row)" class="text-blue-600 hover:underline mr-2 text-sm" @click="editRow(row)">Edit</button>
              <button v-if="row.isEditing && canEdit(row)" class="text-green-600 hover:underline mr-2 text-sm" @click="saveRow(row)">Save</button>
              <button v-if="canEdit(row)" class="text-red-600 hover:underline" @click="deleteRow(row)">Delete</button>
              <span v-if="!canEdit(row)" class="text-gray-400 text-xs">Locked</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-red-500 mt-2">* Rows are editable and deletable for {{ EDIT_WINDOW_MINUTES }} minutes after first save.</p>
    <button class="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-900" @click="addRow">Add Row</button>
  </div>
</template>
