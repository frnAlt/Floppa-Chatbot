const axios = require("axios");

module.exports = {
	config: {
		name: "tinyurl",
		aliases: ["shorturl", "shorten"],
		version: "1.0",
		author: "frnAlt",
		shortDescription: "Shorten URLs using TinyURL",
		longDescription: "Shorten any URL or replied attachment link using TinyURL service.",
		category: "utility",
		role: 0,
		guide: {
			en: "{pn} <url> or reply to a link"
		}
	},

	onStart: async function ({ api, event, args }) {
		let targetUrl = args[0];

		if (!targetUrl && event.type === "message_reply" && event.messageReply?.attachments?.length > 0) {
			targetUrl = event.messageReply.attachments[0].url;
		}

		if (!targetUrl) {
			return api.sendMessage("❌ Please provide a URL or reply to a link/attachment.", event.threadID, event.messageID);
		}

		try {
			const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`);
			api.sendMessage(`🔗 Shortened URL:\n${res.data}`, event.threadID, event.messageID);
		} catch (error) {
			api.sendMessage("❌ Error occurred while shortening URL.", event.threadID, event.messageID);
		}
	}
};
