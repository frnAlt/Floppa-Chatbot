const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "help",
		aliases: ["menu", "commands", "cmds"],
		version: "5.0",
		author: "Gtajisan (Farhan Muh Tasim)",
		shortDescription: "Show all available commands (DM & Group aware)",
		longDescription: "Displays a clean, categorized list of commands with Direct Message (DM) and Group chat distinction.",
		category: "system",
		guide: "{pn}help [command name]"
	},

	onStart: async function ({ message, args, prefix, event }) {
		const allCommands = global.FloppaBot?.commands || global.GoatBot.commands;
		const isDM = !event.isGroup || event.threadID === event.senderID;

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

			return message.reply(
				`🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 🐱\n` +
				`━━━━━━━━━━━━━━━━━━━\n` +
				`➥ Name        : ${name}\n` +
				`➥ Category    : ${(category || "Uncategorized").toUpperCase()}\n` +
				`➥ Description : ${desc}\n` +
				`➥ Aliases     : ${aliases?.length ? aliases.join(", ") : "None"}\n` +
				`➥ Usage       : ${usage}\n` +
				`➥ Permission  : Role ${requiredRole}\n` +
				`➥ DM Supported: ${dmStatus}\n` +
				`➥ Author      : ${author || "Floppa Engine"}\n` +
				`➥ Version     : ${version || "1.0"}`
			);
		}

		// List View — DM Chat vs Group Chat
		const formatCommands = (cmds) => cmds.sort().map((c) => `• ${c}`);

		if (isDM) {
			// DM / Business Account Chat Layout
			let dmMsg = `💬 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 (Business DM Mode)\n`;
			dmMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
			dmMsg += `Welcome to Direct Message Support! Here are commands available in 1-on-1 & Business DM:\n\n`;

			dmMsg += `📥 𝗗𝗜𝗥𝗘𝗖𝗧 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 (𝗗𝗠) 𝗦𝗨𝗣𝗣𝗢𝗥𝗧𝗘𝗗 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:\n`;
			dmMsg += `${dmCommands.sort().map(c => `• ${prefix}${c}`).join("\n")}\n\n`;

			if (groupOnlyCommands.length > 0) {
				dmMsg += `👥 𝗚𝗥𝗢𝗨𝗣-𝗢𝗡𝗟𝗬 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 (Requires Group Chat):\n`;
				dmMsg += `${groupOnlyCommands.sort().map(c => `• ${c}`).join(", ")}\n\n`;
			}

			dmMsg += `💡 Type ${prefix}help [command] for detailed usage info.`;
			return message.reply(dmMsg);
		} else {
			// Group Chat Layout
			let groupMsg = `🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 (Group Mode)\n`;
			groupMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

			const sortedCategories = Object.keys(categories).sort();
			for (const cat of sortedCategories) {
				groupMsg += `\n╭──『 ${cat.toUpperCase()} 』\n`;
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