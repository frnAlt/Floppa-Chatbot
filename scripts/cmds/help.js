const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "help",
		aliases: ["menu", "commands", "cmds"],
		version: "5.5",
		author: "Gtajisan (Farhan Muh Tasim)",
		shortDescription: "Show all available commands (Categorized, DM & Group aware)",
		longDescription: "Displays a clean, categorized list of commands with Direct Message (DM) and Group chat distinction.",
		category: "system",
		guide: "{pn}help [command name]"
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

		// Single Command Details View
		if (args[0]) {
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

		const formatCommands = (cmds) => cmds.sort().map((c) => `• ${c}`);

		if (isDM) {
			// DM / Business Account Chat Layout
			let dmMsg = `💬 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 (Business DM Mode)\n`;
			dmMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
			dmMsg += `Direct Message Support Active!\n\n`;

			const sortedCategories = Object.keys(categories).sort();
			for (const cat of sortedCategories) {
				const icon = emojiMap[cat] || "➥";
				const catCmds = categories[cat].filter(c => !groupOnlyCommands.includes(c));
				if (catCmds.length > 0) {
					dmMsg += `╭──『 ${icon} ${cat.toUpperCase()} 』\n`;
					dmMsg += `${formatCommands(catCmds).join("  ")}\n`;
					dmMsg += `╰───────────────◊\n\n`;
				}
			}

			if (groupOnlyCommands.length > 0) {
				dmMsg += `👥 𝗚𝗥𝗢𝗨𝗣-𝗢𝗡𝗟𝗬 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:\n`;
				dmMsg += `${groupOnlyCommands.sort().map(c => `• ${c}`).join(", ")}\n\n`;
			}

			dmMsg += `💡 Type ${prefix}help [command] for details.`;
			return message.reply(dmMsg);
		} else {
			// Group Chat Layout
			let groupMsg = `🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 (Group Mode)\n`;
			groupMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

			const sortedCategories = Object.keys(categories).sort();
			for (const cat of sortedCategories) {
				const icon = emojiMap[cat] || "➥";
				groupMsg += `\n╭──『 ${icon} ${cat.toUpperCase()} 』\n`;
				groupMsg += `${formatCommands(categories[cat]).join("  ")}\n`;
				groupMsg += `╰───────────────◊\n`;
			}

			groupMsg += `\n📥 Total Commands: ${allCommands.size} (${dmCommands.length} DM Supported)\n`;
			groupMsg += `➥ Use: ${prefix}help [command] for details\n`;
			groupMsg += `➥ Use: ${prefix}callad to contact bot admins`;

			return message.reply(groupMsg);
		}
	}
};