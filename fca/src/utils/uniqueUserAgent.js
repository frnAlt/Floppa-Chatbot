"use strict";
const crypto = require("crypto");

class UniqueUserAgentGenerator {
    constructor() {
        const processUnique = `${Date.now()}-${process.pid}-${typeof process.hrtime === "function" && process.hrtime.bigint ? process.hrtime.bigint() : Math.random()}`;
        this.sessionId = crypto.createHash("sha256").update(processUnique).digest("hex");
        this.counter = 0;
        this.generatedAgents = new Set();
    }

    randomInt(min, max) {
        const range = max - min + 1;
        const bytes = crypto.randomBytes(4);
        const num = bytes.readUInt32BE(0);
        return min + (num % range);
    }

    randomChoice(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[this.randomInt(0, arr.length - 1)];
    }

    generateChromeVersion() {
        const major = this.randomInt(120, 144);
        const minor = 0;
        const build = this.randomInt(1000, 9999);
        const patch = this.randomInt(0, 999);
        return `${major}.${minor}.${build}.${patch}`;
    }

    generateFirefoxVersion() {
        const major = this.randomInt(115, 134);
        const minor = this.randomInt(0, 9);
        return `${major}.${minor}`;
    }

    generateSafariVersion() {
        const major = this.randomInt(15, 18);
        const minor = this.randomInt(0, 6);
        const patch = this.randomInt(0, 5);
        return `${major}.${minor}.${patch}`;
    }

    generateEdgeVersion() {
        const major = this.randomInt(120, 144);
        const minor = 0;
        const build = this.randomInt(1000, 9999);
        const patch = this.randomInt(0, 999);
        return `${major}.${minor}.${build}.${patch}`;
    }

    generateWindowsOS() {
        const versions = [
            `Windows NT 10.0; Win64; x64`,
            `Windows NT 10.0; Win64; x64; rv:${this.randomInt(115, 134)}.0`,
            `Windows NT 10.0; WOW64`
        ];
        return this.randomChoice(versions);
    }

    generateMacOS() {
        const major = this.randomInt(12, 15);
        const minor = this.randomInt(0, 7);
        const patch = this.randomInt(0, 9);
        return `Macintosh; Intel Mac OS X ${major}_${minor}_${patch}`;
    }

    generateLinuxOS() {
        const distros = ["Ubuntu", "Debian", "Fedora", "Linux"];
        const distro = this.randomChoice(distros);
        return distro === "Linux" ? "X11; Linux x86_64" : `X11; ${distro}; Linux x86_64`;
    }

    generateAndroidOS() {
        const version = this.randomInt(10, 15);
        const build = this.randomChoice(["", "; Build/SP1A", "; Build/TP1A", "; Build/UP1A"]);
        return `Linux; Android ${version}${build}`;
    }

    generateIOSOS() {
        const major = this.randomInt(15, 18);
        const minor = this.randomInt(0, 6);
        const patch = this.randomInt(0, 5);
        const device = this.randomChoice(["iPhone", "iPad"]);
        const cpuType = device === "iPhone" ? "CPU iPhone OS" : "CPU OS";
        return `${device}; ${cpuType} ${major}_${minor}_${patch} like Mac OS X`;
    }

    generateMobileDevice() {
        const brands = {
            samsung: ["SM-S928B", "SM-S918B", "SM-A546B", "SM-G998B"],
            google: ["Pixel 7", "Pixel 8", "Pixel 8 Pro", "Pixel 9"],
            xiaomi: ["Redmi Note 12", "Redmi Note 13", "Xiaomi 13", "Xiaomi 14"],
            oppo: ["CPH2551", "CPH2579", "RMX3771"]
        };
        const brand = this.randomChoice(Object.keys(brands));
        return this.randomChoice(brands[brand]);
    }

    generateWebKitVersion() {
        const major = this.randomInt(537, 605);
        const minor = this.randomInt(1, 99);
        return `${major}.${minor}`;
    }

    generateDesktopUserAgent() {
        const browserType = this.randomChoice(["chrome", "chrome", "edge", "firefox", "safari"]);
        const osType = this.randomChoice(["windows", "windows", "mac", "linux"]);

        let osString;
        if (osType === "windows") {
            osString = this.generateWindowsOS();
        } else if (osType === "mac") {
            osString = this.generateMacOS();
        } else {
            osString = this.generateLinuxOS();
        }

        const webkit = this.generateWebKitVersion();

        if (browserType === "chrome") {
            const chromeVersion = this.generateChromeVersion();
            return `Mozilla/5.0 (${osString}) AppleWebKit/${webkit} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkit}`;
        } else if (browserType === "firefox") {
            const firefoxVersion = this.generateFirefoxVersion();
            const geckoVersion = this.randomInt(20100101, 20240101);
            return `Mozilla/5.0 (${osString}) Gecko/${geckoVersion} Firefox/${firefoxVersion}`;
        } else if (browserType === "safari") {
            const safariVersion = this.generateSafariVersion();
            return `Mozilla/5.0 (${osString}) AppleWebKit/${webkit} (KHTML, like Gecko) Version/${safariVersion} Safari/${webkit}`;
        } else {
            const edgeVersion = this.generateEdgeVersion();
            return `Mozilla/5.0 (${osString}) AppleWebKit/${webkit} (KHTML, like Gecko) Chrome/${edgeVersion} Safari/${webkit} Edg/${edgeVersion}`;
        }
    }

    generateMobileUserAgent() {
        const mobileType = this.randomChoice(["android", "ios"]);
        const webkit = this.generateWebKitVersion();

        if (mobileType === "android") {
            const osString = this.generateAndroidOS();
            const device = this.generateMobileDevice();
            const chromeVersion = this.generateChromeVersion();
            return `Mozilla/5.0 (${osString}; ${device}) AppleWebKit/${webkit} (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/${webkit}`;
        } else {
            const osString = this.generateIOSOS();
            const safariVersion = this.generateSafariVersion();
            const build = this.randomChoice(["19E241", "20A362", "21A329", "22A3354"]);
            return `Mozilla/5.0 (${osString}) AppleWebKit/${webkit} (KHTML, like Gecko) Version/${safariVersion} Mobile/${build} Safari/${webkit}`;
        }
    }

    generate(options = {}) {
        const { mobile = false } = options;
        let userAgent;
        let attempts = 0;

        do {
            if (mobile) {
                userAgent = this.generateMobileUserAgent();
            } else {
                const isMobile = this.randomInt(1, 10) <= 2;
                userAgent = isMobile ? this.generateMobileUserAgent() : this.generateDesktopUserAgent();
            }
            attempts++;
            if (attempts > 50) break;
        } while (this.generatedAgents.has(userAgent));

        this.generatedAgents.add(userAgent);
        this.counter++;
        return userAgent;
    }

    generateMultiple(count = 10, options = {}) {
        const agents = [];
        for (let i = 0; i < count; i++) {
            agents.push(this.generate(options));
        }
        return agents;
    }
}

let primaryGenerator = null;
try {
    const external = require("unique-random-useragent");
    if (typeof external === "function") {
        primaryGenerator = external;
    }
} catch (_) {}

const internalGenerator = new UniqueUserAgentGenerator();

function getRandomUserAgent(options = {}) {
    if (typeof primaryGenerator === "function") {
        try {
            return primaryGenerator(options);
        } catch (_) {}
    }
    return internalGenerator.generate(options);
}

function getMultipleUserAgents(count = 10, options = {}) {
    if (typeof primaryGenerator?.multipleUserAgents === "function") {
        try {
            return primaryGenerator.multipleUserAgents(count, options);
        } catch (_) {}
    }
    return internalGenerator.generateMultiple(count, options);
}

module.exports = getRandomUserAgent;
module.exports.randomUserAgent = getRandomUserAgent;
module.exports.getRandomUserAgent = getRandomUserAgent;
module.exports.multipleUserAgents = getMultipleUserAgents;
module.exports.getMultipleUserAgents = getMultipleUserAgents;
module.exports.UniqueUserAgentGenerator = UniqueUserAgentGenerator;
