/**
 * TrustChecker — Network Topology Engine v1.0
 * Distributed Validator Network: Node Registration, Health, Consensus, Peer Discovery
 * 
 * Architecture: Hub-and-Spoke with Regional Clusters
 *   - Hub: TrustChecker Platform (orchestrator)
 *   - Spokes: Validator nodes (verification, carbon settlement, blockchain seals)
 *   - Regional Clusters: geographic grouping for latency optimization
 * 
 * Consensus Model: Proof-of-Trust (PoT)
 *   - Validators stake reputation, not tokens
 *   - Trust score = f(uptime, accuracy, volume, response_time)
 *   - Minimum 3 validators per verification round (Byzantine fault tolerance)
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// NODE TYPES
// ═══════════════════════════════════════════════════════════════════

const NODE_TYPES = {
    validator: {
        name: 'Validator Node',
        description: 'Validates product authenticity, carbon settlements, blockchain seals',
        min_stake: 1000,       // reputation points
        capabilities: ['qr_verification', 'carbon_settlement', 'blockchain_seal'],
        sla: { uptime: 99.5, response_ms: 500 },
    },
    relay: {
        name: 'Relay Node',
        description: 'Routes verification requests to nearest validator cluster',
        min_stake: 500,
        capabilities: ['routing', 'caching', 'load_balancing'],
        sla: { uptime: 99.9, response_ms: 100 },
    },
    archive: {
        name: 'Archive Node',
        description: 'Stores full verification history and audit trail',
        min_stake: 2000,
        capabilities: ['storage', 'audit_trail', 'compliance_export'],
        sla: { uptime: 99.0, response_ms: 2000 },
    },
    observer: {
        name: 'Observer Node',
        description: 'Read-only access to network state for monitoring/analytics',
        min_stake: 0,
        capabilities: ['monitoring', 'analytics'],
        sla: { uptime: 95.0, response_ms: 5000 },
    },
};

// ═══════════════════════════════════════════════════════════════════
// REGIONS
// ═══════════════════════════════════════════════════════════════════

const REGIONS = {
    'ap-southeast': { name: 'Asia Pacific Southeast', hub: 'Singapore', latency_target_ms: 50 },
    'ap-east': { name: 'Asia Pacific East', hub: 'Tokyo', latency_target_ms: 80 },
    'eu-west': { name: 'Europe West', hub: 'Frankfurt', latency_target_ms: 40 },
    'eu-north': { name: 'Europe North', hub: 'Stockholm', latency_target_ms: 60 },
    'us-east': { name: 'North America East', hub: 'Virginia', latency_target_ms: 30 },
    'us-west': { name: 'North America West', hub: 'Oregon', latency_target_ms: 50 },
    'me-south': { name: 'Middle East', hub: 'Bahrain', latency_target_ms: 100 },
    'af-south': { name: 'Africa South', hub: 'Cape Town', latency_target_ms: 150 },
};

// ═══════════════════════════════════════════════════════════════════
// CONSENSUS PARAMETERS
// ═══════════════════════════════════════════════════════════════════

const CONSENSUS = {
    min_validators: 3,         // minimum validators per round (BFT: 2f+1)
    max_validators: 7,         // cap for performance
    quorum_pct: 67,            // 2/3 agreement needed
    round_timeout_ms: 5000,    // max time for consensus round
    slash_threshold: 3,        // consecutive failures → slash
    reward_per_round: 0.01,    // reputation points per successful round
    slash_per_failure: 0.05,   // reputation penalty per failure
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class NetworkTopologyEngine {
    constructor() {
        this.nodes = new Map();            // node_id → node
        this.peers = new Map();            // node_id → Set<peer_id>
        this.consensusRounds = [];         // history
        this.networkStats = { total_rounds: 0, successful: 0, failed: 0 };
    }

    // ─── Node Registration ────────────────────────────────────────

    registerNode(params) {
        const { operator_id, node_type = 'validator', region, endpoint, name, metadata } = params;

        const typeDef = NODE_TYPES[node_type];
        if (!typeDef) return { error: `Invalid node type: ${node_type}`, available: Object.keys(NODE_TYPES) };
        if (!region || !REGIONS[region]) return { error: `Invalid region: ${region}`, available: Object.keys(REGIONS) };
        if (!endpoint) return { error: 'endpoint URL required' };

        const nodeId = `NODE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const apiKey = `ntk_${crypto.randomBytes(24).toString('hex')}`;

        const node = {
            node_id: nodeId,
            name: name || `${typeDef.name} (${region})`,
            node_type,
            type_info: typeDef,
            region,
            region_info: REGIONS[region],
            endpoint,
            operator_id,
            api_key_hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
            status: 'pending',        // pending → active → suspended → decommissioned
            trust_score: 100,         // starts at 100, adjusted by performance
            reputation: typeDef.min_stake,
            capabilities: typeDef.capabilities,
            health: {
                last_heartbeat: null,
                uptime_pct: 100,
                avg_response_ms: 0,
                total_rounds: 0,
                successful_rounds: 0,
                failed_rounds: 0,
                consecutive_failures: 0,
            },
            metadata: metadata || {},
            registered_at: new Date().toISOString(),
            activated_at: null,
        };

        this.nodes.set(nodeId, node);
        this.peers.set(nodeId, new Set());

        return {
            status: 'registered',
            node,
            api_key: apiKey,
            message: 'Node registered. Complete activation by sending first heartbeat.',
            next_steps: ['Send heartbeat to activate', 'Peer discovery will auto-connect to cluster'],
        };
    }

    // ─── Node Activation ──────────────────────────────────────────

    activateNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { error: 'Node not found' };
        if (node.status !== 'pending') return { error: `Cannot activate node in ${node.status} status` };

        node.status = 'active';
        node.activated_at = new Date().toISOString();
        node.health.last_heartbeat = new Date().toISOString();

        // Auto-peer with same-region nodes
        const regionPeers = this._getRegionNodes(node.region).filter(n => n.node_id !== nodeId && n.status === 'active');
        for (const peer of regionPeers) {
            this.peers.get(nodeId)?.add(peer.node_id);
            this.peers.get(peer.node_id)?.add(nodeId);
        }

        return {
            status: 'activated',
            node,
            peers_connected: regionPeers.length,
            peers: regionPeers.map(p => ({ node_id: p.node_id, name: p.name, endpoint: p.endpoint })),
        };
    }

    // ─── Heartbeat ────────────────────────────────────────────────

    heartbeat(nodeId, metrics = {}) {
        const node = this.nodes.get(nodeId);
        if (!node) return { error: 'Node not found' };

        node.health.last_heartbeat = new Date().toISOString();
        if (metrics.response_ms) node.health.avg_response_ms = metrics.response_ms;
        if (metrics.uptime_pct) node.health.uptime_pct = metrics.uptime_pct;

        // Auto-activate pending nodes on first heartbeat
        if (node.status === 'pending') {
            node.status = 'active';
            node.activated_at = new Date().toISOString();
        }

        // Check SLA compliance
        const typeDef = NODE_TYPES[node.node_type];
        const slaOk = (node.health.uptime_pct >= typeDef.sla.uptime) &&
            (node.health.avg_response_ms <= typeDef.sla.response_ms);

        return {
            status: 'ok',
            node_id: nodeId,
            sla_compliant: slaOk,
            trust_score: node.trust_score,
            next_heartbeat_ms: 30000, // heartbeat every 30s
        };
    }

    // ─── Suspend / Decommission ───────────────────────────────────

    suspendNode(nodeId, reason) {
        const node = this.nodes.get(nodeId);
        if (!node) return { error: 'Node not found' };
        node.status = 'suspended';
        node.suspension_reason = reason;
        // Disconnect peers
        for (const peerId of this.peers.get(nodeId) || []) {
            this.peers.get(peerId)?.delete(nodeId);
        }
        this.peers.set(nodeId, new Set());
        return { status: 'suspended', node_id: nodeId, reason };
    }

    decommissionNode(nodeId, reason) {
        const node = this.nodes.get(nodeId);
        if (!node) return { error: 'Node not found' };
        node.status = 'decommissioned';
        node.decommission_reason = reason;
        node.decommissioned_at = new Date().toISOString();
        for (const peerId of this.peers.get(nodeId) || []) {
            this.peers.get(peerId)?.delete(nodeId);
        }
        this.peers.delete(nodeId);
        return { status: 'decommissioned', node_id: nodeId };
    }

    // ─── Peer Discovery ───────────────────────────────────────────

    discoverPeers(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { error: 'Node not found' };

        const currentPeers = this.peers.get(nodeId) || new Set();
        const candidates = [];

        // Same region first, then adjacent regions
        for (const [id, n] of this.nodes) {
            if (id === nodeId || currentPeers.has(id) || n.status !== 'active') continue;
            const sameRegion = n.region === node.region;
            candidates.push({
                node_id: id,
                name: n.name,
                node_type: n.node_type,
                region: n.region,
                trust_score: n.trust_score,
                priority: sameRegion ? 'high' : 'low',
                endpoint: n.endpoint,
            });
        }

        // Sort: same region first, then by trust score
        candidates.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
            return b.trust_score - a.trust_score;
        });

        return {
            node_id: nodeId,
            current_peers: currentPeers.size,
            candidates: candidates.slice(0, 10),
        };
    }

    connectPeer(nodeId, peerId) {
        const node = this.nodes.get(nodeId);
        const peer = this.nodes.get(peerId);
        if (!node || !peer) return { error: 'Node or peer not found' };
        this.peers.get(nodeId)?.add(peerId);
        this.peers.get(peerId)?.add(nodeId);
        return { status: 'connected', node_id: nodeId, peer_id: peerId };
    }

    // ─── Consensus Round (Proof-of-Trust) ─────────────────────────

    runConsensusRound(verificationData) {
        const { product_id, verification_type = 'qr_verification', initiator } = verificationData;

        // Select validators: active + matching capability + highest trust
        const eligible = Array.from(this.nodes.values())
            .filter(n => n.status === 'active' && n.node_type === 'validator' && n.capabilities.includes(verification_type))
            .sort((a, b) => b.trust_score - a.trust_score)
            .slice(0, CONSENSUS.max_validators);

        if (eligible.length < CONSENSUS.min_validators) {
            return {
                error: 'Insufficient validators',
                available: eligible.length,
                required: CONSENSUS.min_validators,
                message: `Need ${CONSENSUS.min_validators} validators, only ${eligible.length} available`,
            };
        }

        const selected = eligible.slice(0, Math.max(CONSENSUS.min_validators, Math.min(eligible.length, CONSENSUS.max_validators)));
        const quorumNeeded = Math.ceil(selected.length * CONSENSUS.quorum_pct / 100);

        // Simulate consensus (in production: actual async verification)
        const votes = selected.map(v => ({
            node_id: v.node_id,
            name: v.name,
            region: v.region,
            trust_score: v.trust_score,
            vote: Math.random() > 0.05 ? 'approve' : 'reject', // 95% approve rate
            response_ms: Math.floor(Math.random() * 400) + 50,
        }));

        const approvals = votes.filter(v => v.vote === 'approve').length;
        const consensus = approvals >= quorumNeeded;

        const round = {
            round_id: `CR-${Date.now().toString(36).toUpperCase()}`,
            product_id,
            verification_type,
            initiator,
            validators: selected.length,
            quorum_needed: quorumNeeded,
            approvals,
            rejections: votes.length - approvals,
            consensus_reached: consensus,
            result: consensus ? 'VERIFIED' : 'REJECTED',
            votes,
            timestamp: new Date().toISOString(),
            duration_ms: Math.max(...votes.map(v => v.response_ms)),
        };

        // Update validator stats
        for (const vote of votes) {
            const node = this.nodes.get(vote.node_id);
            if (!node) continue;
            node.health.total_rounds++;
            if (vote.vote === 'approve' && consensus) {
                node.health.successful_rounds++;
                node.health.consecutive_failures = 0;
                node.trust_score = Math.min(100, node.trust_score + CONSENSUS.reward_per_round);
                node.reputation += CONSENSUS.reward_per_round;
            } else if (vote.vote === 'reject' && consensus) {
                // Voted against consensus — minor penalty
                node.health.failed_rounds++;
                node.health.consecutive_failures++;
                node.trust_score = Math.max(0, node.trust_score - CONSENSUS.slash_per_failure);
                if (node.health.consecutive_failures >= CONSENSUS.slash_threshold) {
                    node.status = 'suspended';
                    node.suspension_reason = 'Consecutive consensus failures';
                }
            }
        }

        this.consensusRounds.push(round);
        this.networkStats.total_rounds++;
        if (consensus) this.networkStats.successful++;
        else this.networkStats.failed++;

        return round;
    }

    // ─── Network Topology Map ────────────────────────────────────

    getTopology() {
        const regionMap = {};
        for (const [regionId, regionInfo] of Object.entries(REGIONS)) {
            const nodes = this._getRegionNodes(regionId);
            regionMap[regionId] = {
                ...regionInfo,
                total_nodes: nodes.length,
                active: nodes.filter(n => n.status === 'active').length,
                validators: nodes.filter(n => n.node_type === 'validator' && n.status === 'active').length,
                relays: nodes.filter(n => n.node_type === 'relay' && n.status === 'active').length,
                archives: nodes.filter(n => n.node_type === 'archive' && n.status === 'active').length,
            };
        }

        const allNodes = Array.from(this.nodes.values());
        return {
            title: 'Network Topology Map',
            total_nodes: allNodes.length,
            active_nodes: allNodes.filter(n => n.status === 'active').length,
            by_type: {
                validators: allNodes.filter(n => n.node_type === 'validator').length,
                relays: allNodes.filter(n => n.node_type === 'relay').length,
                archives: allNodes.filter(n => n.node_type === 'archive').length,
                observers: allNodes.filter(n => n.node_type === 'observer').length,
            },
            by_status: {
                active: allNodes.filter(n => n.status === 'active').length,
                pending: allNodes.filter(n => n.status === 'pending').length,
                suspended: allNodes.filter(n => n.status === 'suspended').length,
                decommissioned: allNodes.filter(n => n.status === 'decommissioned').length,
            },
            regions: regionMap,
            consensus: { ...CONSENSUS, stats: this.networkStats },
            timestamp: new Date().toISOString(),
        };
    }

    // ─── Network Health ───────────────────────────────────────────

    getNetworkHealth() {
        const active = Array.from(this.nodes.values()).filter(n => n.status === 'active');
        if (active.length === 0) return { status: 'no_nodes', health: 'unknown' };

        const avgTrust = active.reduce((a, n) => a + n.trust_score, 0) / active.length;
        const avgUptime = active.reduce((a, n) => a + n.health.uptime_pct, 0) / active.length;
        const avgResponse = active.reduce((a, n) => a + n.health.avg_response_ms, 0) / active.length;
        const staleNodes = active.filter(n => {
            if (!n.health.last_heartbeat) return true;
            return Date.now() - new Date(n.health.last_heartbeat).getTime() > 120000; // >2 min stale
        });

        const successRate = this.networkStats.total_rounds > 0
            ? Math.round((this.networkStats.successful / this.networkStats.total_rounds) * 100)
            : 100;

        const health = avgTrust > 80 && avgUptime > 99 && staleNodes.length === 0 ? 'healthy'
            : avgTrust > 60 && avgUptime > 95 ? 'degraded'
                : 'critical';

        return {
            status: health,
            active_nodes: active.length,
            avg_trust_score: Math.round(avgTrust * 100) / 100,
            avg_uptime_pct: Math.round(avgUptime * 100) / 100,
            avg_response_ms: Math.round(avgResponse),
            stale_nodes: staleNodes.length,
            consensus_success_rate: successRate,
            total_rounds: this.networkStats.total_rounds,
            timestamp: new Date().toISOString(),
        };
    }

    // ─── Node List ────────────────────────────────────────────────

    getNodes(filters = {}) {
        let nodes = Array.from(this.nodes.values());
        if (filters.type) nodes = nodes.filter(n => n.node_type === filters.type);
        if (filters.region) nodes = nodes.filter(n => n.region === filters.region);
        if (filters.status) nodes = nodes.filter(n => n.status === filters.status);
        return nodes.map(n => ({
            node_id: n.node_id,
            name: n.name,
            node_type: n.node_type,
            region: n.region,
            status: n.status,
            trust_score: n.trust_score,
            reputation: n.reputation,
            health: n.health,
            registered_at: n.registered_at,
        }));
    }

    getNode(nodeId) { return this.nodes.get(nodeId) || null; }

    getConsensusHistory(limit = 20) {
        return this.consensusRounds.slice(-limit).reverse();
    }

    getNodeTypes() { return NODE_TYPES; }
    getRegions() { return REGIONS; }
    getConsensusParams() { return CONSENSUS; }

    // ─── Helpers ──────────────────────────────────────────────────

    _getRegionNodes(region) {
        return Array.from(this.nodes.values()).filter(n => n.region === region);
    }
}

module.exports = new NetworkTopologyEngine();
