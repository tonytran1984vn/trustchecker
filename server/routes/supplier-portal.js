/**
 * Supplier Self-Service Portal v1.0
 * Public:  GET /api/supplier-portal/:slug        — public supplier profile
 * Auth:    GET /api/supplier-portal/my/profile    — own supplier profile
 *          PUT /api/supplier-portal/my/profile    — update own profile
 *          GET /api/supplier-portal/my/scores     — own trust scores history
 *          GET /api/supplier-portal/my/improvements — improvement suggestions
 *          PUT /api/supplier-portal/my/assessment — self-assessment
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

// Public: view published supplier profile
router.get('/:slug', async function (req, res) {
    try {
        const result = await db.all(
            'SELECT public_name, slug, description, website, country, certifications, public_trust_score, logo_url FROM supplier_profiles WHERE slug = $1 AND is_published = true',
            [req.params.slug]
        );
        if (!result[0]) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ supplier: result[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load supplier profile' });
    }
});

// Authenticated routes
router.get('/my/profile', authMiddleware, async function (req, res) {
    try {
        const result = await db.all('SELECT * FROM supplier_profiles WHERE org_id = $1 LIMIT 1', [req.user.org_id]);
        res.json({ profile: result[0] || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

router.put('/my/profile', authMiddleware, async function (req, res) {
    try {
        const b = req.body;
        const slug = (b.public_name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const result = await db.all(
            'INSERT INTO supplier_profiles (org_id, public_name, slug, description, website, country, certifications, logo_url, is_published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO UPDATE SET public_name=$2, description=$4, website=$5, country=$6, certifications=$7, logo_url=$8, is_published=$9, updated_at=NOW() RETURNING id, slug',
            [
                req.user.org_id,
                b.public_name,
                slug,
                b.description,
                b.website,
                b.country,
                JSON.stringify(b.certifications || []),
                b.logo_url,
                b.is_published || false,
            ]
        );
        res.json({ profile: result[0], status: 'saved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

router.get('/my/scores', authMiddleware, async function (req, res) {
    try {
        const result = await db.all(
            'SELECT sv.predicted_score, sv.actual_outcome, sv.accuracy_delta, sv.created_at FROM score_validations sv WHERE sv.org_id = $1 ORDER BY sv.created_at DESC LIMIT 50',
            [req.user.org_id]
        );
        res.json({ scores: result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load scores' });
    }
});

router.get('/my/improvements', authMiddleware, async function (req, res) {
    try {
        const result = await db.all('SELECT improvement_plan FROM supplier_profiles WHERE org_id = $1 LIMIT 1', [
            req.user.org_id,
        ]);
        const plan = (result[0] && result[0].improvement_plan) || [];

        // Auto-generate improvement suggestions
        const suggestions = [
            {
                area: 'Certifications',
                action: 'Add ISO 27001, SOC2, or industry-specific certifications',
                impact: 'high',
            },
            { area: 'Incident Response', action: 'Document incident response procedures', impact: 'high' },
            { area: 'Transparency', action: 'Publish self-assessment and score validation data', impact: 'medium' },
            { area: 'Carbon', action: 'Report Scope 1-3 emissions data', impact: 'medium' },
            { area: 'Compliance', action: 'Complete GDPR/data protection documentation', impact: 'high' },
        ];
        res.json({ improvement_plan: plan, suggestions: suggestions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load improvements' });
    }
});

router.put('/my/assessment', authMiddleware, async function (req, res) {
    try {
        await db.all('UPDATE supplier_profiles SET self_assessment = $1, updated_at = NOW() WHERE org_id = $2', [
            JSON.stringify(req.body.assessment || {}),
            req.user.org_id,
        ]);
        res.json({ status: 'saved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save assessment' });
    }
});

module.exports = router;
