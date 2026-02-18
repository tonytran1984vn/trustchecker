/**
 * TrustChecker – CSV Export Service
 */
import { State } from '../core/state.js';
import { showToast } from '../components/toast.js';

export function exportCSV(filename, headers, rows) {
    // Sanitize cells to prevent CSV injection (formula injection in Excel)
    const sanitizeCell = (cell) => {
        const s = String(cell || '').replace(/"/g, '""');
        // Prefix formula-trigger characters with a single quote
        if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
        return s;
    };
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${sanitizeCell(cell)}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`📊 ${filename} exported successfully`, 'success');
}

export function exportProductsCSV() {
    exportCSV('products.csv',
        ['Name', 'SKU', 'Category', 'Manufacturer', 'Origin', 'Trust Score', 'Status'],
        State.products.map(p => [p.name, p.sku, p.category, p.manufacturer, p.origin_country, p.trust_score, p.status])
    );
}

export function exportScansCSV() {
    exportCSV('scan-history.csv',
        ['Product', 'Result', 'Fraud %', 'Trust Score', 'City', 'Country', 'Response ms', 'Time'],
        (State.scanHistory || []).map(s => [s.product_name, s.result, (s.fraud_score * 100).toFixed(1), s.trust_score, s.geo_city, s.geo_country, s.response_time_ms, s.scanned_at])
    );
}

export function exportEvidenceCSV() {
    const items = State.evidenceData?.items || [];
    exportCSV('evidence.csv',
        ['Title', 'Description', 'Type', 'Size', 'SHA-256', 'Status', 'Created'],
        items.map(e => [e.title, e.description, e.file_type, e.file_size, e.sha256_hash, e.blockchain_seal_id ? 'Anchored' : 'Pending', e.created_at])
    );
}

export function exportFraudCSV() {
    exportCSV('fraud-alerts.csv',
        ['Type', 'Description', 'Severity', 'Product', 'Status', 'Time'],
        State.fraudAlerts.map(a => [a.alert_type, a.description, a.severity, a.product_name, a.status, a.created_at])
    );
}

window.exportCSV = exportCSV;
window.exportProductsCSV = exportProductsCSV;
window.exportScansCSV = exportScansCSV;
window.exportEvidenceCSV = exportEvidenceCSV;
window.exportFraudCSV = exportFraudCSV;
