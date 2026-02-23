/**
 * TrustChecker – Utility Helpers
 */

export function timeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
    return new Date(date).toLocaleDateString();
}

export function shortHash(h) {
    return h ? h.slice(0, 8) + '…' + h.slice(-6) : '—';
}

export function scoreColor(s) {
    if (s >= 80) return 'var(--emerald)';
    if (s >= 50) return 'var(--amber)';
    return 'var(--rose)';
}

export function eventIcon(type) {
    const icons = {
        'scan': '📱', 'fraud_alert': '🚨', 'product_registered': '📦',
        'blockchain_seal': '🔗', 'kyc_verified': '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>', 'evidence_uploaded': '🔒',
        'scm_event': '🏭', 'user_login': '👤', 'system': '⚙️',
    };
    return icons[type] || '📌';
}

export function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

window.timeAgo = timeAgo;
window.shortHash = shortHash;
window.scoreColor = scoreColor;
window.eventIcon = eventIcon;
window.downloadJSON = downloadJSON;
