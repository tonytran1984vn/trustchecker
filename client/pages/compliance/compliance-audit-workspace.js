/**
 * Audit Trail Workspace — Compliance Domain
 * Tabs: User Activity · System Changes · Data Export · Privileged Access
 *
 * PERF: Tab 1 eager, tabs 2-4 lazy-loaded on click.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
// Tab 1: eager
import { renderPage as renderUserActivity, initPage as initUserActivity } from './user-activity.js';
// Tabs 2-4: lazy
const lazy = (loader) => () => loader().then(m => m.renderPage());
const lazyInit = (loader) => ({
    render: () => loader().then(m => { lazyInit._mod = m; return m.renderPage(); }),
    init: () => { if (lazyInit._mod?.initPage) lazyInit._mod.initPage(); }
});

export function renderPage() {
    const dataExport = { _mod: null };
    const deRender = () => import('./data-export.js').then(m => { dataExport._mod = m; return m.renderPage(); });
    const deInit = () => { if (dataExport._mod?.initPage) dataExport._mod.initPage(); };

    return renderWorkspace({
        domain: 'compliance-audit',
        title: 'Audit Trail',
        subtitle: 'User Activity · System Changes · Data Export · Privileged Access',
        icon: icon('scroll', 24),
        tabs: [
            { id: 'activity', label: 'User Activity', icon: icon('users', 14), render: renderUserActivity, init: initUserActivity },
            { id: 'changes', label: 'System Changes', icon: icon('settings', 14), render: lazy(() => import('./system-changes.js')) },
            { id: 'export', label: 'Data Export', icon: icon('scroll', 14), render: deRender, init: deInit },
            { id: 'access', label: 'Privileged Access', icon: icon('shield', 14), render: lazy(() => import('./privileged-access.js')) },
        ],
    });
}
