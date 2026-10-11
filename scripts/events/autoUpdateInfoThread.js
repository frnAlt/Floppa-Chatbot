module.exports = {
	config: {
		name: "autoUpdateThreadInfo",
		version: "1.4",
		author: "NTKhang",
		category: "events"
	},

	onStart: async ({ threadsData, event, api }) => {
		const types = ["log:subscribe", "log:unsubscribe", "log:thread-admins", "log:thread-name", "log:thread-image", "log:thread-icon", "log:thread-color", "log:user-nickname", "log:thread-approval-mode"];
		if (!types.includes(event.logMessageType))
			return;
		const { threadID, logMessageData, logMessageType } = event;
		let threadInfo = await threadsData.get(event.threadID);
		if (!threadInfo) {
			threadInfo = await threadsData.create(event.threadID, null, true).catch(() => null);
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
					const { addedParticipants = [] } = event.logMessageData || {};
					let threadInfo_Fca = null;
					try {
						threadInfo_Fca = await api.getThreadInfo(threadID);
					} catch (_) {
						threadInfo_Fca = null;
					}
					if (threadInfo_Fca) {
						threadsData.refreshInfo(threadID, threadInfo_Fca).catch(() => {});
					}

					for (const user of addedParticipants) {
						const uID = String(user.userFbId);
						let oldData = members.find(member => String(member.userID) === uID);
						const isOldMember = Boolean(oldData);
						oldData = oldData || {};
						const userInfo = Array.isArray(threadInfo_Fca?.userInfo) ? threadInfo_Fca.userInfo : [];
						const nicknames = threadInfo_Fca?.nicknames || {};

						const newData = {
							userID: uID,
							name: user.fullName || oldData.name || `User ${uID}`,
							gender: userInfo.find(u => String(u.id) === uID)?.gender || oldData.gender || "UNKNOWN",
							nickname: nicknames[uID] || oldData.nickname || null,
							inGroup: true,
							count: oldData.count || 0
						};

						if (!isOldMember)
							members.push(newData);
						else {
							const index = members.findIndex(member => String(member.userID) === uID);
							members[index] = newData;
						}
					}
					await threadsData.set(threadID, members, "members");
				};

			case "log:unsubscribe":
				return async function () {
					const leftID = String(logMessageData.leftParticipantFbId || "");
					const oldData = members.find(member => String(member.userID) === leftID);
					if (oldData) {
						oldData.inGroup = false;
						await threadsData.set(threadID, members, "members");
					}
				};

			case "log:thread-admins":
				return async function () {
					const targetID = String(logMessageData.TARGET_ID || "");
					if (logMessageData.ADMIN_EVENT === "add_admin") {
						if (!adminIDs.map(String).includes(targetID)) {
							adminIDs.push(targetID);
						}
					} else {
						adminIDs = adminIDs.filter(uid => String(uid) !== targetID);
					}
					adminIDs = [...new Set(adminIDs)];
					await threadsData.set(threadID, adminIDs, "adminIDs");
				};

			case "log:thread-name":
				return async function () {
					const threadName = logMessageData.name || "";
					await threadsData.set(threadID, threadName, "threadName");
				};
			case "log:thread-image":
				return async function () {
					await threadsData.set(threadID, logMessageData.url || "", "imageSrc");
				};
			case "log:thread-icon":
				return async function () {
					await threadsData.set(threadID, logMessageData.thread_icon || "", "emoji");
				};
			case "log:thread-color":
				return async function () {
					await threadsData.set(threadID, logMessageData.theme_id || "", "threadThemeID");
				};
			case "log:thread-approval-mode":
				return async function () {
					const mode = typeof logMessageData.approval_mode === "boolean"
						? logMessageData.approval_mode
						: logMessageData.approval_mode === 1 || logMessageData.approval_mode === "1";
					await threadsData.set(threadID, mode, "approvalMode");
				};
			case "log:user-nickname":
				return async function () {
					const { participant_id, nickname } = logMessageData;
					const pID = String(participant_id || "");
					const oldData = members.find(member => String(member.userID) === pID);
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