/**
 * Super Admin – Key Management
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('key', 28)} Key Management</h1></div>
      <div class="sa-card">
        <h3>Encryption Keys</h3>
        <table class="sa-table">
          <thead><tr><th>Key ID</th><th>Purpose</th><th>Algorithm</th><th>Created</th><th>Rotation</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td class="sa-code">KMS-PII-001</td>
              <td>PII Encryption</td>
              <td>AES-256-GCM</td>
              <td>2025-06-01</td>
              <td>Every 90d · Next: Mar 1</td>
              <td><span class="sa-dot sa-dot-green"></span> Active</td>
            </tr>
            <tr>
              <td class="sa-code">KMS-JWT-001</td>
              <td>JWT Signing</td>
              <td>RS256 (2048-bit)</td>
              <td>2025-06-01</td>
              <td>Every 180d · Next: Jun 1</td>
              <td><span class="sa-dot sa-dot-green"></span> Active</td>
            </tr>
            <tr>
              <td class="sa-code">KMS-QR-001</td>
              <td>QR Code Signing</td>
              <td>HMAC-SHA256</td>
              <td>2025-09-15</td>
              <td>Every 90d · Next: Mar 15</td>
              <td><span class="sa-dot sa-dot-green"></span> Active</td>
            </tr>
            <tr>
              <td class="sa-code">KMS-DB-001</td>
              <td>Database TDE</td>
              <td>AES-256-CBC</td>
              <td>2025-06-01</td>
              <td>Every 365d · Next: Jun 1</td>
              <td><span class="sa-dot sa-dot-green"></span> Active</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="sa-grid-2col" style="margin-top:1rem">
        <div class="sa-card">
          <h3>Rotation Schedule</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">Auto-Rotation</span><span class="sa-mfa-on">Enabled</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Next Rotation</span><span>KMS-PII-001 on Mar 1, 2026</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Grace Period</span><span>7 days (old key still valid)</span></div>
          </div>
        </div>
        <div class="sa-card">
          <h3>HSM Status</h3>
          <div class="sa-detail-grid">
            <div class="sa-detail-item"><span class="sa-detail-label">HSM Provider</span><span>AWS CloudHSM (FIPS 140-2 Level 3)</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Connection</span><span class="sa-mfa-on">Connected</span></div>
            <div class="sa-detail-item"><span class="sa-detail-label">Backup</span><span>Hourly to S3 (encrypted)</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
