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
			vi: "reply tin nhắn của bot hoặc nhập {pn} [số lượng] (vd: {pn} 2)",
			en: "reply bot's message or use {pn} [number] (e.g.: {pn} 2)"
		}
	},

	langs: {
		vi: {
			syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot hoặc nhập số lượng tin nhắn (vd: %1 2)"
		},
		en: {
			syntaxError: "Please reply to a bot message or specify a number to unsend (e.g.: %1 2)"
		}
	},

	onStart: async function ({ message, event, api, args, getLang, commandName }) {
		const botID = String(api.getCurrentUserID());

		// Mode 1: Unsend N recent bot messages (e.g. !u 2)
		if (args[0] && /^\d+$/.test(args[0])) {
			const count = parseInt(args[0], 10);
			if (count <= 0) {
				return message.reply("Please enter a valid number greater than 0.");
			}
			const maxLimit = 25;
			const targetCount = Math.min(count, maxLimit);

			const threadBotMsgs = global.botSentMessages?.get(event.threadID) || [];
			if (threadBotMsgs.length === 0) {
				return message.reply("No recent bot messages recorded in this chat to clean up.");
			}

			const toUnsend = threadBotMsgs.splice(-targetCount);
			let unsentCount = 0;

			for (const mid of toUnsend.reverse()) {
				try {
					await api.unsendMessage(mid);
					unsentCount++;
				} catch (_) {}
			}

			const notice = await message.reply(`🧹 Cleaned up ${unsentCount} bot message(s).`);
			if (notice?.messageID) {
				setTimeout(() => {
					api.unsendMessage(notice.messageID).catch(() => {});
				}, 4000);
			}
			return;
		}

		// Mode 2: Unsend by reply
		if (event.messageReply && event.messageReply.messageID) {
			const replySender = String(event.messageReply.senderID || event.messageReply.actorFbId || "");
			if (replySender && replySender !== botID) {
				return message.reply("You can only unsend messages sent by the bot.");
			}

			try {
				await message.unsend(event.messageReply.messageID);
				// Also remove from tracked messages if present
				const threadBotMsgs = global.botSentMessages?.get(event.threadID);
				if (threadBotMsgs) {
					const idx = threadBotMsgs.indexOf(event.messageReply.messageID);
					if (idx !== -1) threadBotMsgs.splice(idx, 1);
				}
			} catch (err) {
				console.error("[UNSEND ERROR]:", err);
				return message.reply("Could not unsend this message. It may have already been unsent.");
			}
			return;
		}

		return message.reply(getLang("syntaxError", commandName));
	}
};
