/**
 * Generate PDF from system_description.md using Puppeteer (headless Chrome)
 */
const fs = require('fs');
const path = require('path');

// Simple markdown-to-HTML converter for tables, headers, code blocks
function mdToHtml(md) {
    let html = md;

    // Remove mermaid code blocks (not renderable in static PDF)
    html = html.replace(/```mermaid[\s\S]*?```/g, '<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:12px 0;color:#94a3b8;font-style:italic">📊 [Mermaid Diagram — xem bản online để hiển thị]</div>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:16px;overflow-x:auto;font-size:12px;line-height:1.5"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:0.85em">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Blockquotes with alerts
    html = html.replace(/> \[!(IMPORTANT|WARNING|CAUTION|NOTE|TIP)\]\n> (.*)/g, (_, type, text) => {
        const colors = { IMPORTANT: '#3b82f6', WARNING: '#f59e0b', CAUTION: '#ef4444', NOTE: '#6366f1', TIP: '#10b981' };
        return `<div style="border-left:4px solid ${colors[type] || '#6366f1'};background:#1e293b;padding:12px 16px;margin:12px 0;border-radius:0 8px 8px 0"><strong style="color:${colors[type]}">${type}:</strong> ${text}</div>`;
    });

    // Regular blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #6366f1;padding:8px 16px;margin:12px 0;color:#94a3b8;background:#1e293b;border-radius:0 8px 8px 0">$1</blockquote>');

    // Tables
    html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (match, headerRow, bodyRows) => {
        const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
        const headerHtml = headers.map(h => `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #6366f1;font-weight:600;color:#e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">${h}</th>`).join('');

        const rows = bodyRows.trim().split('\n').map(row => {
            const cells = row.split('|').map(c => c.trim()).filter(Boolean);
            return '<tr>' + cells.map(c => `<td style="padding:8px 14px;border-bottom:1px solid #1e293b;color:#cbd5e1;font-size:13px">${c}</td>`).join('') + '</tr>';
        }).join('');

        return `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#0f172a;border-radius:8px;overflow:hidden"><thead style="background:#1e293b"><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table></div>`;
    });

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4 style="color:#a5b4fc;margin:20px 0 8px;font-size:15px">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 style="color:#818cf8;margin:28px 0 12px;font-size:17px;border-bottom:1px solid #1e293b;padding-bottom:8px">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="color:#6366f1;margin:36px 0 16px;font-size:22px;border-bottom:2px solid #6366f1;padding-bottom:10px">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="color:#e2e8f0;margin:0 0 8px;font-size:28px;text-align:center">$1</h1>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;color:#cbd5e1">$1</li>');
    html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="padding-left:24px;margin:8px 0">$1</ul>');

    // Paragraphs (lines not already converted)
    html = html.replace(/^(?!<[hduoltbp]|<\/|<hr|<div|<pre|<block)(.+)$/gm, '<p style="margin:8px 0;color:#cbd5e1;line-height:1.7">$1</p>');

    return html;
}

async function generatePDF() {
    const mdPath = path.join(__dirname, '..', '..', '.gemini', 'antigravity', 'brain', 'ea186a7a-427b-440c-aaeb-6a19fca739a2', 'system_description.md');

    // Fallback if path doesn't exist
    const altPath = '/Users/dangtranhai/.gemini/antigravity/brain/ea186a7a-427b-440c-aaeb-6a19fca739a2/system_description.md';
    const sourcePath = fs.existsSync(mdPath) ? mdPath : altPath;

    const md = fs.readFileSync(sourcePath, 'utf-8');
    const bodyHtml = mdToHtml(md);

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>TrustChecker v9.0.0 — Mô Tả Chi Tiết Chức Năng Hệ Thống</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f172a;
      color: #cbd5e1;
      margin: 0;
      padding: 40px 60px;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { 
      margin: 20mm 15mm; 
      size: A4;
    }
    @media print {
      body { padding: 0; }
      h2 { page-break-before: auto; }
      table, pre { page-break-inside: avoid; }
    }
    .cover {
      text-align: center;
      padding: 80px 0 60px;
      border-bottom: 2px solid #6366f1;
      margin-bottom: 40px;
    }
    .cover .logo { font-size: 64px; margin-bottom: 16px; }
    .cover h1 { font-size: 36px; color: #e2e8f0; margin: 0; font-weight: 700; }
    .cover .subtitle { font-size: 18px; color: #6366f1; margin-top: 8px; font-weight: 500; }
    .cover .version { font-size: 14px; color: #64748b; margin-top: 16px; }
    .cover .date { font-size: 13px; color: #475569; margin-top: 8px; }
    .footer {
      text-align: center;
      padding: 24px 0;
      border-top: 1px solid #1e293b;
      margin-top: 40px;
      color: #475569;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="logo">🛡️</div>
    <h1>TrustChecker</h1>
    <div class="subtitle">Mô Tả Chi Tiết Chức Năng Hệ Thống</div>
    <div class="version">Version 9.0.0 — Digital Trust Infrastructure</div>
    <div class="date">Xuất bản: ${new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  ${bodyHtml}
  <div class="footer">
    TrustChecker v9.0.0 — Distributed Digital Trust Infrastructure — © 2026
  </div>
</body>
</html>`;

    // Write HTML
    const htmlPath = path.join(__dirname, '..', 'system_description_print.html');
    fs.writeFileSync(htmlPath, fullHtml);
    console.log('HTML written to:', htmlPath);

    // Try puppeteer
    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

        const pdfPath = path.join(__dirname, '..', 'TrustChecker_v9.0.0_System_Description.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        });

        await browser.close();
        console.log('✅ PDF generated:', pdfPath);
        return pdfPath;
    } catch (e) {
        console.log('Puppeteer not available, trying alternative...');
        // Return HTML path for manual print
        console.log('📄 HTML file ready for print-to-PDF:', htmlPath);
        return htmlPath;
    }
}

generatePDF().catch(console.error);
