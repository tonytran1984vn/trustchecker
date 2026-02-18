/**
 * TrustChecker – Api Docs Page
 */


export function renderPage() {
  return `
    <div class="card" style="margin-bottom:16px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">📖</span>
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker REST API v8.8.6</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Full endpoint reference • JWT Authentication • JSON responses</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/api/docs" target="_blank" rel="noopener noreferrer" class="btn-action" style="text-decoration:none">📋 JSON Spec</a>
          <a href="/api/docs/html" target="_blank" rel="noopener noreferrer" class="btn-action primary" style="text-decoration:none">🔗 Open Full Docs</a>
        </div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;border-radius:12px;height:calc(100vh - 240px)">
      <iframe src="/api/docs/html" style="width:100%;height:100%;border:none;background:#0a0e1a"></iframe>
    </div>
  `;
}

// Window exports for onclick handlers

