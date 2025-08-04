<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../supabase';
import { ElMessage } from 'element-plus';
import { useReportStore } from '../stores/reportStore';

const EDIT_WINDOW_MINUTES = 3;
const inventory = ref([]);
const loading = ref(false);
const hasGeneratedReport = ref(false);
const currentSetId = ref(null);

onMounted(async () => {
  // Generate a new set ID if none exists
  if (!localStorage.getItem('currentSetId')) {
    currentSetId.value = new Date().toISOString();
    localStorage.setItem('currentSetId', currentSetId.value);
  } else {
    currentSetId.value = localStorage.getItem('currentSetId');
  }
  await fetchCurrentSet();
});

async function fetchCurrentSet() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .or(`set_id.eq.${currentSetId.value},set_id.is.null`)
      .order('created_at');
    
    if (error) throw error;
    inventory.value = data.map(item => ({ ...item, isEditing: false }));
  } catch (error) {
    ElMessage.error('Failed to fetch inventory: ' + error.message);
  } finally {
    loading.value = false;
  }
}

const statusColorMap = {
  'In supply': 'bg-blue-500 text-white',
  'Paid': 'bg-green-500 text-white'
};

function formatMoney(amount) {
  if (!amount) return '';
  const num = amount.toString().replace(/[^\d.]/g, '');
  if (!num) return '';
  return `₦${parseFloat(num).toLocaleString('en-NG')}`;
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

async function addRow() {
  const newRow = {
    dump_name: '',
    deposit: '',
    date: new Date().toISOString().split('T')[0],
    rate: '',
    quantity_deposited: 0,
    quantity_supplied: 0,
    status: 'In supply',
    editable_until: null,
    set_id: currentSetId.value
  };
  
  loading.value = true;
  try {
    // Add to main inventory
    const { data, error: inventoryError } = await supabase
      .from('inventory')
      .insert(newRow)
      .select();
    
    if (inventoryError) throw inventoryError;

    // Also add to dump_inventory
    const dumpData = {
      dump_name: newRow.dump_name,
      deposit: 0,
      date: newRow.date,
      rate: 0,
      quantity_deposited: 0,
      quantity_supplied: 0,
      amount_remaining: 0,
      status: newRow.status,
      set_id: currentSetId.value
    };

    const { error: dumpError } = await supabase
      .from('dump_inventory')
      .insert(dumpData);

    if (dumpError) throw dumpError;

    inventory.value.push({ ...data[0], isEditing: true });
  } catch (error) {
    ElMessage.error('Failed to add row: ' + error.message);
  } finally {
    loading.value = false;
  }
}

function canEdit(row) {
  if (row.editable_until === null) {
    return true;
  }
  const now = new Date();
  return now < new Date(row.editable_until);
}

async function saveRow(row) {
  row.isEditing = false;
  
  let newEditableUntil = row.editable_until;
  if (row.editable_until === null) {
    const now = new Date();
    newEditableUntil = new Date(now.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  }

  const updates = {
    id: row.id,
    dump_name: row.dump_name,
    deposit: formatMoney(row.deposit),
    date: row.date,
    rate: formatMoney(row.rate),
    quantity_deposited: row.quantity_deposited,
    quantity_supplied: row.quantity_supplied,
    status: row.status,
    editable_until: newEditableUntil,
    set_id: currentSetId.value
  };

  loading.value = true;
  try {
    // Update main inventory
    const { error: inventoryError } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', row.id);
    
    if (inventoryError) throw inventoryError;

    // Also save to dump_inventory
    const dumpData = {
      dump_name: row.dump_name,
      deposit: parseFloat(row.deposit?.toString().replace(/[^\d.]/g, '')) || 0,
      date: row.date,
      rate: parseFloat(row.rate?.toString().replace(/[^\d.]/g, '')) || 0,
      quantity_deposited: parseInt(row.quantity_deposited) || 0,
      quantity_supplied: parseInt(row.quantity_supplied) || 0,
      amount_remaining: parseFloat(getAmountRemaining(row).replace(/[^\d.]/g, '')) || 0,
      status: row.status,
      set_id: currentSetId.value,
      updated_at: new Date().toISOString()
    };

    const { error: dumpError } = await supabase
      .from('dump_inventory')
      .insert(dumpData);

    if (dumpError) throw dumpError;

    ElMessage.success('Row saved!');
    const index = inventory.value.findIndex(item => item.id === row.id);
    if (index !== -1) {
      inventory.value[index].editable_until = newEditableUntil;
    }
  } catch (error) {
    ElMessage.error('Failed to save row: ' + error.message);
    row.isEditing = true; // Revert to editing mode on failure
  } finally {
    loading.value = false;
  }
}

function editRow(row) {
  if (canEdit(row)) row.isEditing = true;
}

async function deleteRow(row) {
  if (canEdit(row)) {
    if (window.confirm('Are you sure you want to delete this row?')) {
      loading.value = true;
      try {
        const { error } = await supabase.from('inventory').delete().eq('id', row.id);
        if (error) throw error;
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

function closeAccount() {
  if (!hasGeneratedReport.value) {
    ElMessage.error('Please generate a report before closing the account');
    return;
  }

  if (window.confirm('Are you sure you want to close the current set of data?')) {
    // Generate new set ID for fresh data
    currentSetId.value = new Date().toISOString();
    localStorage.setItem('currentSetId', currentSetId.value);
    
    // Clear local view
    inventory.value = [];
    hasGeneratedReport.value = false;
    ElMessage.success('Current data set closed. You can now start adding fresh data.');
  }
}

// Computed properties for each row
function getTotalSuppliedAmount(row) {
  const rate = parseFloat(row.rate?.toString().replace(/[^\d.]/g, '')) || 0;
  const quantitySupplied = parseFloat(row.quantity_supplied?.toString().replace(/[^\d.]/g, '')) || 0;
  const total = rate * quantitySupplied;
  return total > 0 ? formatMoney(total.toString()) : '';
}

function getAmountRemaining(row) {
  const deposit = parseFloat(row.deposit?.toString().replace(/[^\d.]/g, '')) || 0;
  const totalSupplied = parseFloat(getTotalSuppliedAmount(row).replace(/[^\d.]/g, '')) || 0;
  const remaining = deposit - totalSupplied;
  return remaining >= 0 ? formatMoney(remaining.toString()) : formatMoney('0');
}

function getQuantityRemaining(row) {
  const quantityDeposited = parseFloat(row.quantity_deposited?.toString().replace(/[^\d.]/g, '')) || 0;
  const quantitySupplied = parseFloat(row.quantity_supplied?.toString().replace(/[^\d.]/g, '')) || 0;
  const remaining = quantityDeposited - quantitySupplied;
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
      const remaining = parseFloat(getAmountRemaining(item).replace(/[^\d.]/g, '')) || 0;
      return sum + remaining;
    }, 0);

    // Create a summary header
    const summary = [
      `<h2 class="text-lg font-bold">Inventory Report - ${currentDate}</h2>`,
      `<h3 class="text-sm font-bold">Set ID: ${currentSetId.value}</h3>`,
      `<h3 class="text-sm font-bold">Total Records: ${totalItems}</h3>`,
      '<h3 class="text-sm font-bold mb-2">Detailed Records:</h3>'
    ].join('\n');

    // Create detailed records with natural language format
    const details = inventory.value.map((item, index) => {
      const quantityRemaining = getQuantityRemaining(item);
      
      return [
        `<h3 class="text-sm font-bold">Record #${index + 1}:</h3>`,
        `<ul class="list-disc pl-6 py-2">
           <li class="font-medium">Dump Name:<b> ${item.dump_name}</b></li>
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
</script>

<template>
  <div class="overflow-x-auto rounded-lg shadow bg-white p-4 relative">
    <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
      <p>Loading...</p>
    </div>
    <button class="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-900" @click="addRow">Add Row</button>
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
              <span v-else>{{ row.dump_name }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.deposit" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.deposit }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.date" type="date" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateDateInput" />
              <span v-else>{{ row.date }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.rate" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.rate }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.quantity_deposited" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.quantity_deposited }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <input v-if="row.isEditing && canEdit(row)" v-model="row.quantity_supplied" class="border rounded px-1 py-0.5 w-full text-sm" @keydown="validateNumericInput" />
              <span v-else>{{ row.quantity_supplied }}</span>
            </td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ getTotalSuppliedAmount(row) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ getAmountRemaining(row) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-sm text-center">{{ getQuantityRemaining(row) }}</td>
            <td class="px-2 py-2 border border-blue-200 text-center">
              <select v-if="row.isEditing && canEdit(row)" v-model="row.status" class="border rounded px-1 py-0.5 w-full text-center text-sm">
                <option value="In supply">In supply</option>
                <option value="Paid">Paid</option>
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
    <button @click="handleGenerateReport" class="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">Generate Report</button>
    <button class="mt-2 mx-3 px-2 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-800" @click="closeAccount">Close Account</button>
  </div>
</template>
