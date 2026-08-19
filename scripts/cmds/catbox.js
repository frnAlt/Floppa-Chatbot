const axios = require("axios");

const baseApiUrl = async () => {
	const base = await axios.get(
		`https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json`
	);
	return base.data.api;
};

module.exports.config = {
	name: "catbox",
	aliases: ["cat", "cb"],
	version: "1.6.9",
	author: "frnAlt",
	role: 0,
	category: "utility",
	shortDescription: "Convert attachment to Catbox URL",
	longDescription: "Upload video, audio, or image attachment to Catbox and get shareable link.",
	countDown: 5,
	guide: {
		en: "Reply to an attachment to upload to Catbox"
	}
};

module.exports.onStart = async ({ api, event }) => {
	try {
		const allUrl = event.messageReply?.attachments[0]?.url;
		if (!allUrl) {
			return api.sendMessage("❌ Please reply to an attachment to upload.", event.threadID, event.messageID);
		}
		const msg = await api.sendMessage("✨ Uploading your attachment... Please wait", event.threadID);

		const { data } = await axios.get(`${await baseApiUrl()}/catbox?url=${encodeURIComponent(allUrl)}`);

		await api.unsendMessage(msg.messageID);
		api.sendMessage(`✅ Uploaded successfully!\n\n🔗 ${data.url}`, event.threadID, event.messageID);

	} catch (e) {
		api.sendMessage("❌ Error while uploading attachment to Catbox.", event.threadID, event.messageID);
	}
};
