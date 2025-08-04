import { ElMessage } from 'element-plus';
import { supabase } from './supabase';

export async function generateReport(inventory, getTotalSuppliedAmount, getAmountRemaining, getQuantityRemaining) {
  if (!inventory.length) {
    ElMessage.warning('No inventory data to report.');
    return;
  }

  const now = new Date();
  const dateString = now.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let report = `INVENTORY REPORT\nGenerated: ${dateString}\n\n`;

  const totalItems = inventory.length;
  const totalSuppliedAmount = inventory.reduce((sum, row) => {
    const val = parseFloat(getTotalSuppliedAmount(row).replace(/[^\d.]/g, '')) || 0;
    return sum + val;
  }, 0);
  const totalRemainingAmount = inventory.reduce((sum, row) => {
    const val = parseFloat(getAmountRemaining(row).replace(/[^\d.]/g, '')) || 0;
    return sum + val;
  }, 0);
  const totalRemainingQuantity = inventory.reduce((sum, row) => {
    const val = parseFloat(getQuantityRemaining(row)) || 0;
    return sum + val;
  }, 0);

  report += `Summary:\n`;
  report += `- Total inventory entries: ${totalItems}\n`;
  report += `- Total amount supplied: ₦${totalSuppliedAmount.toLocaleString('en-NG')}\n`;
  report += `- Total amount remaining: ₦${totalRemainingAmount.toLocaleString('en-NG')}\n`;
  report += `- Total quantity yet to be supplied: ${totalRemainingQuantity.toLocaleString('en-NG')}\n\n`;

  report += `Details:\n`;

  inventory.forEach((row, index) => {
    report += `${index + 1}. Dump Name: ${row.dump_name}\n`;
    report += `   - Deposit: ${row.deposit}\n`;
    report += `   - Date: ${row.date}\n`;
    report += `   - Rate: ${row.rate}\n`;
    report += `   - Quantity Deposited: ${row.quantity_deposited}\n`;
    report += `   - Quantity Supplied: ${row.quantity_supplied}\n`;
    report += `   - Total Supplied Value: ${getTotalSuppliedAmount(row)}\n`;
    report += `   - Amount Remaining: ${getAmountRemaining(row)}\n`;
    report += `   - Quantity Remaining: ${getQuantityRemaining(row)}\n`;
    report += `   - Status: ${row.status}\n\n`;
  });

  try {
    const { error } = await supabase.from('reports').insert({
      report_text: report,
      report_title: `Inventory Report - ${dateString}`
    });

    if (error) throw error;
    ElMessage.success('Report saved to Supabase!');
  } catch (error) {
    ElMessage.error('Failed to save report: ' + error.message);
  }
}