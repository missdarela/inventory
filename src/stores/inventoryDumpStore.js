import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { ref } from 'vue';

export const useInventoryDumpStore = defineStore('inventoryDump', () => {
    const dumps = ref([]);
    const allInventoryData = ref([]);
    const loading = ref(false);
    const error = ref(null);

    async function addToDump(inventoryData) {
        loading.value = true;
        try {
            const dumpData = {
                dump_name: inventoryData.dumpName,
                deposit: inventoryData.deposit,
                date: inventoryData.date,
                rate: inventoryData.rate,
                quantity_deposited: inventoryData.quantityDeposited,
                total_amount_supplied: inventoryData.totalAmountSupplied,
                quantity_supplied: inventoryData.quantitySupplied,
                amount_remaining: inventoryData.amountRemaining,
                quantity_remaining: inventoryData.quantityRemaining,
                status: inventoryData.status,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('dump_inventory')
                .insert(dumpData)
                .select();

            if (error) {
                console.error('Supabase error:', error); 
                throw error;
            }

            dumps.value = [...dumps.value, data[0]];
            return data[0];
        } catch (error) {
            console.error('Failed to add to dump:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchDumpsByName(dumpName) {
        loading.value = true;
        try {
            const { data, error } = await supabase
                .from('dump_inventory')
                .select('*')
                .ilike('dump_name', dumpName)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error querying dump_inventory:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to fetch dumps:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchAllInventoryData() {
        try {
            loading.value = true;
            error.value = null;

            const { data, error: fetchError } = await supabase
                .from('dump_inventory')
                .select('*')
                .order('date', { ascending: false });

            if (fetchError) {
                console.error('Error fetching all inventory data:', fetchError);
                error.value = fetchError.message;
                return [];
            }

            allInventoryData.value = data || [];
            return data || [];
        } catch (err) {
            console.error('Error in fetchAllInventoryData:', err);
            error.value = err.message;
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function saveDumpMetadata(dumpData) {
        loading.value = true;
        try {
            const dumpEntry = {
                dump_name: dumpData.name,
                status: dumpData.status,
                deposit: 0,  
                date: new Date().toISOString().split('T')[0],
                rate: 0,
                quantity_deposited: dumpData.itemCount || 0,
                quantity_remaining: dumpData.itemCount || 0,
                created_at: new Date().toISOString(),
                set_id: 1  
            };

            const { data, error } = await supabase
                .from('dump_inventory')
                .insert(dumpEntry)
                .select();

            if (error) {
                console.error('Error saving dump metadata:', error);
                throw error;
            }

            return data[0];
        } catch (error) {
            console.error('Failed to save dump metadata:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    function capitalizeDumpName(name) {
        return name.replace(/\b\w/g, l => l.toUpperCase());
    }

    return {
        dumps,
        allInventoryData,
        loading,
        error,
        fetchDumpsByName,
        fetchAllInventoryData,
        addToDump,
        saveDumpMetadata,
        capitalizeDumpName
    };
});