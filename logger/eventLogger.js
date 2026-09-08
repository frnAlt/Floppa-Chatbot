/**
 * @author Gtajisan (Farhan Muh Tasim) & Antigravity
 * ! Floppa-Chatbot Advanced Event & Message Logging Engine
 * Provides clean, high-visibility, colorized console output with:
 * - Group Name + Thread ID (or Direct Message indication)
 * - Sender Name + Sender ID + Role Badges
 * - Standard, Advanced, and Compact display modes
 * - Formatted message content, replies, attachments, reactions, unsends, and commands
 */

const moment = require("moment-timezone");
const { colors } = require("../func/colors.js");

// Cache for resolved names to eliminate repeat lookups
const userCache = new Map();
const threadCache = new Map();

// Styling helpers (ANSI based for reliability across all terminal environments)
const c = {
	bold: text => `\x1b[1m${text}\x1b[0m`,
	dim: text => `\x1b[2m${text}\x1b[0m`,
	time: text => `\x1b[90m${text}\x1b[0m`,
	bracketCyan: text => `\x1b[36m${text}\x1b[0m`,
	bracketYellow: text => `\x1b[33m${text}\x1b[0m`,
	bracketMagenta: text => `\x1b[35m${text}\x1b[0m`,
	groupLabel: text => `\x1b[36m${text}\x1b[0m`,
	groupName: text => `\x1b[1;96m"${text}"\x1b[0m`,
	dmLabel: text => `\x1b[1;95m${text}\x1b[0m`,
	userLabel: text => `\x1b[33m${text}\x1b[0m`,
	userName: text => `\x1b[1;93m${text}\x1b[0m`,
	id: text => `\x1b[90m${text}\x1b[0m`,
	text: text => `\x1b[37m${text}\x1b[0m`,
	arrow: `\x1b[1;92m➔\x1b[0m`,
	success: text => `\x1b[32m${text}\x1b[0m`,
	error: text => `\x1b[1;91m${text}\x1b[0m`,
	cardBorder: text => `\x1b[36m${text}\x1b[0m`,
	cardBorderYellow: text => `\x1b[33m${text}\x1b[0m`,
	cardBorderRed: text => `\x1b[91m${text}\x1b[0m`,
	cardBorderMagenta: text => `\x1b[95m${text}\x1b[0m`
};

function getTimeZone() {
	return global.GoatBot?.config?.timeZone || global.FloppaBot?.config?.timeZone || "Asia/Dhaka";
}

function getTimestamp(format = "HH:mm:ss") {
	const tz = getTimeZone();
	try {
		return moment().tz(tz).format(format);
	} catch (_) {
		return moment().format(format);
	}
}

function getFullDateTime() {
	const tz = getTimeZone();
	try {
		return moment().tz(tz).format("HH:mm:ss DD/MM/YYYY");
	} catch (_) {
		return moment().format("HH:mm:ss DD/MM/YYYY");
	}
}

function getLogConfig() {
	const cfg = global.GoatBot?.config?.logEvents || global.FloppaBot?.config?.logEvents || {};
	return {
		mode: (cfg.mode || "standard").toLowerCase(), // "standard" | "advanced" | "compact" | "raw"
		disableAll: Boolean(cfg.disableAll),
		showRole: cfg.showRole !== false,
		showDirectMessage: cfg.showDirectMessage !== false,
		maxBodyLength: typeof cfg.maxBodyLength === "number" ? cfg.maxBodyLength : 250,
		message: cfg.message !== false,
		command: cfg.command !== false,
		message_reply: cfg.message_reply !== false,
		message_reaction: cfg.message_reaction !== false,
		message_unsend: cfg.message_unsend !== false,
		event: cfg.event !== false,
		read_receipt: Boolean(cfg.read_receipt),
		typ: Boolean(cfg.typ),
		presence: Boolean(cfg.presence)
	};
}

/**
 * Resolve thread name and group status
 */
function resolveThread(threadID, isGroupHint, explicitThreadName) {
	if (!threadID) {
		return { threadID: "N/A", threadName: "Unknown", isGroup: false, isDM: false };
	}

	const strID = String(threadID);

	if (explicitThreadName && explicitThreadName !== "Group Chat" && explicitThreadName !== "Direct Message") {
		threadCache.set(strID, { threadName: explicitThreadName, isGroup: Boolean(isGroupHint) });
		return {
			threadID: strID,
			threadName: explicitThreadName,
			isGroup: Boolean(isGroupHint),
			isDM: !isGroupHint
		};
	}

	if (threadCache.has(strID)) {
		const cached = threadCache.get(strID);
		if (cached.threadName && !cached.threadName.startsWith("Group ") && !cached.threadName.startsWith("User ")) {
			return { threadID: strID, threadName: cached.threadName, isGroup: cached.isGroup, isDM: !cached.isGroup };
		}
	}

	let threadData = global.db?.allThreadData?.find(t => String(t.threadID) === strID);
	let threadName = threadData?.threadName;
	let isGroup = typeof threadData?.isGroup === "boolean" ? threadData.isGroup : isGroupHint;

	if (typeof isGroup === "undefined") {
		isGroup = true;
	}

	if (!threadName) {
		if (!isGroup) {
			threadName = "Direct Message";
		} else {
			threadName = `Group ${strID}`;
		}
	}

	threadCache.set(strID, { threadName, isGroup: Boolean(isGroup) });
	return {
		threadID: strID,
		threadName,
		isGroup: Boolean(isGroup),
		isDM: !isGroup
	};
}

/**
 * Resolve user name and role badge
 */
function resolveUser(senderID, threadData, explicitUserName) {
	if (!senderID) {
		return {
			senderID: "N/A",
			senderName: "System",
			role: { id: 0, name: "Member", badge: "User" }
		};
	}

	const strID = String(senderID);

	let senderName = explicitUserName;
	if (!senderName || senderName.startsWith("User ")) {
		if (userCache.has(strID)) {
			const cachedName = userCache.get(strID);
			if (cachedName && !cachedName.startsWith("User ")) {
				senderName = cachedName;
			}
		}
	}

	if (!senderName || senderName.startsWith("User ")) {
		const uData = global.db?.allUserData?.find(u => String(u.userID) === strID);
		if (uData?.name) {
			senderName = uData.name;
		} else if (threadData?.members) {
			const m = threadData.members.find(mem => String(mem.userID) === strID);
			if (m?.name) {
				senderName = m.name;
			}
		}
	}

	if (!senderName) {
		senderName = `User ${strID}`;
	} else {
		userCache.set(strID, senderName);
	}

	// Calculate role
	const config = global.GoatBot?.config || global.FloppaBot?.config || {};
	const devUsers = (config.devUsers || []).map(String);
	const adminBot = (config.adminBot || []).map(String);
	const premiumUsers = (config.premiumUsers || []).map(String);
	const adminBox = threadData?.adminIDs ? threadData.adminIDs.map(String) : [];

	let role = { id: 0, name: "Member", badge: "User" };

	if (devUsers.includes(strID)) {
		role = { id: 4, name: "Developer", badge: "Dev" };
	} else if (adminBot.includes(strID)) {
		role = { id: 2, name: "Bot Admin", badge: "Admin" };
	} else if (premiumUsers.includes(strID)) {
		role = { id: 3, name: "Premium", badge: "Premium" };
	} else if (adminBox.includes(strID)) {
		role = { id: 1, name: "Group Admin", badge: "GrpAdmin" };
	}

	return {
		senderID: strID,
		senderName,
		role
	};
}

/**
 * Summarize attachments into human readable labels
 */
function formatAttachments(attachments) {
	if (!Array.isArray(attachments) || attachments.length === 0) return "";

	const counts = {};
	let stickerDesc = null;

	for (const att of attachments) {
		const type = att.type || "file";
		if (type === "sticker") {
			stickerDesc = att.description || att.stickerID || "Sticker";
			counts["Sticker"] = (counts["Sticker"] || 0) + 1;
		} else if (type === "photo") {
			counts["Photo"] = (counts["Photo"] || 0) + 1;
		} else if (type === "video") {
			counts["Video"] = (counts["Video"] || 0) + 1;
		} else if (type === "audio") {
			counts["Audio"] = (counts["Audio"] || 0) + 1;
		} else if (type === "animated_image") {
			counts["GIF"] = (counts["GIF"] || 0) + 1;
		} else {
			counts["File"] = (counts["File"] || 0) + 1;
		}
	}

	if (stickerDesc && counts["Sticker"] === 1 && Object.keys(counts).length === 1) {
		return `[📎 Sticker: ${stickerDesc}]`;
	}

	const parts = Object.entries(counts).map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`);
	return `[📎 ${parts.join(", ")}]`;
}

/**
 * Format group event description
 */
function formatGroupEvent(event, actorName, threadName) {
	const logType = event.logMessageType || "";
	const data = event.logMessageData || {};

	switch (logType) {
		case "log:subscribe": {
			const added = data.addedParticipants || [];
			const names = added.map(p => p.fullName || p.name || `User ${p.userFbId}`).join(", ");
			return `${actorName} added ${names || "new members"} to ${threadName}`;
		}
		case "log:unsubscribe": {
			const leftID = String(data.leftParticipantFbId || "");
			const leftName = userCache.get(leftID) || `User ${leftID}`;
			if (leftID === String(event.author || event.senderID)) {
				return `${leftName} left the group`;
			}
			return `${actorName} removed ${leftName} from ${threadName}`;
		}
		case "log:thread-name":
			return `${actorName} changed group name to "${data.name || "Untitled"}"`;
		case "log:thread-icon":
			return `${actorName} changed group icon`;
		case "log:thread-color":
			return `${actorName} changed chat theme color`;
		case "log:user-nickname": {
			const pID = String(data.participant_id || "");
			const pName = userCache.get(pID) || `User ${pID}`;
			return `${actorName} set nickname for ${pName} to "${data.nickname || "(cleared)"}"`;
		}
		case "log:thread-approval-mode":
			return `${actorName} updated member approval mode`;
		default:
			return event.logMessageBody || logType || "Group event received";
	}
}

/**
 * Format role badge with ANSI colors
 */
function getRoleBadge(role, cfg) {
	if (!cfg.showRole || !role || role.id === 0) return "";
	switch (role.id) {
		case 4: return ` \x1b[1;95m[${role.badge}]\x1b[0m`;
		case 2: return ` \x1b[1;91m[${role.badge}]\x1b[0m`;
		case 3: return ` \x1b[1;93m[${role.badge}]\x1b[0m`;
		case 1: return ` \x1b[1;96m[${role.badge}]\x1b[0m`;
		default: return ` \x1b[90m[${role.badge}]\x1b[0m`;
	}
}

/**
 * Clean & truncate body text
 */
function cleanBody(body, maxLen = 250) {
	if (!body) return "";
	let cleaned = String(body).replace(/\r?\n/g, " ↵ ");
	if (cleaned.length > maxLen) {
		cleaned = cleaned.slice(0, maxLen) + "...";
	}
	return cleaned;
}

/**
 * Build chat tag for single-line display
 */
function formatChatTag(thread) {
	if (thread.isGroup) {
		return `${c.bracketCyan("[")}${c.groupLabel("Group: ")}${c.groupName(thread.threadName)}${c.id(` | ID: ${thread.threadID}`)}${c.bracketCyan("]")}`;
	} else {
		return `${c.bracketMagenta("[")}${c.dmLabel("Direct Message")}${c.id(` | ID: ${thread.threadID}`)}${c.bracketMagenta("]")}`;
	}
}

/**
 * Build user tag for single-line display
 */
function formatUserTag(user, roleBadge) {
	return `${c.bracketYellow("[")}${c.userName(user.senderName)}${c.id(` | ID: ${user.senderID}`)}${c.bracketYellow("]")}${roleBadge}`;
}

/**
 * Main Event Logger class
 */
const eventLogger = {
	/**
	 * Log any incoming FCA event (message, reply, reaction, unsend, group event, typ, etc.)
	 */
	logEvent(event, context = {}) {
		try {
			if (!event || typeof event !== "object") return null;

			const cfg = getLogConfig();
			if (cfg.disableAll) return null;

			const type = event.type || "unknown";
			if (cfg[type] === false) return null;

			const threadID = event.threadID;
			const senderID = event.senderID || event.author || event.userID;
			const isGroupHint = typeof event.isGroup === "boolean" ? event.isGroup : (threadID && senderID ? String(threadID) !== String(senderID) : true);

			const thread = resolveThread(threadID, isGroupHint, event.threadName);
			const user = resolveUser(senderID, global.db?.allThreadData?.find(t => String(t.threadID) === String(threadID)), event.senderName);

			const timeStr = getTimestamp("HH:mm:ss");
			const fullTimeStr = getFullDateTime();
			const tz = getTimeZone();

			let displayBody = cleanBody(event.body, cfg.maxBodyLength);
			const attachStr = formatAttachments(event.attachments);
			if (attachStr) {
				displayBody = displayBody ? `${displayBody} \x1b[32m${attachStr}\x1b[0m` : `\x1b[32m${attachStr}\x1b[0m`;
			}

			const roleBadge = getRoleBadge(user.role, cfg);

			// Raw mode requested
			if (cfg.mode === "raw") {
				console.log(`\x1b[1;92m[RAW ${type.toUpperCase()}]:\x1b[0m`, JSON.stringify(event, null, 2));
				return {
					...thread,
					...user,
					displayBody: event.body || attachStr,
					timeStr
				};
			}

			// ————————————————————————— STANDARD MODE ————————————————————————— //
			if (cfg.mode === "standard") {
				const timeTag = c.time(`[${timeStr}]`);
				const chatTag = formatChatTag(thread);
				const userTag = formatUserTag(user, roleBadge);

				switch (type) {
					case "message": {
						const badge = "\x1b[1;92m[MSG]\x1b[0m";
						console.log(`${timeTag} ${badge} ${chatTag} ${userTag}: ${c.text(displayBody || "[Empty Message]")}`);
						break;
					}
					case "message_reply": {
						const badge = "\x1b[1;94m[REPLY]\x1b[0m";
						const repliedTo = event.messageReply?.senderName || (event.messageReply?.senderID ? `User ${event.messageReply.senderID}` : "message");
						console.log(`${timeTag} ${badge} ${chatTag} ${userTag} \x1b[94m↳ Replied to ${repliedTo}:\x1b[0m ${c.text(displayBody || "[Empty Reply]")}`);
						break;
					}
					case "message_reaction": {
						const badge = "\x1b[1;95m[REACT]\x1b[0m";
						const emoji = event.reaction || "❤️";
						console.log(`${timeTag} ${badge} ${chatTag} ${userTag} reacted ${emoji} on message ${c.id(event.messageID || "")}`);
						break;
					}
					case "message_unsend": {
						const badge = "\x1b[1;91m[UNSEND]\x1b[0m";
						console.log(`${timeTag} ${badge} ${chatTag} ${userTag} unsent message ${c.id(event.messageID || "")}`);
						break;
					}
					case "event": {
						const badge = `\x1b[1;96m[EVENT: ${event.logMessageType ? event.logMessageType.replace("log:", "").toUpperCase() : "GROUP"}]\x1b[0m`;
						const eventDesc = formatGroupEvent(event, user.senderName, thread.threadName);
						console.log(`${timeTag} ${badge} ${chatTag} \x1b[96m${eventDesc}\x1b[0m`);
						break;
					}
					case "typ": {
						if (cfg.typ) {
							const badge = c.time("[TYPING]");
							console.log(`${timeTag} ${badge} ${chatTag} ${user.senderName} is typing...`);
						}
						break;
					}
					case "presence": {
						if (cfg.presence) {
							const badge = c.time("[PRESENCE]");
							console.log(`${timeTag} ${badge} ${userTag} status: ${event.statuses || "active"}`);
						}
						break;
					}
					case "read_receipt": {
						if (cfg.read_receipt) {
							const badge = c.time("[READ]");
							console.log(`${timeTag} ${badge} ${chatTag} ${user.senderName} read messages up to ${event.time}`);
						}
						break;
					}
					default: {
						const badge = `\x1b[1;33m[${type.toUpperCase()}]\x1b[0m`;
						console.log(`${timeTag} ${badge} ${chatTag} ${userTag}: ${c.text(displayBody || "[No content]")}`);
						break;
					}
				}
			}

			// ————————————————————————— ADVANCED MODE ————————————————————————— //
			else if (cfg.mode === "advanced") {
				const border = c.cardBorder("─".repeat(55));
				const tag = (type || "").toUpperCase();

				switch (type) {
					case "message":
					case "message_reply": {
						const replyInfo = type === "message_reply"
							? `\n${c.cardBorder("│")} ↩️  ${c.bold("Reply To :")} ${event.messageReply?.senderName || event.messageReply?.senderID || "N/A"} (${c.id(event.messageReply?.messageID || "")})`
							: "";

						console.log(
							`${c.cardBorder(`┌── [${tag}] `)}${border}\n` +
							`${c.cardBorder("│")} 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
							`${c.cardBorder("│")} 💬 ${c.bold("Chat     :")} [${thread.isGroup ? "Group" : "DM"}] "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
							`${c.cardBorder("│")} 👤 ${c.bold("Sender   :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m${roleBadge ? ` | ${roleBadge.trim()}` : ""}${replyInfo}\n` +
							`${c.cardBorder("│")} 📄 ${c.bold("Content  :")} ${c.text(displayBody || "[No content]")}\n` +
							`${c.cardBorder("│")} 🆔 ${c.bold("MessageID:")} ${c.id(event.messageID || "N/A")}\n` +
							`${c.cardBorder("└")}${border}`
						);
						break;
					}
					case "message_reaction": {
						const rBorder = c.cardBorderMagenta("─".repeat(55));
						console.log(
							`\x1b[95m┌── [REACTION] \x1b[0m${rBorder}\n` +
							`\x1b[95m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
							`\x1b[95m│\x1b[0m 💬 ${c.bold("Chat     :")} [${thread.isGroup ? "Group" : "DM"}] "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
							`\x1b[95m│\x1b[0m 👤 ${c.bold("Sender   :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m\n` +
							`\x1b[95m│\x1b[0m 🎯 ${c.bold("Reaction :")} ${event.reaction || "❤️"} on message: ${c.id(event.messageID || "N/A")}\n` +
							`\x1b[95m└\x1b[0m${rBorder}`
						);
						break;
					}
					case "message_unsend": {
						const uBorder = c.cardBorderRed("─".repeat(55));
						console.log(
							`\x1b[91m┌── [UNSEND] \x1b[0m${uBorder}\n` +
							`\x1b[91m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
							`\x1b[91m│\x1b[0m 💬 ${c.bold("Chat     :")} [${thread.isGroup ? "Group" : "DM"}] "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
							`\x1b[91m│\x1b[0m 👤 ${c.bold("Sender   :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m\n` +
							`\x1b[91m│\x1b[0m 🗑️  ${c.bold("TargetID :")} ${c.id(event.messageID || "N/A")}\n` +
							`\x1b[91m└\x1b[0m${uBorder}`
						);
						break;
					}
					case "event": {
						const eBorder = c.cardBorder("─".repeat(55));
						const eventDesc = formatGroupEvent(event, user.senderName, thread.threadName);
						console.log(
							`\x1b[96m┌── [EVENT: ${(event.logMessageType || "GROUP").toUpperCase()}] \x1b[0m${eBorder}\n` +
							`\x1b[96m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
							`\x1b[96m│\x1b[0m 💬 ${c.bold("Chat     :")} "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
							`\x1b[96m│\x1b[0m 👤 ${c.bold("Actor    :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m\n` +
							`\x1b[96m│\x1b[0m 📢 ${c.bold("Details  :")} \x1b[96m${eventDesc}\x1b[0m\n` +
							`\x1b[96m└\x1b[0m${eBorder}`
						);
						break;
					}
					default: {
						console.log(
							`\x1b[33m┌── [${tag}] \x1b[0m${border}\n` +
							`\x1b[33m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr}\n` +
							`\x1b[33m│\x1b[0m 💬 ${c.bold("Chat     :")} "${thread.threadName}" | ID: ${thread.threadID}\n` +
							`\x1b[33m│\x1b[0m 👤 ${c.bold("Sender   :")} "${user.senderName}" | ID: ${user.senderID}\n` +
							`\x1b[33m│\x1b[0m 📄 ${c.bold("Details  :")} ${displayBody || "[No text]"}\n` +
							`\x1b[33m└\x1b[0m${border}`
						);
						break;
					}
				}
			}

			// ————————————————————————— COMPACT MODE ————————————————————————— //
			else if (cfg.mode === "compact") {
				const timeTag = c.time(`[${timeStr}]`);
				const chatName = thread.isGroup ? thread.threadName : "DM";
				switch (type) {
					case "message":
					case "message_reply":
						console.log(`${timeTag} [\x1b[36m${chatName}\x1b[0m (${c.id(thread.threadID)})] \x1b[33m${user.senderName}\x1b[0m: ${c.text(displayBody)}`);
						break;
					case "message_reaction":
						console.log(`${timeTag} [\x1b[36m${chatName}\x1b[0m] \x1b[33m${user.senderName}\x1b[0m reacted ${event.reaction}`);
						break;
					case "message_unsend":
						console.log(`${timeTag} [\x1b[36m${chatName}\x1b[0m] \x1b[33m${user.senderName}\x1b[0m unsent message`);
						break;
					case "event":
						console.log(`${timeTag} [\x1b[36m${chatName}\x1b[0m] \x1b[96m${formatGroupEvent(event, user.senderName, thread.threadName)}\x1b[0m`);
						break;
					default:
						console.log(`${timeTag} [\x1b[36m${chatName}\x1b[0m] ${type}: ${displayBody}`);
						break;
				}
			}

			return {
				threadID: thread.threadID,
				threadName: thread.threadName,
				isGroup: thread.isGroup,
				senderID: user.senderID,
				senderName: user.senderName,
				role: user.role,
				displayBody: event.body || attachStr,
				timeStr,
				fullTimeStr
			};
		} catch (err) {
			console.error("[EVENT LOGGER ERROR]:", err.message || err);
			return null;
		}
	},

	/**
	 * Log command execution
	 */
	logCommand({ commandName, userName, senderID, threadID, threadName, isGroup, args = [], duration = 0, role = 0 }) {
		try {
			const cfg = getLogConfig();
			if (cfg.disableAll || !cfg.command) return;

			const timeStr = getTimestamp("HH:mm:ss");
			const fullTimeStr = getFullDateTime();
			const tz = getTimeZone();

			const thread = resolveThread(threadID, isGroup, threadName);
			const user = resolveUser(senderID, global.db?.allThreadData?.find(t => String(t.threadID) === String(threadID)), userName);

			const roleBadge = getRoleBadge(user.role, cfg);
			const argsStr = args.length ? args.join(" ") : "";
			const speedStr = `${duration}ms`;

			if (cfg.mode === "standard") {
				const timeTag = c.time(`[${timeStr}]`);
				const badge = "\x1b[1;93m[CMD]\x1b[0m";
				const chatTag = formatChatTag(thread);
				const userTag = formatUserTag(user, roleBadge);

				console.log(`${timeTag} ${badge} ${chatTag} ${userTag} ${c.arrow} \x1b[1;37m${commandName}\x1b[0m${argsStr ? ` ${c.id(argsStr)}` : ""} ${c.success(`(${speedStr})`)}`);
			} else if (cfg.mode === "advanced") {
				const border = c.cardBorderYellow("─".repeat(55));
				console.log(
					`\x1b[1;93m┌── [COMMAND: ${commandName.toUpperCase()}] \x1b[0m${border}\n` +
					`\x1b[1;93m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
					`\x1b[1;93m│\x1b[0m 💬 ${c.bold("Chat     :")} [${thread.isGroup ? "Group" : "DM"}] "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
					`\x1b[1;93m│\x1b[0m 👤 ${c.bold("Caller   :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m${roleBadge ? ` | ${roleBadge.trim()}` : ""}\n` +
					`\x1b[1;93m│\x1b[0m ⚡ ${c.bold("Command  :")} ${commandName}${argsStr ? ` ${argsStr}` : ""}\n` +
					`\x1b[1;93m│\x1b[0m ⏱️  ${c.bold("Latency  :")} ${c.success(speedStr)} | \x1b[1;92mStatus: SUCCESS\x1b[0m\n` +
					`\x1b[1;93m└\x1b[0m${border}`
				);
			} else if (cfg.mode === "compact") {
				console.log(`${c.time(`[${timeStr}]`)} [CMD] [\x1b[36m${thread.threadName}\x1b[0m] \x1b[33m${user.senderName}\x1b[0m ➔ ${commandName} ${argsStr} (${speedStr})`);
			}
		} catch (e) {
			console.error("[COMMAND LOGGER ERROR]:", e.message || e);
		}
	},

	/**
	 * Log command failure / error
	 */
	logCommandError({ commandName, userName, senderID, threadID, threadName, isGroup, error, duration = 0, role = 0 }) {
		try {
			const cfg = getLogConfig();
			if (cfg.disableAll) return;

			const timeStr = getTimestamp("HH:mm:ss");
			const fullTimeStr = getFullDateTime();
			const tz = getTimeZone();

			const thread = resolveThread(threadID, isGroup, threadName);
			const user = resolveUser(senderID, global.db?.allThreadData?.find(t => String(t.threadID) === String(threadID)), userName);
			const errMsg = (error?.message || error?.stack || error || "Unknown Error").split("\n")[0];

			if (cfg.mode === "standard" || cfg.mode === "compact") {
				const timeTag = c.time(`[${timeStr}]`);
				const badge = "\x1b[1;91m[CMD:ERR]\x1b[0m";
				const chatTag = formatChatTag(thread);
				const userTag = formatUserTag(user, "");

				console.log(`${timeTag} ${badge} ${chatTag} ${userTag} ➔ \x1b[1;37m${commandName}\x1b[0m: ${c.error(errMsg)} (${duration}ms)`);
			} else if (cfg.mode === "advanced") {
				const border = c.cardBorderRed("─".repeat(55));
				console.log(
					`\x1b[91m┌── [COMMAND ERROR: ${commandName.toUpperCase()}] \x1b[0m${border}\n` +
					`\x1b[91m│\x1b[0m 🕒 ${c.bold("Time     :")} ${fullTimeStr} (${tz})\n` +
					`\x1b[91m│\x1b[0m 💬 ${c.bold("Chat     :")} "${thread.threadName}" | ID: \x1b[36m${thread.threadID}\x1b[0m\n` +
					`\x1b[91m│\x1b[0m 👤 ${c.bold("Caller   :")} "${user.senderName}" | ID: \x1b[33m${user.senderID}\x1b[0m\n` +
					`\x1b[91m│\x1b[0m ❌ ${c.bold("Error    :")} ${c.error(errMsg)}\n` +
					`\x1b[91m│\x1b[0m ⏱️  ${c.bold("Latency  :")} ${duration}ms\n` +
					`\x1b[91m└\x1b[0m${border}`
				);
			}
		} catch (_) {}
	},

	/**
	 * Log onChat triggers
	 */
	logOnChat({ commandName, userName, senderID, threadID, threadName, isGroup, args = [] }) {
		const cfg = getLogConfig();
		if (cfg.disableAll || !cfg.command) return;
		const thread = resolveThread(threadID, isGroup, threadName);
		const user = resolveUser(senderID, null, userName);
		const timeTag = c.time(`[${getTimestamp("HH:mm:ss")}]`);
		console.log(`${timeTag} \x1b[1;36m[ONCHAT]\x1b[0m [Group: "${c.bold(thread.threadName)}" | ID: ${c.id(thread.threadID)}] [\x1b[33m${user.senderName}\x1b[0m] ➔ ${commandName} ${c.id(args.join(" "))}`);
	},

	/**
	 * Log onReply triggers
	 */
	logOnReply({ commandName, userName, senderID, threadID, threadName, isGroup, args = [] }) {
		const cfg = getLogConfig();
		if (cfg.disableAll || !cfg.message_reply) return;
		const thread = resolveThread(threadID, isGroup, threadName);
		const user = resolveUser(senderID, null, userName);
		const timeTag = c.time(`[${getTimestamp("HH:mm:ss")}]`);
		console.log(`${timeTag} \x1b[1;94m[ONREPLY]\x1b[0m [Group: "${c.bold(thread.threadName)}" | ID: ${c.id(thread.threadID)}] [\x1b[33m${user.senderName}\x1b[0m] ➔ ${commandName} ${c.id(args.join(" "))}`);
	},

	/**
	 * Log onReaction triggers
	 */
	logOnReaction({ commandName, userName, senderID, threadID, threadName, isGroup, reaction }) {
		const cfg = getLogConfig();
		if (cfg.disableAll || !cfg.message_reaction) return;
		const thread = resolveThread(threadID, isGroup, threadName);
		const user = resolveUser(senderID, null, userName);
		const timeTag = c.time(`[${getTimestamp("HH:mm:ss")}]`);
		console.log(`${timeTag} \x1b[1;95m[ONREACT]\x1b[0m [Group: "${c.bold(thread.threadName)}" | ID: ${c.id(thread.threadID)}] [\x1b[33m${user.senderName}\x1b[0m] reacted ${reaction || "❤️"} ➔ ${commandName}`);
	},

	/**
	 * Log onEvent triggers
	 */
	logEventCommand({ commandName, userName, senderID, threadID, threadName, isGroup }) {
		const cfg = getLogConfig();
		if (cfg.disableAll || !cfg.event) return;
		const thread = resolveThread(threadID, isGroup, threadName);
		const user = resolveUser(senderID, null, userName);
		const timeTag = c.time(`[${getTimestamp("HH:mm:ss")}]`);
		console.log(`${timeTag} \x1b[1;96m[EVENT_CMD]\x1b[0m [Group: "${c.bold(thread.threadName)}" | ID: ${c.id(thread.threadID)}] [\x1b[33m${user.senderName}\x1b[0m] ➔ ${commandName}`);
	},

	/**
	 * Get current mode
	 */
	getMode() {
		return getLogConfig().mode;
	},

	/**
	 * Change log mode on the fly
	 */
	setMode(newMode) {
		const valid = ["standard", "advanced", "compact", "raw"];
		if (!valid.includes(newMode)) return false;
		if (!global.GoatBot.config.logEvents) global.GoatBot.config.logEvents = {};
		global.GoatBot.config.logEvents.mode = newMode;
		return true;
	}
};

module.exports = eventLogger;
