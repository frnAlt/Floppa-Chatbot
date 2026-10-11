/**
 * @fileoverview NKXICA & FCA Cookie Parser & Converter Utility
 * Adapted from @neoaz07/nkxica and enhanced for Floppa Facebook Chat API
 * @author neoaz07 (Saifullah Neoaz) & Gtajisan (Farhan Muh Tasim)
 * @license MIT / Apache-2.0
 */

"use strict";

const { CookieJar, Cookie } = require("tough-cookie");

class CookieUtils {
    /**
     * Parse cookies from various formats (Netscape, JSON array, Header string, Object, CookieJar)
     * @param {string|Array|object} cookieData
     * @param {CookieJar} [jar]
     * @returns {CookieJar}
     */
    static parse(cookieData, jar = new CookieJar()) {
        if (!cookieData) return jar;

        if (cookieData instanceof CookieJar) {
            return cookieData;
        }

        if (typeof cookieData === "string") {
            const trimmed = cookieData.trim();
            if (trimmed.includes("# Netscape HTTP Cookie File") || trimmed.includes("#HttpOnly_")) {
                return this.parseNetscape(trimmed, jar);
            } else if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return this.parse(parsed, jar);
                } catch (_) {
                    return this.parseHeader(trimmed, jar);
                }
            } else {
                return this.parseHeader(trimmed, jar);
            }
        }

        if (Array.isArray(cookieData)) {
            return this.parseArray(cookieData, jar);
        }

        if (typeof cookieData === "object" && cookieData !== null) {
            if (Array.isArray(cookieData.cookies)) {
                return this.parseArray(cookieData.cookies, jar);
            }
            if (Array.isArray(cookieData.appState)) {
                return this.parseArray(cookieData.appState, jar);
            }
            return this.parseObject(cookieData, jar);
        }

        return jar;
    }

    /**
     * Parse Netscape cookies.txt format
     * @param {string} data
     * @param {CookieJar} jar
     * @returns {CookieJar}
     */
    static parseNetscape(data, jar = new CookieJar()) {
        const lines = String(data || "").split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line || (line.startsWith("#") && !line.startsWith("#HttpOnly_"))) {
                continue;
            }

            const isHttpOnly = line.startsWith("#HttpOnly_");
            if (isHttpOnly) {
                line = line.substring("#HttpOnly_".length);
            }

            let parts = line.split("\t");
            if (parts.length < 7) {
                parts = line.split(/\s{2,}/);
            }
            if (parts.length < 7) {
                parts = line.split(/\s+/);
            }

            if (parts.length >= 7) {
                const [domain, , path, secure, expiration, name, value] = parts;
                try {
                    const cookie = new Cookie({
                        key: name,
                        value: value || "",
                        domain: domain ? String(domain).replace(/^\./, "") : "facebook.com",
                        path: path || "/",
                        secure: secure === "TRUE" || secure === true,
                        httpOnly: isHttpOnly,
                        expires: expiration && expiration !== "0" && !isNaN(Number(expiration))
                            ? new Date(Number(expiration) * 1000)
                            : undefined
                    });

                    const url = `https://${cookie.domain || "facebook.com"}${cookie.path || "/"}`;
                    if (typeof jar.setCookieSync === "function") {
                        jar.setCookieSync(cookie, url);
                    }
                } catch (_) {}
            }
        }

        return jar;
    }

    /**
     * Parse JSON array of cookie objects (EditThisCookie, Cookie-Editor, etc.)
     * @param {Array<object>} arr
     * @param {CookieJar} jar
     * @returns {CookieJar}
     */
    static parseArray(arr, jar = new CookieJar()) {
        for (const item of arr || []) {
            if (!item || typeof item !== "object") continue;
            const name = item.name || item.key;
            if (!name || item.value === undefined || item.value === null) continue;

            try {
                const domain = item.domain ? String(item.domain).replace(/^\./, "") : "facebook.com";
                const expirationDate = item.expirationDate || item.expires;
                const cookie = new Cookie({
                    key: String(name).trim(),
                    value: String(item.value).trim().replace(/^"(.*)"$/, "$1"),
                    domain,
                    path: item.path || "/",
                    hostOnly: item.hostOnly !== undefined ? Boolean(item.hostOnly) : false,
                    secure: item.secure !== false,
                    httpOnly: Boolean(item.httpOnly),
                    sameSite: item.sameSite || undefined,
                    expires: expirationDate && !isNaN(Number(expirationDate))
                        ? new Date(Number(expirationDate) * 1000)
                        : undefined
                });

                const url = `https://${domain}${cookie.path || "/"}`;
                if (typeof jar.setCookieSync === "function") {
                    jar.setCookieSync(cookie, url);
                }
            } catch (_) {}
        }
        return jar;
    }

    /**
     * Parse raw HTTP Cookie header string
     * @param {string} str
     * @param {CookieJar} jar
     * @param {string} [domain="facebook.com"]
     * @returns {CookieJar}
     */
    static parseHeader(str, jar = new CookieJar(), domain = "facebook.com") {
        let raw = String(str || "").trim();
        if (/^cookie\s*:/i.test(raw)) {
            raw = raw.replace(/^cookie\s*:/i, "").trim();
        }

        const parts = raw.split(";").map(p => p.trim()).filter(Boolean);
        for (const part of parts) {
            const eqIndex = part.indexOf("=");
            if (eqIndex <= 0) continue;

            const name = part.slice(0, eqIndex).trim();
            const value = part.slice(eqIndex + 1).trim().replace(/^"(.*)"$/, "$1");
            if (!name) continue;

            try {
                const cookie = new Cookie({
                    key: name,
                    value,
                    domain: domain.replace(/^\./, ""),
                    path: "/",
                    hostOnly: false,
                    secure: true,
                    httpOnly: false
                });

                const url = `https://${domain}/`;
                if (typeof jar.setCookieSync === "function") {
                    jar.setCookieSync(cookie, url);
                }
            } catch (_) {}
        }

        return jar;
    }

    /**
     * Parse key-value dictionary object
     * @param {object} obj
     * @param {CookieJar} jar
     * @param {string} [domain="facebook.com"]
     * @returns {CookieJar}
     */
    static parseObject(obj, jar = new CookieJar(), domain = "facebook.com") {
        for (const [name, val] of Object.entries(obj || {})) {
            if (!name || val === undefined || val === null) continue;
            try {
                const cookie = new Cookie({
                    key: String(name).trim(),
                    value: String(val).trim().replace(/^"(.*)"$/, "$1"),
                    domain: domain.replace(/^\./, ""),
                    path: "/",
                    hostOnly: false,
                    secure: true,
                    httpOnly: false
                });

                const url = `https://${domain}/`;
                if (typeof jar.setCookieSync === "function") {
                    jar.setCookieSync(cookie, url);
                }
            } catch (_) {}
        }
        return jar;
    }

    /**
     * Convert CookieJar to standard AppState array
     * @param {CookieJar} jar
     * @param {string} [url="https://www.facebook.com/"]
     * @returns {Array<object>}
     */
    static toAppState(jar, url = "https://www.facebook.com/") {
        if (!jar) return [];
        if (jar.store && typeof jar.store.getAllCookies === "function") {
            try {
                let all = [];
                jar.store.getAllCookies((err, cookies) => {
                    if (!err && Array.isArray(cookies)) {
                        all = cookies;
                    }
                });
                if (all.length > 0) {
                    return all.map(c => ({
                        key: c.key,
                        value: c.value,
                        domain: c.domain,
                        path: c.path,
                        hostOnly: c.hostOnly,
                        creation: c.creation ? c.creation.toISOString() : new Date().toISOString(),
                        lastAccessed: c.lastAccessed ? c.lastAccessed.toISOString() : new Date().toISOString()
                    }));
                }
            } catch (_) {}
        }
        if (typeof jar.getCookiesSync === "function") {
            try {
                const cookies = jar.getCookiesSync(url);
                return cookies.map(c => ({
                    key: c.key,
                    value: c.value,
                    domain: c.domain,
                    path: c.path,
                    hostOnly: c.hostOnly,
                    creation: c.creation ? c.creation.toISOString() : new Date().toISOString(),
                    lastAccessed: c.lastAccessed ? c.lastAccessed.toISOString() : new Date().toISOString()
                }));
            } catch (_) {
                return [];
            }
        }
        return [];
    }

    /**
     * Convert CookieJar to Cookie header string
     * @param {CookieJar} jar
     * @param {string} [url="https://www.facebook.com/"]
     * @returns {string}
     */
    static toHeaderString(jar, url = "https://www.facebook.com/") {
        if (!jar || typeof jar.getCookieStringSync !== "function") return "";
        try {
            return jar.getCookieStringSync(url);
        } catch (_) {
            return "";
        }
    }
}

module.exports = CookieUtils;
