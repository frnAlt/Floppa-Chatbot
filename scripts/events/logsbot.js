const { getTime } = global.utils || {};

module.exports = {
	config: {
		name: "logsbot",
		isBot: true,
		version: "2.0.0",
		author: "frnAlt",
		envConfig: {
			allow: true
		},
		category: "events"
	},

	langs: {
		vi: {
			title: "🛡️ ═══ BÁO CÁO HOẠT ĐỘNG BOT ═══",
			added: "\n✅ Bot vừa được thêm vào nhóm mới!\n👤 Người thêm: %1 (%2)",
			kicked: "\n❌ Bot vừa bị kick khỏi nhóm!\n👤 Người thực hiện: %1 (%2)",
			footer: "\n🏠 Nhóm: %1\n🆔 ID Nhóm: %2\n🔗 Profile: https://facebook.com/%3\n⏰ Thời gian: %4"
		},
		en: {
			title: "🛡️ ═══ BOT AUDIT EVENT ═══",
			added: "\n✅ Bot was added to a new group!\n👤 Added by: %1 (%2)",
			kicked: "\n❌ Bot was removed from group!\n👤 Action by: %1 (%2)",
			footer: "\n🏠 Group: %1\n🆔 Group ID: %2\n🔗 Profile: https://facebook.com/%3\n⏰ Timestamp: %4"
		}
	},

	onStart: async ({ usersData, threadsData, event, api, getLang }) => {
		const botID = String(api.getCurrentUserID());
		const isBotAdded = event.logMessageType === "log:subscribe" && event.logMessageData?.addedParticipants?.some(item => String(item.userFbId) === botID);
		const isBotKicked = event.logMessageType === "log:unsubscribe" && String(event.logMessageData?.leftParticipantFbId) === botID;

		if (!isBotAdded && !isBotKicked)
			return;

		return async function () {
			const { author, threadID } = event;
			if (String(author) === botID)
				return;

			const { config } = global.GoatBot || {};
			const adminList = config?.adminBot || [];
			if (!adminList || adminList.length === 0)
				return;

			let msg = getLang("title");
			let threadName = "Group Chat";

			const threadRecord = await threadsData.get(threadID).catch(() => null);
			if (threadRecord?.threadName) {
				threadName = threadRecord.threadName;
			} else {
				try {
					const info = await api.getThreadInfo(threadID).catch(() => null);
					if (info?.threadName) threadName = info.threadName;
				} catch (_) {}
			}

			let authorName = "Facebook User";
			if (author) {
				try {
					authorName = await usersData.getName(author) || "Facebook User";
				} catch (_) {
					authorName = "Facebook User";
				}
			}

			if (isBotAdded) {
				msg += getLang("added", authorName, author || "N/A");
			} else if (isBotKicked) {
				msg += getLang("kicked", authorName, author || "N/A");
			}

			const time = getTime ? getTime("DD/MM/YYYY HH:mm:ss") : new Date().toLocaleString();
			msg += getLang("footer", threadName, threadID, author || "", time);

			for (const adminID of adminList) {
				api.sendMessage(msg, adminID).catch(() => {});
			}
		};
	}
};