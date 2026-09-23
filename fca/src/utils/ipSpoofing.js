"use strict";

/**
 * @file ipSpoofing.js
 * Advanced IP Spoofing, Ban Bypass, Device Fingerprinting, and Anti-Rate-Limit Engine for Floppa FCA.
 * Designed to bypass data-center IP flags, cloud provider subnet bans (AWS, GCP, Heroku, Render),
 * and Facebook anti-scraping / rate-limit heuristics by injecting multi-tier residential proxy
 * forwarding headers, realistic device hardware fingerprints, dynamic IP/proxy rotation, and
 * automatic anti-ban recovery.
 */

const RESIDENTIAL_SUBNETS = [
    // North America (Comcast, AT&T, Verizon, Charter, Cox)
    { prefix: "24.120.", min: 1, max: 254, isp: "Comcast Cable", country: "US", locale: "en-US", tz: "America/New_York", region: "ASH" },
    { prefix: "67.160.", min: 1, max: 254, isp: "Comcast Cable", country: "US", locale: "en-US", tz: "America/Chicago", region: "DFW" },
    { prefix: "73.45.", min: 1, max: 254, isp: "Comcast Cable", country: "US", locale: "en-US", tz: "America/Denver", region: "DFW" },
    { prefix: "76.102.", min: 1, max: 254, isp: "Comcast Cable", country: "US", locale: "en-US", tz: "America/Los_Angeles", region: "LLA" },
    { prefix: "98.209.", min: 1, max: 254, isp: "Comcast Cable", country: "US", locale: "en-US", tz: "America/New_York", region: "ASH" },
    { prefix: "99.100.", min: 1, max: 254, isp: "AT&T Internet Services", country: "US", locale: "en-US", tz: "America/Chicago", region: "DFW" },
    { prefix: "108.192.", min: 1, max: 254, isp: "AT&T Internet Services", country: "US", locale: "en-US", tz: "America/Los_Angeles", region: "LLA" },
    { prefix: "107.130.", min: 1, max: 254, isp: "AT&T Internet Services", country: "US", locale: "en-US", tz: "America/New_York", region: "ASH" },
    { prefix: "70.160.", min: 1, max: 254, isp: "Verizon Fios", country: "US", locale: "en-US", tz: "America/New_York", region: "ASH" },
    { prefix: "108.6.", min: 1, max: 254, isp: "Verizon Fios", country: "US", locale: "en-US", tz: "America/New_York", region: "ASH" },
    { prefix: "96.40.", min: 1, max: 254, isp: "Charter Spectrum", country: "US", locale: "en-US", tz: "America/Los_Angeles", region: "LLA" },
    { prefix: "142.112.", min: 1, max: 254, isp: "Charter Spectrum", country: "US", locale: "en-US", tz: "America/Chicago", region: "DFW" },
    { prefix: "68.96.", min: 1, max: 254, isp: "Cox Communications", country: "US", locale: "en-US", tz: "America/Phoenix", region: "LLA" },

    // Europe (Deutsche Telekom, Orange, Vodafone UK, British Telecom, Iliad)
    { prefix: "80.187.", min: 1, max: 254, isp: "Deutsche Telekom", country: "DE", locale: "de-DE,de;q=0.9,en;q=0.8", tz: "Europe/Berlin", region: "FRA" },
    { prefix: "84.130.", min: 1, max: 254, isp: "Deutsche Telekom", country: "DE", locale: "de-DE,de;q=0.9,en;q=0.8", tz: "Europe/Berlin", region: "FRA" },
    { prefix: "90.63.", min: 1, max: 254, isp: "Orange France", country: "FR", locale: "fr-FR,fr;q=0.9,en;q=0.8", tz: "Europe/Paris", region: "FRA" },
    { prefix: "92.128.", min: 1, max: 254, isp: "Vodafone UK", country: "GB", locale: "en-GB,en;q=0.9", tz: "Europe/London", region: "FRA" },
    { prefix: "86.136.", min: 1, max: 254, isp: "British Telecom", country: "GB", locale: "en-GB,en;q=0.9", tz: "Europe/London", region: "FRA" },
    { prefix: "79.16.", min: 1, max: 254, isp: "Telecom Italia", country: "IT", locale: "it-IT,it;q=0.9,en;q=0.8", tz: "Europe/Rome", region: "FRA" },
    { prefix: "82.50.", min: 1, max: 254, isp: "Fastweb Italy", country: "IT", locale: "it-IT,it;q=0.9,en;q=0.8", tz: "Europe/Rome", region: "FRA" },
    { prefix: "83.32.", min: 1, max: 254, isp: "Telefonica de Espana", country: "ES", locale: "es-ES,es;q=0.9,en;q=0.8", tz: "Europe/Madrid", region: "FRA" },

    // Asia-Pacific (Viettel, VNPT, FPT, Singtel, Jio, Airtel, NTT, Telstra)
    { prefix: "113.160.", min: 1, max: 254, isp: "VNPT Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "113.185.", min: 1, max: 254, isp: "VNPT Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "115.72.", min: 1, max: 254, isp: "Viettel Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "115.79.", min: 1, max: 254, isp: "Viettel Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "171.244.", min: 1, max: 254, isp: "Viettel Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "1.52.", min: 1, max: 254, isp: "FPT Telecom Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "118.69.", min: 1, max: 254, isp: "FPT Telecom Vietnam", country: "VN", locale: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7", tz: "Asia/Ho_Chi_Minh", region: "SIN" },
    { prefix: "49.204.", min: 1, max: 254, isp: "Reliance Jio Infocomm", country: "IN", locale: "en-IN,en;q=0.9,hi;q=0.8", tz: "Asia/Kolkata", region: "SIN" },
    { prefix: "49.32.", min: 1, max: 254, isp: "Reliance Jio Infocomm", country: "IN", locale: "en-IN,en;q=0.9,hi;q=0.8", tz: "Asia/Kolkata", region: "SIN" },
    { prefix: "106.208.", min: 1, max: 254, isp: "Bharti Airtel", country: "IN", locale: "en-IN,en;q=0.9,hi;q=0.8", tz: "Asia/Kolkata", region: "SIN" },
    { prefix: "116.86.", min: 1, max: 254, isp: "Singtel Singapore", country: "SG", locale: "en-SG,en;q=0.9,zh-CN;q=0.8", tz: "Asia/Singapore", region: "SIN" },
    { prefix: "133.200.", min: 1, max: 254, isp: "NTT Communications Japan", country: "JP", locale: "ja-JP,ja;q=0.9,en;q=0.8", tz: "Asia/Tokyo", region: "NRT" },
    { prefix: "1.128.", min: 1, max: 254, isp: "Telstra Australia", country: "AU", locale: "en-AU,en;q=0.9", tz: "Australia/Sydney", region: "SYD" },
    { prefix: "101.160.", min: 1, max: 254, isp: "Telstra Australia", country: "AU", locale: "en-AU,en;q=0.9", tz: "Australia/Sydney", region: "SYD" },

    // Latin America (Claro, Telefonica, Telmex)
    { prefix: "189.130.", min: 1, max: 254, isp: "Telmex Mexico", country: "MX", locale: "es-MX,es;q=0.9,en;q=0.8", tz: "America/Mexico_City", region: "DFW" },
    { prefix: "187.188.", min: 1, max: 254, isp: "Claro Brazil", country: "BR", locale: "pt-BR,pt;q=0.9,en;q=0.8", tz: "America/Sao_Paulo", region: "DFW" },
    { prefix: "177.100.", min: 1, max: 254, isp: "Telefonica Brasil", country: "BR", locale: "pt-BR,pt;q=0.9,en;q=0.8", tz: "America/Sao_Paulo", region: "DFW" }
];

/**
 * Generate a random integer between min and max inclusive.
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a realistic public residential IPv4 address with associated subnet metadata.
 */
function generateResidentialIPMeta() {
    const subnet = RESIDENTIAL_SUBNETS[Math.floor(Math.random() * RESIDENTIAL_SUBNETS.length)];
    const octet3 = randomInt(subnet.min, subnet.max);
    const octet4 = randomInt(2, 253);
    const ip = `${subnet.prefix}${octet3}.${octet4}`;
    return {
        ip,
        isp: subnet.isp,
        country: subnet.country,
        locale: subnet.locale,
        timezone: subnet.tz,
        region: subnet.region
    };
}

/**
 * Generates a realistic public residential IPv4 address.
 * Guarantees rejection of private (RFC 1918), loopback, CGNAT, multicast, and broadcast ranges.
 */
function generateResidentialIP() {
    return generateResidentialIPMeta().ip;
}

/**
 * Generates a realistic public residential IPv6 address from top global residential allocations.
 */
function generateResidentialIPv6() {
    const prefixes = ["2600:1700:", "2601:640:", "2607:fb90:", "2a02:8108:", "2a01:cb08:", "2405:4800:", "2402:800:"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const group = () => Math.floor(Math.random() * 0xffff).toString(16);
    return `${prefix}${group()}:${group()}:${group()}:${group()}:${group()}`;
}

/**
 * Creates a comprehensive set of IP spoofing & forwarding headers.
 * These headers cause intermediate CDNs, reverse-proxies, and Facebook ingress gateways
 * to treat the request as originating from a residential user rather than a data-center IP.
 *
 * @param {string} [ip] - Specific IP to spoof, or omit to auto-generate.
 * @param {object} [options] - Additional options.
 * @returns {object} Spoofed HTTP headers.
 */
function getSpoofedIpHeaders(ip, options = {}) {
    const clientIp = ip || generateResidentialIP();
    const proxyHops = options.includeChain ? `${clientIp}, 172.67.${randomInt(1, 250)}.${randomInt(1, 250)}` : clientIp;

    const headers = {
        "X-Forwarded-For": proxyHops,
        "Client-IP": clientIp,
        "X-Real-IP": clientIp,
        "CF-Connecting-IP": clientIp,
        "True-Client-IP": clientIp,
        "X-Cluster-Client-IP": clientIp,
        "Fastly-Client-IP": clientIp,
        "Forwarded": `for=${clientIp};proto=https;host=www.facebook.com`,
        "X-Forwarded-Proto": "https",
        "X-Forwarded-Host": "www.facebook.com"
    };

    if (options.ipv6) {
        headers["X-Forwarded-For-IPv6"] = generateResidentialIPv6();
    }

    return headers;
}

/**
 * Generates a coherent device, hardware, and browser fingerprint to mimic genuine Chrome users.
 *
 * @param {string} [persona="desktop"] - 'desktop', 'android', or 'ios'.
 * @returns {object} Hardware and client hints fingerprint.
 */
function getDeviceFingerprint(persona = "desktop") {
    const isMobile = persona === "android" || persona === "mobile";
    const screens = [
        { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, vpW: 1920, vpH: 969, dpr: 1 },
        { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, vpW: 2560, vpH: 1320, dpr: 1 },
        { width: 1536, height: 864, availWidth: 1536, availHeight: 824, vpW: 1536, vpH: 746, dpr: 1.25 },
        { width: 1440, height: 900, availWidth: 1440, availHeight: 875, vpW: 1440, vpH: 800, dpr: 2 },
        { width: 1366, height: 768, availWidth: 1366, availHeight: 728, vpW: 1366, vpH: 650, dpr: 1 }
    ];
    const chosenScreen = screens[Math.floor(Math.random() * screens.length)];
    const memory = [8, 16, 32][Math.floor(Math.random() * 3)];
    const concurrency = [4, 8, 12, 16][Math.floor(Math.random() * 4)];

    return {
        isMobile,
        screen: {
            width: chosenScreen.width,
            height: chosenScreen.height,
            availWidth: chosenScreen.availWidth,
            availHeight: chosenScreen.availHeight,
            colorDepth: 24,
            pixelDepth: 24
        },
        deviceMemory: memory,
        hardwareConcurrency: concurrency,
        dpr: chosenScreen.dpr,
        viewportWidth: chosenScreen.vpW,
        viewportHeight: chosenScreen.vpH,
        webgl: {
            vendor: "Google Inc. (Intel)",
            renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)"
        },
        clientHints: {
            "sec-ch-ua-mobile": isMobile ? "?1" : "?0",
            "sec-ch-ua-model": isMobile ? '"Pixel 7"' : '""',
            "sec-ch-viewport-width": String(chosenScreen.vpW),
            "sec-ch-dpr": String(chosenScreen.dpr),
            "sec-ch-device-memory": String(memory)
        }
    };
}

/**
 * Calculates human typing simulation delay based on text length and punctuation.
 * Avoids mechanical burst detection by Facebook.
 *
 * @param {string} text - Message text to be typed.
 * @param {number} [speedWpm=65] - Words per minute typing speed.
 * @returns {number} Typing delay in milliseconds (bounded safely).
 */
function calculateTypingDelay(text, speedWpm = 65) {
    if (!text || typeof text !== "string") {
        return randomInt(200, 500);
    }

    const words = text.trim().split(/\s+/).length;
    const chars = text.length;

    // ~5 chars per word average, base time per character
    const msPerChar = Math.round(60000 / (speedWpm * 5));
    let totalDelay = chars * msPerChar;

    // Add hesitation for punctuation (commas, periods, questions)
    const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
    totalDelay += punctuationCount * randomInt(80, 200);

    // Add random human jitter (±15%)
    const jitter = Math.round(totalDelay * (Math.random() * 0.3 - 0.15));
    totalDelay = Math.max(350, Math.min(totalDelay + jitter, 2500));

    return totalDelay;
}

/**
 * Checks whether an HTTP response or error represents an IP ban, rate-limit, or anti-bot challenge.
 *
 * @param {number|object} statusOrRes - HTTP status code or response object.
 * @param {any} [bodyOrError] - Response body or Error object.
 * @returns {boolean} True if the event matches an IP ban or rate limit.
 */
function isIpBannedOrRateLimited(statusOrRes, bodyOrError) {
    let status = 0;
    let body = null;
    let headers = null;

    if (typeof statusOrRes === "number") {
        status = statusOrRes;
        body = bodyOrError;
    } else if (statusOrRes && typeof statusOrRes === "object") {
        status = statusOrRes.status || statusOrRes.statusCode || (statusOrRes.response && statusOrRes.response.status) || 0;
        body = statusOrRes.body || statusOrRes.data || (statusOrRes.response && statusOrRes.response.data);
        headers = statusOrRes.headers || (statusOrRes.response && statusOrRes.response.headers);
    }

    if (status === 429 || status === 403 || status === 503) {
        return true;
    }

    if (headers && headers["retry-after"]) {
        return true;
    }

    const text = typeof body === "string" ? body : (body ? JSON.stringify(body) : (bodyOrError ? String(bodyOrError) : ""));
    if (!text) return false;

    const BAN_SIGNATURES = [
        "action_blocked",
        "Action Blocked",
        "temporarily blocked",
        "temporarily_blocked",
        "reduce the rate",
        "Please slow down",
        "limit how often",
        "checkpoint/block",
        "login_approval",
        "checkpoint_282",
        "checkpoint_956",
        "checkpoint_scraping",
        "rate limit reached",
        "temporarily unavailable",
        "IP address has been blocked",
        "1357004", // Facebook Challenge / Anti-spam checkpoint
        "1357001", // Rate limit exceeded
        "368",     // Action temporarily blocked for spam heuristics
        "1404078", // Flood control / messaging blocked
        "1404110"  // Message flood protection
    ];

    for (const sig of BAN_SIGNATURES) {
        if (text.includes(sig)) {
            return true;
        }
    }

    return false;
}

/**
 * Proxy Pool and Auto-Failover Manager.
 */
class ProxyRotator {
    constructor(proxies = []) {
        this.proxies = Array.isArray(proxies) ? [...proxies] : [];
        this.failedProxies = new Set();
        this.currentIndex = 0;
    }

    addProxy(proxy) {
        if (proxy && typeof proxy === "string" && !this.proxies.includes(proxy)) {
            this.proxies.push(proxy);
        }
    }

    getActiveProxy() {
        if (!this.proxies.length) return null;
        return this.proxies[this.currentIndex % this.proxies.length];
    }

    rotate() {
        if (!this.proxies.length) return null;
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return this.getActiveProxy();
    }

    markFailed(proxy) {
        if (proxy) this.failedProxies.add(proxy);
        return this.rotate();
    }
}

/**
 * Central IP Ban & Rate Limit Protection Controller.
 * Manages sticky residential IPs, automatic rotation upon IP bans, and graceful backoff retries.
 */
class IpBanProtection {
    constructor(config = {}) {
        this.enabled = config.enabled !== false;
        this.spoofIP = config.spoofIP !== false;
        this.rotateIPOnBlock = config.rotateIPOnBlock !== false;
        this.ignoreIPBan = config.ignoreIPBan !== false;
        this.randomizeUserAgent = config.randomizeUserAgent !== false;
        this.maxRetries = Number.isInteger(config.maxRetries) ? config.maxRetries : 4;
        this.backoffMs = Number.isInteger(config.backoffMs) ? config.backoffMs : 1500;
        this.customSpoofedIP = config.customSpoofedIP || null;

        const initialMeta = generateResidentialIPMeta();
        this.currentMeta = initialMeta;
        this.currentIP = this.customSpoofedIP || initialMeta.ip;

        this.rotationCount = 0;
        this.totalBlocksEncountered = 0;
        this.lastRotatedAt = Date.now();
        this.history = [];

        this.proxyRotator = new ProxyRotator(config.proxies || []);
    }

    /**
     * Get the current active spoofed IP address.
     */
    getCurrentIP() {
        if (this.customSpoofedIP) return this.customSpoofedIP;
        return this.currentIP;
    }

    /**
     * Get metadata for current residential subnet (ISP, country, timezone, region).
     */
    getCurrentMeta() {
        return this.currentMeta;
    }

    /**
     * Set a custom fixed spoofed IP address.
     */
    setCustomIP(ip) {
        this.customSpoofedIP = ip;
        this.currentIP = ip;
    }

    /**
     * Rotates the spoofed IP to a fresh residential IP address.
     *
     * @param {string} [reason="manual"] - Reason for the rotation.
     * @returns {string} The new spoofed IP.
     */
    rotateIP(reason = "manual") {
        const oldIP = this.currentIP;
        this.currentMeta = generateResidentialIPMeta();
        this.currentIP = this.currentMeta.ip;
        this.rotationCount++;
        this.lastRotatedAt = Date.now();

        // Also rotate proxy if proxies are configured
        if (this.proxyRotator.proxies.length > 0) {
            this.proxyRotator.rotate();
        }

        this.history.push({
            oldIP,
            newIP: this.currentIP,
            isp: this.currentMeta.isp,
            reason,
            timestamp: this.lastRotatedAt
        });

        if (this.history.length > 50) {
            this.history.shift();
        }

        return this.currentIP;
    }

    /**
     * Returns spoofed headers for outgoing HTTP requests.
     */
    getHeaders(options = {}) {
        if (!this.enabled || !this.spoofIP) return {};
        return getSpoofedIpHeaders(this.getCurrentIP(), options);
    }

    /**
     * Handles an IP block / rate-limit detection:
     * Rotates the spoofed IP, increments counters, and computes backoff duration.
     *
     * @param {any} errOrRes - The error or response that triggered the block.
     * @param {number} [attempt=1] - Current retry attempt index.
     * @returns {{ shouldRetry: boolean, waitMs: number, newIP: string }}
     */
    handleBlock(errOrRes, attempt = 1) {
        this.totalBlocksEncountered++;
        let newIP = this.currentIP;

        if (this.rotateIPOnBlock) {
            newIP = this.rotateIP("IP ban / rate-limit detected");
        }

        // Exponential backoff with random jitter: (base * 1.8^(attempt - 1)) + jitter
        const base = this.backoffMs;
        const multiplier = Math.pow(1.8, Math.max(0, attempt - 1));
        const jitter = Math.floor(Math.random() * 800);
        const waitMs = Math.min(Math.round(base * multiplier) + jitter, 45000);

        const shouldRetry = this.ignoreIPBan && attempt <= this.maxRetries;

        return {
            shouldRetry,
            waitMs,
            newIP,
            attempt,
            totalBlocks: this.totalBlocksEncountered
        };
    }

    /**
     * Diagnostic status summary.
     */
    getStatus() {
        return {
            enabled: this.enabled,
            spoofIP: this.spoofIP,
            ignoreIPBan: this.ignoreIPBan,
            rotateIPOnBlock: this.rotateIPOnBlock,
            currentIP: this.getCurrentIP(),
            currentMeta: this.currentMeta,
            rotationCount: this.rotationCount,
            totalBlocksEncountered: this.totalBlocksEncountered,
            lastRotatedAt: this.lastRotatedAt,
            hasProxies: this.proxyRotator.proxies.length > 0
        };
    }
}

// Global Singleton Instance
const globalIpBanProtection = new IpBanProtection();

module.exports = {
    RESIDENTIAL_SUBNETS,
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
};
