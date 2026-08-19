const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "help",
		aliases: ["menu", "commands", "cmds", "mansu", "allcmds"],
		version: "6.0",
		author: "frnAlt",
		shortDescription: "Show all available commands and full system info",
		longDescription: "Displays a comprehensive categorized list of all commands along with system info, bot stats, and DM/Group distinction.",
		category: "system",
		guide: "{pn}help [command name | mansu | all]"
	},

	onStart: async function ({ message, args, prefix, event }) {
		const allCommands = global.FloppaBot?.commands || global.GoatBot.commands;
		const isDM = !event.isGroup || event.threadID === event.senderID;

		const emojiMap = {
			ai: "➥", "ai-image": "➥", group: "➥", system: "➥",
			fun: "➥", owner: "➥", config: "➥", economy: "➥",
			media: "➥", "18+": "➥", tools: "➥", utility: "➥",
			info: "➥", image: "➥", game: "➥", admin: "➥",
			rank: "➥", boxchat: "➥", others: "➥"
		};

		// Group commands by category
		const categories = {};
		const dmCommands = [];
		const groupOnlyCommands = [];

		const cleanCategoryName = (text) => {
			if (!text) return "others";
			return text
				.normalize("NFKD")
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, " ")
				.trim()
				.toLowerCase();
		};

		for (const [name, cmd] of allCommands) {
			const cfg = cmd.config || {};
			const cat = cleanCategoryName(cfg.category);
			if (!categories[cat]) categories[cat] = [];
			categories[cat].push(cfg.name);

			const isGroupOnly = cfg.groupOnly === true || cfg.scope === "group";
			if (isGroupOnly) {
				groupOnlyCommands.push(cfg.name);
			} else {
				dmCommands.push(cfg.name);
			}
		}

		// Single Command Details View (if args[0] is a specific command and not "mansu" / "all")
		if (args[0] && !["mansu", "all", "menu", "list"].includes(args[0].toLowerCase())) {
			const query = args[0].toLowerCase();
			const cmd =
				allCommands.get(query) ||
				[...allCommands.values()].find((c) => (c.config.aliases || []).includes(query));
			if (!cmd) return message.reply(`❌ Command "${query}" not found.`);

			const {
				name,
				version,
				author,
				guide,
				category,
				shortDescription,
				longDescription,
				aliases,
				role,
				groupOnly,
				scope
			} = cmd.config;

			const desc =
				typeof longDescription === "string"
					? longDescription
					: longDescription?.en || shortDescription?.en || shortDescription || "No description provided.";

			const usage =
				typeof guide === "string"
					? guide.replace(/{pn}/g, prefix)
					: guide?.en?.replace(/{pn}/g, prefix) || `${prefix}${name}`;

			const requiredRole = role !== undefined ? role : 0;
			const isGroupOnly = groupOnly === true || scope === "group";
			const dmStatus = isGroupOnly ? "❌ Group Only" : "✅ Yes (Usable in DM & Business Chat)";
			const icon = emojiMap[cleanCategoryName(category)] || "➥";

			return message.reply(
				`🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 🐱\n` +
				`━━━━━━━━━━━━━━━━━━━\n` +
				`${icon} Name        : ${name}\n` +
				`${icon} Category    : ${(category || "Uncategorized").toUpperCase()}\n` +
				`${icon} Description : ${desc}\n` +
				`${icon} Aliases     : ${aliases?.length ? aliases.join(", ") : "None"}\n` +
				`${icon} Usage       : ${usage}\n` +
				`${icon} Permission  : Role ${requiredRole}\n` +
				`${icon} DM Supported: ${dmStatus}\n` +
				`${icon} Author      : ${author || "Gtajisan"}\n` +
				`${icon} Version     : ${version || "1.0"}`
			);
		}

		// Full Command Menu & System Info
		const totalThreads = global.db?.allThreadData?.length || 0;
		const totalUsers = global.db?.allUserData?.length || 0;
		const uptime = global.utils?.convertTime(process.uptime() * 1000) || "Online";

		let menuMsg = `🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 (Full Command Menu) 🐱\n`;
		menuMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
		menuMsg += `👤 Developer : Gtajisan (Farhan Muh Tasim)\n`;
		menuMsg += `⚡ Prefix    : ${prefix}\n`;
		menuMsg += `📊 Mode      : ${isDM ? "Direct Message (DM)" : "Group Chat"}\n`;
		menuMsg += `⏱️ Uptime    : ${uptime}\n`;
		menuMsg += `📥 Commands  : ${allCommands.size} Total (${dmCommands.length} DM Supported)\n`;
		menuMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

		const formatCommands = (cmds) => cmds.sort().map((c) => `• ${c}`);
		const sortedCategories = Object.keys(categories).sort();

		for (const cat of sortedCategories) {
			const icon = emojiMap[cat] || "➥";
			menuMsg += `\n╭──『 ${icon} ${cat.toUpperCase()} 』\n`;
			menuMsg += `${formatCommands(categories[cat]).join("  ")}\n`;
			menuMsg += `╰───────────────◊\n`;
		}

		menuMsg += `\n💡 Type ${prefix}help [command] for specific command details.\n`;
		menuMsg += `💬 Type ${prefix}callad to contact bot developers & admins.`;

		return message.reply(menuMsg);
	}
};