#!/usr/bin/env node
/**
 * Compile ERQF engine to V8 bytecode (.jsc)
 * Usage: node scripts/compile-erqf.js
 */
const bytenode = require('bytenode');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'server', 'engines', 'erqf-engine.js');
const dst = path.join(__dirname, '..', 'server', 'engines', 'erqf-engine.jsc');

if (!fs.existsSync(src)) {
    console.error('❌ Source file not found:', src);
    process.exit(1);
}

console.log('🔐 Compiling ERQF engine to V8 bytecode...');
console.log('   Source:', src);
console.log('   Output:', dst);

bytenode.compileFile(src, dst).then(() => {
    const srcSize = fs.statSync(src).size;
    const dstSize = fs.statSync(dst).size;
    console.log(`✅ Compiled successfully!`);
    console.log(`   JS: ${srcSize} bytes → JSC: ${dstSize} bytes`);
    console.log(`   The .jsc file is V8 bytecode — not readable by humans.`);
    console.log(`\n📌 Next steps:`);
    console.log(`   1. Deploy only erqf-engine.jsc to VPS (not .js)`);
    console.log(`   2. Update require in tenant-admin.js to load .jsc`);
}).catch(err => {
    console.error('❌ Compilation failed:', err.message);
    process.exit(1);
});
