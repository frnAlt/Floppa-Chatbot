const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
        config: {
                name: "pfp",
                aliases: ["profilepic", "getpfp", "userpic"],
                version: "1.0",
                author: "frnAlt",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Lấy ảnh đại diện của người dùng",
                        en: "Fetch user's profile picture"
                },
                category: "utility",
                guide: {
                        vi: '   {pn}: Lấy ảnh đại diện của bạn'
                                + '\n   {pn} <@tag>: Lấy ảnh đại diện của người được tag'
                                + '\n   {pn} <uid>: Lấy ảnh đại diện từ UID'
                                + '\n   {pn} <profile_link>: Lấy ảnh đại diện từ link profile'
                                + '\n   (Hoặc reply tin nhắn của ai đó)',
                        en: '   {pn}: Fetch your profile picture'
                                + '\n   {pn} <@tag>: Fetch tagged user\'s profile picture'
                                + '\n   {pn} <uid>: Fetch profile picture from UID'
                                + '\n   {pn} <profile_link>: Fetch profile picture from profile link'
                                + '\n   (Or reply to someone\'s message)'
                }
        },

        langs: {
                vi: {
                        fetching: "🔍 Đang lấy ảnh đại diện...",
                        success: "✓ Ảnh đại diện của %1",
                        error: "× Không thể lấy ảnh đại diện: %1",
                        invalidUID: "! UID không hợp lệ"
                },
                en: {
                        fetching: "🔍 Fetching profile picture...",
                        success: "✓ Profile picture of %1",
                        error: "× Could not fetch profile picture: %1",
                        invalidUID: "! Invalid UID"
                }
        },

	onStart: async function ({ api, message, args, event, getLang, usersData }) {
		try {
			let uid = event.senderID;

			if (event.messageReply) {
				uid = event.messageReply.senderID || event.messageReply.actorFbId || uid;
			} else if (event.mentions && Object.keys(event.mentions).length > 0) {
				uid = Object.keys(event.mentions)[0];
			} else if (args[0]) {
				const cleanArg = args[0].trim();
				if (/^\d+$/.test(cleanArg)) {
					uid = cleanArg;
				} else if (cleanArg.includes("facebook.com/")) {
					const match = cleanArg.match(/(?:profile\.php\?id=|\/)([\d]+)/);
					if (match) uid = match[1];
				}
			}

			uid = String(uid).replace(/(fb)?id[:.]/, "").trim();
			if (!uid || isNaN(uid))
				return message.reply(getLang("invalidUID"));

			const userName = await usersData.getName(uid).catch(() => "User");
			const avatarURL = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
			const avatarStream = await global.utils.getStreamFromURL(avatarURL, `pfp_${uid}.jpg`);

			await message.reply({
				body: getLang("success", userName),
				attachment: avatarStream
			});
		} catch (err) {
			console.error("Error in pfp command:", err);
			return message.reply(getLang("error", err.message || err));
		}
	}
};