const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "pair",
		aliases: ["match", "love"],
		version: "1.2",
		author: "Farhan (Baka-Chan-bot)",
		countDown: 5,
		role: 0,
		shortDescription: "Pair two people randomly or custom",
		longDescription: "Pairs you with a random group member or a mentioned user with love percentage.",
		category: "fun",
		guide: {
			en: "{pn} or {pn} @User"
		}
	},

	onStart: async function ({ api, event, usersData }) {
		const { threadID, messageID, senderID, mentions } = event;
		const { participantIDs } = await api.getThreadInfo(threadID);
		const botID = api.getCurrentUserID();
		const senderData = await usersData.get(senderID);
		const nameSender = senderData?.name || "User";

		let uid2, name2;

		if (mentions && Object.keys(mentions).length > 0) {
			uid2 = Object.keys(mentions)[0];
			const u2Data = await usersData.get(uid2);
			name2 = u2Data?.name || "User";
		} else {
			const listUserID = participantIDs.filter(ID => ID != botID && ID != senderID);
			if (listUserID.length === 0) {
				return api.sendMessage("❌ Not enough members to pair in this chat.", threadID, messageID);
			}
			uid2 = listUserID[Math.floor(Math.random() * listUserID.length)];
			const u2Data = await usersData.get(uid2);
			name2 = u2Data?.name || "User";
		}

		const lovePercent = Math.floor(Math.random() * 101);
		const arrayTag = [
			{ id: senderID, tag: nameSender },
			{ id: uid2, tag: name2 }
		];

		const cacheDir = path.join(__dirname, "cache");
		await fs.ensureDir(cacheDir);

		const avt1Path = path.join(cacheDir, `avt1_${Date.now()}.png`);
		const avt2Path = path.join(cacheDir, `avt2_${Date.now()}.png`);
		const gifPath = path.join(cacheDir, "giflove.png");

		try {
			const [avatar1, avatar2] = await Promise.all([
				axios.get(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }).catch(() => null),
				axios.get(`https://graph.facebook.com/${uid2}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }).catch(() => null)
			]);

			if (!await fs.pathExists(gifPath)) {
				const gifRes = await axios.get(`https://i.ibb.co/wC2JJBb/trai-tim-lap-lanh.gif`, { responseType: "arraybuffer" });
				await fs.writeFile(gifPath, gifRes.data);
			}

			const attachments = [];
			if (avatar1?.data) {
				await fs.writeFile(avt1Path, avatar1.data);
				attachments.push(fs.createReadStream(avt1Path));
			}
			attachments.push(fs.createReadStream(gifPath));
			if (avatar2?.data) {
				await fs.writeFile(avt2Path, avatar2.data);
				attachments.push(fs.createReadStream(avt2Path));
			}

			const msg = {
				body: `🥰 Successful pairing! 💌 Wishing you both eternal happiness 💕\n\n💞 Love Ratio: ${lovePercent}%\n👥 ${nameSender} 💓 ${name2}`,
				mentions: arrayTag,
				attachment: attachments
			};

			return api.sendMessage(msg, threadID, messageID);

		} catch (err) {
			console.error("Pair command error:", err);
			return api.sendMessage(`🥰 Pairing: ${nameSender} 💓 ${name2}\n💞 Love Ratio: ${lovePercent}%`, threadID, messageID);
		}
	}
};
