const { getTime, drive, getStreamFromURL } = global.utils || {};

module.exports = {
	config: {
		name: "welcome",
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
			multiple1: "bạn",
			multiple2: "các bạn",
			welcomeBot: "Cảm ơn bạn đã thêm mình vào nhóm!\nPrefix của bot: %1\nĐể xem danh sách lệnh, vui lòng nhập: %1help",
			defaultWelcomeMessage: "👋 Chào mừng {multiple} đã đến với {boxName}!\n👤 Tên: {userName}\n🆔 ID: {userID}\n👥 Người thêm: {inviterName}\n🔢 Thành viên thứ: {memberCount}\nChúc {multiple} một buổi {session} vui vẻ 🎉"
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			multiple1: "you",
			multiple2: "you guys",
			welcomeBot: "Thank you for inviting me to the group!\nBot prefix: %1\nTo view commands, type: %1help",
			defaultWelcomeMessage: "👋 Welcome {multiple} to {boxName}!\n👤 Name: {userName}\n🆔 ID: {userID}\n👥 Added by: {inviterName}\n🔢 Total Members: {memberCount}\nHave a wonderful {session}! 🎉"
		}
	},

	onStart: async ({ threadsData, usersData, message, event, api, getLang }) => {
		if (event.logMessageType !== "log:subscribe")
			return;

		return async function () {
			const { threadID, author } = event;
			const { addedParticipants } = event.logMessageData;
			if (!addedParticipants || addedParticipants.length === 0)
				return;

			const botID = String(api.getCurrentUserID());

			let threadData;
			try {
				threadData = await threadsData.get(threadID);
			} catch (_) {
				return;
			}

			const settings = threadData?.settings || {};

			// ── Case 1: Bot itself joined ──
			if (addedParticipants.some(item => String(item.userFbId) === botID)) {
				if (settings.sendWelcomeBotJoinMessage === false || settings.sendWelcomeMessage === false) {
					return;
				}
				const prefix = global.utils.getPrefix(threadID);
				return message.send(getLang("welcomeBot", prefix));
			}

			// ── Case 2: Regular member(s) joined ──
			if (settings.sendWelcomeMessage === false) {
				return;
			}

			const hours = +getTime("HH");
			const session =
				hours < 10 ? getLang("session1") :
				hours < 12 ? getLang("session2") :
				hours < 18 ? getLang("session3") :
				getLang("session4");

			const isMultiple = addedParticipants.length > 1;
			const multiple = isMultiple ? getLang("multiple2") : getLang("multiple1");
			const threadName = threadData.threadName || "Group Chat";

			// Get inviter (normal person who added)
			let inviterName = "Group Link / Admin";
			let inviterID = String(author || "N/A");
			if (author && author !== botID) {
				try {
					inviterName = await usersData.getName(author) || "Group Admin";
				} catch (_) {
					inviterName = "Group Member";
				}
			}

			// Count total members
			const memberCount = Array.isArray(threadData.members) ? threadData.members.length : (addedParticipants.length);

			let { welcomeMessage = getLang("defaultWelcomeMessage") } = (threadData.data || {});

			const namesList = addedParticipants.map(u => u.fullName).join(", ");
			const uidsList = addedParticipants.map(u => u.userFbId).join(", ");
			const firstUser = addedParticipants[0];

			// Mentions setup
			const hasMentionTag = welcomeMessage.includes("{userNameTag}");
			const mentions = hasMentionTag
				? addedParticipants.map(u => ({ tag: u.fullName, id: u.userFbId }))
				: null;

			welcomeMessage = welcomeMessage
				.replace(/\{userName\}/g, isMultiple ? namesList : firstUser.fullName)
				.replace(/\{userNameTag\}/g, isMultiple ? namesList : firstUser.fullName)
				.replace(/\{userID\}|\{userFbId\}/g, isMultiple ? uidsList : firstUser.userFbId)
				.replace(/\{inviterName\}|\{authorName\}/g, inviterName)
				.replace(/\{inviterID\}|\{authorID\}/g, inviterID)
				.replace(/\{memberCount\}/g, String(memberCount))
				.replace(/\{multiple\}/g, multiple)
				.replace(/\{boxName\}|\{threadName\}/g, threadName)
				.replace(/\{session\}/g, session);

			const form = { body: welcomeMessage };
			if (mentions) form.mentions = mentions;

			// Handle Attachments: custom welcome attachments or member avatar fallback
			if (threadData.data?.welcomeAttachment && threadData.data.welcomeAttachment.length > 0 && drive?.getFile) {
				try {
					const streams = threadData.data.welcomeAttachment.map(fileId =>
						drive.getFile(fileId, "stream")
					);
					const settled = await Promise.allSettled(streams);
					form.attachment = settled
						.filter(({ status }) => status === "fulfilled")
						.map(({ value }) => value);
				} catch (_) {}
			} else if (!isMultiple && firstUser?.userFbId) {
				try {
					const avatarUrl = await usersData.getAvatarUrl(firstUser.userFbId).catch(() => null);
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
