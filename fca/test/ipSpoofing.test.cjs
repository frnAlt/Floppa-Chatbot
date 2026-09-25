"use strict";

const assert = require("assert");
const fca = require("../index.js");
const {
    generateResidentialIP,
    generateResidentialIPMeta,
    generateResidentialIPv6,
    getSpoofedIpHeaders,
    getDeviceFingerprint,
    calculateTypingDelay,
    isIpBannedOrRateLimited,
    ProxyRotator,
    IpBanProtection,
    globalIpBanProtection
} = require("../src/utils/ipSpoofing");
const { getHeaders } = require("../src/utils/headers");

const tests = [];
function test(name, fn) {
    tests.push({ name, fn });
}

test("generateResidentialIP returns a valid non-private IPv4 address", () => {
    for (let i = 0; i < 20; i++) {
        const ip = generateResidentialIP();
        assert.match(ip, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        const parts = ip.split(".").map(Number);
        assert.ok(parts[0] > 0 && parts[0] < 224, `Invalid first octet: ${ip}`);
        assert.ok(parts[0] !== 10, `IP in private 10.x subnet: ${ip}`);
        assert.ok(parts[0] !== 127, `IP is loopback: ${ip}`);
        assert.ok(!(parts[0] === 192 && parts[1] === 168), `IP is private 192.168.x: ${ip}`);
        assert.ok(parts[3] >= 1 && parts[3] <= 254, `Invalid host octet: ${ip}`);
    }
});

test("generateResidentialIPv6 returns valid IPv6 structure", () => {
    const ipv6 = generateResidentialIPv6();
    assert.ok(typeof ipv6 === "string");
    assert.ok(ipv6.includes(":"));
    assert.ok(ipv6.startsWith("2600:") || ipv6.startsWith("2601:") || ipv6.startsWith("2607:") ||
              ipv6.startsWith("2a02:") || ipv6.startsWith("2a01:") || ipv6.startsWith("2405:") || ipv6.startsWith("2402:"));
});

test("getSpoofedIpHeaders creates comprehensive anti-ban forwarding headers", () => {
    const testIP = "73.45.120.88";
    const headers = getSpoofedIpHeaders(testIP);

    assert.strictEqual(headers["X-Forwarded-For"], testIP);
    assert.strictEqual(headers["Client-IP"], testIP);
    assert.strictEqual(headers["X-Real-IP"], testIP);
    assert.strictEqual(headers["CF-Connecting-IP"], testIP);
    assert.strictEqual(headers["True-Client-IP"], testIP);
    assert.strictEqual(headers["X-Cluster-Client-IP"], testIP);
    assert.strictEqual(headers["Fastly-Client-IP"], testIP);
    assert.ok(headers["Forwarded"].includes(testIP));
    assert.strictEqual(headers["X-Forwarded-Proto"], "https");
    assert.strictEqual(headers["X-Forwarded-Host"], "www.facebook.com");
});

test("isIpBannedOrRateLimited detects HTTP status codes and FB challenge payloads", () => {
    assert.strictEqual(isIpBannedOrRateLimited(429), true);
    assert.strictEqual(isIpBannedOrRateLimited(403), true);
    assert.strictEqual(isIpBannedOrRateLimited(503), true);
    assert.strictEqual(isIpBannedOrRateLimited(200), false);

    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, headers: { "retry-after": "60" } }), true);
    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, body: "action_blocked: user is temporarily restricted" }), true);
    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, body: '{"error":1357004,"error_summary":"Challenge required"}' }), true);
    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, body: '{"error":368,"message":"Action blocked for spam"}' }), true);
    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, body: 'Please slow down and try again later' }), true);
    assert.strictEqual(isIpBannedOrRateLimited({ status: 200, body: "Welcome to Facebook" }), false);
});

test("IpBanProtection rotates IP, tracks history, and calculates backoff", () => {
    const protector = new IpBanProtection({
        enabled: true,
        spoofIP: true,
        rotateIPOnBlock: true,
        ignoreIPBan: true,
        maxRetries: 3,
        backoffMs: 1000
    });

    const initialIP = protector.getCurrentIP();
    assert.ok(initialIP);

    const blockResult1 = protector.handleBlock({ status: 429 }, 1);
    assert.strictEqual(blockResult1.shouldRetry, true);
    assert.strictEqual(blockResult1.attempt, 1);
    assert.ok(blockResult1.waitMs >= 1000);
    assert.notStrictEqual(blockResult1.newIP, initialIP);

    const blockResult2 = protector.handleBlock({ status: 429 }, 2);
    assert.strictEqual(blockResult2.shouldRetry, true);
    assert.ok(blockResult2.waitMs > blockResult1.waitMs);

    const status = protector.getStatus();
    assert.strictEqual(status.rotationCount, 2);
    assert.strictEqual(status.totalBlocksEncountered, 2);
    assert.ok(status.currentIP);
});

test("getHeaders incorporates spoofed IP headers when enabled and omits them by default", () => {
    const spoofedHeaders = getHeaders("https://www.facebook.com/api/graphql/", { spoofIP: true }, {});
    assert.ok(spoofedHeaders["X-Forwarded-For"], "X-Forwarded-For header missing in getHeaders when spoofIP=true");
    assert.ok(spoofedHeaders["Client-IP"], "Client-IP header missing in getHeaders when spoofIP=true");
    assert.ok(spoofedHeaders["CF-Connecting-IP"], "CF-Connecting-IP header missing in getHeaders when spoofIP=true");
    assert.ok(spoofedHeaders["X-Real-IP"], "X-Real-IP header missing in getHeaders when spoofIP=true");

    const directHeaders = getHeaders("https://www.facebook.com/api/graphql/", {}, {});
    assert.strictEqual(directHeaders["CF-Connecting-IP"], undefined, "CF-Connecting-IP should not be present on direct connections");
    assert.strictEqual(directHeaders["Fastly-Client-IP"], undefined, "Fastly-Client-IP should not be present on direct connections");
    assert.strictEqual(directHeaders["X-Forwarded-For"], undefined, "X-Forwarded-For should not be present on direct connections");
});

test("generateResidentialIPMeta provides rich geo and ISP metadata", () => {
    const meta = generateResidentialIPMeta();
    assert.ok(meta.ip);
    assert.ok(meta.isp);
    assert.ok(meta.country);
    assert.ok(meta.locale);
    assert.ok(meta.timezone);
});

test("getDeviceFingerprint returns consistent client hints and hardware specs", () => {
    const fp = getDeviceFingerprint("desktop");
    assert.strictEqual(fp.isMobile, false);
    assert.ok(fp.screen.width > 0);
    assert.ok(fp.deviceMemory >= 8);
    assert.ok(fp.hardwareConcurrency >= 4);
    assert.ok(fp.clientHints["sec-ch-viewport-width"]);
    assert.strictEqual(fp.clientHints["sec-ch-ua-mobile"], "?0");
});

test("calculateTypingDelay scales with text length and bounds safely", () => {
    const shortDelay = calculateTypingDelay("hi");
    const longDelay = calculateTypingDelay("Hello world! This is an extended test message with some punctuation, right?");
    assert.ok(shortDelay >= 350);
    assert.ok(longDelay > shortDelay);
    assert.ok(longDelay <= 2500);
});

test("ProxyRotator rotates proxies and tracks failed nodes", () => {
    const rotator = new ProxyRotator(["http://p1:8080", "http://p2:8080"]);
    assert.strictEqual(rotator.getActiveProxy(), "http://p1:8080");
    assert.strictEqual(rotator.rotate(), "http://p2:8080");
    assert.strictEqual(rotator.rotate(), "http://p1:8080");
    rotator.markFailed("http://p1:8080");
    assert.ok(rotator.failedProxies.has("http://p1:8080"));
});

test("fca exports IP spoofing helpers directly on root module", () => {
    assert.strictEqual(typeof fca.ipSpoofing, "object");
    assert.strictEqual(typeof fca.globalIpBanProtection, "object");
    assert.strictEqual(typeof fca.generateResidentialIP, "function");
    assert.strictEqual(typeof fca.generateResidentialIPv6, "function");
    assert.strictEqual(typeof fca.getSpoofedIpHeaders, "function");
    assert.strictEqual(typeof fca.isIpBannedOrRateLimited, "function");
    assert.strictEqual(typeof fca.IpBanProtection, "function");
});

async function main() {
    let passed = 0;
    for (const { name, fn } of tests) {
        try {
            await fn();
            passed++;
            console.log(`PASS ${name}`);
        } catch (err) {
            console.error(`FAIL ${name}`);
            throw err;
        }
    }
    console.log(`\nALL ${passed}/${tests.length} IP SPOOFING & ANTI-BAN TESTS PASSED!`);
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
