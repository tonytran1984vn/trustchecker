/**
 * TrustChecker — Data Sovereignty Architecture Engine v1.0
 * Jurisdiction Routing, Data Residency Zones, Cross-Border Compliance, PII Localization
 * 
 * Ensures data stays within legal boundaries:
 *   - GDPR (EU) → data stays in EU zones
 *   - PIPL (China) → data stays in mainland China
 *   - LGPD (Brazil) → data stays in Brazil/LATAM
 *   - PDPA (Thailand/Singapore) → data stays in APAC
 *   - CCPA (California) → US data handling rules
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// SOVEREIGNTY ZONES
// ═══════════════════════════════════════════════════════════════════

const SOVEREIGNTY_ZONES = {
    'eu': {
        name: 'European Union',
        regulation: 'GDPR',
        data_center: 'Frankfurt, DE',
        backup_dc: 'Dublin, IE',
        pii_rules: {
            storage: 'eu-only',
            transfer: 'adequacy_decision_or_scc',   // Standard Contractual Clauses
            retention_max_months: 36,
            right_to_erasure: true,
            data_portability: true,
            dpo_required: true,
            breach_notification_hours: 72,
        },
        countries: ['DE', 'FR', 'NL', 'IT', 'ES', 'PL', 'IE', 'SE', 'PT', 'AT', 'BE', 'FI', 'DK', 'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'CY', 'LU', 'MT'],
    },
    'us': {
        name: 'United States',
        regulation: 'CCPA/CPRA + State Laws',
        data_center: 'Virginia, US',
        backup_dc: 'Oregon, US',
        pii_rules: {
            storage: 'us-domestic',
            transfer: 'dpf_or_contract',    // Data Privacy Framework
            retention_max_months: 24,
            right_to_erasure: true,
            data_portability: true,
            dpo_required: false,
            breach_notification_hours: 72,
        },
        countries: ['US'],
    },
    'apac': {
        name: 'Asia Pacific',
        regulation: 'PDPA (SG/TH) + APPI (JP)',
        data_center: 'Singapore',
        backup_dc: 'Tokyo, JP',
        pii_rules: {
            storage: 'apac-zone',
            transfer: 'cbpr_or_contract',   // Cross-Border Privacy Rules
            retention_max_months: 36,
            right_to_erasure: true,
            data_portability: false,
            dpo_required: true,
            breach_notification_hours: 72,
        },
        countries: ['SG', 'TH', 'JP', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'NZ', 'IN', 'TW', 'HK'],
    },
    'cn': {
        name: 'China (Mainland)',
        regulation: 'PIPL + DSL + CSL',
        data_center: 'Shanghai, CN',
        backup_dc: 'Beijing, CN',
        pii_rules: {
            storage: 'china-only',
            transfer: 'cat_assessment_required',   // Cross-border Assessment by CAC
            retention_max_months: 24,
            right_to_erasure: true,
            data_portability: true,
            dpo_required: true,
            breach_notification_hours: 72,
            critical_data_exit_ban: true,           // CI operator data cannot leave
        },
        countries: ['CN'],
    },
    'latam': {
        name: 'Latin America',
        regulation: 'LGPD (BR) + Regional',
        data_center: 'São Paulo, BR',
        backup_dc: 'Buenos Aires, AR',
        pii_rules: {
            storage: 'latam-zone',
            transfer: 'adequacy_or_scc',
            retention_max_months: 60,
            right_to_erasure: true,
            data_portability: true,
            dpo_required: true,
            breach_notification_hours: 48,
        },
        countries: ['BR', 'MX', 'AR', 'CL', 'CO', 'PE'],
    },
    'me': {
        name: 'Middle East',
        regulation: 'PDPL (SA) + DPL (UAE)',
        data_center: 'Bahrain',
        backup_dc: 'Riyadh, SA',
        pii_rules: {
            storage: 'me-zone',
            transfer: 'regulatory_approval',
            retention_max_months: 36,
            right_to_erasure: true,
            data_portability: false,
            dpo_required: true,
            breach_notification_hours: 72,
        },
        countries: ['SA', 'AE', 'QA', 'BH', 'KW', 'OM'],
    },
    'af': {
        name: 'Africa',
        regulation: 'POPIA (ZA) + AU Convention',
        data_center: 'Cape Town, ZA',
        backup_dc: 'Nairobi, KE',
        pii_rules: {
            storage: 'africa-zone',
            transfer: 'consent_or_contract',
            retention_max_months: 60,
            right_to_erasure: true,
            data_portability: false,
            dpo_required: false,
            breach_notification_hours: 72,
        },
        countries: ['ZA', 'KE', 'NG', 'EG', 'GH', 'MA'],
    },
};

// ═══════════════════════════════════════════════════════════════════
// CROSS-BORDER TRANSFER MECHANISMS
// ═══════════════════════════════════════════════════════════════════

const TRANSFER_MECHANISMS = {
    adequacy_decision: { name: 'Adequacy Decision', risk: 'low', auto_approve: true },
    scc: { name: 'Standard Contractual Clauses', risk: 'medium', auto_approve: false },
    bcr: { name: 'Binding Corporate Rules', risk: 'low', auto_approve: true },
    dpf: { name: 'EU-US Data Privacy Framework', risk: 'low', auto_approve: true },
    cbpr: { name: 'APEC Cross-Border Privacy Rules', risk: 'medium', auto_approve: false },
    consent: { name: 'Explicit Consent', risk: 'medium', auto_approve: false },
    cat_assessment: { name: 'CAC Security Assessment (China)', risk: 'high', auto_approve: false },
    regulatory_approval: { name: 'Regulatory Pre-Approval', risk: 'high', auto_approve: false },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class DataSovereigntyEngine {

    constructor() {
        this.routingDecisions = [];
        this.transferRequests = [];
    }

    // ─── Determine zone from country code ─────────────────────────

    resolveZone(countryCode) {
        const cc = (countryCode || '').toUpperCase();
        for (const [zoneId, zone] of Object.entries(SOVEREIGNTY_ZONES)) {
            if (zone.countries.includes(cc)) {
                return { zone_id: zoneId, ...zone, country: cc };
            }
        }
        return { zone_id: 'us', ...SOVEREIGNTY_ZONES.us, country: cc, fallback: true, note: 'Country not mapped, defaulting to US zone' };
    }

    // ─── Route data based on tenant jurisdiction ──────────────────

    routeData(tenantId, countryCode, dataType = 'pii') {
        const zone = this.resolveZone(countryCode);

        const decision = {
            id: uuidv4(),
            tenant_id: tenantId,
            country: countryCode,
            zone: zone.zone_id,
            data_center: zone.data_center,
            backup_dc: zone.backup_dc,
            data_type: dataType,
            rules: zone.pii_rules,
            regulation: zone.regulation,
            decided_at: new Date().toISOString(),
        };

        this.routingDecisions.push(decision);
        return decision;
    }

    // ─── Cross-border transfer assessment ─────────────────────────

    assessTransfer(fromZone, toZone, dataType, volume) {
        const from = SOVEREIGNTY_ZONES[fromZone];
        const to = SOVEREIGNTY_ZONES[toZone];
        if (!from || !to) return { error: 'Invalid zone', available: Object.keys(SOVEREIGNTY_ZONES) };

        if (fromZone === toZone) {
            return { allowed: true, mechanism: 'same_zone', risk: 'none', auto_approve: true };
        }

        // China special case: critical data cannot leave
        if (fromZone === 'cn' && from.pii_rules.critical_data_exit_ban && dataType === 'critical') {
            return { allowed: false, reason: 'PIPL/CSL critical data exit ban — data cannot leave China', regulation: 'PIPL Article 36' };
        }

        // Determine transfer mechanism
        const transferRule = from.pii_rules.transfer;
        let mechanism = transferRule;
        let mechanismInfo = TRANSFER_MECHANISMS[transferRule] || TRANSFER_MECHANISMS.scc;

        const assessment = {
            id: uuidv4(),
            from_zone: fromZone,
            to_zone: toZone,
            from_regulation: from.regulation,
            to_regulation: to.regulation,
            data_type: dataType,
            volume,
            allowed: true,
            mechanism: mechanismInfo.name,
            risk: mechanismInfo.risk,
            auto_approve: mechanismInfo.auto_approve,
            requirements: [],
            assessed_at: new Date().toISOString(),
        };

        // Add specific requirements
        if (!mechanismInfo.auto_approve) {
            assessment.requirements.push('Legal review required');
            assessment.requirements.push(`${mechanismInfo.name} must be signed`);
        }
        if (dataType === 'pii') assessment.requirements.push('Data minimization — transfer only necessary fields');
        if (from.pii_rules.dpo_required) assessment.requirements.push(`DPO sign-off from ${from.name}`);
        if (volume > 10000) assessment.requirements.push('Transfer Impact Assessment (TIA) recommended');

        this.transferRequests.push(assessment);
        return assessment;
    }

    // ─── Compliance status for a tenant ───────────────────────────

    getTenantCompliance(tenantId, countryCode) {
        const zone = this.resolveZone(countryCode);
        const rules = zone.pii_rules;

        return {
            tenant_id: tenantId,
            zone: zone.zone_id,
            regulation: zone.regulation,
            data_residency: { data_center: zone.data_center, backup: zone.backup_dc, storage_restriction: rules.storage },
            obligations: {
                right_to_erasure: rules.right_to_erasure,
                data_portability: rules.data_portability,
                dpo_required: rules.dpo_required,
                breach_notification: `${rules.breach_notification_hours} hours`,
                max_retention: `${rules.retention_max_months} months`,
            },
            cross_border: { transfer_mechanism: rules.transfer, requires_assessment: !TRANSFER_MECHANISMS[rules.transfer]?.auto_approve },
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getZones() { return SOVEREIGNTY_ZONES; }
    getTransferMechanisms() { return TRANSFER_MECHANISMS; }
    getRoutingHistory(limit = 20) { return this.routingDecisions.slice(-limit).reverse(); }
    getTransferHistory(limit = 20) { return this.transferRequests.slice(-limit).reverse(); }
}

module.exports = new DataSovereigntyEngine();
