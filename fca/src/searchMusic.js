"use strict";

const utils = require("./utils");

/**
 * Searches Facebook's Stories music catalog for playable audio tracks.
 * Uses RelayModern GraphQL query StoriesCreateMusicSelectorMainPageQuery.
 *
 * @param {object} defaultFuncs - FCA default request functions
 * @param {object} api - FCA API instance
 * @param {object} ctx - FCA context
 * @returns {function(string, object|function, function=): Promise<object>}
 */
module.exports = function (defaultFuncs, api, ctx) {
    const SEARCH_DOC_ID = "23943555345255534";
    const SEARCH_FRIENDLY_NAME = "StoriesCreateMusicSelectorMainPageQuery";
    const GRAPHQL_URL = "https://www.facebook.com/api/graphql/";
    const PRODUCT = "FB_CAMERA";
    const MAX_COUNT = 50;
    const DEFAULT_COUNT = 20;

    function textOf(node) {
        if (node == null) return "";
        if (typeof node === "string") return node;
        if (typeof node === "object" && typeof node.text === "string") return node.text;
        return "";
    }

    function formatDuration(ms) {
        if (!Number.isFinite(ms) || ms <= 0) return "0:00";
        const totalSeconds = Math.round(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    function unwrapTrack(assets) {
        if (!assets || typeof assets !== "object") return null;
        const raw = assets;
        const asset = raw.__typename === "AudioAsset" ? raw : raw.item && raw.item.__typename === "AudioAsset" ? raw.item : raw;
        if (!asset || typeof asset !== "object") return null;
        const downloads = Array.isArray(asset.progressive_download) ? asset.progressive_download : [];
        const audioUrl = downloads.find((d) => d && typeof d.url === "string" && d.url)?.url;
        if (!audioUrl) return null;
        const durationMs = Number(asset.duration_in_ms) || 0;
        const cover = (asset.cover_artwork && asset.cover_artwork.uri) || (asset.display_image && asset.display_image.uri) || null;
        return {
            id: asset.id == null ? null : String(asset.id),
            title: textOf(asset.title) || "Unknown title",
            artist: textOf(asset.display_artist) || "Unknown artist",
            album: textOf(asset.album_title) || "",
            durationMs,
            duration: formatDuration(durationMs),
            coverArtwork: typeof cover === "string" ? cover : null,
            audioUrl,
            tags: Array.isArray(asset.tags)
                ? asset.tags.map((t) => ({
                      type: String(t.type ?? ""),
                      name: String(t.name ?? "")
                  }))
                : []
        };
    }

    function collectTracks(payload) {
        const data = payload;
        const container = data?.data?.xfb_music_picker_connection_container;
        const edges = container && container.items && Array.isArray(container.items.edges) ? container.items.edges : [];
        const tracks = [];
        const seen = new Set();
        let endCursor = null;
        let hasNextPage = false;
        for (const edge of edges) {
            if (!edge || !edge.node) continue;
            const node = edge.node;
            const candidates = [];
            if (node.item) candidates.push(node.item);
            if (Array.isArray(node.sub_items)) candidates.push(...node.sub_items);
            for (const candidate of candidates) {
                const track = unwrapTrack(candidate);
                if (track && track.id && !seen.has(track.id)) {
                    seen.add(track.id);
                    tracks.push(track);
                }
            }
        }
        const pageInfo = container?.items?.page_info;
        if (pageInfo) {
            endCursor = pageInfo.end_cursor || null;
            hasNextPage = Boolean(pageInfo.has_next_page);
        }
        return { tracks, endCursor, hasNextPage };
    }

    function normalizeError(err) {
        if (!err || typeof err !== "object") {
            return { error: String(err), message: String(err), code: "FB_ERROR" };
        }
        const message = err.message || err.errorDescription || err.errorSummary || err.error || "Music search failed.";
        const normalized = { ...err, message, error: err.error != null ? err.error : message };
        if (!normalized.code) {
            if (err.authConfirmed) normalized.code = "FB_REAUTH";
            else if (err.staleQuery) normalized.code = "STALE_QUERY";
            else if (err.res !== void 0 && !err.statusCode) normalized.code = "BAD_RESPONSE";
            else normalized.code = "FB_ERROR";
        }
        return normalized;
    }

    return function searchMusic(query, options, callback) {
        let cb = callback;
        let opt = options;
        if (typeof opt === "function") {
            cb = opt;
            opt = {};
        }
        opt = opt || {};

        let resolveFunc = () => {};
        let rejectFunc = () => {};
        const returnPromise = new Promise((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (typeof cb !== "function") {
            cb = (err, data) => {
                if (err) return rejectFunc(err);
                resolveFunc(data);
            };
        }

        try {
            const requested = Number(opt.count);
            const count = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), MAX_COUNT) : DEFAULT_COUNT;
            const text = query == null ? "" : String(query).trim();
            const params = { first: count };
            if (text) params.search_text = text;
            if (opt.cursor) params.after = String(opt.cursor);

            const form = {
                av: ctx.userID,
                __user: ctx.userID,
                __a: "1",
                __req: "1",
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: SEARCH_FRIENDLY_NAME,
                doc_id: SEARCH_DOC_ID,
                variables: JSON.stringify({
                    params,
                    product: opt.product || PRODUCT
                }),
                server_timestamps: "true"
            };
            if (ctx.fb_dtsg) form.fb_dtsg = ctx.fb_dtsg;
            if (ctx.ttstamp) form.ttstamp = ctx.ttstamp;
            if (ctx.jazoest) form.jazoest = ctx.jazoest;

            defaultFuncs
                .post(GRAPHQL_URL, ctx.jar, form)
                .then((res) => {
                    if (res && typeof res === "object" && res.statusCode !== undefined && res.body !== undefined) {
                        return utils.parseAndCheckLogin(ctx, defaultFuncs)(res);
                    }
                    return res;
                })
                .then((parsed) => {
                    if (!parsed) {
                        throw { error: "searchMusic returned an empty object.", code: "BAD_RESPONSE" };
                    }
                    if (parsed.error) {
                        throw {
                            error: parsed.error,
                            errorSummary: parsed.errorSummary,
                            errorDescription: parsed.errorDescription,
                            code: "FB_ERROR"
                        };
                    }
                    const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
                    if (errors.length) {
                        const first = errors[0] || {};
                        throw {
                            error: first.message || first.summary || first.description || "Facebook rejected the music request.",
                            errorSummary: first.summary,
                            errorDescription: first.description,
                            code: first.requires_reauth ? "FB_REAUTH" : "FB_ERROR"
                        };
                    }
                    const { tracks, endCursor, hasNextPage } = collectTracks(parsed);
                    return cb(null, { tracks, endCursor, hasNextPage, query: text });
                })
                .catch((err) => {
                    const normalized = normalizeError(err);
                    return cb(normalized);
                });
        } catch (error) {
            return cb(normalizeError(error));
        }

        return returnPromise;
    };
};
