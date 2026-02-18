const { safeError } = require('../utils/safe-error');
/**
 * White-label Branding Routes
 * Theme configuration, logo, colors, custom domain per organization
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// Default theme
const DEFAULT_THEME = {
    brand_name: 'TrustChecker',
    tagline: 'Digital Trust Infrastructure',
    logo_url: null,
    favicon_url: null,
    primary_color: '#00ffcc',
    secondary_color: '#0088ff',
    accent_color: '#ff6b6b',
    background_color: '#0a0a1a',
    surface_color: '#111322',
    text_color: '#e0e0e0',
    font_family: 'Inter, sans-serif',
    border_radius: '12px',
    custom_css: '',
    custom_domain: null,
    features: {
        show_branding: true,
        show_powered_by: true,
        custom_login_page: false,
        custom_email_template: false
    }
};

// ─── GET / — Get current branding config ────────────────────
router.get('/', async (req, res) => {
    try {
        const brandConfig = await db.get("SELECT details FROM audit_log WHERE action = 'BRAND_CONFIG' AND actor_id = ? ORDER BY timestamp DESC LIMIT 1", [req.user.company || req.user.id]);
        const theme = brandConfig ? { ...DEFAULT_THEME, ...JSON.parse(brandConfig.details) } : DEFAULT_THEME;

        res.json({
            theme,
            css_variables: generateCSSVariables(theme),
            is_default: !brandConfig
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT / — Update branding configuration ──────────────────
router.put('/', requireRole('admin'), async (req, res) => {
    try {
        const {
            brand_name, tagline, logo_url, favicon_url,
            primary_color, secondary_color, accent_color,
            background_color, surface_color, text_color,
            font_family, border_radius, custom_css, custom_domain,
            features
        } = req.body;

        const theme = {
            brand_name: brand_name || DEFAULT_THEME.brand_name,
            tagline: tagline || DEFAULT_THEME.tagline,
            logo_url: logo_url || null,
            favicon_url: favicon_url || null,
            primary_color: primary_color || DEFAULT_THEME.primary_color,
            secondary_color: secondary_color || DEFAULT_THEME.secondary_color,
            accent_color: accent_color || DEFAULT_THEME.accent_color,
            background_color: background_color || DEFAULT_THEME.background_color,
            surface_color: surface_color || DEFAULT_THEME.surface_color,
            text_color: text_color || DEFAULT_THEME.text_color,
            font_family: font_family || DEFAULT_THEME.font_family,
            border_radius: border_radius || DEFAULT_THEME.border_radius,
            custom_css: custom_css || '',
            custom_domain: custom_domain || null,
            features: features || DEFAULT_THEME.features,
            updated_at: new Date().toISOString()
        };

        // Validate colors
        const colorFields = ['primary_color', 'secondary_color', 'accent_color', 'background_color', 'surface_color', 'text_color'];
        for (const field of colorFields) {
            if (theme[field] && !/^#[0-9A-Fa-f]{6}$/.test(theme[field])) {
                return res.status(400).json({ error: `Invalid color format for ${field}: ${theme[field]}. Use #RRGGBB.` });
            }
        }

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.company || req.user.id, 'BRAND_CONFIG', 'branding', req.user.id, JSON.stringify(theme));

        res.json({
            theme,
            css_variables: generateCSSVariables(theme),
            message: 'Branding configuration updated'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /reset — Reset to default branding ────────────────
router.post('/reset', requireRole('admin'), async (req, res) => {
    try {
        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.company || req.user.id, 'BRAND_CONFIG', 'branding', req.user.id, JSON.stringify(DEFAULT_THEME));

        res.json({ theme: DEFAULT_THEME, message: 'Branding reset to defaults' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /preview — Preview branding as CSS ─────────────────
router.get('/preview', async (req, res) => {
    try {
        const brandConfig = await db.get("SELECT details FROM audit_log WHERE action = 'BRAND_CONFIG' AND actor_id = ? ORDER BY timestamp DESC LIMIT 1", [req.user.company || req.user.id]);
        const theme = brandConfig ? { ...DEFAULT_THEME, ...JSON.parse(brandConfig.details) } : DEFAULT_THEME;

        const css = `
/* TrustChecker White-Label Theme — ${theme.brand_name} */
:root {
${generateCSSVariables(theme).map(v => `  ${v.property}: ${v.value};`).join('\n')}
}
${theme.custom_css || ''}
`;

        res.setHeader('Content-Type', 'text/css');
        res.send(css);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /presets — List available theme presets ─────────────
router.get('/presets', async (req, res) => {
    res.json({
        presets: [
            {
                name: 'TrustChecker Default', id: 'default',
                primary_color: '#00ffcc', secondary_color: '#0088ff', background_color: '#0a0a1a'
            },
            {
                name: 'Corporate Blue', id: 'corporate',
                primary_color: '#2563eb', secondary_color: '#1e40af', background_color: '#0f172a'
            },
            {
                name: 'Emerald Green', id: 'emerald',
                primary_color: '#10b981', secondary_color: '#059669', background_color: '#0a1a15'
            },
            {
                name: 'Royal Purple', id: 'purple',
                primary_color: '#8b5cf6', secondary_color: '#7c3aed', background_color: '#13091f'
            },
            {
                name: 'Sunrise Orange', id: 'sunrise',
                primary_color: '#f59e0b', secondary_color: '#d97706', background_color: '#1a1208'
            },
            {
                name: 'Light Mode', id: 'light',
                primary_color: '#0066cc', secondary_color: '#004499', background_color: '#ffffff', text_color: '#1a1a1a', surface_color: '#f5f5f5'
            }
        ]
    });
});

function generateCSSVariables(theme) {
    return [
        { property: '--primary', value: theme.primary_color },
        { property: '--secondary', value: theme.secondary_color },
        { property: '--accent', value: theme.accent_color },
        { property: '--bg', value: theme.background_color },
        { property: '--surface', value: theme.surface_color },
        { property: '--text', value: theme.text_color },
        { property: '--font', value: theme.font_family },
        { property: '--radius', value: theme.border_radius },
        { property: '--primary-rgb', value: hexToRgb(theme.primary_color) },
        { property: '--accent-rgb', value: hexToRgb(theme.accent_color) },
    ];
}

function hexToRgb(hex) {
    if (!hex || hex.length < 7) return '0, 255, 204';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

module.exports = router;
