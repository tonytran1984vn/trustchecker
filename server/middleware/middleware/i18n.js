/**
 * i18n (Internationalization) Middleware v1.0
 * Supports: en, vi, zh, ja, ko, de, fr, es
 */
const SUPPORTED_LOCALES = ['en', 'vi', 'zh', 'ja', 'ko', 'de', 'fr', 'es'];
const DEFAULT_LOCALE = 'en';

function i18nMiddleware(req, res, next) {
    // Determine locale from Accept-Language header or query param
    let locale = req.query.lang || DEFAULT_LOCALE;
    const acceptLang = req.headers['accept-language'];
    if (acceptLang && !req.query.lang) {
        const match = acceptLang.match(/^([a-z]{2})/i);
        if (match && SUPPORTED_LOCALES.includes(match[1].toLowerCase())) {
            locale = match[1].toLowerCase();
        }
    }
    req.locale = locale;
    res.setHeader('Content-Language', locale);
    next();
}

module.exports = { i18nMiddleware: i18nMiddleware, SUPPORTED_LOCALES: SUPPORTED_LOCALES };
