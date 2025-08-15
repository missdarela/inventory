import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { ref } from 'vue';

export const useReportStore = defineStore('Report', () => {
    const Reports = ref([]);
    const currentReport = ref(null);
    const loading = ref(false);

    async function setReport(text, type = 'inventory') {
      loading.value = true;
      try {
        const reportData = {
          content: text,
          created_at: new Date().toISOString(),
          type: type
        };

        const { data, error } = await supabase
          .from('Reports')
          .insert(reportData)
          .select();

        if (error) throw error;

        Reports.value = [...Reports.value, data[0]];
        currentReport.value = data[0];
      } catch (error) {
        console.error('Failed to save report:', error);
        throw error;
      } finally {
        loading.value = false;
      }
    }

    async function fetchReports() {
      loading.value = true;
      try {
        const { data, error } = await supabase
          .from('Reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        Reports.value = data;
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        throw error;
      } finally {
        loading.value = false;
      }
    }

    function setCurrentReport(Report) {
      currentReport.value = Report;
    }

    return {
      Reports,
      currentReport,
      loading,
      setReport,
      fetchReports,
      setCurrentReport
    };
});