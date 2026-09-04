module.exports = {
	config: {
		name: "all",
		aliases: ["tagall", "tag"],
		version: "2.0.0",
		author: "frnAlt",
		countDown: 5,
		role: 1,
		description: {
			vi: "Tag tất cả thành viên trong nhóm chat của bạn",
			en: "Tag all members in your group chat"
		},
		category: "box chat",
		guide: {
			vi: "   {pn} [nội dung | để trống]",
			en: "   {pn} [content | empty]"
		}
	},

	onStart: async function ({ message, event, args, threadsData }) {
		let participantIDs = event.participantIDs;
		if (!participantIDs || !participantIDs.length) {
			try {
				const threadInfo = await threadsData.get(event.threadID);
				participantIDs = threadInfo?.members ? threadInfo.members.map(m => m.userID) : [];
			} catch (_) {}
		}
		if (!participantIDs || !participantIDs.length) {
			return message.reply("❌ Could not retrieve member list for this group.");
		}
		const mentions = [];
		let body = args.join(" ").trim() || "@everyone";
		if (body.length < participantIDs.length) {
			body += " ".repeat(participantIDs.length - body.length);
		}
		for (let idx = 0; idx < participantIDs.length; idx++) {
			mentions.push({
				tag: body[idx],
				id: String(participantIDs[idx]),
				fromIndex: idx
			});
		}
		return message.reply({ body, mentions });
	}
};