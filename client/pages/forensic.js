/**
 * TrustChecker – Forensic Page
 */
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';

async function downloadForensicReport(id) {
  try {
    const report = await API.get(`/evidence/${id}/forensic-report`);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📋 Forensic report downloaded', 'success');
  } catch (err) {
    showToast('Failed to generate report: ' + err.message, 'error');
  }
}

// Window exports for onclick handlers
window.downloadForensicReport = downloadForensicReport;
