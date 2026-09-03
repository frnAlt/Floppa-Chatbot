module.exports = {
	config: {
		name: "unsend",
		aliases: ["u", "usend", "r", "uns"],
		version: "1.2",
		author: "frnAlt",
		countDown: 5,
		role: 0,
		description: {
			vi: "Gỡ tin nhắn của bot",
			en: "Unsend bot's message"
		},
		category: "box chat",
		guide: {
			vi: "reply tin nhắn muốn gỡ của bot và gọi lệnh {pn}",
			en: "reply the message you want to unsend and call the command {pn}"
		}
	},

	langs: {
		vi: {
			syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot"
		},
		en: {
			syntaxError: "Please reply the message you want to unsend"
		}
	},

	onStart: async function ({ message, event, api, getLang }) {
		if (!event.messageReply || !event.messageReply.messageID)
			return message.reply(getLang("syntaxError"));

		const botID = String(api.getCurrentUserID());
		const replySender = String(event.messageReply.senderID || event.messageReply.actorFbId || "");

		if (replySender && replySender !== botID) {
			return message.reply("You can only unsend messages sent by the bot.");
		}

		try {
			await message.unsend(event.messageReply.messageID);
		} catch (err) {
			console.error("[UNSEND ERROR]:", err);
			return message.reply("Could not unsend this message. It may have already been unsent.");
		}
	}
};
