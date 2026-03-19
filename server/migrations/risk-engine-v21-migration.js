/**
 * Risk Engine V21.6 — Database Migration
 * Creates tables for trust network persistence, org credibility, insights, market data, ROI, API keys.
 * Idempotent: uses CREATE TABLE IF NOT EXISTS.
 */
const db = require('../db');
const crypto = require('crypto');

async function runMigration() {
    console.log('🔄 Running Risk Engine V21.6 migration...');

    // 1. Trust network data (V20)
    await db.run(`CREATE TABLE IF NOT EXISTS trust_network_data (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        trust_score REAL NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_tnd_actor ON trust_network_data(actor_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_tnd_org ON trust_network_data(org_id)`);

    // 2. Org credibility (V21)
    await db.run(`CREATE TABLE IF NOT EXISTS org_credibility (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id TEXT UNIQUE NOT NULL,
        total_reports INT DEFAULT 0,
        accurate INT DEFAULT 0,
        agreed INT DEFAULT 0,
        false_positives INT DEFAULT 0,
        credibility_score REAL DEFAULT 0.5,
        tier TEXT DEFAULT 'bronze',
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_oc_org ON org_credibility(org_id)`);

    // 3. Network insights (V21.6)
    await db.run(`CREATE TABLE IF NOT EXISTS network_insights (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        type TEXT NOT NULL,
        actor_id TEXT,
        batch_id TEXT,
        severity TEXT DEFAULT 'info',
        data JSONB DEFAULT '{}',
        org_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_ni_type ON network_insights(type)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_ni_org ON network_insights(org_id)`);

    // 4. Market data (V21.6)
    await db.run(`CREATE TABLE IF NOT EXISTS market_data (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        region TEXT NOT NULL,
        category TEXT DEFAULT 'default',
        risk_score REAL DEFAULT 0,
        is_fraud BOOLEAN DEFAULT false,
        org_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_md_region ON market_data(region)`);

    // 5. ROI tracker (V21.6)
    await db.run(`CREATE TABLE IF NOT EXISTS roi_tracker (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id TEXT UNIQUE NOT NULL,
        total_scans INT DEFAULT 0,
        fraud_detected INT DEFAULT 0,
        blocked_value REAL DEFAULT 0,
        passed_value REAL DEFAULT 0,
        baseline_loss_rate REAL DEFAULT 0.05,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_roi_org ON roi_tracker(org_id)`);

    console.log('✅ Risk Engine V21.6 migration complete (5 tables + indexes)');
}

module.exports = { runMigration };
