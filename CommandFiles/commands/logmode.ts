import fs from "fs-extra";
import path from "path";

export const meta: CommandMeta = {
  name: "logmode",
  description: "View and configure console event logger modes and filters.",
  author: "Gtajisan & Antigravity",
  version: "1.0.0",
  usage: "{prefix}logmode [standard | advanced | compact | raw | toggle <type> | length <num>]",
  category: "Admin",
  role: 2,
  noPrefix: false,
  waitingTime: 2,
  otherNames: ["logger", "setlog", "logsettings"],
  icon: "📜",
};

export async function entry({ message, args, prefix }) {
  const configPath = path.join(process.cwd(), "config.json");
  const config = global.GoatBot?.config || global.FloppaBot?.config || {};
  if (!config.logEvents) {
    config.logEvents = {
      mode: "standard",
      disableAll: false,
      showRole: true,
      showDirectMessage: true,
      maxBodyLength: 250,
      message: true,
      command: true,
      message_reply: true,
      message_reaction: true,
      message_unsend: true,
      event: true,
      read_receipt: false,
      typ: false,
      presence: false
    };
  }

  const logCfg = config.logEvents;
  const subCommand = (args[0] || "").toLowerCase();

  // Helper to save changes to config.json
  const saveConfig = async () => {
    try {
      await fs.writeJson(configPath, config, { spaces: 2 });
    } catch (e) {
      console.error("Failed to persist config.json:", e);
    }
  };

  // Switch modes: standard, advanced, compact, raw
  if (["standard", "advanced", "compact", "raw"].includes(subCommand)) {
    logCfg.mode = subCommand;
    await saveConfig();
    return message.reply(
      `✅ Console Logger Mode updated to: **${subCommand.toUpperCase()}**\n\n` +
      `💡 Description:\n` +
      (subCommand === "standard"
        ? `• Streamlined, colorized output with Group Name, Thread ID, User Name, User ID, and Role badges.`
        : subCommand === "advanced"
        ? `• Detailed bordered card view displaying timestamps, latency, message IDs, and comprehensive metadata.`
        : subCommand === "compact"
        ? `• Minimalist single-line format designed for high-traffic servers with many groups.`
        : `• Raw JSON dump for low-level protocol inspection and debugging.`)
    );
  }

  // Toggle specific event types
  if (subCommand === "toggle" && args[1]) {
    const target = args[1].toLowerCase();
    const validKeys = [
      "message", "command", "message_reply", "message_reaction",
      "message_unsend", "event", "read_receipt", "typ", "presence",
      "showRole", "showDirectMessage", "disableAll"
    ];

    const matchKey = validKeys.find(k => k.toLowerCase() === target || k.toLowerCase().replace(/_/g, "") === target);
    if (!matchKey) {
      return message.reply(
        `❌ Invalid event type: "${args[1]}"\n\n` +
        `Available types to toggle:\n` +
        validKeys.map(k => `• ${k}`).join("\n")
      );
    }

    logCfg[matchKey] = !logCfg[matchKey];
    await saveConfig();
    return message.reply(
      `⚙️ Setting **${matchKey}** has been toggled to: **${logCfg[matchKey] ? "ENABLED ✅" : "DISABLED ❌"}**`
    );
  }

  // Set max body preview length
  if (subCommand === "length" && args[1]) {
    const len = parseInt(args[1], 10);
    if (isNaN(len) || len < 20 || len > 2000) {
      return message.reply(`❌ Please provide a valid number between 20 and 2000.`);
    }
    logCfg.maxBodyLength = len;
    await saveConfig();
    return message.reply(`📏 Maximum body length for console logging set to: **${len} characters**.`);
  }

  // Default: show current configuration
  const mode = (logCfg.mode || "standard").toUpperCase();
  const tz = config.timeZone || "Asia/Dhaka";
  const statusIcon = (val: any) => val ? "✅" : "❌";

  const infoText =
    `╔═══════════════════════════╗\n` +
    `   📜 FLOPPA CONSOLE LOGGER\n` +
    `╚═══════════════════════════╝\n\n` +
    `🎯 Current Mode: **${mode}**\n` +
    `🕒 Time Zone: **${tz}**\n` +
    `📏 Max Body Preview: **${logCfg.maxBodyLength || 250} chars**\n` +
    `🏷️ Show Roles: ${statusIcon(logCfg.showRole !== false)}\n` +
    `💬 Show Direct Msgs: ${statusIcon(logCfg.showDirectMessage !== false)}\n\n` +
    `📋 **Event Filters:**\n` +
    ` • Messages: ${statusIcon(logCfg.message !== false)}\n` +
    ` • Commands: ${statusIcon(logCfg.command !== false)}\n` +
    ` • Replies: ${statusIcon(logCfg.message_reply !== false)}\n` +
    ` • Reactions: ${statusIcon(logCfg.message_reaction !== false)}\n` +
    ` • Unsends: ${statusIcon(logCfg.message_unsend !== false)}\n` +
    ` • Group Events: ${statusIcon(logCfg.event !== false)}\n` +
    ` • Typing Indicator: ${statusIcon(logCfg.typ)}\n` +
    ` • Read Receipts: ${statusIcon(logCfg.read_receipt)}\n` +
    ` • Presence: ${statusIcon(logCfg.presence)}\n\n` +
    `⚙️ **Commands:**\n` +
    `➔ \`${prefix}logmode standard\` : Clean colorized view (default)\n` +
    `➔ \`${prefix}logmode advanced\` : Full card view with IDs & latency\n` +
    `➔ \`${prefix}logmode compact\`  : Ultra-short high traffic mode\n` +
    `➔ \`${prefix}logmode raw\`      : Raw JSON format\n` +
    `➔ \`${prefix}logmode toggle <type>\` : Toggle a filter\n` +
    `➔ \`${prefix}logmode length <num>\`  : Set body length limit`;

  return message.reply(infoText);
}
