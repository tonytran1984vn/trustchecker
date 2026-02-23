/**
 * Scan Result – Enterprise Consumer-Facing Verification Response
 * 3 Tiers: First Scan (<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>) → Duplicate Warning (<span class="status-icon status-warn" aria-label="Warning">!</span>) → Anomaly Alert (🚨)
 * + Internal Risk Engine trigger per persona
 */
import { icon } from '../core/icons.js';

// ─── SIMULATED SCAN SCENARIOS ──────────────────────────────────
const SCENARIOS = [
    {
        id: 'first-scan',
        label: 'Lần đầu xác thực',
        scanCount: 1,
        ers: 0,
        firstScanTime: null,
        geo: { city: 'Hồ Chí Minh', country: 'VN', lat: 10.776, lng: 106.700 },
        product: { name: 'Premium Coffee Blend (Arabica)', sku: 'ACME-CFE-001', batch: 'B-2026-0895', factory: 'Factory HCM-01', production: '2026-02-15', expiry: '2028-02-15' },
    },
    {
        id: 'duplicate',
        label: 'Lần thứ 2 (trùng mã)',
        scanCount: 2,
        ers: 35,
        firstScanTime: '14:30 – 18/02/2026',
        geo: { city: 'Hà Nội', country: 'VN', lat: 21.028, lng: 105.834 },
        product: { name: 'Premium Coffee Blend (Arabica)', sku: 'ACME-CFE-001', batch: 'B-2026-0895', factory: 'Factory HCM-01', production: '2026-02-15', expiry: '2028-02-15' },
    },
    {
        id: 'anomaly',
        label: 'Bất thường (10 lần, nhiều vùng)',
        scanCount: 10,
        ers: 82,
        firstScanTime: '09:15 – 17/02/2026',
        geo: { city: 'Phnom Penh', country: 'KH', lat: 11.556, lng: 104.928 },
        product: { name: 'Premium Coffee Blend (Arabica)', sku: 'ACME-CFE-001', batch: 'B-2026-0895', factory: 'Factory HCM-01', production: '2026-02-15', expiry: '2028-02-15' },
    },
];

export function renderPage() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const brandName = 'TrustChecker';

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Scan Verification Response</h1>
        <div class="sa-title-actions"><span style="font-size:0.72rem;color:var(--text-secondary)">Enterprise-grade consumer-facing verification + internal risk trigger</span></div>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem">
        ${SCENARIOS.map(s => `<button class="btn btn-sm ${s.id === 'first-scan' ? 'btn-primary' : 'btn-outline'}" onclick="document.querySelectorAll('.scan-scenario').forEach(el=>el.style.display='none');document.getElementById('sc-${s.id}').style.display='block';this.parentElement.querySelectorAll('.btn').forEach(b=>b.className='btn btn-sm btn-outline');this.className='btn btn-sm btn-primary'">${s.label}</button>`).join('')}
      </div>

      <!-- SCENARIO 1: FIRST SCAN <span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> -->
      <div id="sc-first-scan" class="scan-scenario">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <!-- Consumer-facing -->
          <div class="sa-card" style="border-left:4px solid #22c55e">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">👤 Consumer Response</div>
            <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:1.5rem;text-align:center">
              <div style="font-size:2.5rem;margin-bottom:0.5rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
              <div style="font-size:1.3rem;font-weight:800;color:#22c55e;margin-bottom:0.5rem">Sản phẩm chính hãng đã được xác thực</div>
              <div style="font-size:0.88rem;color:var(--text-primary);margin-bottom:1rem">Mã sản phẩm này được xác thực lần đầu vào:</div>
              <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem">${timeStr} – ${dateStr}</div>
              <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Hệ thống ghi nhận đây là lần xác thực đầu tiên của mã này.</div>
              <div style="border-top:1px solid rgba(34,197,94,0.15);padding-top:0.75rem;font-size:0.78rem;color:var(--text-secondary)">Cảm ơn bạn đã tin tưởng thương hiệu <strong>${brandName}</strong>.</div>
            </div>
          </div>

          <!-- Internal System -->
          <div class="sa-card" style="border-left:4px solid #3b82f6">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">⚙ Internal System Logic</div>
            ${internalBlock('Event Risk Score (ERS)', '0', '#22c55e', 'First scan → ERS = 0 → Log only')}
            <div style="font-size:0.78rem;line-height:1.8;padding:0.75rem;background:rgba(59,130,246,0.04);border-radius:6px;margin-top:0.75rem">
              <div><span class="status-icon status-pass" aria-label="Pass">✓</span> <strong>mark first_scan</strong> = true</div>
              <div><span class="status-icon status-pass" aria-label="Pass">✓</span> <strong>store geo</strong>: HCM, VN (10.776, 106.700)</div>
              <div><span class="status-icon status-pass" aria-label="Pass">✓</span> <strong>store device_hash</strong>: web-Mozilla/5.0...</div>
              <div><span class="status-icon status-pass" aria-label="Pass">✓</span> <strong>store timestamp</strong>: ${timeStr} ${dateStr}</div>
              <div><span class="status-icon status-pass" aria-label="Pass">✓</span> <strong>batch link</strong>: B-2026-0895</div>
              <div style="color:var(--text-secondary);margin-top:0.3rem">→ Không tạo case · Không notify · Log event only</div>
            </div>
            ${personaImpact([
        ['CEO', '—', 'First Scan Rate += 1', 'green'],
        ['Ops', '—', 'Scan counter updated', 'green'],
        ['Risk', '—', 'No action (ERS = 0)', 'green'],
        ['Compliance', '—', 'Event logged to immutable audit', 'green'],
        ['IT', '—', 'API call logged', 'green'],
    ])}
          </div>
        </div>
      </div>

      <!-- SCENARIO 2: DUPLICATE <span class="status-icon status-warn" aria-label="Warning">!</span> -->
      <div id="sc-duplicate" class="scan-scenario" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <div class="sa-card" style="border-left:4px solid #f59e0b">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">👤 Consumer Response</div>
            <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:1.5rem;text-align:center">
              <div style="font-size:2.5rem;margin-bottom:0.5rem"><span class="status-icon status-warn" aria-label="Warning">!</span></div>
              <div style="font-size:1.3rem;font-weight:800;color:#f59e0b;margin-bottom:0.5rem">Cảnh báo: Mã đã được xác thực trước đó</div>
              <div style="font-size:0.88rem;color:var(--text-primary);margin-bottom:0.75rem">Mã sản phẩm này đã được xác thực lần đầu vào:</div>
              <div style="font-size:1.1rem;font-weight:700;margin-bottom:1rem">14:30 – 18/02/2026</div>
              <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.6;padding:0.75rem;background:rgba(245,158,11,0.05);border-radius:8px;text-align:left">
                Nếu bạn không phải là người đã thực hiện lần xác thực đầu tiên, vui lòng <strong>kiểm tra kỹ nguồn gốc sản phẩm</strong> trước khi sử dụng.
              </div>
              <div style="margin-top:1rem"><button class="btn btn-sm btn-outline" style="color:#f59e0b;border-color:#f59e0b">📞 Liên hệ hỗ trợ</button></div>
            </div>
          </div>

          <div class="sa-card" style="border-left:4px solid #f59e0b">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">⚙ Internal System Logic</div>
            ${internalBlock('Event Risk Score (ERS)', '35', '#f59e0b', 'F1:15 (2nd scan) + G1:20 (HCM→HN 1,200km) = Medium')}
            <div style="font-size:0.78rem;line-height:1.8;padding:0.75rem;background:rgba(245,158,11,0.04);border-radius:6px;margin-top:0.75rem">
              <div>⚡ <strong>increment scan_count</strong> = 2</div>
              <div>⚡ <strong>calculate ERS</strong> = 35 (Medium)</div>
              <div>⚡ <strong>create soft case</strong>: SC-2026-xxxx</div>
              <div>⚡ <strong>geo delta</strong>: HCM → Hà Nội (1,200km, 28h gap)</div>
              <div>⚡ <strong>update batch BRS</strong>: B-2026-0895</div>
              <div style="color:#f59e0b;font-weight:600;margin-top:0.3rem">→ Soft case tạo · Ops dashboard notified</div>
            </div>
            ${personaImpact([
        ['CEO', '—', 'Duplicate Rate += 0.01%', 'green'],
        ['Ops', '📋', 'Soft case created → verify distribution channel', 'orange'],
        ['Risk', '📋', 'Event logged, pattern check queued', 'blue'],
        ['Compliance', '—', 'Event logged to audit trail', 'green'],
        ['IT', '—', 'Normal API pattern', 'green'],
    ])}
          </div>
        </div>
      </div>

      <!-- SCENARIO 3: ANOMALY 🚨 -->
      <div id="sc-anomaly" class="scan-scenario" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <div class="sa-card" style="border-left:4px solid #ef4444">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">👤 Consumer Response</div>
            <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:1.5rem;text-align:center">
              <div style="font-size:2.5rem;margin-bottom:0.5rem">🚨</div>
              <div style="font-size:1.3rem;font-weight:800;color:#ef4444;margin-bottom:0.5rem">Phát hiện hành vi xác thực bất thường</div>
              <div style="font-size:0.88rem;color:var(--text-primary);margin-bottom:0.75rem;line-height:1.5">Mã này đã được xác thực nhiều lần tại các địa điểm khác nhau.</div>
              <div style="font-size:0.88rem;font-weight:600;color:#ef4444;margin-bottom:1rem;padding:0.6rem;background:rgba(239,68,68,0.05);border-radius:8px"><span class="status-icon status-warn" aria-label="Warning">!</span> Sản phẩm có thể không đảm bảo tính nguyên vẹn.</div>
              <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.5;margin-bottom:1rem">
                Một sản phẩm chính hãng chỉ nên được xác thực lần đầu duy nhất.<br>
                Nếu bạn nghi ngờ sản phẩm không chính hãng, vui lòng liên hệ ngay.
              </div>
              <button class="btn btn-sm btn-primary" style="background:#ef4444;border-color:#ef4444">🚨 Báo cáo sản phẩm nghi giả</button>
            </div>
          </div>

          <div class="sa-card" style="border-left:4px solid #ef4444">
            <div style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">⚙ Internal System Logic</div>
            ${internalBlock('Event Risk Score (ERS)', '82', '#ef4444', 'G2:40 (VN→KH cross-country) + F3:25 (10 scans burst) + B3:17 (counterfeit zone) = Critical')}
            <div style="font-size:0.78rem;line-height:1.8;padding:0.75rem;background:rgba(239,68,68,0.04);border-radius:6px;margin-top:0.75rem">
              <div>🚨 <strong>ERS = 82</strong> → CRITICAL threshold breached</div>
              <div>🚨 <strong>LOCK batch</strong> B-2026-0895 (all codes frozen)</div>
              <div>🚨 <strong>Create critical case</strong>: FC-2026-xxxx</div>
              <div>🚨 <strong>Escalate</strong>: Risk → Compliance → CEO</div>
              <div>🚨 <strong>Flag product</strong> as counterfeit-suspected</div>
              <div>🚨 <strong>Geo cluster</strong>: 10 scans × 4 countries × 48h</div>
              <div style="color:#ef4444;font-weight:700;margin-top:0.3rem">→ IMMEDIATE: Batch locked · All personas notified</div>
            </div>
            ${personaImpact([
        ['CEO', '<span class="status-dot red"></span>', 'BRI alert · Counterfeit heatmap updated · Board report flag', 'red'],
        ['Ops', '<span class="status-dot red"></span>', 'Batch B-2026-0895 LOCKED · Distribution suspended', 'red'],
        ['Risk', '<span class="status-dot red"></span>', 'Critical case FC-xxxx · Pattern analysis · Confirm counterfeit', 'red'],
        ['Compliance', '<span class="status-dot red"></span>', 'Legal record created · Evidence package · Regulator report queued', 'red'],
        ['IT', '<span class="status-dot amber"></span>', 'Check for bot pattern · IP analysis · API abuse detection', 'orange'],
    ])}
          </div>
        </div>
      </div>

      <!-- PRODUCT INFO (shown for all) -->
      <div class="sa-card" style="margin-top:1.5rem">
        <h3>📦 Product Record</h3>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.75rem">
          ${[['Product', 'Premium Coffee Blend (Arabica)'], ['SKU', 'ACME-CFE-001'], ['Batch', 'B-2026-0895'], ['Factory', 'HCM-01'], ['Production', '2026-02-15'], ['Expiry', '2028-02-15']].map(([l, v]) =>
        `<div style="text-align:center;padding:0.5rem;background:rgba(99,102,241,0.03);border-radius:6px"><div style="font-size:0.65rem;color:var(--text-secondary)">${l}</div><div style="font-size:0.82rem;font-weight:600">${v}</div></div>`
    ).join('')}
        </div>
      </div>
    </div>`;
}

function internalBlock(label, value, color, detail) {
    return `<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:${color}06;border:1px solid ${color}15;border-radius:8px">
    <div style="text-align:center;min-width:60px"><div style="font-size:1.8rem;font-weight:800;color:${color}">${value}</div><div style="font-size:0.62rem;color:var(--text-secondary)">ERS</div></div>
    <div><div style="font-size:0.82rem;font-weight:700">${label}</div><div style="font-size:0.72rem;color:var(--text-secondary)">${detail}</div></div>
  </div>`;
}

function personaImpact(items) {
    return `<div style="margin-top:0.75rem"><div style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.3rem">PERSONA IMPACT:</div>
    <div style="display:grid;gap:0.25rem">${items.map(([persona, flag, action, color]) => {
        const bg = color === 'red' ? 'rgba(239,68,68,0.06)' : color === 'orange' ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.04)';
        return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0.5rem;background:${bg};border-radius:4px;font-size:0.72rem"><strong style="min-width:70px">${persona}</strong><span>${flag}</span><span style="flex:1">${action}</span></div>`;
    }).join('')}</div></div>`;
}
