/**
 * @author frnAlt
 * ! Floppa-Chatbot Help & Command Navigation Engine
 * ! Paginated, categorized, and interactive command menu
 */

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands", "cmds", "allcmds", "guide"],
    version: "7.0.0",
    author: "frnAlt",
    countDown: 2,
    role: 0,
    shortDescription: {
      en: "Display interactive paginated list of commands and system info"
    },
    longDescription: {
      en: "Interactive multi-page command navigation menu with category filters and single command search."
    },
    category: "system",
    guide: {
      en: "   {pn} [page number]: View specific page (e.g. {pn} 2)\n" +
        "   {pn} [command name]: View specific command details\n" +
        "   {pn} cat [category]: Filter commands by category\n" +
        "   {pn} all: View category summary overview"
    }
  },

  onStart: async function ({ message, args, prefix, event }) {
    const allCommands = global.FloppaBot?.commands || global.GoatBot?.commands || new Map();
    const isDM = !event.isGroup || event.threadID === event.senderID;

    // Convert map to sorted command array
    const cmdList = [];
    const categories = {};

    for (const [name, cmd] of allCommands) {
      const cfg = cmd.config || cmd.meta || {};
      const cmdName = cfg.name || name;
      const category = (cfg.category || "Utility").toLowerCase();
      const desc = typeof cfg.description === "string" 
        ? cfg.description 
        : (cfg.description?.en || cfg.shortDescription?.en || cfg.shortDescription || "No description");
      const role = cfg.role !== undefined ? cfg.role : (cfg.hasPermission || 0);

      const cmdInfo = {
        name: cmdName,
        category,
        description: desc,
        role,
        aliases: cfg.aliases || cfg.otherNames || [],
        usage: cfg.guide?.en || cfg.usage || `${prefix}${cmdName}`,
        author: cfg.author || "frnAlt",
        version: cfg.version || "1.0.0"
      };

      cmdList.push(cmdInfo);
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmdInfo);
    }

    cmdList.sort((a, b) => a.name.localeCompare(b.name));

    // Case 1: Specific Command Lookup (if not number or keyword)
    if (args[0] && isNaN(args[0]) && !["all", "cat", "category", "categories"].includes(args[0].toLowerCase())) {
      const query = args[0].toLowerCase();

      // Check if user is searching for category
      if (categories[query]) {
        return renderCategory(categories[query], query, prefix, message);
      }

      // Find command by name or alias
      const found = cmdList.find(c => c.name.toLowerCase() === query || c.aliases.map(a => a.toLowerCase()).includes(query));
      if (!found) {
        return message.reply(`❌ Command or category "${query}" not found. Type ${prefix}help to see available pages.`);
      }

      const roleStr = found.role === 2 ? "Admin Only (Role 2)" : found.role === 1 ? "Group Admin (Role 1)" : "All Users (Role 0)";

      return message.reply(
        `╭─── [ 🐱 𝗙𝗟𝗢𝗣𝗣𝗔 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 ] ───╮\n` +
        `│ 📌 Name        : ${found.name}\n` +
        `│ 📁 Category    : ${found.category.toUpperCase()}\n` +
        `│ 📝 Description : ${found.description}\n` +
        `│ 🔀 Aliases     : ${found.aliases.length > 0 ? found.aliases.join(", ") : "None"}\n` +
        `│ 🔰 Permission  : ${roleStr}\n` +
        `│ 👤 Author      : ${found.author}\n` +
        `│ 🏷️ Version     : ${found.version}\n` +
        `╰───────────────────────────────╯\n\n` +
        `📖 Usage:\n${found.usage.replace(/{pn}|{prefix}/g, prefix)}`
      );
    }

    // Case 2: Category Summary Overview
    if (args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "categories") {
      const sortedCatNames = Object.keys(categories).sort();
      let summary = `╭─── [ 🐱 𝗙𝗟𝗢𝗣𝗣𝗔 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦 ] ───╮\n`;
      summary += `│ 👤 Author   : frnAlt\n`;
      summary += `│ 📦 Total    : ${cmdList.length} Commands across ${sortedCatNames.length} Categories\n`;
      summary += `╰───────────────────────────────╯\n\n`;

      for (const cat of sortedCatNames) {
        summary += `• ${cat.toUpperCase()} (${categories[cat].length} cmds)\n`;
      }
      summary += `\n💡 Type ${prefix}help cat <category> to view commands in a specific category.\n`;
      summary += `💡 Type ${prefix}help <page> to browse page by page.`;
      return message.reply(summary);
    }

    // Case 3: Category filter via `cat <category>`
    if (["cat", "category"].includes(args[0]?.toLowerCase()) && args[1]) {
      const targetCat = args[1].toLowerCase();
      if (!categories[targetCat]) {
        return message.reply(`❌ Category "${targetCat}" not found. Type ${prefix}help all to see available categories.`);
      }
      return renderCategory(categories[targetCat], targetCat, prefix, message);
    }

    // Case 4: Paginated List of Commands
    const perPage = 15;
    const totalPages = Math.ceil(cmdList.length / perPage) || 1;
    let page = parseInt(args[0]) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    return sendHelpPage(page, totalPages, cmdList, perPage, prefix, message, event.senderID);
  },

  onReply: async function ({ message, event, Reply, prefix }) {
    if (event.senderID !== Reply.author) return;

    const input = (event.body || "").trim();
    const allCommands = global.FloppaBot?.commands || global.GoatBot?.commands || new Map();

    // Convert map to sorted command array
    const cmdList = [];
    for (const [name, cmd] of allCommands) {
      const cfg = cmd.config || cmd.meta || {};
      const cmdName = cfg.name || name;
      const category = (cfg.category || "Utility").toLowerCase();
      const desc = typeof cfg.description === "string" 
        ? cfg.description 
        : (cfg.description?.en || cfg.shortDescription?.en || cfg.shortDescription || "No description");
      const role = cfg.role !== undefined ? cfg.role : (cfg.hasPermission || 0);

      cmdList.push({
        name: cmdName,
        category,
        description: desc,
        role,
        aliases: cfg.aliases || cfg.otherNames || [],
        usage: cfg.guide?.en || cfg.usage || `${prefix}${cmdName}`,
        author: cfg.author || "frnAlt",
        version: cfg.version || "1.0.0"
      });
    }
    cmdList.sort((a, b) => a.name.localeCompare(b.name));

    const perPage = 15;
    const totalPages = Math.ceil(cmdList.length / perPage) || 1;

    // Check if reply is a page number
    if (!isNaN(input)) {
      let page = parseInt(input);
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      return sendHelpPage(page, totalPages, cmdList, perPage, prefix, message, event.senderID);
    }

    // Check if reply is a command name
    const query = input.toLowerCase();
    const found = cmdList.find(c => c.name.toLowerCase() === query || c.aliases.map(a => a.toLowerCase()).includes(query));
    if (found) {
      const roleStr = found.role === 2 ? "Admin Only (Role 2)" : found.role === 1 ? "Group Admin (Role 1)" : "All Users (Role 0)";
      return message.reply(
        `╭─── [ 🐱 𝗙𝗟𝗢𝗣𝗣𝗔 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 ] ───╮\n` +
        `│ 📌 Name        : ${found.name}\n` +
        `│ 📁 Category    : ${found.category.toUpperCase()}\n` +
        `│ 📝 Description : ${found.description}\n` +
        `│ 🔀 Aliases     : ${found.aliases.length > 0 ? found.aliases.join(", ") : "None"}\n` +
        `│ 🔰 Permission  : ${roleStr}\n` +
        `│ 👤 Author      : ${found.author}\n` +
        `│ 🏷️ Version     : ${found.version}\n` +
        `╰───────────────────────────────╯\n\n` +
        `📖 Usage:\n${found.usage.replace(/{pn}|{prefix}/g, prefix)}`
      );
    }

    return message.reply(`⚠️ Enter a page number between 1 and ${totalPages}, or type a valid command name.`);
  }
};

function renderCategory(cmds, catName, prefix, message) {
  let msg = `╭─── [ 📁 ${catName.toUpperCase()} COMMANDS (${cmds.length}) ] ───╮\n`;
  msg += `│ 👤 Author : frnAlt\n`;
  msg += `╰───────────────────────────────╯\n\n`;

  cmds.forEach((c, i) => {
    msg += `${i + 1}. ➥ ${c.name} : ${c.description.slice(0, 45)}\n`;
  });

  msg += `\n💡 Type ${prefix}help <command> for detailed usage.`;
  return message.reply(msg);
}

function sendHelpPage(page, totalPages, cmdList, perPage, prefix, message, authorID) {
  const startIndex = (page - 1) * perPage;
  const pageCommands = cmdList.slice(startIndex, startIndex + perPage);

  let msg = `╭─── [ 🐱 𝗙𝗟𝗢𝗣𝗣𝗔-𝗖𝗛𝗔𝗧𝗕𝗢𝗧 𝗠𝗘𝗡𝗨 ] ───╮\n`;
  msg += `│ 👤 Author   : frnAlt\n`;
  msg += `│ ⚡ Prefix   : ${prefix}\n`;
  msg += `│ 📄 Page     : [ ${page} / ${totalPages} ]\n`;
  msg += `│ 📦 Total    : ${cmdList.length} Commands\n`;
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
  msg += `• Reply with command name to inspect details\n`;
  msg += `• Use ${prefix}help <page> or ${prefix}help <command>`;

  return message.reply(msg, (err, info) => {
    if (!err && info?.messageID) {
      global.GoatBot?.onReply?.set(info.messageID, {
        commandName: "help",
        messageID: info.messageID,
        author: authorID,
        page,
        totalPages
      });
    }
  });
}