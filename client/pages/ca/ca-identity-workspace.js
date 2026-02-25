/**
 * Identity Workspace — CA Domain (Code Governance)
 * Tabs: Code Lifecycle | Code Allocation | Audit Trail | Duplicate Intelligence | Format Rules
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderLifecycle } from './code-lifecycle.js';
import { renderPage as renderGenerate } from './code-generate.js';
import { renderPage as renderAuditLog } from './code-audit-log.js';
import { renderPage as renderDuplicate } from './duplicate-classification.js';
import { renderPage as renderFormatRules } from './code-format-rules.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-identity',
        title: 'Identity',
        subtitle: 'Code lifecycle · Allocation · Governance',
        icon: icon('key', 24),
        tabs: [
            { id: 'lifecycle', label: 'Code Lifecycle', icon: icon('workflow', 14), render: renderLifecycle },
            { id: 'allocation', label: 'Code Allocation', icon: icon('zap', 14), render: renderGenerate },
            { id: 'audit', label: 'Audit Trail', icon: icon('scroll', 14), render: renderAuditLog },
            { id: 'duplicate', label: 'Duplicate Intelligence', icon: icon('target', 14), render: renderDuplicate },
            { id: 'format', label: 'Format Rules', icon: icon('settings', 14), render: renderFormatRules },
        ],
    });
}
