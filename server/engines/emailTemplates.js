/**
 * Email Template Engine
 * Generates HTML email templates for transactional notifications
 */

class EmailTemplates {
    constructor() {
        this.brandName = 'TrustChecker';
        this.brandColor = '#6366f1';
        this.footerText = '© 2026 TrustChecker — Anti-Counterfeit QR Validation Platform';
    }

    /** Base HTML wrapper */
    _wrap(title, body) {
        return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;background:#f4f5f7;color:#1a1a2e}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,${this.brandColor},#818cf8);padding:32px 24px;text-align:center;color:#fff}
.header h1{margin:0;font-size:22px;font-weight:700}
.header p{margin:8px 0 0;opacity:.85;font-size:14px}
.body{padding:32px 24px}
.body h2{color:#1a1a2e;font-size:18px;margin:0 0 16px}
.body p{color:#4a4a68;line-height:1.6;margin:0 0 16px}
.btn{display:inline-block;background:${this.brandColor};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0}
.alert-box{padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid}
.alert-warning{background:#fff3cd;border-color:#ff9800;color:#856404}
.alert-success{background:#d4edda;border-color:#28a745;color:#155724}
.alert-danger{background:#f8d7da;border-color:#dc3545;color:#721c24}
.metric{display:inline-block;text-align:center;padding:12px 20px;margin:4px;background:#f8f9ff;border-radius:8px}
.metric .val{font-size:24px;font-weight:700;color:${this.brandColor}}
.metric .label{font-size:12px;color:#6b6b8d}
.footer{background:#f8f9ff;padding:20px 24px;text-align:center;font-size:12px;color:#9a9abd}
.footer a{color:${this.brandColor}}
code{background:#f0f0f5;padding:2px 6px;border-radius:4px;font-size:13px}
</style></head><body>
<div class="container">
<div class="header"><h1>🔒 ${this.brandName}</h1><p>Anti-Counterfeit Verification Platform</p></div>
<div class="body">${body}</div>
<div class="footer">${this.footerText}<br>
<a href="#">Notification Preferences</a> · <a href="#">Privacy Policy</a></div>
</div></body></html>`;
    }

    /** Password reset email */
    passwordReset(username, resetToken, resetUrl) {
        return this._wrap('Reset Your Password', `
<h2>Password Reset Request</h2>
<p>Hi <strong>${username}</strong>,</p>
<p>We received a request to reset your password. Click the button below to create a new password:</p>
<center><a href="${resetUrl || '#'}?token=${resetToken}" class="btn">Reset Password</a></center>
<p>Or copy this code: <code>${resetToken}</code></p>
<div class="alert-box alert-warning">This token expires in 1 hour. If you didn't request this, ignore this email.</div>
        `);
    }

    /** Welcome email */
    welcome(username, loginUrl) {
        return this._wrap('Welcome to TrustChecker', `
<h2>Welcome aboard, ${username}! 🎉</h2>
<p>Your account has been created successfully. You now have access to the world's most advanced anti-counterfeit verification platform.</p>
<center>
<div class="metric"><div class="val">✅</div><div class="label">Account Active</div></div>
<div class="metric"><div class="val">100</div><div class="label">Free Scans</div></div>
<div class="metric"><div class="val">24/7</div><div class="label">API Access</div></div>
</center>
<center><a href="${loginUrl || '#'}" class="btn">Go to Dashboard</a></center>
        `);
    }

    /** Fraud alert email */
    fraudAlert(productName, fraudScore, scanId, alertDetails) {
        const severity = fraudScore > 0.8 ? 'CRITICAL' : fraudScore > 0.5 ? 'HIGH' : 'MEDIUM';
        const alertClass = fraudScore > 0.8 ? 'alert-danger' : 'alert-warning';

        return this._wrap(`Fraud Alert — ${severity}`, `
<h2>⚠️ Fraud Alert Detected</h2>
<div class="alert-box ${alertClass}"><strong>${severity} SEVERITY</strong> — Suspicious activity detected</div>
<p><strong>Product:</strong> ${productName}<br>
<strong>Fraud Score:</strong> ${(fraudScore * 100).toFixed(0)}%<br>
<strong>Scan ID:</strong> <code>${scanId}</code></p>
<p>${alertDetails || 'Please review this alert immediately in your dashboard.'}</p>
<center><a href="#" class="btn">Review Alert</a></center>
        `);
    }

    /** Scan verification receipt */
    scanReceipt(productName, result, trustScore, fraudScore, sealHash) {
        const resultIcon = result === 'valid' ? '✅' : result === 'suspicious' ? '⚠️' : '❌';
        const alertClass = result === 'valid' ? 'alert-success' : result === 'suspicious' ? 'alert-warning' : 'alert-danger';

        return this._wrap('Scan Verification Receipt', `
<h2>${resultIcon} Scan Complete</h2>
<div class="alert-box ${alertClass}"><strong>Result:</strong> ${result.toUpperCase()}</div>
<p><strong>Product:</strong> ${productName}</p>
<center>
<div class="metric"><div class="val">${trustScore}</div><div class="label">Trust Score</div></div>
<div class="metric"><div class="val">${(fraudScore * 100).toFixed(0)}%</div><div class="label">Fraud Risk</div></div>
</center>
<p><strong>Blockchain Seal:</strong> <code>${sealHash || 'N/A'}</code></p>
        `);
    }

    /** Invoice/payment email */
    invoice(planName, amount, currency, invoiceId, period) {
        return this._wrap('Payment Confirmation', `
<h2>Payment Received 💳</h2>
<div class="alert-box alert-success"><strong>Payment successful!</strong></div>
<p><strong>Plan:</strong> ${planName}<br>
<strong>Amount:</strong> ${currency || 'USD'} ${amount}<br>
<strong>Invoice ID:</strong> <code>${invoiceId}</code><br>
<strong>Period:</strong> ${period || 'Current billing cycle'}</p>
<center><a href="#" class="btn">View Invoice</a></center>
        `);
    }

    /** KYC status update */
    kycStatus(businessName, status, reason) {
        const icon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
        const alertClass = status === 'approved' ? 'alert-success' : status === 'rejected' ? 'alert-danger' : 'alert-warning';

        return this._wrap('KYC Verification Update', `
<h2>${icon} KYC Verification — ${status.toUpperCase()}</h2>
<div class="alert-box ${alertClass}"><strong>${businessName}</strong> — ${status}</div>
<p>${reason || 'Your verification has been processed.'}</p>
<center><a href="#" class="btn">View Details</a></center>
        `);
    }

    /** Weekly summary digest */
    weeklyDigest(stats) {
        return this._wrap('Weekly Activity Digest', `
<h2>📊 Your Weekly Summary</h2>
<center>
<div class="metric"><div class="val">${stats.total_scans || 0}</div><div class="label">Total Scans</div></div>
<div class="metric"><div class="val">${stats.fraud_alerts || 0}</div><div class="label">Fraud Alerts</div></div>
<div class="metric"><div class="val">${stats.avg_trust || 0}</div><div class="label">Avg Trust</div></div>
<div class="metric"><div class="val">${stats.new_products || 0}</div><div class="label">New Products</div></div>
</center>
<p>Keep up the great work protecting your supply chain! 🛡️</p>
<center><a href="#" class="btn">View Full Report</a></center>
        `);
    }

    /** Get all available templates list */
    listTemplates() {
        return [
            { name: 'password_reset', description: 'Password reset with token', params: ['username', 'resetToken', 'resetUrl'] },
            { name: 'welcome', description: 'New user welcome', params: ['username', 'loginUrl'] },
            { name: 'fraud_alert', description: 'Fraud detection notification', params: ['productName', 'fraudScore', 'scanId', 'alertDetails'] },
            { name: 'scan_receipt', description: 'Scan verification receipt', params: ['productName', 'result', 'trustScore', 'fraudScore', 'sealHash'] },
            { name: 'invoice', description: 'Payment confirmation', params: ['planName', 'amount', 'currency', 'invoiceId', 'period'] },
            { name: 'kyc_status', description: 'KYC verification update', params: ['businessName', 'status', 'reason'] },
            { name: 'weekly_digest', description: 'Weekly activity summary', params: ['stats'] },
        ];
    }

    /** Preview a template with sample data */
    preview(templateName) {
        const sampleData = {
            password_reset: () => this.passwordReset('John Doe', 'abc123xyz', 'https://trustchecker.app/reset'),
            welcome: () => this.welcome('John Doe', 'https://trustchecker.app/dashboard'),
            fraud_alert: () => this.fraudAlert('Premium Headphones XR-500', 0.87, 'scan-abc-123', 'Multiple scans from unauthorized region'),
            scan_receipt: () => this.scanReceipt('Premium Headphones XR-500', 'valid', 92, 0.05, '0xab3f...9cd1'),
            invoice: () => this.invoice('Professional', 99, 'USD', 'INV-2026-001', 'Feb 2026'),
            kyc_status: () => this.kycStatus('Acme Corporation', 'approved', 'All verification checks passed'),
            weekly_digest: () => this.weeklyDigest({ total_scans: 347, fraud_alerts: 3, avg_trust: 88, new_products: 12 }),
        };

        return sampleData[templateName] ? sampleData[templateName]() : null;
    }
}

module.exports = new EmailTemplates();
