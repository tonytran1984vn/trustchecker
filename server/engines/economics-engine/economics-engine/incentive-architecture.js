/**
 * TrustChecker — Incentive Architecture Engine v1.0
 * INFRASTRUCTURE LAYER: Making Every Participant Profit From Integrity
 * 
 * Control says "you must not cheat". Incentive says "you profit more from honesty".
 * Infrastructure that lasts is built on incentive, not just enforcement.
 * 
 * Models: per-participant incentive design, network fee topology,
 *         switching cost moat, carbon market layer (registry→trading→clearing)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. PARTICIPANT-LEVEL INCENTIVE DESIGN
// ═══════════════════════════════════════════════════════════════════

const PARTICIPANT_INCENTIVES = {
    title: 'Every Participant Must Profit From System Integrity',

    participants: [
        {
            participant: 'Admin Company (Operating Entity)',
            why_they_stay_honest: [
                'Revenue share tied to network health: network integrity score > 90% → 100% revenue share. < 80% → reduced by 20%',
                'Reputation bond: $1M performance bond returned after 3 years continuous compliance',
                'Competitive replacement: GGC can replace admin company with 75% supermajority vote',
                'Insurance premium reduction: lower claims = lower D&O/E&O premiums (direct $ benefit)',
            ],
            perverse_incentive_guard: 'Admin cannot profit from volume inflation — revenue audited quarterly, synthetic volume detection built into monitoring',
            alignment_metric: 'Net Promoter Score of tenants + validator satisfaction index',
        },
        {
            participant: 'SCM Data Provider (Tenant)',
            why_they_provide_quality_data: [
                'Trust Score premium: accurate data → higher trust score → better settlement terms (Platinum = $500K unsecured)',
                'Fee discount: data quality score > 90% → 15% fee discount on all platform services',
                'Priority access: high-quality data providers get priority during capacity constraints',
                'Data certification badge: verified supply chain displayed to end consumers → brand value',
                'Insurance reduction: verified supply chain → lower product liability insurance',
            ],
            perverse_incentive_guard: 'Gaming detection: statistical anomaly detection on data submissions. Known-truth test injections (honeypots).',
            punishment: 'Data quality < 50% for 3 months → downgrade to Bronze tier → settlement limit reduced to $10K',
        },
        {
            participant: 'Blockchain Operator (Node + Anchoring)',
            why_they_maintain_uptime: [
                'Uptime bonus: 99.9%+ uptime → 20% reward bonus on top of base validator reward',
                'Staking yield compound: continuous uptime → staking yield increases 0.5% per quarter (capped at +3%)',
                'Infrastructure grant: operators maintaining >99.95% uptime eligible for annual infrastructure subsidy',
                'Priority in geographic expansion: high-uptime operators get first-mover advantage in new regions',
            ],
            perverse_incentive_guard: 'Uptime must be independently verifiable (external monitoring + cross-validator attestation). Cannot self-report uptime.',
            punishment: 'Uptime < 95% for 30 days → 10% stake slashing. < 90% for 7 days → temporary suspension.',
        },
        {
            participant: 'IVU Validator (Trust Scoring)',
            why_they_score_accurately: [
                'Accuracy reward: scores correlated with subsequent verified outcomes → accuracy bonus pool ($50K/quarter)',
                'Reputation compound: accuracy history → higher weight in consensus → more influence → more reward',
                'Model improvement bounty: validators finding scoring model flaws → bounty ($5K-$25K per improvement)',
                'Independence premium: 10% elevated reward rate for validators with no tenant relationships',
            ],
            perverse_incentive_guard: 'SEP-3: IVU cannot set model weights. Cross-validation: 3+ independent validators per score. Canary scores: platform injects known-truth test cases.',
            punishment: 'Accuracy < 70% for 60 days → enhanced monitoring. < 60% → suspension + retraining required.',
        },
        {
            participant: 'GGC Member (Governance)',
            why_they_govern_well: [
                'Compensation: competitive fixed fee (set by independent committee) + reputation value',
                'Tenure risk: poor governance decisions → not reappointed (tracked via governance scorecard)',
                'Liability protection: good-faith decisions protected by D&O insurance + constitutional shield',
                'Legacy: named in governance transparency report — public accountability = personal brand value',
            ],
            perverse_incentive_guard: 'COI disclosure mandatory, recusal enforced, proxy voting limited, composition diversified.',
            punishment: 'Governance failure leading to system incident → investigation + potential removal. No liability shield if bad faith.',
        },
        {
            participant: 'External Auditor / Assurance Partner',
            why_they_audit_honestly: [
                'Multi-year engagement: good audit → continued relationship (avg audit fee $200K-$500K/year)',
                'Reputation: published audit results. Missed finding later discovered → professional reputation damage',
                'Regulatory requirement: auditor rotation every 5-7 years (no entrenchment). Independent from management.',
            ],
            perverse_incentive_guard: 'Auditor cannot provide consulting to same entity (independence). Rotation enforced.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. NETWORK FEE TOPOLOGY → CASH FLOW MODEL
// ═══════════════════════════════════════════════════════════════════

const FEE_TOPOLOGY = {
    title: 'How Money Flows Through the Network',

    fee_flows: [
        {
            source: 'Tenant SaaS Subscription',
            amount: '$2K-$50K/month based on verification volume',
            flows_to: [
                { destination: 'Operating Entity', pct: 45, purpose: 'Platform operations + R&D' },
                { destination: 'Validator Reward Pool', pct: 20, purpose: 'Validator staking rewards' },
                { destination: 'Capital Reserve', pct: 10, purpose: 'Loss absorption buffer' },
                { destination: 'Infrastructure Fund', pct: 10, purpose: 'Node operations + blockchain gas' },
                { destination: 'Insurance Premium', pct: 5, purpose: '$25M coverage premium' },
                { destination: 'Regulatory Reserve', pct: 5, purpose: 'Compliance + legal defense' },
                { destination: 'Innovation Fund', pct: 5, purpose: 'R&D for next-generation features' },
            ],
        },
        {
            source: 'Settlement Transaction Fee',
            amount: '0.1%-0.5% of settled value (tiered)',
            flows_to: [
                { destination: 'Settlement GmbH', pct: 40, purpose: 'CCP operations + risk management' },
                { destination: 'Capital Reserve', pct: 20, purpose: 'Settlement risk buffer' },
                { destination: 'Validator Reward Pool', pct: 15, purpose: 'Finality verification rewards' },
                { destination: 'Operating Entity', pct: 15, purpose: 'Platform share' },
                { destination: 'Insurance', pct: 10, purpose: 'Settlement insurance premium' },
            ],
        },
        {
            source: 'Carbon Verification Fee',
            amount: '$0.10-$1.00 per ton verified (volume-tiered)',
            flows_to: [
                { destination: 'Operating Entity', pct: 35, purpose: 'Verification operations' },
                { destination: 'Validator Reward Pool', pct: 25, purpose: 'Carbon verification rewards' },
                { destination: 'Registry Integration', pct: 15, purpose: 'Verra/Gold Standard API costs' },
                { destination: 'Capital Reserve', pct: 10, purpose: 'Carbon risk buffer' },
                { destination: 'Carbon Integrity Fund', pct: 15, purpose: 'Anti-fraud + double-counting prevention' },
            ],
        },
        {
            source: 'Blockchain Anchoring Fee',
            amount: '$0.01-$0.10 per anchor (batch-discounted)',
            flows_to: [
                { destination: 'Blockchain Operator', pct: 60, purpose: 'Gas + infrastructure costs' },
                { destination: 'Operating Entity', pct: 25, purpose: 'Platform margin' },
                { destination: 'Capital Reserve', pct: 15, purpose: 'Anchor integrity reserve' },
            ],
        },
        {
            source: 'Data Licensing (Anonymized Trust Data)',
            amount: '$10K-$100K/year per data customer',
            flows_to: [
                { destination: 'Operating Entity', pct: 50, purpose: 'Data operations' },
                { destination: 'Data Contributing Tenants', pct: 25, purpose: 'Revenue share for data contributors' },
                { destination: 'Innovation Fund', pct: 15, purpose: 'Data product R&D' },
                { destination: 'Capital Reserve', pct: 10, purpose: 'Data liability reserve' },
            ],
        },
    ],

    constitutional_floors: {
        validator_pool: '≥15% of total revenue',
        capital_reserve: '≥8% of total revenue',
        insurance: '≥3% of total revenue',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. SWITCHING COST & REVENUE MOAT
// ═══════════════════════════════════════════════════════════════════

const SWITCHING_MOAT = {
    title: 'Revenue Moat Design — Why Participants Cannot Easily Leave',

    moat_layers: [
        {
            moat: 'Data Network Effect',
            description: 'More tenants → more supply chain data → better trust scores → more valuable for each tenant',
            switching_cost: '$200K-$500K to rebuild equivalent data history elsewhere',
            defensibility: 'VERY HIGH — data cannot be replicated. Historical trust scores are platform-specific.',
            quantification: 'Each new tenant adds ~$50K of network value to existing tenants (Metcalfe-adjusted)',
        },
        {
            moat: 'Regulatory Compliance Lock-in',
            description: 'Tenants build compliance workflows around platform. Changing platforms = re-validation with regulators.',
            switching_cost: '$100K-$300K regulatory re-submission costs + 6-12 month delay',
            defensibility: 'HIGH — regulatory relationships are entity-specific. Cannot transfer.',
        },
        {
            moat: 'Trust Score History',
            description: 'Years of verified trust history. New platform starts from zero trust.',
            switching_cost: 'Cannot switch — trust score history is not portable (platform-specific model)',
            defensibility: 'VERY HIGH — trust score is calculated property, not transferable data.',
        },
        {
            moat: 'Settlement Rail Integration',
            description: 'Counterparties integrated through settlement rail. Multi-party coordination to switch.',
            switching_cost: '$50K-$100K per counterparty relationship re-establishment',
            defensibility: 'HIGH — two-sided market. Both parties must switch simultaneously.',
        },
        {
            moat: 'Blockchain Anchor History',
            description: 'Immutable verification history anchored on-chain. Cannot be replicated on different infrastructure.',
            switching_cost: 'Cannot replicate historical proofs. New platform = fresh start.',
            defensibility: 'ABSOLUTE — cryptographic proofs are chain-specific.',
        },
    ],

    total_estimated_switching_cost: '$350K-$900K per enterprise tenant',
    ltv_cac_target: '> 5:1 (estimated 8:1 at scale due to switching cost)',
};

// ═══════════════════════════════════════════════════════════════════
// 4. CARBON MARKET LAYER
// ═══════════════════════════════════════════════════════════════════

const CARBON_MARKET = {
    title: 'Carbon Credit Market Infrastructure',

    layers: [
        {
            layer: 'Registry Logic',
            design: {
                supported_registries: ['Verra VCS', 'Gold Standard', 'ACR (American Carbon Registry)', 'CAR (Climate Action Reserve)', 'Regional (EU ETS bridged)'],
                bridge_mechanism: 'API integration per registry. Platform acts as aggregation layer, NOT issuer.',
                credit_lifecycle: 'Issuance (registry) → Verification (platform) → Trading (platform orderbook) → Retirement (registry)',
                double_counting_prevention: 'Unique serial number tracking + cross-registry reconciliation + blockchain anchor per credit',
            },
        },
        {
            layer: 'Secondary Trading Logic',
            design: {
                orderbook: 'Continuous limit orderbook (price-time priority)',
                settlement: 'T+2 delivery-vs-payment via Settlement GmbH',
                price_discovery: 'Aggregated from orderbook + external feeds (CBL, Xpansiv)',
                market_surveillance: 'Pattern detection for wash trading, spoofing, market manipulation',
                circuit_breakers: 'Price moves > 15% in 5 minutes → 30-minute trading halt',
            },
        },
        {
            layer: 'Clearing & Settlement Risk',
            design: {
                clearing_model: 'CCP novation via Settlement GmbH',
                margin: 'Initial margin (5% of position) + variation margin (daily mark-to-market)',
                default_fund: 'Mutualized: each member contributes pro-rata to default waterfall',
                default_waterfall: '1. Defaulter margin → 2. Defaulter default fund → 3. CCP skin-in-game → 4. Non-defaulter fund → 5. Insurance → 6. Capital Reserve Trust',
                recovery: 'Voluntary tear-up + partial allocation (CPMI-IOSCO principles)',
            },
        },
        {
            layer: 'Counterparty Default Handling',
            design: {
                detection: 'Auto-detect: failed settlement T+3 → margin call → T+5 → default declaration',
                close_out: 'Netting of all positions. Auction of defaulter portfolio to remaining members.',
                loss_allocation: 'Default waterfall (above). If waterfall exhausted → pro-rata loss sharing among non-defaulters.',
                recovery_timeline: 'Target: full resolution within 7 business days of default',
                reporting: 'Regulatory notification within 24 hours. Client notification within 4 hours.',
            },
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class IncentiveArchitectureEngine {
    getParticipantIncentives() { return PARTICIPANT_INCENTIVES; }
    getFeeTopology() { return FEE_TOPOLOGY; }
    getSwitchingMoat() { return SWITCHING_MOAT; }
    getCarbonMarket() { return CARBON_MARKET; }

    calculateNetworkValue(tenant_count) {
        const n = tenant_count || 50;
        const metcalfe = n * (n - 1) / 2;
        const valuePerConnection = 50000; // $50K network value per connection pair
        const adjustedValue = metcalfe * valuePerConnection * 0.001; // Metcalfe discount
        return {
            tenant_count: n,
            theoretical_connections: metcalfe,
            estimated_network_value_usd: Math.round(adjustedValue),
            per_tenant_value_usd: Math.round(adjustedValue / n),
            switching_cost_per_tenant: '$350K-$900K',
            ltv_cac_ratio: '8:1 at scale',
        };
    }

    getFullArchitecture() {
        return {
            title: 'Incentive Architecture — Infrastructure-Grade',
            version: '1.0',
            participant_incentives: PARTICIPANT_INCENTIVES,
            fee_topology: FEE_TOPOLOGY,
            switching_moat: SWITCHING_MOAT,
            carbon_market: CARBON_MARKET,
        };
    }
}

module.exports = new IncentiveArchitectureEngine();
