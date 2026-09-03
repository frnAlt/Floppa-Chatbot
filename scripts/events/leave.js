const { getTime, drive, getStreamFromURL } = global.utils || {};

module.exports = {
	config: {
		name: "leave",
		version: "2.0.0",
		author: "frnAlt",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			leaveType1: "tự rời khỏi",
			leaveType2: "bị kick khỏi",
			defaultLeaveMessage: "👋 {userName} (ID: {userID}) đã {type} nhóm {boxName}."
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			leaveType1: "left",
			leaveType2: "was kicked from",
			defaultLeaveMessage: "👋 {userName} (ID: {userID}) {type} {boxName}."
		}
	},

	onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
		if (event.logMessageType !== "log:unsubscribe")
			return;

		return async function () {
			const { threadID, author } = event;
			const threadData = await threadsData.get(threadID).catch(() => ({}));
			if (threadData?.settings?.sendLeaveMessage === false)
				return;

			const { leftParticipantFbId } = event.logMessageData;
			const botID = String(api.getCurrentUserID());
			if (String(leftParticipantFbId) === botID)
				return;

			const hours = +getTime("HH");
			const session =
				hours < 10 ? getLang("session1") :
				hours < 12 ? getLang("session2") :
				hours < 18 ? getLang("session3") :
				getLang("session4");

			const threadName = threadData.threadName || "Group Chat";
			const userName = await usersData.getName(leftParticipantFbId).catch(() => "Facebook User");
			const isSelfLeave = String(leftParticipantFbId) === String(author);

			let kickerName = "Admin";
			let kickerID = String(author || "N/A");
			if (!isSelfLeave && author) {
				try {
					kickerName = await usersData.getName(author) || "Group Admin";
				} catch (_) {
					kickerName = "Admin";
				}
			}

			const remainingCount = Array.isArray(threadData.members) ? Math.max(0, threadData.members.length - 1) : 0;

			let { leaveMessage = getLang("defaultLeaveMessage") } = (threadData.data || {});

			leaveMessage = leaveMessage
				.replace(/\{userName\}|\{userNameTag\}/g, userName)
				.replace(/\{userID\}|\{userFbId\}/g, String(leftParticipantFbId))
				.replace(/\{type\}/g, isSelfLeave ? getLang("leaveType1") : getLang("leaveType2"))
				.replace(/\{kickerName\}|\{authorName\}/g, kickerName)
				.replace(/\{kickerID\}|\{authorID\}/g, kickerID)
				.replace(/\{memberCount\}/g, String(remainingCount))
				.replace(/\{threadName\}|\{boxName\}/g, threadName)
				.replace(/\{time\}/g, String(hours))
				.replace(/\{session\}/g, session);

			const form = { body: leaveMessage };

			if (leaveMessage.includes("{userNameTag}")) {
				form.mentions = [{
					id: leftParticipantFbId,
					tag: userName
				}];
			}

			if (threadData.data?.leaveAttachment && threadData.data.leaveAttachment.length > 0 && drive?.getFile) {
				try {
					const streams = threadData.data.leaveAttachment.map(file => drive.getFile(file, "stream"));
					const settled = await Promise.allSettled(streams);
					form.attachment = settled
						.filter(({ status }) => status === "fulfilled")
						.map(({ value }) => value);
				} catch (_) {}
			} else if (leftParticipantFbId) {
				try {
					const avatarUrl = await usersData.getAvatarUrl(leftParticipantFbId).catch(() => null);
					if (avatarUrl && typeof getStreamFromURL === "function") {
						const avatarStream = await getStreamFromURL(avatarUrl).catch(() => null);
						if (avatarStream) form.attachment = avatarStream;
					}
				} catch (_) {}
			}

			message.send(form);
		};
	}
};