/**
 * TrustChecker v9.4 — Domain Registry
 * 
 * Clean Architecture / Hexagonal bounded context definitions.
 * Maps 6 domains with invariants, aggregate roots, and ownership rules.
 */

// ═══════════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const DOMAINS = {
    PRODUCT_AUTHENTICITY: {
        name: 'ProductAuthenticity',
        description: 'Product registration, QR codes, scan verification, trust scoring',
        aggregateRoots: ['Product'],
        entities: ['Product', 'QRCode', 'ScanEvent', 'TrustScore', 'BlockchainSeal'],
        valueObjects: ['HashSeal', 'TrustLevel', 'ScanLocation'],
        repositories: ['ProductRepository', 'ScanEventRepository', 'TrustScoreRepository'],
        domainEvents: ['scan.created', 'scan.verified', 'scan.fraud_detected'],
        invariants: [
            { id: 'PA-001', rule: 'Product hash_seal must be unique per organization', enforcement: 'database_unique_constraint' },
            { id: 'PA-002', rule: 'TrustScore must be between 0 and 100', enforcement: 'domain_validation' },
            { id: 'PA-003', rule: 'QRCode cannot be reassigned after first scan', enforcement: 'aggregate_logic' },
            { id: 'PA-004', rule: 'ScanEvent must reference valid Product + QRCode', enforcement: 'foreign_key' },
            { id: 'PA-005', rule: 'Fraud detection requires minimum 3 data points', enforcement: 'service_rule' },
        ],
        ownedTables: ['products', 'qr_codes', 'scan_events', 'trust_scores', 'blockchain_seals'],
    },

    SUPPLY_CHAIN: {
        name: 'SupplyChain',
        description: 'Shipment tracking, inventory, partner management, EPCIS events',
        aggregateRoots: ['Shipment', 'Inventory'],
        entities: ['Shipment', 'ShipmentCheckpoint', 'Inventory', 'Partner', 'SupplyChainEvent', 'EPCISEvent', 'DigitalTwinState'],
        valueObjects: ['GeoLocation', 'ShipmentStatus', 'InventoryLevel', 'PartnerScore'],
        repositories: ['ShipmentRepository', 'InventoryRepository', 'PartnerRepository'],
        domainEvents: ['shipment.created', 'shipment.checkpoint', 'shipment.delivered', 'inventory.alert'],
        invariants: [
            { id: 'SC-001', rule: 'Shipment status transitions: CREATED → IN_TRANSIT → DELIVERED (no backward)', enforcement: 'state_machine' },
            { id: 'SC-002', rule: 'Checkpoint timestamp must be after shipment creation', enforcement: 'domain_validation' },
            { id: 'SC-003', rule: 'Inventory quantity cannot be negative', enforcement: 'domain_validation' },
            { id: 'SC-004', rule: 'Partner score recalculated on every completed shipment', enforcement: 'domain_event' },
            { id: 'SC-005', rule: 'EPCIS events immutable after creation', enforcement: 'aggregate_logic' },
        ],
        ownedTables: ['shipments', 'shipment_checkpoints', 'inventory', 'partners', 'supply_chain_events', 'epcis_events', 'digital_twin_states'],
    },

    RISK_INTELLIGENCE: {
        name: 'RiskIntelligence',
        description: 'Fraud detection, anomaly detection, risk scoring, Monte Carlo simulation',
        aggregateRoots: ['FraudAlert'],
        entities: ['FraudAlert', 'AnomalyDetection', 'RiskScore'],
        valueObjects: ['Severity', 'RiskLevel', 'ConfidenceInterval'],
        repositories: ['FraudAlertRepository', 'AnomalyRepository'],
        domainEvents: ['fraud.alert.created', 'fraud.alert.resolved'],
        invariants: [
            { id: 'RI-001', rule: 'FraudAlert severity: LOW → MEDIUM → HIGH → CRITICAL', enforcement: 'enum_validation' },
            { id: 'RI-002', rule: 'Resolved alert cannot be reopened (create new instead)', enforcement: 'aggregate_logic' },
            { id: 'RI-003', rule: 'Anomaly score requires at least 30 data points', enforcement: 'service_rule' },
            { id: 'RI-004', rule: 'Monte Carlo simulation requires >= 1000 iterations', enforcement: 'service_rule' },
            { id: 'RI-005', rule: 'Risk score must include at least 2 contributing factors', enforcement: 'domain_validation' },
        ],
        ownedTables: ['fraud_alerts', 'anomaly_detections'],
    },

    ESG_COMPLIANCE: {
        name: 'ESGCompliance',
        description: 'Carbon footprint, sustainability scoring, certifications, GDPR compliance',
        aggregateRoots: ['SustainabilityScore', 'Certification'],
        entities: ['SustainabilityScore', 'Certification', 'DataProcessingRecord', 'ConsentRecord', 'DPIARecord'],
        valueObjects: ['CarbonFootprint', 'EmissionScope', 'ComplianceStatus'],
        repositories: ['SustainabilityRepository', 'CertificationRepository', 'GDPRRepository'],
        domainEvents: [],
        invariants: [
            { id: 'ESG-001', rule: 'Carbon footprint Scope 1 + 2 + 3 must be >= 0', enforcement: 'domain_validation' },
            { id: 'ESG-002', rule: 'Certification expiry must be future date at creation', enforcement: 'domain_validation' },
            { id: 'ESG-003', rule: 'GDPR consent withdrawal must be honored within 72 hours', enforcement: 'service_rule' },
            { id: 'ESG-004', rule: 'DPIA required before processing sensitive data categories', enforcement: 'policy_gate' },
        ],
        ownedTables: ['sustainability_scores', 'certifications', 'data_processing_records', 'consent_records', 'dpia_records'],
    },

    IDENTITY: {
        name: 'Identity',
        description: 'User management, organization, sessions, authentication, authorization',
        aggregateRoots: ['User', 'Organization'],
        entities: ['User', 'Organization', 'Session', 'RefreshToken', 'PasskeyCredential', 'KYCBusiness'],
        valueObjects: ['Role', 'Plan', 'TenantContext', 'PasswordPolicy'],
        repositories: ['UserRepository', 'OrganizationRepository', 'SessionRepository'],
        domainEvents: [],
        invariants: [
            { id: 'ID-001', rule: 'Username and email must be unique system-wide', enforcement: 'database_unique_constraint' },
            { id: 'ID-002', rule: 'Password minimum 12 chars with 4 character types', enforcement: 'domain_validation' },
            { id: 'ID-003', rule: 'Account lockout after 5 failed attempts in 15 minutes', enforcement: 'service_rule' },
            { id: 'ID-004', rule: 'Organization slug must be unique and URL-safe', enforcement: 'database_unique_constraint' },
            { id: 'ID-005', rule: 'Enterprise tenant requires dedicated schema', enforcement: 'provisioning_rule' },
            { id: 'ID-006', rule: 'Role hierarchy: admin > manager > operator > viewer (no skip)', enforcement: 'rbac_check' },
        ],
        ownedTables: ['users', 'organizations', 'sessions', 'refresh_tokens', 'passkey_credentials', 'kyc_businesses'],
    },

    BILLING: {
        name: 'Billing',
        description: 'Plans, invoices, payments, usage metering, Stripe integration',
        aggregateRoots: ['BillingPlan', 'Invoice'],
        entities: ['BillingPlan', 'Invoice', 'Payment', 'UsageMeter', 'WebhookEndpoint', 'WebhookEvent'],
        valueObjects: ['PlanTier', 'PaymentStatus', 'UsageQuota'],
        repositories: ['BillingRepository', 'InvoiceRepository', 'UsageRepository'],
        domainEvents: [],
        invariants: [
            { id: 'BL-001', rule: 'Plan downgrade only at billing cycle end', enforcement: 'service_rule' },
            { id: 'BL-002', rule: 'Invoice total must match sum of line items', enforcement: 'domain_validation' },
            { id: 'BL-003', rule: 'Usage meter cannot exceed plan quota without upgrade prompt', enforcement: 'feature_gate' },
            { id: 'BL-004', rule: 'Payment refund within 30-day window only', enforcement: 'service_rule' },
            { id: 'BL-005', rule: 'Webhook retry: 3 attempts with exponential backoff', enforcement: 'delivery_policy' },
        ],
        ownedTables: ['billing_plans', 'invoices', 'payments', 'usage_meters', 'webhook_endpoints', 'webhook_events'],
    },
};

// ═══════════════════════════════════════════════════════════════════
// DOMAIN REGISTRY
// ═══════════════════════════════════════════════════════════════════

class DomainRegistry {
    constructor() {
        this.domains = new Map();
        this._tableOwnership = new Map();
        this._eventOwnership = new Map();

        // Register all domains
        for (const [key, domain] of Object.entries(DOMAINS)) {
            this.register(key, domain);
        }
    }

    register(key, domain) {
        this.domains.set(key, { ...domain, key });

        // Index table ownership
        for (const table of domain.ownedTables || []) {
            if (this._tableOwnership.has(table)) {
                throw new Error(`Table "${table}" already owned by ${this._tableOwnership.get(table)} — cannot assign to ${key}`);
            }
            this._tableOwnership.set(table, key);
        }

        // Index event ownership
        for (const event of domain.domainEvents || []) {
            if (this._eventOwnership.has(event)) {
                throw new Error(`Event "${event}" already owned by ${this._eventOwnership.get(event)} — cannot assign to ${key}`);
            }
            this._eventOwnership.set(event, key);
        }
    }

    // ─── Query Methods ──────────────────────────────────────────────

    getDomain(key) {
        return this.domains.get(key) || null;
    }

    getDomainByTable(tableName) {
        const domainKey = this._tableOwnership.get(tableName);
        return domainKey ? this.domains.get(domainKey) : null;
    }

    getDomainByEvent(eventType) {
        const domainKey = this._eventOwnership.get(eventType);
        return domainKey ? this.domains.get(domainKey) : null;
    }

    getInvariantsForDomain(key) {
        const domain = this.domains.get(key);
        return domain ? domain.invariants : [];
    }

    getAllInvariants() {
        const all = [];
        for (const domain of this.domains.values()) {
            for (const inv of domain.invariants) {
                all.push({ domain: domain.name, ...inv });
            }
        }
        return all;
    }

    // ─── Cross-Domain Boundary Check ────────────────────────────────

    /**
     * Check if a write operation crosses domain boundaries.
     * Returns list of affected domains — if > 1, saga required.
     */
    checkTransactionBoundary(tables) {
        const domains = new Set();
        for (const table of tables) {
            const owner = this._tableOwnership.get(table);
            if (owner) domains.add(owner);
        }
        return {
            domains: [...domains],
            crossesBoundary: domains.size > 1,
            requiresSaga: domains.size > 1,
        };
    }

    /**
     * Validate that an event is published by its owning domain.
     */
    validateEventOwnership(eventType, publisherDomain) {
        const owner = this._eventOwnership.get(eventType);
        if (!owner) return { valid: true, warning: `Event "${eventType}" not registered in any domain` };
        if (owner !== publisherDomain) {
            return {
                valid: false,
                error: `Event "${eventType}" owned by ${owner}, cannot be published by ${publisherDomain}`,
            };
        }
        return { valid: true };
    }

    // ─── Diagnostics ────────────────────────────────────────────────

    getStats() {
        const stats = {
            totalDomains: this.domains.size,
            totalInvariants: 0,
            totalTables: this._tableOwnership.size,
            totalEvents: this._eventOwnership.size,
            domains: {},
        };
        for (const [key, domain] of this.domains) {
            stats.totalInvariants += domain.invariants.length;
            stats.domains[key] = {
                name: domain.name,
                aggregateRoots: domain.aggregateRoots.length,
                entities: domain.entities.length,
                invariants: domain.invariants.length,
                tables: domain.ownedTables.length,
                events: domain.domainEvents.length,
            };
        }
        return stats;
    }
}

// Singleton
const registry = new DomainRegistry();

module.exports = {
    DomainRegistry,
    registry,
    DOMAINS,
};
