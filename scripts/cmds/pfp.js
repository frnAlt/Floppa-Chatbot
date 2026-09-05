module.exports = {
	config: {
		name: "pfp",
		aliases: ["profilepic", "getpfp", "userpic", "dp", "pp"],
		version: "2.1.0",
		author: "frnAlt",
		countDown: 5,
		role: 0,
		description: {
			vi: "Lấy ảnh đại diện của người dùng (hỗ trợ tag, tên, UID, reply)",
			en: "Fetch user profile picture (supports tag, name, UID, reply)"
		},
		category: "utility",
		guide: {
			vi: '   {pn}: Lấy ảnh đại diện của bạn'
				+ '\n   {pn} <@tag hoặc Tên>: Lấy ảnh đại diện của người được tag/tên'
				+ '\n   {pn} <uid>: Lấy ảnh đại diện từ UID'
				+ '\n   {pn} <profile_link>: Lấy ảnh đại diện từ link Facebook'
				+ '\n   (Hoặc reply tin nhắn của người đó và gõ {pn})',
			en: '   {pn}: Fetch your profile picture'
				+ '\n   {pn} <@tag or Name>: Fetch tagged or named user\'s profile picture'
				+ '\n   {pn} <uid>: Fetch profile picture from UID'
				+ '\n   {pn} <profile_link>: Fetch profile picture from Facebook link'
				+ '\n   (Or reply to someone\'s message and type {pn})'
		}
	},

	langs: {
		vi: {
			success: "✓ Ảnh đại diện của %1",
			error: "× Không thể lấy ảnh đại diện: %1",
			invalidUID: "! UID không hợp lệ",
			notFound: "❌ Không tìm thấy thành viên \"%1\" trong nhóm. Vui lòng reply tin nhắn của họ hoặc nhập UID."
		},
		en: {
			success: "✓ Profile picture of %1",
			error: "× Could not fetch profile picture: %1",
			invalidUID: "! Invalid UID",
			notFound: "❌ Could not find member \"%1\" in this group. Please reply to their message or provide their UID."
		}
	},

	onStart: async function ({ api, message, args, event, getLang, usersData, threadsData }) {
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
			let avatarStream = null;

			// Source 1: Direct Facebook CDN URL from api.getUserInfo (highest quality)
			if (api && typeof api.getUserInfo === "function") {
				try {
					const info = await api.getUserInfo(uid);
					const directCdnUrl = info?.[uid]?.profilePicUrl || info?.[uid]?.thumbSrc;
					if (directCdnUrl) {
						avatarStream = await global.utils.getStreamFromURL(directCdnUrl, `pfp_${uid}.jpg`, { timeout: 15000 }).catch(() => null);
					}
				} catch (_) {}
			}

			// Source 2: Graph API with access token
			if (!avatarStream) {
				try {
					const graphUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
					avatarStream = await global.utils.getStreamFromURL(graphUrl, `pfp_${uid}.jpg`, { timeout: 15000 }).catch(() => null);
				} catch (_) {}
			}

			// Source 3: Graph API type=large
			if (!avatarStream) {
				try {
					const graphUrlLarge = `https://graph.facebook.com/${uid}/picture?type=large`;
					avatarStream = await global.utils.getStreamFromURL(graphUrlLarge, `pfp_${uid}.jpg`, { timeout: 15000 }).catch(() => null);
				} catch (_) {}
			}

			// Source 4: usersData controller fallback
			if (!avatarStream) {
				const fallbackUrl = await usersData.getAvatarUrl(uid);
				avatarStream = await global.utils.getStreamFromURL(fallbackUrl, `pfp_${uid}.jpg`);
			}

			if (api?.setMessageReaction) {
				api.setMessageReaction("✅", event.messageID, () => {}, true);
			}

			await message.reply({
				body: getLang("success", userName),
				attachment: avatarStream
			});
		} catch (err) {
			console.error("[PFP ERROR]:", err);
			if (api?.setMessageReaction) {
				api.setMessageReaction("❌", event.messageID, () => {}, true);
			}
			return message.reply(getLang("error", err.message || err));
		}
	}
};