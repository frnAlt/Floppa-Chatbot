module.exports = {
	config: {
		name: "autoUpdateThreadInfo",
		version: "1.4",
		author: "NTKhang",
		category: "events"
	},

	onStart: async ({ threadsData, event, api }) => {
		const types = ["log:subscribe", "log:unsubscribe", "log:thread-admins", "log:thread-name", "log:thread-image", "log:thread-icon", "log:thread-color", "log:user-nickname"];
		if (!types.includes(event.logMessageType))
			return;
		const { threadID, logMessageData, logMessageType } = event;
		let threadInfo = await threadsData.get(event.threadID);
		if (!threadInfo) {
			threadInfo = await threadsData.create(event.threadID).catch(() => null);
		}
		if (!threadInfo)
			return;
		// eslint-disable-next-line prefer-const
		let { members = [], adminIDs = [] } = threadInfo;
		if (!Array.isArray(members)) members = [];
		if (!Array.isArray(adminIDs)) adminIDs = [];
		switch (logMessageType) {
			case "log:subscribe":
				return async function () {
					const { addedParticipants } = event.logMessageData;
					let threadInfo_Fca;
					try {
						threadInfo_Fca = await api.getThreadInfo(threadID);
					} catch (_) {
						threadInfo_Fca = null;
					}
					if (!threadInfo_Fca) return;
					threadsData.refreshInfo(threadID, threadInfo_Fca).catch(() => {});

					for (const user of addedParticipants) {
						let oldData = members.find(member => member.userID === user.userFbId);
						const isOldMember = oldData ? true : false;
						oldData = oldData || {};
						const userInfo = Array.isArray(threadInfo_Fca.userInfo) ? threadInfo_Fca.userInfo : [];
						const nicknames = threadInfo_Fca.nicknames || {};

						const newData = {
							userID: user.userFbId,
							name: user.fullName,
							gender: userInfo.find(u => u.id == user.userFbId)?.gender || "UNKNOWN",
							nickname: nicknames[user.userFbId] || null,
							inGroup: true,
							count: oldData.count || 0
						};

						if (!isOldMember)
							members.push(newData);
						else {
							const index = members.findIndex(member => member.userID === user.userFbId);
							members[index] = newData;
						}
					}
					await threadsData.set(threadID, members, "members");
				};

			case "log:unsubscribe":
				return async function () {
					const oldData = members.find(member => member.userID === logMessageData.leftParticipantFbId);
					if (oldData) {
						oldData.inGroup = false;
						await threadsData.set(threadID, members, "members");
					}
				};

			case "log:thread-admins":
				return async function () {
					if (logMessageData.ADMIN_EVENT == "add_admin")
						adminIDs.push(logMessageData.TARGET_ID);
					else
						adminIDs = adminIDs.filter(uid => uid != logMessageData.TARGET_ID);
					adminIDs = [...new Set(adminIDs)];
					await threadsData.set(threadID, adminIDs, "adminIDs");
				};

			case "log:thread-name":
				return async function () {
					const threadName = logMessageData.name;
					await threadsData.set(threadID, threadName, "threadName");
				};
			case "log:thread-image":
				return async function () {
					await threadsData.set(threadID, logMessageData.url, "imageSrc");
				};
			case "log:thread-icon":
				return async function () {
					await threadsData.set(threadID, logMessageData.thread_icon, "emoji");
				};
			case "log:thread-color":
				return async function () {
					await threadsData.set(threadID, logMessageData.theme_id, "threadThemeID");
				};
			case "log:user-nickname":
				return async function () {
					const { participant_id, nickname } = logMessageData;
					const oldData = members.find(member => member.userID === participant_id);
					if (oldData) {
						oldData.nickname = nickname;
						await threadsData.set(threadID, members, "members");
					}
				};
			default:
				return null;
		}

	}
};