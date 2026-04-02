const engines = require('./server/engines/economics-engine');
for (const [name, engine] of Object.entries(engines)) {
  console.info("Testing:", name);
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine)).filter(m => m !== 'constructor');
  for (const method of methods) {
    try {
        if (method === "analyzeIncentive") {
            engine[method]('validator', 1000, 0, 0); // test /0
        } else if (method === "projectScale") {
            engine[method](1000); // baseVolume parameter
        } else if (method === "calculateUnitEconomics") {
            engine[method]({});
        } else {
            engine[method]();
        }
        console.log(`  - [PASS] ${method}`);
    } catch(err) {
        console.error(`  - [FAIL] ${method}: ${err.message}`);
    }
  }
}
