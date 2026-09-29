/**
 * @author Neoaz 🐊 & frnAlt (Gtajisan)
 * High-Speed Music Player & Catalog Search powered by Facebook Stories (RelayModern)
 * Optimized for low-latency direct streaming without disk I/O bottlenecks.
 */

"use strict";

const axios = require("axios");

// In-memory caches for zero-latency retrieval
const userSearchCache = new Map();
const queryCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "0:00";
	const total = Math.round(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = String(total % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

async function searchTracks(api, query, count = 6) {
	const cacheKey = `${query.toLowerCase().trim()}_${count}`;
	const cached = queryCache.get(cacheKey);
	if (cached && (Date.now() - cached.time) < CACHE_TTL_MS) {
		return cached.tracks;
	}

	let tracks = [];
	if (typeof api?.searchMusic === "function") {
		const res = await api.searchMusic(query, { count });
		tracks = res?.tracks || [];
	} else if (typeof api?.music?.search === "function") {
		const res = await api.music.search(query, { count });
		tracks = res?.tracks || [];
	} else if (typeof global.GoatBot?.fcaApi?.searchMusic === "function") {
		const res = await global.GoatBot.fcaApi.searchMusic(query, { count });
		tracks = res?.tracks || [];
	} else {
		try {
			const searchMusicFactory = require("../../fca/src/searchMusic");
			const defaultFuncs = api?.__defaultFuncs || api?.defaultFuncs || {
				post: (url, jar, form) => axios.post(url, new URLSearchParams(form).toString(), {
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					jar,
					withCredentials: true
				}).then(r => r.data)
			};
			const fn = searchMusicFactory(defaultFuncs, api, api?.ctx || {});
			const res = await fn(query, { count });
			tracks = res?.tracks || [];
		} catch (e) {
			throw new Error(`searchMusic query failed: ${e.message}`);
		}
	}

	if (tracks.length > 0) {
		queryCache.set(cacheKey, { tracks, time: Date.now() });
	}
	return tracks;
}

async function sendTrack(message, event, api, track) {
	if (!track || !track.audioUrl) {
		return message.reply("❌ This audio track is no longer available or stream link has expired.");
	}

	if (api && typeof api.setMessageReaction === "function") {
		api.setMessageReaction("⏳", event.messageID, () => {}, true);
	}

	let statusMsg = null;
	try {
		statusMsg = await message.reply(`⏳ Streaming "${track.title || "Song"}" by ${track.artist || "Artist"}...`);
	} catch (_) {}

	try {
		const safeTitle = (track.title || "track").replace(/[^\w.-]+/g, "_").slice(0, 30);
		const fileName = `${safeTitle}.mp3`;
		let stream;

		// Stream directly into FCA uploader without saving to disk first
		if (global.utils && typeof global.utils.getStreamFromURL === "function") {
			stream = await global.utils.getStreamFromURL(track.audioUrl, fileName, {
				timeout: 25000,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
				}
			});
		} else {
			const res = await axios({
				method: "GET",
				url: track.audioUrl,
				responseType: "stream",
				timeout: 25000,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
				}
			});
			res.data.path = fileName;
			stream = res.data;
		}

		const bodyText = `🎵 ${track.title || "Unknown"}\n`
			+ `👤 Artist: ${track.artist || "Unknown"}\n`
			+ `${track.album ? `💿 Album: ${track.album}\n` : ""}`
			+ `⏱️ Duration: ${track.duration || formatDuration(track.durationMs)}\n`
			+ `📻 Facebook Music Catalog`;

		if (statusMsg?.messageID && api && typeof api.unsendMessage === "function") {
			api.unsendMessage(statusMsg.messageID).catch(() => {});
		}

		if (api && typeof api.setMessageReaction === "function") {
			api.setMessageReaction("🎵", event.messageID, () => {}, true);
		}

		return message.reply({
			body: bodyText,
			attachment: stream
		});
	} catch (error) {
		if (statusMsg?.messageID && api && typeof api.unsendMessage === "function") {
			api.unsendMessage(statusMsg.messageID).catch(() => {});
		}
		if (api && typeof api.setMessageReaction === "function") {
			api.setMessageReaction("❌", event.messageID, () => {}, true);
		}
		return message.reply(`❌ Failed to stream track: ${error.message || "Network timeout"}`);
	}
}

module.exports = {
	config: {
		name: "music",
		aliases: ["fca-music", "fbmusic", "track", "stickermusic"],
		version: "1.2.0",
		author: "Neoaz 🐊 & frnAlt",
		countDown: 1, // Minimal cooldown to eliminate command delay
		role: 0,
		description: {
			en: "Search Facebook Stories music catalog and send playable audio track"
		},
		category: "media",
		guide: {
			en: "   {pn} <song name | artist>: Search music\n"
				+ "   {pn} <number>: Play track from last search\n"
				+ "   {pn} <song name> --top: Play top match instantly\n"
				+ "   Reply with <number> to search results to stream that song"
		}
	},

	onStart: async function ({ message, args, event, api }) {
		const rawQuery = args.join(" ").trim();
		if (!rawQuery) {
			return message.reply(
				"⚠️ Please enter a song name or artist to search.\n"
				+ "Example: !music believer\n"
				+ "         !music shape of you --top"
			);
		}

		const cached = userSearchCache.get(event.senderID) || userSearchCache.get(event.threadID);
		const numberMatch = rawQuery.match(/^(?:#|pick\s+)?(\d+)$/i);

		if (numberMatch && cached && Array.isArray(cached.tracks) && cached.tracks.length) {
			const index = parseInt(numberMatch[1], 10) - 1;
			const track = cached.tracks[index];
			if (!track) {
				return message.reply(`❌ Please pick a number between 1 and ${cached.tracks.length}.`);
			}
			return sendTrack(message, event, api, track);
		}

		const playTopDirectly = args.includes("--top") || args.includes("-t");
		const cleanQuery = rawQuery.replace(/--(?:top|t)\b/gi, "").trim();

		if (api && typeof api.setMessageReaction === "function") {
			api.setMessageReaction("🔍", event.messageID, () => {}, true);
		}

		let tracks = [];
		try {
			tracks = await searchTracks(api, cleanQuery, 6);
		} catch (err) {
			return message.reply(`❌ Music catalog error: ${err.message || String(err)}`);
		}

		if (!tracks.length) {
			return message.reply(`❌ No songs found in the Facebook catalog for "${cleanQuery}".`);
		}

		const top = tracks.slice(0, 6);
		const cacheEntry = { query: cleanQuery, tracks: top, time: Date.now() };
		userSearchCache.set(event.senderID, cacheEntry);
		userSearchCache.set(event.threadID, cacheEntry);

		if (top.length === 1 || playTopDirectly) {
			return sendTrack(message, event, api, top[0]);
		}

		const lines = top.map((t, idx) =>
			`${idx + 1}. ${t.title || "Unknown"} — ${t.artist || "Unknown"} (${t.duration || formatDuration(t.durationMs)})`
		);

		const replyHeader = `🎧 Facebook Music Search: "${cleanQuery}"\n`
			+ `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
			+ `${lines.join("\n")}\n`
			+ `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
			+ `👉 Reply with a number (1-${top.length}) to stream that song.`;

		return message.reply(replyHeader, (err, info) => {
			if (err || !info?.messageID) return;
			const replyMap = global.GoatBot?.onReply || global.FloppaBot?.onReply;
			if (replyMap && typeof replyMap.set === "function") {
				replyMap.set(info.messageID, {
					commandName: "music",
					messageID: info.messageID,
					author: event.senderID,
					tracks: top
				});
			}
		});
	},

	onReply: async function ({ message, event, Reply, api }) {
		if (!Reply || !Reply.tracks) return;
		if (Reply.author && String(event.senderID) !== String(Reply.author)) {
			return;
		}

		const match = String(event.body || "").trim().match(/\d+/);
		const choice = match ? parseInt(match[0], 10) : NaN;

		if (isNaN(choice) || choice < 1 || choice > Reply.tracks.length) {
			return message.reply(`❌ Invalid choice. Please reply with a number between 1 and ${Reply.tracks.length}.`);
		}

		const selected = Reply.tracks[choice - 1];

		const replyMap = global.GoatBot?.onReply || global.FloppaBot?.onReply;
		if (replyMap && typeof replyMap.delete === "function" && Reply.messageID) {
			replyMap.delete(Reply.messageID);
		}

		if (api && typeof api.unsendMessage === "function" && event.messageReply?.messageID) {
			api.unsendMessage(event.messageReply.messageID).catch(() => {});
		}

		return sendTrack(message, event, api, selected);
	}
};
