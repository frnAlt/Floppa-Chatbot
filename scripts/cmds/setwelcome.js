const { drive, getStreamFromURL, getExtFromUrl, getTime } = global.utils;

module.exports = {
	config: {
		name: "setwelcome",
		aliases: ["welcome", "setwc", "wc"],
		version: "2.0.0",
		author: "frnAlt",
		countDown: 5,
		role: 1,
		description: {
			vi: "Bật/tắt và tùy chỉnh tin nhắn chào mừng thành viên mới tham gia nhóm",
			en: "Toggle and customize welcome message when new members join your group"
		},
		category: "custom",
		guide: {
			vi: {
				body: "   {pn} [on | off]: bật hoặc tắt tin nhắn chào mừng"
					+ "\n   {pn} text [<nội dung> | reset]: chỉnh sửa nội dung tin nhắn hoặc reset về mặc định"
					+ "\n   Shortcuts khả dụng:"
					+ "\n   • {userName}: tên thành viên mới"
					+ "\n   • {userNameTag}: tag thành viên mới"
					+ "\n   • {userID}: ID Facebook của thành viên mới"
					+ "\n   • {inviterName}: tên người thêm vào nhóm"
					+ "\n   • {inviterID}: ID Facebook người thêm"
					+ "\n   • {memberCount}: tổng số thành viên nhóm"
					+ "\n   • {boxName}: tên nhóm chat"
					+ "\n   • {multiple}: bạn || các bạn"
					+ "\n   • {session}: buổi trong ngày"
					+ "\n   {pn} file [reset]: gửi kèm file để làm tệp đính kèm chào mừng"
			},
			en: {
				body: "   {pn} [on | off]: turn on or off welcome message"
					+ "\n   {pn} text [<content> | reset]: edit welcome text or reset to default"
					+ "\n   Available shortcuts:"
					+ "\n   • {userName}: new member name"
					+ "\n   • {userNameTag}: mention new member"
					+ "\n   • {userID}: new member's Facebook UID"
					+ "\n   • {inviterName}: name of who added them"
					+ "\n   • {inviterID}: UID of who added them"
					+ "\n   • {memberCount}: total member count"
					+ "\n   • {boxName}: group chat name"
					+ "\n   • {multiple}: you || you guys"
					+ "\n   • {session}: session in day"
					+ "\n   {pn} file [reset]: attach media to welcome message"
			}
		}
	},

	langs: {
		vi: {
			status: "📌 Trạng thái chào mừng: %1\n📝 Nội dung hiện tại:\n%2",
			turnedOn: "✅ Đã bật chức năng chào mừng thành viên mới",
			turnedOff: "❌ Đã tắt chức năng chào mừng thành viên mới",
			missingContent: "Vui lòng nhập nội dung tin nhắn",
			edited: "Đã chỉnh sửa nội dung tin nhắn chào mừng của nhóm bạn thành:\n%1",
			reseted: "Đã reset nội dung tin nhắn chào mừng về mặc định",
			noFile: "Không có tệp đính kèm tin nhắn chào mừng nào để xóa",
			resetedFile: "Đã reset tệp đính kèm thành công",
			missingFile: "Hãy phản hồi tin nhắn này kèm file ảnh/video/audio",
			addedFile: "Đã thêm %1 tệp đính kèm vào tin nhắn chào mừng của nhóm bạn"
		},
		en: {
			status: "📌 Welcome Message Status: %1\n📝 Current Template:\n%2",
			turnedOn: "✅ Turned on welcome message",
			turnedOff: "❌ Turned off welcome message",
			missingContent: "Please enter welcome message content",
			edited: "Edited welcome message content of your group to:\n%1",
			reseted: "Reset welcome message content to default",
			noFile: "No file attachments to delete",
			resetedFile: "Reset file attachments successfully",
			missingFile: "Please reply to this message with image/video/audio file",
			addedFile: "Added %1 file attachment(s) to welcome message"
		}
	},

	onStart: async function ({ args, threadsData, message, event, commandName, getLang }) {
		const { threadID, senderID, body } = event;
		const threadRecord = await threadsData.get(threadID);
		const data = threadRecord?.data || {};
		const settings = threadRecord?.settings || {};

		if (!args[0]) {
			const isEnabled = settings.sendWelcomeMessage !== false;
			const currentMsg = data.welcomeMessage || "(Default template showing name, user ID, inviter, and member count)";
			return message.reply(getLang("status", isEnabled ? "ON ✅" : "OFF ❌", currentMsg));
		}

		switch (args[0].toLowerCase()) {
			case "text": {
				if (!args[1])
					return message.reply(getLang("missingContent"));
				else if (args[1] == "reset")
					delete data.welcomeMessage;
				else
					data.welcomeMessage = body.slice(body.indexOf(args[0]) + args[0].length).trim();
				await threadsData.set(threadID, {
					data
				});
				message.reply(data.welcomeMessage ? getLang("edited", data.welcomeMessage) : getLang("reseted"));
				break;
			}
			case "file": {
				if (args[1] == "reset") {
					const { welcomeAttachment } = data;
					if (!welcomeAttachment)
						return message.reply(getLang("noFile"));
					try {
						await Promise.all(data.welcomeAttachment.map(fileId => drive.deleteFile(fileId)));
						delete data.welcomeAttachment;
					}
					catch (e) { }
					await threadsData.set(threadID, {
						data
					});
					message.reply(getLang("resetedFile"));
				}
				else if (event.attachments.length == 0 && (!event.messageReply || event.messageReply.attachments.length == 0))
					return message.reply(getLang("missingFile"), (err, info) => {
						global.GoatBot.onReply.set(info.messageID, {
							messageID: info.messageID,
							author: senderID,
							commandName
						});
					});
				else {
					saveChanges(message, event, threadID, senderID, threadsData, getLang);
				}
				break;
			}
			case "on":
			case "off": {
				settings.sendWelcomeMessage = args[0].toLowerCase() == "on";
				await threadsData.set(threadID, { settings });
				message.reply(settings.sendWelcomeMessage ? getLang("turnedOn") : getLang("turnedOff"));
				break;
			}
			default:
				message.SyntaxError();
				break;
		}
	},

	onReply: async function ({ event, Reply, message, threadsData, getLang }) {
		const { threadID, senderID } = event;
		if (senderID != Reply.author)
			return;

		if (event.attachments.length == 0 && (!event.messageReply || event.messageReply.attachments.length == 0))
			return message.reply(getLang("missingFile"));
		saveChanges(message, event, threadID, senderID, threadsData, getLang);
	}
};

async function saveChanges(message, event, threadID, senderID, threadsData, getLang) {
	const { data } = await threadsData.get(threadID);
	const attachments = [...event.attachments, ...(event.messageReply?.attachments || [])].filter(item => ["photo", 'png', "animated_image", "video", "audio"].includes(item.type));
	if (!data.welcomeAttachment)
		data.welcomeAttachment = [];

	await Promise.all(attachments.map(async attachment => {
		const { url } = attachment;
		const ext = getExtFromUrl(url);
		const fileName = `${getTime()}.${ext}`;
		const infoFile = await drive.uploadFile(`setwelcome_${threadID}_${senderID}_${fileName}`, await getStreamFromURL(url));
		data.welcomeAttachment.push(infoFile.id);
	}));

	await threadsData.set(threadID, {
		data
	});
	message.reply(getLang("addedFile", attachments.length));
}
