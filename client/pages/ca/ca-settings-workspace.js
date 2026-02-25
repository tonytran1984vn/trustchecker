/**
 * Settings Workspace — CA Domain (Company Settings & Integration)
 * Tabs: Company Profile | Security | API & Integrations | Billing
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderProfile } from './company-profile.js';
import { renderPage as renderSecurity } from '../settings.js';
import { renderPage as renderIntegrations } from './integrations.js';
import { renderPage as renderBilling } from '../billing.js';

export function renderPage() {
    return renderWorkspace({
        domain: 'ca-settings',
        title: 'Settings',
        subtitle: 'Company profile · Security · Integrations · Billing',
        icon: icon('settings', 24),
        tabs: [
            { id: 'profile', label: 'Company Profile', icon: icon('building', 14), render: renderProfile },
            { id: 'security', label: 'Security', icon: icon('lock', 14), render: renderSecurity },
            { id: 'integrations', label: 'API & Integrations', icon: icon('plug', 14), render: renderIntegrations },
            { id: 'billing', label: 'Billing & Quota', icon: icon('creditCard', 14), render: renderBilling },
        ],
    });
}
