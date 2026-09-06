const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const FB_CLIENT_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

/**
 * Attempts to fetch a high-definition avatar buffer without compression artifacts or broken 1x1 dummy GIFs.
 * Priority order:
 * 1. Graph API with 1500x1500px + Android client token (uncompressed original upload)
 * 2. Graph API with 720x720px + Android client token
 * 3. Graph API direct high-res (without token)
 * 4. Live api.getUserInfo CDN url (for locked/restricted profiles)
 * 5. Controller usersData avatar URL
 */
async function fetchHighQualityAvatar(uid, api, usersData) {
	const candidateUrls = [
		`https://graph.facebook.com/${uid}/picture?width=1500&height=1500&access_token=${FB_CLIENT_TOKEN}`,
		`https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_CLIENT_TOKEN}`,
		`https://graph.facebook.com/${uid}/picture?width=1500&height=1500`,
		`https://graph.facebook.com/${uid}/picture?width=720&height=720`,
		`https://graph.facebook.com/${uid}/picture?type=large`
	];

	for (const url of candidateUrls) {
		try {
			const res = await axios.get(url, {
				responseType: "arraybuffer",
				maxRedirects: 5,
				timeout: 10000,
				validateStatus: status => status === 200,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
				}
			});

			const buffer = Buffer.from(res.data);
			const finalUrl = res.request?.res?.responseUrl || "";
			const contentType = (res.headers["content-type"] || "").toLowerCase();

			// Filter out Facebook's 390-byte dummy placeholder GIF (rsrc.php / static CDN)
			if (buffer.length <= 1000) continue;
			if (finalUrl.includes("static.xx.fbcdn.net/rsrc.php")) continue;
			if (contentType.includes("image/gif") && buffer.length < 5000) continue;

			return buffer;
		} catch (_) {}
	}

	// Fallback for private/locked accounts: FCA getUserInfo
	if (api && typeof api.getUserInfo === "function") {
		try {
			const info = await api.getUserInfo(uid);
			const directCdnUrl = info?.[uid]?.profilePicUrl || info?.[uid]?.thumbSrc;
			if (directCdnUrl) {
				const res = await axios.get(directCdnUrl, {
					responseType: "arraybuffer",
					timeout: 10000,
					validateStatus: status => status === 200
				});
				const buffer = Buffer.from(res.data);
				if (buffer.length > 500) return buffer;
			}
		} catch (_) {}
	}

	// Fallback to database controller avatar
	if (usersData && typeof usersData.getAvatarUrl === "function") {
		try {
			const avatarUrl = await usersData.getAvatarUrl(uid);
			if (avatarUrl) {
				const res = await axios.get(avatarUrl, {
					responseType: "arraybuffer",
					timeout: 10000,
					validateStatus: status => status === 200
				});
				const buffer = Buffer.from(res.data);
				if (buffer.length > 1000) return buffer;
			}
		} catch (_) {}
	}

	return null;
}

module.exports = {
	config: {
		name: "pfp",
		aliases: ["profilepic", "getpfp", "userpic", "dp", "pp"],
		version: "2.2.0",
		author: "frnAlt",
		countDown: 5,
		role: 0,
		description: {
			vi: "Lấy ảnh đại diện chất lượng cao của người dùng (hỗ trợ tag, tên, UID, link, reply)",
			en: "Fetch high-definition user profile picture (supports tag, name, UID, link, reply)"
		},
		category: "utility",
		guide: {
			vi: '   {pn}: Lấy ảnh đại diện HD của bạn'
				+ '\n   {pn} <@tag hoặc Tên>: Lấy ảnh đại diện của người được tag/tên'
				+ '\n   {pn} <uid>: Lấy ảnh đại diện từ UID'
				+ '\n   {pn} <profile_link>: Lấy ảnh đại diện từ link Facebook'
				+ '\n   (Hoặc reply tin nhắn của người đó và gõ {pn})',
			en: '   {pn}: Fetch your HD profile picture'
				+ '\n   {pn} <@tag or Name>: Fetch tagged or named user\'s profile picture'
				+ '\n   {pn} <uid>: Fetch profile picture from UID'
				+ '\n   {pn} <profile_link>: Fetch profile picture from Facebook link'
				+ '\n   (Or reply to someone\'s message and type {pn})'
		}
	},

	langs: {
		vi: {
			success: "✓ Ảnh đại diện HD của %1",
			error: "× Không thể lấy ảnh đại diện: %1",
			invalidUID: "! UID không hợp lệ",
			notFound: "❌ Không tìm thấy thành viên \"%1\" trong nhóm. Vui lòng reply tin nhắn của họ hoặc nhập UID."
		},
		en: {
			success: "✓ HD profile picture of %1",
			error: "× Could not fetch profile picture: %1",
			invalidUID: "! Invalid UID",
			notFound: "❌ Could not find member \"%1\" in this group. Please reply to their message or provide their UID."
		}
	},

	onStart: async function ({ api, message, args, event, getLang, usersData, threadsData }) {
		let cachePath = null;
		try {
			if (api?.setMessageReaction) {
				api.setMessageReaction("🖼️", event.messageID, () => {}, true);
			}

			let uid = null;
			let targetName = null;

			// 1. Mentions Object Check (explicit tag in message has highest priority)
			if (event.mentions && Object.keys(event.mentions).length > 0) {
				uid = Object.keys(event.mentions)[0];
				targetName = event.mentions[uid]?.replace(/^@/, "").trim();
			}
			// 2. Reply Check (reply to a user's message)
			else if (event.messageReply) {
				uid = event.messageReply.senderID || event.messageReply.actorFbId || event.messageReply.userID || event.messageReply.author;
			}
			// 3. Arguments Provided (UID, Profile Link, or Text Name Tag)
			else if (args.length > 0) {
				const fullArg = args.join(" ").trim();
				const cleanArg = fullArg.replace(/^@/, "").trim();

				// Case A: Direct numeric UID
				if (/^\d+$/.test(cleanArg)) {
					uid = cleanArg;
				}
				// Case B: Facebook Profile URL
				else if (cleanArg.includes("facebook.com/")) {
					const match = cleanArg.match(/(?:profile\.php\?id=|\/)([\d]+)/);
					if (match) {
						uid = match[1];
					} else if (api && typeof api.getUID === "function") {
						try {
							uid = await api.getUID(cleanArg);
						} catch (_) {}
					}

					// Fallback vanity regex extract
					if (!uid) {
						const vanityMatch = cleanArg.match(/facebook\.com\/([^/?]+)/);
						if (vanityMatch) {
							try {
								const response = await axios.get(`https://www.facebook.com/${vanityMatch[1]}`, {
									headers: {
										"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
									},
									timeout: 5000
								});
								const uidMatch = response.data.match(/"userID":"(\d+)"/) || response.data.match(/"entity_id":"(\d+)"/);
								if (uidMatch) uid = uidMatch[1];
							} catch (_) {}
						}
					}
				}

				// Case C: Name or text tag match (e.g. "@Isotope Anmah" or "Isotope")
				if (!uid && cleanArg) {
					targetName = cleanArg.toLowerCase();

					// Search in group members
					if (threadsData && event.threadID) {
						const threadRecord = await threadsData.get(event.threadID).catch(() => null);
						const members = threadRecord?.members || [];

						// Exact match on member name
						let found = members.find(m => m.name && m.name.toLowerCase() === targetName);

						// Substring match
						if (!found) {
							found = members.find(m => m.name && m.name.toLowerCase().includes(targetName));
						}

						// Nickname match
						if (!found) {
							found = members.find(m => m.nickname && m.nickname.toLowerCase().includes(targetName));
						}

						// Word match (e.g. words in any order)
						if (!found) {
							const words = targetName.split(/\s+/).filter(w => w.length > 1);
							if (words.length > 0) {
								found = members.find(m => m.name && words.every(w => m.name.toLowerCase().includes(w)));
							}
						}

						if (found) {
							uid = found.userID || found.id;
						}
					}

					// Fallback: Search in global user database
					if (!uid && global.db?.allUserData) {
						const globalFound = global.db.allUserData.find(u => u.name && (u.name.toLowerCase() === targetName || u.name.toLowerCase().includes(targetName)));
						if (globalFound) {
							uid = globalFound.userID;
						}
					}

					// Fallback: Query live thread info from Facebook API
					if (!uid && api && typeof api.getThreadInfo === "function" && event.threadID) {
						try {
							const tInfo = await api.getThreadInfo(event.threadID);
							const p = tInfo?.userInfo || [];
							if (Array.isArray(p)) {
								const found = p.find(m => m.name && (m.name.toLowerCase() === targetName || m.name.toLowerCase().includes(targetName)));
								if (found) uid = found.id;
							}
						} catch (_) {}
					}

					// If user typed a target name that cannot be found, inform them instead of returning sender's PFP
					if (!uid) {
						return message.reply(getLang("notFound", fullArg));
					}
				}
			}
			// 4. Default: No args, no reply -> Caller's own avatar
			else {
				uid = event.senderID;
			}

			uid = String(uid || "").replace(/(fb)?id[:.]/, "").trim();
			if (!uid || isNaN(uid)) {
				return message.reply(getLang("invalidUID"));
			}

			const userName = targetName || (await usersData.getName(uid).catch(() => null)) || `User ${uid}`;

			const imageBuffer = await fetchHighQualityAvatar(uid, api, usersData);
			if (!imageBuffer) {
				if (api?.setMessageReaction) {
					api.setMessageReaction("❌", event.messageID, () => {}, true);
				}
				return message.reply(getLang("error", "Could not fetch high quality profile picture"));
			}

			const cacheDir = path.join(__dirname, "cache");
			await fs.ensureDir(cacheDir);
			cachePath = path.join(cacheDir, `pfp_${uid}_${Date.now()}.jpg`);
			await fs.writeFile(cachePath, imageBuffer);

			if (api?.setMessageReaction) {
				api.setMessageReaction("✅", event.messageID, () => {}, true);
			}

			await message.reply({
				body: getLang("success", userName),
				attachment: fs.createReadStream(cachePath)
			});
		} catch (err) {
			console.error("[PFP ERROR]:", err);
			if (api?.setMessageReaction) {
				api.setMessageReaction("❌", event.messageID, () => {}, true);
			}
			return message.reply(getLang("error", err.message || err));
		} finally {
			if (cachePath) {
				await fs.remove(cachePath).catch(() => {});
			}
		}
	}
};