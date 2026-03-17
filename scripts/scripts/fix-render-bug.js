/**
 * Batch fix: Replace .then(() => render()) with targeted DOM update
 * 
 * For each file:
 * 1. Remove `import { render } from ...state.js` (or just remove render from multi-import)
 * 2. Remove .then(() => render()) calls
 * 3. Add setTimeout → getElementById update at end of load()
 * 4. Wrap renderPage() return in <div id="X-root">...</div>
 * 5. Any window.xxx = () => { ... render() } calls → use getElementById update
 */
const fs = require('fs');
const path = require('path');

const BASE = '/Users/dangtranhai/Downloads/TrustChecker';
const files = [
    'client/pages/sa/risk-feed.js',
    'client/pages/sa/risk-analytics.js',
    'client/pages/sa/industry-benchmark.js',
    'client/pages/sa/suspicious-tenants.js',
    'client/pages/ca/access-logs.js',
    'client/pages/ca/code-audit-log.js',
    'client/pages/ca/risk-rules.js',
    'client/pages/ca/batches.js',
    'client/pages/ca/incidents.js',
    'client/pages/ca/code-lifecycle.js',
    'client/pages/ca/traceability.js',
    'client/pages/ca/code-batch-assign.js',
    'client/pages/ca/code-generate.js',
    'client/pages/ca/company-profile.js',
    'client/pages/ca/flow-config.js',
    'client/pages/ca/supply-route-engine.js',
    'client/pages/ca/duplicate-classification.js',
    'client/pages/ca/scan-analytics.js',
    'client/pages/infra/carbon-registry.js',
    'client/pages/sustainability.js',
];

let fixed = 0;
for (const f of files) {
    const fp = path.join(BASE, f);
    if (!fs.existsSync(fp)) { console.log('SKIP:', f); continue; }
    let code = fs.readFileSync(fp, 'utf8');

    const basename = path.basename(f, '.js').replace(/[^a-z0-9]/g, '-');
    const rootId = basename + '-root';

    if (code.includes(`id="${rootId}"`)) { console.log('ALREADY:', f); continue; }

    let changed = false;

    // STEP 1: Remove render from state.js import
    code = code.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*state\.js['"];?\n?/,
        (match, imports) => {
            if (!imports.includes('render')) return match; // no render import
            const newImports = imports.split(',').map(i => i.trim()).filter(i => i && i !== 'render').join(', ');
            if (!newImports) return ''; // only render was imported
            changed = true;
            return `import { ${newImports} } from '../../core/state.js';\n`;
        }
    );

    // STEP 2: Remove .then(() => render()) 
    if (code.includes('.then(() => render())')) {
        code = code.replace(/\.then\(\(\) => render\(\)\)/g, '');
        changed = true;
    }

    // STEP 3: Add targeted DOM update at end of load function
    // Find: `loading = false;\n` (end of load fn) and add setTimeout after
    if (!code.includes(`getElementById('${rootId}')`)) {
        const loadEndRe = /(  loading = false;\n)(\s*\})/;
        if (loadEndRe.test(code)) {
            code = code.replace(loadEndRe,
                `$1  setTimeout(() => { const el = document.getElementById('${rootId}'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);\n$2`
            );
            changed = true;
        } else {
            // Try simpler pattern
            const simpleRe = /(loading\s*=\s*false;\s*)\n(\s*\})/;
            if (simpleRe.test(code)) {
                code = code.replace(simpleRe,
                    `$1\n  setTimeout(() => { const el = document.getElementById('${rootId}'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);\n$2`
                );
                changed = true;
            }
        }
    }

    // STEP 4: Convert renderPage to use renderContent + wrapper
    // Find: export function renderPage() { ... return `<content>` }
    // Replace with: function renderContent() { ... return `<content>` } + export function renderPage() { return wrapper }

    // Check if renderPage exists
    if (code.includes('export function renderPage()')) {
        // Rename renderPage to renderContent and add new renderPage wrapper
        code = code.replace('export function renderPage()', 'function renderContent()');

        // Add new renderPage at the end (before any window. handlers or end of file)
        const windowHandlerIdx = code.lastIndexOf('window.');
        const insertIdx = windowHandlerIdx > 0 ? code.lastIndexOf('\n', windowHandlerIdx) : code.length;

        const newRenderPage = `\nexport function renderPage() {\n  return \`<div id="${rootId}">\${renderContent()}</div>\`;\n}\n`;
        code = code.slice(0, insertIdx) + newRenderPage + code.slice(insertIdx);
        changed = true;
    }

    // STEP 5: Fix any window.xxx handlers that call render()
    // Replace render() calls in window handlers with targeted update
    code = code.replace(
        /render\(\);/g,
        (match) => {
            // Only replace if it's a standalone render() call (not part of renderContent etc.)
            return `{ const _el = document.getElementById('${rootId}'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; }`;
        }
    );

    // STEP 6: Fix .ws-content / .ws-tab patterns
    const wsRe = /setTimeout\(\(\)\s*=>\s*\{[\s\S]*?\.querySelector\(['"]\.ws-(?:content|tab)[\s\S]*?\}\s*,\s*\d+\);?/g;
    if (wsRe.test(code)) {
        code = code.replace(wsRe,
            `setTimeout(() => { const el = document.getElementById('${rootId}'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);`
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(fp, code);
        fixed++;
        console.log('FIXED:', f);
    } else {
        console.log('NO CHANGE:', f);
    }
}
console.log(`\nDone. Fixed ${fixed} files.`);
