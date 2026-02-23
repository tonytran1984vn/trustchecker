/**
 * Risk – Pattern Clusters (QR reuse + device clustering)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const clusters = [
        { id: 'CL-007', type: 'QR Reuse', size: 14, region: 'BKK-PNH corridor', pattern: 'Same 14 QR codes scanned across 3 locations within 48h', risk: 89, status: 'active' },
        { id: 'CL-006', type: 'Device Cluster', size: 8, region: 'HCM retail', pattern: '8 devices with same IP block scanning high-value products', risk: 75, status: 'investigating' },
        { id: 'CL-005', type: 'QR Reuse', size: 6, region: 'Da Nang', pattern: '6 QR codes from recalled batch B-0812 still being scanned', risk: 82, status: 'investigating' },
        { id: 'CL-004', type: 'Behavioral', size: 3, region: 'Singapore', pattern: '3 rooted devices, scripted scan intervals (exactly 30s apart)', risk: 91, status: 'active' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Pattern Clusters</h1></div>

      <div class="sa-card">
        ${clusters.map(c => `
          <div style="padding:1rem;margin-bottom:0.75rem;border-radius:10px;border-left:4px solid ${c.risk >= 80 ? '#ef4444' : '#f59e0b'};background:rgba(255,255,255,0.01)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="sa-code" style="font-weight:600">${c.id}</span>
                <span class="sa-status-pill sa-pill-${c.type.includes('QR') ? 'orange' : c.type === 'Device Cluster' ? 'blue' : 'red'}">${c.type}</span>
                <span class="sa-score sa-score-${c.risk >= 80 ? 'danger' : 'warning'}">${c.risk}</span>
                <span style="font-size:0.72rem;color:var(--text-secondary)">${c.size} items · ${c.region}</span>
              </div>
              <span class="sa-status-pill sa-pill-${c.status === 'active' ? 'red' : 'orange'}">${c.status}</span>
            </div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.5rem">${c.pattern}</div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-xs btn-primary">Analyze</button>
              <button class="btn btn-xs btn-outline">Create Case</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
