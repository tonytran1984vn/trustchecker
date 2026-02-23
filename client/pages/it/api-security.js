/**
 * IT – API Security (Key rotation, token, webhook sig, OAuth)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} API Security</h1></div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Token & Key Policy</h3>
        <div class="sa-threshold-list">
          ${th('API Key Rotation', 'Every 90 days')}
          ${th('Token Expiration', '1 hour (access) / 30 days (refresh)')}
          ${th('Max Keys per User', '3')}
          ${th('Auto-revoke Inactive', '30 days unused')}
        </div>
      </div>
      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Webhook Security</h3>
        <div class="sa-threshold-list">
          ${th('Signature Algorithm', 'HMAC-SHA256')}
          ${th('Signature Header', 'X-TC-Signature')}
          ${th('Retry on Failure', '3 attempts, exponential backoff')}
          ${th('Payload Encryption', 'Optional (AES-256)')}
        </div>
      </div>
      <div class="sa-card">
        <h3>OAuth2 Security</h3>
        <div class="sa-threshold-list">
          ${th('Grant Types', 'Authorization Code, Client Credentials')}
          ${th('PKCE Required', 'Yes (public clients)')}
          ${th('Redirect URI Validation', 'Strict match')}
          ${th('Scope Restrictions', 'read, write, admin')}
        </div>
      </div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:260px;text-align:center" /></div></div>`; }
