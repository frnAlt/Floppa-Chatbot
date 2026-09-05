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

			const threadBotMsgs = global.botSentMessages?.get(String(event.threadID)) || [];
			if (threadBotMsgs.length === 0) {
				return message.reply("❌ No recent bot messages recorded in this chat to unsend.");
			}

			const toUnsend = threadBotMsgs.splice(-targetCount);
			let unsentCount = 0;

			for (const mid of toUnsend.reverse()) {
				try {
					await api.unsendMessage(mid, event.threadID);
					unsentCount++;
					await new Promise(r => setTimeout(r, 250));
				} catch (_) {}
			}

			if (unsentCount === 0) {
				return message.reply("❌ Could not unsend messages. They may have already been unsent or are too old.");
			}

			const notice = await message.reply(`🧹 Cleaned up ${unsentCount} bot message(s).`);
			if (notice?.messageID) {
				setTimeout(() => {
					api.unsendMessage(notice.messageID, event.threadID).catch(() => {});
				}, 3500);
			}
			return;
		}

		// Mode 2: Unsend by reply
		if (event.messageReply && event.messageReply.messageID) {
			const replySender = event.messageReply.senderID || event.messageReply.actorFbId;
			const isBotMsg = (replySender && String(replySender) === botID) ||
				(global.botSentMessages?.get(String(event.threadID))?.includes(event.messageReply.messageID));

			if (!isBotMsg && replySender && String(replySender) !== botID) {
				return message.reply("❌ I can only unsend messages sent by me!");
			}

			try {
				await api.unsendMessage(event.messageReply.messageID, event.threadID);
				const threadBotMsgs = global.botSentMessages?.get(String(event.threadID));
				if (threadBotMsgs) {
					const idx = threadBotMsgs.indexOf(event.messageReply.messageID);
					if (idx !== -1) threadBotMsgs.splice(idx, 1);
				}
				if (api.setMessageReaction) {
					api.setMessageReaction("✅", event.messageID, () => {}, true);
				}
				if (api.unsendMessage && event.messageID) {
					setTimeout(() => api.unsendMessage(event.messageID, event.threadID).catch(() => {}), 1500);
				}
			} catch (err) {
				console.error("[UNSEND ERROR]:", err.message);
				return message.reply("❌ Could not unsend this message. It may have already been unsent or is too old.");
			}
			return;
		}

		// Mode 3: Default without reply or args -> unsend last bot message in this thread
		const threadBotMsgs = global.botSentMessages?.get(String(event.threadID)) || [];
		if (threadBotMsgs.length > 0) {
			const lastMID = threadBotMsgs.pop();
			try {
				await api.unsendMessage(lastMID, event.threadID);
				if (api.setMessageReaction) {
					api.setMessageReaction("✅", event.messageID, () => {}, true);
				}
				if (api.unsendMessage && event.messageID) {
					setTimeout(() => api.unsendMessage(event.messageID, event.threadID).catch(() => {}), 1500);
				}
				return;
			} catch (err) {
				console.error("[UNSEND ERROR]:", err.message);
			}
		}

		return message.reply("❌ No bot message to unsend. Reply to any bot message with {p}unsend or specify a count: {p}unsend <number>");
	}
};
