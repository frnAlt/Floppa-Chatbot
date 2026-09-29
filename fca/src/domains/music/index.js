"use strict";

const { Domain } = require("../Domain");

/**
 * Music Domain - Handles Facebook Stories music catalog search operations
 */
class MusicDomain extends Domain {
    constructor(api, name = "music", options = {}) {
        super(api, name, options);
    }

    /**
     * Search Facebook Stories music catalog for playable audio tracks
     * @param {string} query
     * @param {object|function} [options]
     * @param {function} [callback]
     */
    async search(query, options, callback) {
        let cb = callback;
        let opt = options;
        if (typeof opt === "function") {
            cb = opt;
            opt = {};
        }
        opt = opt || {};

        const cacheKey = `search:${String(query).toLowerCase().trim()}:${opt.count || 20}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            if (typeof cb === "function") cb(null, cached);
            return cached;
        }

        const context = {
            operation: "search",
            query,
            options: opt,
            timestamp: Date.now()
        };

        await this.executeMiddleware(context, "search");
        if (context.error) throw context.error;

        let result;
        if (typeof this.api.searchMusic === "function") {
            result = await this.api.searchMusic(query, opt, cb);
        } else {
            const err = new Error("searchMusic is not available on this API instance");
            if (typeof cb === "function") return cb(err);
            throw err;
        }

        this.setCached(cacheKey, result);
        return result;
    }
}

function createMusicDomain(api, options = {}) {
    return new MusicDomain(api, "music", options);
}

module.exports = {
    MusicDomain,
    createMusicDomain
};
