const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

const doNotDelete = "[ 🐱 | Floppa Chatbot Engine ]";
/**
* @author frnAlt
* ! Floppa-Chatbot Help & Command Navigation Engine
* ! Dual-mode: Category unicode framing (Insta-Bot style) & Paginated list navigation
*/

function visualWidth(text) {
	let width = 0;
	for (const ch of String(text)) {
		const cp = ch.codePointAt(0);
		if (cp === 0xfe0f || cp === 0x200d)
			continue;
		if (cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf) || (cp >= 0x2b00 && cp <= 0x2bff))
			width += 2;
		else
			width += 1;
	}
	return width;
}

function checkLangObject(data, langCode) {
	if (typeof data === "string")
		return data;
	if (typeof data === "object" && data !== null && !Array.isArray(data))
		return data[langCode] || data.en || Object.values(data).find(v => typeof v === "string") || undefined;
	return undefined;
}

function cropContent(content, max) {
	if (content && content.length > max) {
		content = content.slice(0, max - 3) + "...";
	}
	return content || "";
}

module.exports = {
	config: {
		name: "help",
		version: "7.2.0",
		author: "frnAlt",
		countDown: 3,
		role: 0,
		description: {
			en: "View command usage, paginated lists, and category guides"
		},
		category: "info",
		aliases: ["menu", "commands", "cmds", "allcmds", "guide"],
		guide: {
			en: "{pn}: show every command grouped by category"
				+ "\n   {pn} <page number>: show paginated command list (e.g. {pn} 2)"
				+ "\n   {pn} <command name> [-u | usage | -g | guide]: only show command usage"
				+ "\n   {pn} <command name> [-i | info]: only show command info"
				+ "\n   {pn} <command name> [-r | role]: only show command role"
				+ "\n   {pn} <command name> [-a | alias]: only show command alias"
				+ "\n   {pn} cat <category>: show commands in a specific category"
				+ "\n   {pn} all: show category overview"
		},
		priority: 1
	},

	langs: {
		en: {
			header: "☠️ FLOPPA AI ☠️",
			summary: "%1 commands in %2 categories",
			categoryHeader: "╭─『 %1 』",
			categoryFooter: "╰───────────────♢",
			commandLine: "│ %1",
			joiner: " • ",
			noCommands: "No commands in this category",
			tip: "Type %1help <command name> to view its details",
			total: "Total Commands: %1",
			footerTip: "Type: %1help <command> for details",
			commandNotFound: "Command \"%1\" does not exist. Type %2help to view available commands.",
			getInfoCommand: "╭── NAME ────⭓"
				+ "\n│ %1"
				+ "\n├── INFO"
				+ "\n│ Description: %2"
				+ "\n│ Other names: %3"
				+ "\n│ Other names in your group: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Time per command: %7s"
				+ "\n│ Author: %8"
				+ "\n├── USAGE"
				+ "\n│%9"
				+ "\n├── NOTES"
				+ "\n│ The content inside <XXXXX> can be changed"
				+ "\n│ The content inside [a|b|c] is a or b or c"
				+ "\n╰──────⭔",
			onlyInfo: "╭── INFO ────⭓"
				+ "\n│ Command name: %1"
				+ "\n│ Description: %2"
				+ "\n│ Other names: %3"
				+ "\n│ Other names in your group: %4"
				+ "\n│ Version: %5"
				+ "\n│ Role: %6"
				+ "\n│ Time per command: %7s"
				+ "\n│ Author: %8"
				+ "\n╰─────────────⭓",
			onlyUsage: "╭── USAGE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			onlyAlias: "╭── ALIAS ────⭓"
				+ "\n│ Other names: %1"
				+ "\n│ Other names in your group: %2"
				+ "\n╰─────────────⭓",
			onlyRole: "╭── ROLE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			doNotHave: "Do not have",
			roleText0: "0 (All users)",
			roleText1: "1 (Group administrators)",
			roleText2: "2 (Admin bot)",
			roleText3: "3 (Premium users)",
			roleText4: "4 (Bot Developers)",
			roleText0setRole: "0 (set role, all users)",
			roleText1setRole: "1 (set role, group administrators)"
		},
		vi: {
			header: "☠️ FLOPPA AI ☠️",
			summary: "%1 lệnh trong %2 nhóm",
			categoryHeader: "╭─『 %1 』",
			categoryFooter: "╰───────────────♢",
			commandLine: "│ %1",
			joiner: " • ",
			noCommands: "Không có lệnh nào trong nhóm này",
			tip: "Nhập %1help <tên lệnh> để xem chi tiết",
			total: "Tổng số lệnh: %1",
			footerTip: "Nhập: %1help <tên lệnh> để xem chi tiết",
			commandNotFound: "Lệnh \"%1\" không tồn tại. Nhập %2help để xem các lệnh khả dụng.",
			getInfoCommand: "╭── NAME ────⭓"
				+ "\n│ %1"
				+ "\n├── INFO"
				+ "\n│ Mô tả: %2"
				+ "\n│ Tên khác: %3"
				+ "\n│ Tên khác trong nhóm bạn: %4"
				+ "\n│ Phiên bản: %5"
				+ "\n│ Quyền hạn: %6"
				+ "\n│ Thời gian chờ: %7s"
				+ "\n│ Tác giả: %8"
				+ "\n├── USAGE"
				+ "\n│%9"
				+ "\n├── NOTES"
				+ "\n│ Nội dung bên trong <XXXXX> có thể thay đổi"
				+ "\n│ Nội dung bên trong [a|b|c] là a hoặc b hoặc c"
				+ "\n╰──────⭔",
			onlyInfo: "╭── INFO ────⭓"
				+ "\n│ Tên lệnh: %1"
				+ "\n│ Mô tả: %2"
				+ "\n│ Tên khác: %3"
				+ "\n│ Tên khác trong nhóm bạn: %4"
				+ "\n│ Phiên bản: %5"
				+ "\n│ Quyền hạn: %6"
				+ "\n│ Thời gian chờ: %7s"
				+ "\n│ Tác giả: %8"
				+ "\n╰─────────────⭓",
			onlyUsage: "╭── USAGE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			onlyAlias: "╭── ALIAS ────⭓"
				+ "\n│ Tên khác: %1"
				+ "\n│ Tên khác trong nhóm bạn: %2"
				+ "\n╰─────────────⭓",
			onlyRole: "╭── ROLE ────⭓"
				+ "\n│%1"
				+ "\n╰─────────────⭓",
			doNotHave: "Không có",
			roleText0: "0 (Tất cả người dùng)",
			roleText1: "1 (Quản trị viên nhóm)",
			roleText2: "2 (Admin bot)",
			roleText3: "3 (Người dùng Premium)",
			roleText4: "4 (Nhà phát triển bot)",
			roleText0setRole: "0 (đặt role, tất cả người dùng)",
			roleText1setRole: "1 (đặt role, quản trị viên nhóm)"
		}
	},

	onStart: async function ({ message, args, event, threadsData, getLang, role, globalData, prefix: passedPrefix }) {
		let langCode = "en";
		try {
			langCode = (await threadsData?.get?.(event.threadID, "data.lang")) || global.GoatBot?.config?.language || global.FloppaBot?.config?.language || "en";
		} catch {
			langCode = global.GoatBot?.config?.language || global.FloppaBot?.config?.language || "en";
		}

		let customLang = {};
		const pathCustomLang = path.normalize(`${process.cwd()}/languages/cmds/${langCode}.js`);
		if (fs.existsSync(pathCustomLang)) {
			try {
				customLang = require(pathCustomLang);
			} catch (err) {
				customLang = {};
			}
		}

		const fallbackLang = (key, ...val) => {
			let str = module.exports.langs?.[langCode]?.[key] || module.exports.langs?.en?.[key] || key;
			for (let i = val.length - 1; i >= 0; i--) {
				str = str.replace(new RegExp(`%${i + 1}`, "g"), val[i]);
			}
			return str;
		};

		const _getLang = typeof getLang === "function"
			? (key, ...val) => {
				const res = getLang(key, ...val);
				if (typeof res === "string" && res.startsWith("❌ Can't find text")) {
					return fallbackLang(key, ...val);
				}
				return res || fallbackLang(key, ...val);
			}
			: fallbackLang;

		const { threadID } = event;
		let threadData = {};
		try {
			threadData = (await threadsData?.get?.(threadID)) || {};
		} catch {
			threadData = {};
		}

		const getPrefix = global.utils?.getPrefix;
		const prefix = passedPrefix || (getPrefix ? getPrefix(threadID) : null) || global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "!";

		const commands = global.GoatBot?.commands || global.FloppaBot?.commands || new Map();
		const aliases = global.GoatBot?.aliases || global.FloppaBot?.aliases || new Map();

		// Parse argument
		const arg0 = (args[0] || "").toLowerCase();

		// Check if lookup is for a specific command
		let command = commands.get(arg0) || commands.get(aliases.get(arg0));
		const aliasesData = threadData?.data?.aliases || {};

		if (!command && arg0) {
			for (const cmdName in aliasesData) {
				if (Array.isArray(aliasesData[cmdName]) && aliasesData[cmdName].includes(arg0)) {
					command = commands.get(cmdName);
					break;
				}
			}
		}

		if (!command && arg0 && globalData?.get) {
			try {
				const globalAliasesData = await globalData.get('setalias', 'data', []);
				if (Array.isArray(globalAliasesData)) {
					for (const item of globalAliasesData) {
						if (item?.aliases && Array.isArray(item.aliases) && item.aliases.includes(arg0)) {
							command = commands.get(item.commandName);
							break;
						}
					}
				}
			} catch (_) {}
		}

		// ─── CASE 1: SPECIFIC COMMAND LOOKUP (Full Details Card or Subcommand Flags) ───
		if (command) {
			const formSendMessage = {};
			const configCommand = command.config || command.meta || {};

			let guide = (typeof configCommand.guide === "string" || (typeof configCommand.guide === "object" && !Array.isArray(configCommand.guide) && (configCommand.guide[langCode] || configCommand.guide.en || configCommand.guide.body)))
				? (typeof configCommand.guide === "string" ? configCommand.guide : (configCommand.guide[langCode] || configCommand.guide.en || configCommand.guide))
				: undefined;

			if (guide == undefined) {
				guide = typeof customLang[configCommand.name]?.guide === "string"
					? customLang[configCommand.name]?.guide
					: (customLang[configCommand.name]?.guide?.[langCode] || customLang[configCommand.name]?.guide?.["en"]);
			}

			if (guide == undefined && configCommand.usage) {
				guide = typeof configCommand.usage === "string" ? configCommand.usage : (configCommand.usage[langCode] || configCommand.usage.en);
			}

			guide = guide || {
				body: `${prefix}${configCommand.name}`
			};
			if (typeof guide === "string")
				guide = { body: guide };

			const guideBody = (guide.body || `${prefix}${configCommand.name}`)
				.replace(/\{pn\}/g, prefix + configCommand.name)
				.replace(/\{p\}\{n\}/g, prefix + configCommand.name)
				.replace(/\{prefix\}\{name\}/g, prefix + configCommand.name)
				.replace(/\{prefix\}|\{p\}/g, prefix)
				.replace(/\{name\}|\{n\}/g, configCommand.name);

			const aliasesString = (configCommand.aliases && configCommand.aliases.length > 0) ? configCommand.aliases.join(", ") : _getLang("doNotHave");
			const aliasesThisGroup = (threadData?.data?.aliases?.[configCommand.name] && threadData.data.aliases[configCommand.name].length > 0)
				? threadData.data.aliases[configCommand.name].join(", ")
				: _getLang("doNotHave");

			let roleOfCommand = configCommand.role !== undefined ? configCommand.role : (configCommand.hasPermission || 0);
			let roleIsSet = false;
			if (threadData?.data?.setRole?.[configCommand.name] !== undefined) {
				roleOfCommand = threadData.data.setRole[configCommand.name];
				roleIsSet = true;
			}

			const roleText = roleOfCommand == 0 ?
				(roleIsSet ? _getLang("roleText0setRole") : _getLang("roleText0")) :
				roleOfCommand == 1 ?
					(roleIsSet ? _getLang("roleText1setRole") : _getLang("roleText1")) :
					roleOfCommand == 3 ?
						_getLang("roleText3") :
						roleOfCommand == 4 ?
							_getLang("roleText4") :
							_getLang("roleText2");

			const author = configCommand.author || "frnAlt";
			const descriptionCustomLang = customLang[configCommand.name]?.description;
			let description = checkLangObject(configCommand.description, langCode)
				|| checkLangObject(configCommand.shortDescription, langCode)
				|| checkLangObject(configCommand.longDescription, langCode);

			if (description == undefined) {
				if (descriptionCustomLang != undefined)
					description = checkLangObject(descriptionCustomLang, langCode);
				else
					description = _getLang("doNotHave");
			}

			let sendWithAttachment = false;

			if (args[1]?.match(/^(-g|guide|-u|usage)$/i)) {
				formSendMessage.body = _getLang("onlyUsage", guideBody.split("\n").join("\n│"));
				sendWithAttachment = true;
			}
			else if (args[1]?.match(/^(-a|alias|aliase|aliases)$/i)) {
				formSendMessage.body = _getLang("onlyAlias", aliasesString, aliasesThisGroup);
			}
			else if (args[1]?.match(/^(-r|role)$/i)) {
				formSendMessage.body = _getLang("onlyRole", roleText);
			}
			else if (args[1]?.match(/^(-i|info)$/i)) {
				formSendMessage.body = _getLang(
					"onlyInfo",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version || "1.0.0",
					roleText,
					configCommand.countDown || 1,
					author
				);
			}
			else {
				formSendMessage.body = _getLang(
					"getInfoCommand",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version || "1.0.0",
					roleText,
					configCommand.countDown || 1,
					author,
					guideBody.split("\n").join("\n│")
				);
				sendWithAttachment = true;
			}

			if (sendWithAttachment && guide.attachment) {
				if (typeof guide.attachment === "object" && !Array.isArray(guide.attachment)) {
					const promises = [];
					formSendMessage.attachment = [];

					for (const keyPathFile in guide.attachment) {
						const pathFile = path.normalize(keyPathFile);

						if (!fs.existsSync(pathFile)) {
							const cutDirPath = path.dirname(pathFile);
							fs.ensureDirSync(cutDirPath);

							const getFilePromise = axios.get(guide.attachment[keyPathFile], { responseType: 'arraybuffer', timeout: 10000 })
								.then(response => {
									fs.writeFileSync(pathFile, Buffer.from(response.data));
								})
								.catch(() => {});

							promises.push({
								pathFile,
								getFilePromise
							});
						}
						else {
							promises.push({
								pathFile,
								getFilePromise: Promise.resolve()
							});
						}
					}

					await Promise.all(promises.map(item => item.getFilePromise));
					for (const item of promises) {
						if (fs.existsSync(item.pathFile)) {
							formSendMessage.attachment.push(fs.createReadStream(item.pathFile));
						}
					}
				}
			}

			return message.reply(formSendMessage);
		}

		// Gather available commands based on user permissions
		const categories = new Map();
		const allAvailableCmds = [];

		for (const [name, value] of commands) {
			const cmdRole = value?.config?.role !== undefined ? value.config.role : (value?.config?.hasPermission || 0);
			if (cmdRole > 1 && (role || 0) < cmdRole)
				continue;

			const category = (value?.config?.category || "NO CATEGORY").toLowerCase();
			const descriptionCustomLang = customLang[name]?.description;
			let description;
			if (descriptionCustomLang != undefined)
				description = checkLangObject(descriptionCustomLang, langCode);
			else if (value?.config?.description || value?.config?.shortDescription)
				description = checkLangObject(value?.config?.description, langCode) || checkLangObject(value?.config?.shortDescription, langCode);

			if (description)
				description = cropContent(description.charAt(0).toUpperCase() + description.slice(1), 46);
			else
				description = "—";

			const cmdObj = {
				name,
				description,
				category,
				priority: value?.priority || value?.config?.priority || 0
			};

			allAvailableCmds.push(cmdObj);

			if (!categories.has(category))
				categories.set(category, []);
			categories.get(category).push(cmdObj);
		}

		allAvailableCmds.sort((a, b) => a.name.localeCompare(b.name));

		const sortedCategories = [...categories.entries()]
			.map(([category, list]) => {
				list.sort((a, b) => a.name.localeCompare(b.name));
				return { category, list };
			})
			.sort((a, b) => a.category.localeCompare(b.category));

		// ─── CASE 2: CATEGORY SUMMARY OVERVIEW (all / categories) ───
		if (arg0 === "all" || arg0 === "categories") {
			let summary = `╭─── [ 🐱 FLOPPA CATEGORIES ] ───╮\n`;
			summary += `│ 👤 Author   : frnAlt\n`;
			summary += `│ 📦 Total    : ${allAvailableCmds.length} Commands across ${sortedCategories.length} Categories\n`;
			summary += `╰───────────────────────────────╯\n\n`;

			for (const { category, list } of sortedCategories) {
				summary += `• ${category.toUpperCase()} (${list.length} cmds)\n`;
			}
			summary += `\n💡 Type ${prefix}help cat <category> to view commands in a specific category.\n`;
			summary += `💡 Type ${prefix}help <command> to view detailed usage guide.`;
			return message.reply(summary);
		}

		// ─── CASE 3: CATEGORY FILTER VIA 'cat <category>' or '<category>' ───
		let targetCat = null;
		if (["cat", "category"].includes(arg0) && args[1]) {
			targetCat = args[1].toLowerCase();
		} else if (categories.has(arg0)) {
			targetCat = arg0;
		}

		if (targetCat) {
			const list = categories.get(targetCat);
			if (list) {
				list.sort((a, b) => a.name.localeCompare(b.name));
				const lines = [];
				lines.push(_getLang("categoryHeader", targetCat.toUpperCase()));
				lines.push(_getLang("commandLine", list.map(item => item.name).join(_getLang("joiner"))));
				lines.push(_getLang("categoryFooter"));
				lines.push("");
				lines.push(_getLang("total", list.length));
				lines.push(_getLang("footerTip", prefix));
				return message.reply(lines.join("\n"));
			}
		}

		// ─── CASE 4: PAGINATED COMMAND LIST VIA EXPLICIT PAGE (e.g. !help 2 or !help page 2) ───
		const isPageArg = (arg0 === "page" && !isNaN(args[1])) || (!isNaN(arg0) && parseInt(arg0) > 1);
		if (isPageArg) {
			const perPage = 15;
			const totalPages = Math.ceil(allAvailableCmds.length / perPage) || 1;
			let page = parseInt(arg0 === "page" ? args[1] : arg0) || 1;
			if (page < 1) page = 1;
			if (page > totalPages) page = totalPages;

			const startIndex = (page - 1) * perPage;
			const pageCommands = allAvailableCmds.slice(startIndex, startIndex + perPage);

			let msg = `╭─── [ 🐱 FLOPPA-CHATBOT MENU ] ───╮\n`;
			msg += `│ 👤 Author   : frnAlt\n`;
			msg += `│ ⚡ Prefix   : ${prefix}\n`;
			msg += `│ 📄 Page     : [ ${page} / ${totalPages} ]\n`;
			msg += `│ 📦 Total    : ${allAvailableCmds.length} Commands\n`;
			msg += `╰───────────────────────────────╯\n\n`;
			msg += `╭──『 📋 COMMANDS LIST 』\n`;

			pageCommands.forEach((cmd, idx) => {
				const num = startIndex + idx + 1;
				const descShort = cmd.description.length > 40 ? cmd.description.slice(0, 37) + "..." : cmd.description;
				msg += `│ ${num}. ➥ ${cmd.name} - ${descShort}\n`;
			});

			msg += `╰───────────────────────────────◊\n\n`;
			msg += `💡 Navigation:\n`;
			msg += `• Reply with a page number (1-${totalPages}) to switch pages\n`;
			msg += `• Reply with command name to inspect full usage & guide\n`;
			msg += `• Use ${prefix}help <command> for complete guide`;

			return message.reply(msg, (err, info) => {
				if (!err && info?.messageID && global.GoatBot?.onReply) {
					global.GoatBot.onReply.set(info.messageID, {
						commandName: module.exports.config.name,
						messageID: info.messageID,
						author: event.senderID,
						page,
						totalPages
					});
				}
			});
		}

		// ─── CASE 5: COMMAND NOT FOUND (User supplied an invalid command name) ───
		if (args[0] && isNaN(args[0])) {
			return message.reply(_getLang("commandNotFound", args[0], prefix));
		}

		// ─── CASE 6: DEFAULT CATEGORY BOX OVERVIEW (!help or !help 1) ───
		let total = 0;
		const lines = [];
		const header = _getLang("header");
		const boxWidth = visualWidth(_getLang("categoryFooter"));
		const pad = Math.max(0, Math.floor((boxWidth - visualWidth(header)) / 2));
		lines.push(" ".repeat(pad) + header);

		for (const { category, list } of sortedCategories) {
			total += list.length;
			lines.push("");
			lines.push(_getLang("categoryHeader", category.toUpperCase()));
			lines.push(_getLang("commandLine", list.map(item => item.name).join(_getLang("joiner"))));
			lines.push(_getLang("categoryFooter"));
		}

		lines.push("");
		lines.push(_getLang("total", total));
		lines.push(_getLang("footerTip", prefix));

		return message.reply(lines.join("\n"), (err, info) => {
			if (!err && info?.messageID && global.GoatBot?.onReply) {
				global.GoatBot.onReply.set(info.messageID, {
					commandName: module.exports.config.name,
					messageID: info.messageID,
					author: event.senderID
				});
			}
		});
	},

	onReply: async function ({ message, event, Reply, getLang, role, threadsData, globalData, prefix }) {
		if (Reply.author && event.senderID !== Reply.author)
			return;

		const input = (event.body || "").trim();
		if (!input || /^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(input))
			return;

		const replyArgs = input.split(/\s+/);
		const commandName = (replyArgs[0] || "").toLowerCase();
		const commands = global.GoatBot?.commands || global.FloppaBot?.commands || new Map();
		const aliases = global.GoatBot?.aliases || global.FloppaBot?.aliases || new Map();
		const command = commands.get(commandName) || commands.get(aliases.get(commandName));

		// If user replied with a valid command name, show its details
		if (command) {
			if (typeof Reply.delete === "function") Reply.delete();
			return module.exports.onStart({
				message,
				args: replyArgs,
				event,
				threadsData,
				getLang,
				role,
				globalData,
				prefix
			});
		}

		// If user replied with a page number, switch to that page
		const pageMatch = input.match(/^(?:page\s*)?(\d+)$/i);
		if (pageMatch) {
			if (typeof Reply.delete === "function") Reply.delete();
			return module.exports.onStart({
				message,
				args: [pageMatch[1]],
				event,
				threadsData,
				getLang,
				role,
				globalData,
				prefix
			});
		}
	}
};
