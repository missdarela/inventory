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

            console.log('Saving to dump_inventory:', dumpData); // Debug log

            const { data, error } = await supabase
                .from('dump_inventory')
                .insert(dumpData)
                .select();

            if (error) {
                console.error('Supabase error:', error); // Debug log
                throw error;
            }

            console.log('Successfully saved:', data); // Debug log
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
                .eq('dump_name', dumpName)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
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
            const metadataEntry = {
                dump_name: dumpData.name,
                status: dumpData.status,
                created_at: new Date().toISOString(),
                last_updated: dumpData.lastUpdated,
                item_count: dumpData.itemCount || 0
            };

            const { data, error } = await supabase
                .from('dump_metadata')
                .insert(metadataEntry)
                .select();

            if (error) {
                console.error('Supabase metadata error:', error);
                throw error;
            }

            console.log('Successfully saved dump metadata:', data);
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