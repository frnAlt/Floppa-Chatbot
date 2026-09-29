/**
 * @author Neoaz 🐊 & frnAlt (Gtajisan)
 * Music search and player powered by Facebook Stories music catalog (RelayModern)
 * Inspired by lazyneoaz/Insta-Bot & Floppa Engine
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const userSearchCache = new Map();

function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "0:00";
	const total = Math.round(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = String(total % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

async function searchTracks(api, query, count = 10) {
	if (typeof api?.searchMusic === "function") {
		const res = await api.searchMusic(query, { count });
		return res?.tracks || [];
	}
	if (typeof api?.music?.search === "function") {
		const res = await api.music.search(query, { count });
		return res?.tracks || [];
	}
	if (typeof global.GoatBot?.fcaApi?.searchMusic === "function") {
		const res = await global.GoatBot.fcaApi.searchMusic(query, { count });
		return res?.tracks || [];
	}
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
		return res?.tracks || [];
	} catch (e) {
		throw new Error(`searchMusic query failed: ${e.message}`);
	}
}

async function sendTrack(message, event, api, track) {
	if (!track || !track.audioUrl) {
		return message.reply("❌ This audio track is no longer available or stream link has expired.");
	}

	if (api && typeof api.setMessageReaction === "function") {
		api.setMessageReaction("⏳", event.messageID, () => {}, true);
	}

	const tempFilePath = path.join(os.tmpdir(), `music_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
	try {
		const response = await axios({
			method: "GET",
			url: track.audioUrl,
			responseType: "arraybuffer",
			timeout: 20000,
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
			}
		});

		await fs.writeFile(tempFilePath, Buffer.from(response.data));

		const bodyText = `🎵 Track: ${track.title || "Unknown"}\n`
			+ `👤 Artist: ${track.artist || "Unknown"}\n`
			+ `${track.album ? `💿 Album: ${track.album}\n` : ""}`
			+ `⏱️ Duration: ${track.duration || formatDuration(track.durationMs)}\n`
			+ `📻 Source: Facebook Stories Music Catalog`;

		if (api && typeof api.setMessageReaction === "function") {
			api.setMessageReaction("👍", event.messageID, () => {}, true);
		}

		return message.reply({
			body: bodyText,
			attachment: fs.createReadStream(tempFilePath)
		}, () => {
			fs.remove(tempFilePath).catch(() => {});
		});
	} catch (error) {
		fs.remove(tempFilePath).catch(() => {});
		if (api && typeof api.setMessageReaction === "function") {
			api.setMessageReaction("👎", event.messageID, () => {}, true);
		}
		return message.reply(`❌ Failed to stream track: ${error.message || "Network timeout"}`);
	}
}

module.exports = {
	config: {
		name: "music",
		aliases: ["fca-music", "fbmusic", "track", "stickermusic"],
		version: "1.0.0",
		author: "Neoaz 🐊 & frnAlt",
		countDown: 5,
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

		const cached = userSearchCache.get(event.senderID);
		if (/^\d+$/.test(rawQuery) && cached && Array.isArray(cached.tracks) && cached.tracks.length) {
			const index = parseInt(rawQuery, 10) - 1;
			const track = cached.tracks[index];
			if (!track) {
				return message.reply(`❌ Please pick a number between 1 and ${cached.tracks.length}.`);
			}
			return sendTrack(message, event, api, track);
		}

		const playTopDirectly = args.includes("--top");
		const cleanQuery = rawQuery.replace(/--top/gi, "").trim();

		let tracks = [];
		try {
			tracks = await searchTracks(api, cleanQuery, 10);
		} catch (err) {
			return message.reply(`❌ Music catalog error: ${err.message || String(err)}`);
		}

		if (!tracks.length) {
			return message.reply(`❌ No songs found in the Facebook catalog for "${cleanQuery}".`);
		}

		const top = tracks.slice(0, 10);
		userSearchCache.set(event.senderID, { query: cleanQuery, tracks: top });

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
			api.unsendMessage(event.messageReply.messageID, event.threadID).catch(() => {});
		}

		return sendTrack(message, event, api, selected);
	}
};
