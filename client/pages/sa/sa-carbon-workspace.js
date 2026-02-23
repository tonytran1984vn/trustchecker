/**
 * Carbon / CIE Workspace — SA Domain
 * Tabs: Carbon Footprint | Carbon Passport | Green Finance | Sustainability | Carbon Registry
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { renderPage as renderCarbon } from '../scm/carbon.js?v=3.4';
import { renderPage as renderCarbonCredit } from '../scm/carbon-credit.js?v=3.4';
import { renderPage as renderGreenFinance } from '../infra/green-finance.js?v=3.4';
import { renderPage as renderSustainability } from '../sustainability.js?v=3.4';
import { renderPage as renderCarbonRegistry } from '../infra/carbon-registry.js?v=3.4';

export function renderPage() {
    return renderWorkspace({
        domain: 'carbon',
        title: 'Carbon / CIE',
        subtitle: 'Carbon Integrity Engine · Emissions · Passports · ESG',
        icon: icon('globe', 24),
        tabs: [
            { id: 'footprint', label: 'Carbon Footprint', icon: icon('globe', 14), render: renderCarbon },
            { id: 'passport', label: 'Carbon Passport', icon: icon('tag', 14), render: renderCarbonCredit },
            { id: 'green-finance', label: 'Green Finance', icon: icon('barChart', 14), render: renderGreenFinance },
            { id: 'sustainability', label: 'Sustainability', icon: icon('check', 14), render: renderSustainability },
            { id: 'registry', label: 'Registry', icon: icon('scroll', 14), render: renderCarbonRegistry },
        ],
    });
}
