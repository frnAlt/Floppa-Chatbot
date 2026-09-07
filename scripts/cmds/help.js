/**
 * @author frnAlt
 * ! Floppa-Chatbot Help & Command Navigation Engine
 * ! Paginated, categorized, and interactive command menu with full guide extraction
 */

function extractCommandDetails(cmd, name, prefix) {
  prefix = prefix || global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "!";
  const cfg = cmd.config || cmd.meta || {};
  const cmdName = cfg.name || name;
  const category = (cfg.category || "utility").toLowerCase();

  // 1. Resolve short description
  let description = "No description available";
  if (typeof cfg.shortDescription === "string" && cfg.shortDescription.trim()) {
    description = cfg.shortDescription.trim();
  } else if (typeof cfg.shortDescription?.en === "string" && cfg.shortDescription.en.trim()) {
    description = cfg.shortDescription.en.trim();
  } else if (typeof cfg.description === "string" && cfg.description.trim()) {
    description = cfg.description.trim();
  } else if (typeof cfg.description?.en === "string" && cfg.description.en.trim()) {
    description = cfg.description.en.trim();
  } else if (typeof cfg.description?.vi === "string" && cfg.description.vi.trim()) {
    description = cfg.description.vi.trim();
  } else if (typeof cfg.description === "object" && cfg.description !== null) {
    const val = Object.values(cfg.description).find(v => typeof v === "string" && v.trim());
    if (val) description = val.trim();
  }

  // 2. Resolve detailed long description
  let longDesc = null;
  if (typeof cfg.longDescription === "string" && cfg.longDescription.trim()) {
    longDesc = cfg.longDescription.trim();
  } else if (typeof cfg.longDescription?.en === "string" && cfg.longDescription.en.trim()) {
    longDesc = cfg.longDescription.en.trim();
  } else if (typeof cfg.longDescription?.vi === "string" && cfg.longDescription.vi.trim()) {
    longDesc = cfg.longDescription.vi.trim();
  } else if (typeof cfg.longDescription === "object" && cfg.longDescription !== null) {
    const val = Object.values(cfg.longDescription).find(v => typeof v === "string" && v.trim());
    if (val) longDesc = val.trim();
  }
  if (longDesc === description) longDesc = null;

  const replacePlaceholders = (text) => {
    if (!text) return text;
    return text
      .replace(/{pn}/g, `${prefix}${cmdName}`)
      .replace(/{p}{n}/g, `${prefix}${cmdName}`)
      .replace(/{prefix}{name}/g, `${prefix}${cmdName}`)
      .replace(/{p}/g, prefix)
      .replace(/{prefix}/g, prefix)
      .replace(/{n}/g, cmdName)
      .replace(/{name}/g, cmdName);
  };

  description = replacePlaceholders(description);
  if (longDesc) longDesc = replacePlaceholders(longDesc);

  // 3. Resolve usage & guide across all schemas
  let rawGuide = "";
  if (typeof cfg.guide === "string" && cfg.guide.trim()) {
    rawGuide = cfg.guide.trim();
  } else if (typeof cfg.guide?.en === "string" && cfg.guide.en.trim()) {
    rawGuide = cfg.guide.en.trim();
  } else if (typeof cfg.guide?.vi === "string" && cfg.guide.vi.trim()) {
    rawGuide = cfg.guide.vi.trim();
  } else if (typeof cfg.guide === "object" && cfg.guide !== null) {
    const val = Object.values(cfg.guide).find(v => typeof v === "string" && v.trim());
    if (val) rawGuide = val.trim();
  } else if (typeof cfg.usage === "string" && cfg.usage.trim()) {
    rawGuide = cfg.usage.trim();
  } else if (typeof cfg.usage?.en === "string" && cfg.usage.en.trim()) {
    rawGuide = cfg.usage.en.trim();
  } else if (typeof cfg.usage === "object" && cfg.usage !== null) {
    const val = Object.values(cfg.usage).find(v => typeof v === "string" && v.trim());
    if (val) rawGuide = val.trim();
  } else if (typeof cfg.use === "string" && cfg.use.trim()) {
    rawGuide = cfg.use.trim();
  } else if (typeof cfg.syntax === "string" && cfg.syntax.trim()) {
    rawGuide = cfg.syntax.trim();
  }

  if (!rawGuide || rawGuide === `${prefix}${cmdName}`) {
    if (longDesc) {
      rawGuide = `${prefix}${cmdName}\n${longDesc}`;
    } else if (description && description !== "No description available") {
      rawGuide = `${prefix}${cmdName}\n💡 ${description}`;
    } else {
      rawGuide = `${prefix}${cmdName}`;
    }
  }

  // Replace all template placeholders accurately
  const formattedUsage = rawGuide
    .replace(/{pn}/g, `${prefix}${cmdName}`)
    .replace(/{p}{n}/g, `${prefix}${cmdName}`)
    .replace(/{prefix}{name}/g, `${prefix}${cmdName}`)
    .replace(/{p}/g, prefix)
    .replace(/{prefix}/g, prefix)
    .replace(/{n}/g, cmdName)
    .replace(/{name}/g, cmdName);

  const role = cfg.role !== undefined ? cfg.role : (cfg.hasPermission || 0);
  const countDown = cfg.countDown !== undefined ? cfg.countDown : (cfg.cooldowns || 1);

  return {
    name: cmdName,
    category,
    description,
    longDescription: longDesc,
    role,
    countDown,
    aliases: cfg.aliases || cfg.otherNames || [],
    usage: formattedUsage,
    author: cfg.author || "frnAlt",
    version: cfg.version || "1.0.0"
  };
}

function formatCommandDetail(found) {
  const roleStr = found.role === 2
    ? "Bot Admin (Role 2)"
    : found.role === 1
    ? "Group Admin (Role 1)"
    : "All Users (Role 0)";

  let card =
`╭─── [ 🐱 FLOPPA COMMAND INFO ] ───╮
│ 📌 Name        : ${found.name}
│ 📁 Category    : ${found.category.toUpperCase()}
│ 📝 Description : ${found.description}\n`;

  if (found.longDescription) {
    card += `│ ℹ️ Details     : ${found.longDescription}\n`;
  }

  card +=
`│ 🔀 Aliases     : ${found.aliases.length > 0 ? found.aliases.join(", ") : "None"}
│ ⏱️ Cooldown    : ${found.countDown}s
│ 🔰 Permission  : ${roleStr}
│ 👤 Author      : ${found.author}
│ 🏷️ Version     : ${found.version}
╰───────────────────────────────╯

📖 Usage & Guide:
${found.usage}`;

  return card;
}

function buildCommandList(prefix) {
  const allCommands = global.FloppaBot?.commands || global.GoatBot?.commands || new Map();
  const cmdList = [];
  const categories = {};

  for (const [name, cmd] of allCommands) {
    const info = extractCommandDetails(cmd, name, prefix);
    cmdList.push(info);
    if (!categories[info.category]) categories[info.category] = [];
    categories[info.category].push(info);
  }

  cmdList.sort((a, b) => a.name.localeCompare(b.name));
  return { cmdList, categories };
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands", "cmds", "allcmds", "guide"],
    version: "7.1.0",
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
        "   {pn} [command name]: View specific command details & usage\n" +
        "   {pn} cat [category]: Filter commands by category\n" +
        "   {pn} all: View category summary overview"
    }
  },

  onStart: async function ({ message, args, prefix }) {
    const { cmdList, categories } = buildCommandList(prefix);

    // Case 1: Specific Command Lookup
    if (args[0] && isNaN(args[0]) && !["all", "cat", "category", "categories"].includes(args[0].toLowerCase())) {
      const query = args[0].toLowerCase();

      if (categories[query]) {
        return renderCategory(categories[query], query, prefix, message);
      }

      const found = cmdList.find(c => c.name.toLowerCase() === query || c.aliases.map(a => a.toLowerCase()).includes(query));
      if (!found) {
        return message.reply(`❌ Command or category "${query}" not found. Type ${prefix}help to see available commands.`);
      }

      return message.reply(formatCommandDetail(found));
    }

    // Case 2: Category Summary Overview
    if (args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "categories") {
      const sortedCatNames = Object.keys(categories).sort();
      let summary = `╭─── [ 🐱 FLOPPA CATEGORIES ] ───╮\n`;
      summary += `│ 👤 Author   : frnAlt\n`;
      summary += `│ 📦 Total    : ${cmdList.length} Commands across ${sortedCatNames.length} Categories\n`;
      summary += `╰───────────────────────────────╯\n\n`;

      for (const cat of sortedCatNames) {
        summary += `• ${cat.toUpperCase()} (${categories[cat].length} cmds)\n`;
      }
      summary += `\n💡 Type ${prefix}help cat <category> to view commands in a specific category.\n`;
      summary += `💡 Type ${prefix}help <command> to view detailed usage guide.`;
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

    return sendHelpPage(page, totalPages, cmdList, perPage, prefix, message);
  },

  onReply: async function ({ message, event, Reply, prefix }) {
    if (event.senderID !== Reply.author) return;

    const input = (event.body || "").trim();
    if (!input) return;

    if (/^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(input)) return;

    const { cmdList } = buildCommandList(prefix);

    const perPage = 15;
    const totalPages = Math.ceil(cmdList.length / perPage) || 1;

    // Page navigation reply
    const pageMatch = input.match(/^(?:page\s*)?(\d+)$/i);
    if (pageMatch) {
      let page = parseInt(pageMatch[1], 10);
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      if (typeof Reply.delete === "function") Reply.delete();
      return sendHelpPage(page, totalPages, cmdList, perPage, prefix, message);
    }

    // Specific command lookup reply
    const query = input.toLowerCase();
    const found = cmdList.find(c => c.name.toLowerCase() === query || c.aliases.map(a => a.toLowerCase()).includes(query));
    if (found) {
      if (typeof Reply.delete === "function") Reply.delete();
      return message.reply(formatCommandDetail(found));
    }

    if (/^page\s*\d+/i.test(input)) {
      return message.reply(`⚠️ Enter a page number between 1 and ${totalPages}, or type a valid command name.`);
    }
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

function sendHelpPage(page, totalPages, cmdList, perPage, prefix, message) {
  const startIndex = (page - 1) * perPage;
  const pageCommands = cmdList.slice(startIndex, startIndex + perPage);

  let msg = `╭─── [ 🐱 FLOPPA-CHATBOT MENU ] ───╮\n`;
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
  msg += `• Reply with command name to inspect full usage & guide\n`;
  msg += `• Use ${prefix}help <command> for complete guide`;

  return message.reply(msg, (err, info) => {
    if (!err && info?.messageID) {
      global.GoatBot?.onReply?.set(info.messageID, {
        commandName: "help",
        messageID: info.messageID,
        page,
        totalPages
      });
    }
  });
}
