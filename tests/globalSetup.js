const http = require("http");
const fs = require("fs");
const path = require("path");

module.exports = async function() {
    var base = process.env.TEST_URL || "http://localhost:4000";
    return new Promise(function(resolve) {
        var data = JSON.stringify({ email: "owner@tonyisking.com", password: "123qaz12" });
        var url = new URL(base + "/api/auth/login");
        var req = http.request({
            hostname: url.hostname, port: url.port, path: url.pathname,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": data.length }
        }, function(res) {
            var body = "";
            res.on("data", function(c) { body += c; });
            res.on("end", function() {
                try {
                    var parsed = JSON.parse(body);
                    fs.writeFileSync("/tmp/test-token.txt", parsed.token || "");
                } catch(e) {
                    fs.writeFileSync("/tmp/test-token.txt", "");
                }
                resolve();
            });
        });
        req.on("error", function() { fs.writeFileSync("/tmp/test-token.txt", ""); resolve(); });
        req.write(data);
        req.end();
    });
};
