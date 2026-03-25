/**
 * GeoIP Resolution Utility
 * Uses geoip-lite (MaxMind) for zero-latency, local IP-to-location lookups.
 * No external API calls — the database is bundled with the package.
 */
let geoip;
try {
    geoip = require('geoip-lite');
} catch (e) {
    console.warn('[GeoIP] geoip-lite not installed, geo resolution disabled');
    geoip = null;
}

/**
 * Resolve an IP address to geographic location.
 * @param {string} ip — IPv4 or IPv6 address
 * @returns {{ city: string|null, region: string|null, country: string|null, ll: number[]|null }}
 */
function resolve(ip) {
    if (!geoip || !ip) return { city: null, region: null, country: null, ll: null };

    // Strip IPv6-mapped IPv4 prefix
    const cleanIP = ip.replace(/^::ffff:/, '');

    // Skip private/local IPs
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
        return { city: null, region: null, country: null, ll: null };
    }

    try {
        const geo = geoip.lookup(cleanIP);
        if (!geo) return { city: null, region: null, country: null, ll: null };

        return {
            city: geo.city || null,
            region: geo.region || null,
            country: geo.country || null,
            ll: geo.ll || null,
        };
    } catch (e) {
        return { city: null, region: null, country: null, ll: null };
    }
}

module.exports = { resolve };
