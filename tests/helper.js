var fs = require("fs");
function getToken() {
    try { return fs.readFileSync("/tmp/test-token.txt", "utf8").trim(); }
    catch(e) { return ""; }
}
module.exports = { getToken: getToken };
