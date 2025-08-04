<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryDumpStore } from '../stores/inventoryDumpStore';
import { ElNotification } from 'element-plus';

const router = useRouter();

const EDIT_WINDOW_MINUTES = 5;
const inventoryDumpStore = useInventoryDumpStore();

const headings = [
  'S/N',
  'Dump Name',
  'Deposit',
  'Date',
  'Rate',
  'Quantity Deposited',
  'Total Amount Supplied',
  'Quantity Supplied',
  'Amount Remaining',
  'Quantity Remaining',
  'Status',
];

const inventory = ref([
  {
    id: 1,
    dumpName: 'Heartland',
    deposit: '₦20000',
    date: '24-12-2024',
    rate: '₦80000',
    quantityDeposited: '230',
    totalAmountSupplied: '₦11,680,000',
    quantitySupplied: '',
    amountRemaining: '',
    quantityRemaining: '',
    status: 'In Stock',
    createdAt: new Date(),
    isEditing: false,
    editableUntil: null, // null until first save
  },
]);

function addRow() {
  inventory.value.push({
    id: inventory.value.length + 1,
    dumpName: '',
    deposit: '',
    date: '',
    rate: '',
    quantityDeposited: '',
    totalAmountSupplied: '',
    quantitySupplied: '',
    amountRemaining: '',
    quantityRemaining: '',
    status: '',
    createdAt: new Date(),
    isEditing: true,
    editableUntil: null,
  });
}

function canEdit(row) {
  if (row.editableUntil === null) {
    // Editable until first save
    return true;
  }
  const now = new Date();
  return now < new Date(row.editableUntil);
}

async function saveRow(row) {
  row.isEditing = false;
  
  // Always save to Supabase (both new and edited rows)
  try {
    console.log('Attempting to save row:', row);
    const result = await inventoryDumpStore.addToDump(row);
    console.log('Row saved successfully to Supabase:', result);
    
    // Show success message
    alert(`✅ Row saved successfully for ${row.dumpName}!`);
    
    // Set the edit window after first save
    if (row.editableUntil === null) {
      const now = new Date();
      row.editableUntil = new Date(now.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
    }
  } catch (error) {
    console.error('Failed to save row:', error);
    alert(`❌ Failed to save row: ${error.message}`);
  }
}

function editRow(row) {
  if (canEdit(row)) row.isEditing = true;
}

function deleteRow(row) {
  if (canEdit(row)) {
    inventory.value = inventory.value.filter(r => r !== row);
    // Re-number S/N
    inventory.value.forEach((r, idx) => r.id = idx + 1);
  }
}

// Get dumps from localStorage to match inventoryDump component
const getDumps = () => {
  const savedDumps = localStorage.getItem('inventoryDumps');
  if (savedDumps) {
    return JSON.parse(savedDumps);
  }
  
  // Fallback to default dumps if localStorage is empty
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

const dumps = getDumps();

function navigateToDumpDetails(dumpName) {
  const dump = dumps.find(d => d.name === dumpName);
  if (dump) {
    router.push(`/dashboard/dump/inventory/${dump.id}`);
  }
}

// Test function to verify Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const data = await inventoryDumpStore.fetchDumpsByName('Heartland');
    console.log('Test successful - data retrieved:', data);
    alert(`✅ Supabase connection working! Found ${data.length} records for Heartland.`);
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    alert(`❌ Supabase connection failed: ${error.message}`);
  }
}

function exportInventory() {
  const csvContent = `S/N,Dump Name,Deposit,Date,Rate,Quantity Deposited,Total Amount Supplied,Quantity Supplied,Amount Remaining,Quantity Remaining,Status\n` +
    inventory.value.map(row => `${row.id},${row.dumpName},${row.deposit},${row.date},${row.rate},${row.quantityDeposited},${row.totalAmountSupplied},${row.quantitySupplied},${row.amountRemaining},${row.quantityRemaining},${row.status}`).join('\n');
  
  const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'inventory.csv');
  link.click();
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header Section -->
      <div class="mb-8">
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p class="mt-2 text-sm text-gray-600">Add, edit, and manage your inventory records</p>
            </div>
            
            <div class="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
              <button 
                @click="addRow" 
                class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add New Record
              </button>
              <button 
                @click="testSupabaseConnection" 
                class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Test Connection
              </button>
              <button 
                @click="exportInventory" 
                class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 011-2h2"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16a3 3 0 013 3v8a3 3 0 01-3 3H4a3 3 0 01-3-3V9a3 3 0 013-3z"></path>
                </svg>
                Export to CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Inventory Records</h2>
          <p class="text-sm text-gray-600">{{ inventory.length }} {{ inventory.length === 1 ? 'record' : 'records' }} total</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full table-fixed">
            <thead class="bg-green-200 text-sm">
              <tr>
                <th class="px-2 py-2 w-12 border">S/N</th>
                <th class="px-2 py-2 w-32 border">Dump Name</th>
                <th class="px-2 py-2 w-24 border">Deposit</th>
                <th class="px-2 py-2 w-28 border">Date</th>
                <th class="px-2 py-2 w-24 border">Rate</th>
                <th class="px-2 py-2 w-32 border">Quantity Deposited</th>
                <th class="px-2 py-2 w-40 border">Total Amount Supplied</th>
                <th class="px-2 py-2 w-32 border">Quantity Supplied</th>
                <th class="px-2 py-2 w-32 border">Amount Remaining</th>
                <th class="px-2 py-2 w-32 border">Quantity Remaining</th>
                <th class="px-2 py-2 w-24 border">Status</th>
                <th class="px-2 py-2 w-32 border">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in inventory" :key="row.id">
                <td class="px-2 py-2 border">{{ row.id }}</td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.dumpName" class="border rounded px-1 py-0.5 w-full" />
                  <button 
                    v-else 
                    @click="navigateToDumpDetails(row.dumpName)"
                    class="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                  >
                    {{ row.dumpName }}
                  </button>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.deposit" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.deposit }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.date" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.date }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.rate" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.rate }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.quantityDeposited" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.quantityDeposited }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.totalAmountSupplied" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.totalAmountSupplied }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.quantitySupplied" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.quantitySupplied }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.amountRemaining" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.amountRemaining }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.quantityRemaining" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.quantityRemaining }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <input v-if="row.isEditing && canEdit(row)" v-model="row.status" class="border rounded px-1 py-0.5 w-full" />
                  <span v-else>{{ row.status }}</span>
                </td>
                <td class="px-2 py-2 border">
                  <button v-if="!row.isEditing && canEdit(row)" class="text-blue-600 hover:underline mr-2" @click="editRow(row)">Edit</button>
                  <button v-if="row.isEditing && canEdit(row)" class="text-green-600 hover:underline mr-2" @click="saveRow(row)">Save</button>
                  <button v-if="canEdit(row)" class="text-red-600 hover:underline" @click="deleteRow(row)">Delete</button>
                  <span v-if="!canEdit(row)" class="text-gray-400 text-xs">Locked</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p class="text-xs text-gray-500">* Rows are editable and deletable for {{ EDIT_WINDOW_MINUTES }} minutes after first save.</p>
        </div>
      </div>
    </div>
  </div>
</template> 