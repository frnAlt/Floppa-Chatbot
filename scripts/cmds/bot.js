const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bot",
    aliases: ["off", "on", "botoff", "boton", "maintenance"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 2,
    role: 2,
    shortDescription: { en: "Toggle bot admin control" },
    longDescription: { en: "Toggle bot status. When OFF, only bot admins can use commands. When ON, all users can use commands." },
    category: "admin",
    guide: { en: "{pn} on | {pn} off | {pn} state" }
  },

  onStart: async function ({ message, args, commandName, event, api, usersData, threadsData }) {
    const configPath = path.join(process.cwd(), "config.json");
    const currentOff = global.GoatBot.botOff === true;

    const reactEmoji = async (emoji) => {
      try {
        if (typeof message?.reaction === "function") {
          await message.reaction(emoji, event?.messageID);
        } else if (typeof api?.setMessageReaction === "function" && event?.messageID) {
          api.setMessageReaction(emoji, event.messageID, () => {}, true);
        }
      } catch (_) {}
    };

    const targetAction = (args[0] || (commandName === "on" ? "on" : commandName === "off" ? "off" : "")).toLowerCase();

    if (["status", "state", "info", "details"].includes(targetAction)) {
      const os = require("os");
      const config = global.GoatBot?.config || {};
      const commands = global.GoatBot?.commands || new Map();
      const aliases = global.GoatBot?.aliases || new Map();

      const [allUsers, allThreads] = await Promise.all([
        usersData?.getAll ? usersData.getAll().catch(() => []) : [],
        threadsData?.getAll ? threadsData.getAll().catch(() => []) : []
      ]);

      const mem = process.memoryUsage();
      const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
      const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
      const uptimeSec = process.uptime();
      const d = Math.floor(uptimeSec / (3600 * 24));
      const h = Math.floor((uptimeSec % (3600 * 24)) / 3600);
      const m = Math.floor((uptimeSec % 3600) / 60);
      const s = Math.floor(uptimeSec % 60);
      const uptimeStr = `${d > 0 ? d + "d " : ""}${h > 0 ? h + "h " : ""}${m}m ${s}s`;

      const stateStatus = global.GoatBot?.botOff
        ? "❌ OFF (Admin-Only Control)"
        : "✅ ON (Available to All Users)";

      const prefix = global.GoatBot?.config?.prefix || "!";
      const report =
`FLOPPA BOT STATUS & DETAILS

Operational State
• Bot Status: ${stateStatus}
• Active Prefix: ${prefix}
• Bot Name: ${config.nickNameBot || "Floppa Bot"}

Command & Architecture
• Total Commands: ${commands.size}
• Total Aliases: ${aliases.size}
• Bot Admins: ${(config.adminBot || []).length} admin(s)

Database Statistics
• Registered Users: ${allUsers.length.toLocaleString()}
• Active Groups: ${allThreads.length.toLocaleString()}

System & Performance
• Bot Uptime: ${uptimeStr}
• Memory (Heap): ${heapUsedMB} MB / ${heapTotalMB} MB
• Platform: ${os.type()} ${os.arch()} (Node ${process.version})`;

      return message.reply(report);
    }

    if (targetAction === "on") {
      global.GoatBot.botOff = false;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("✅");
    }

    if (targetAction === "off") {
      global.GoatBot.botOff = true;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("❌");
    }

    if (targetAction === "status") {
      return await reactEmoji(global.GoatBot.botOff ? "❌" : "✅");
    }

    if (targetAction === "") {
      // Toggle if invoked without arguments
      global.GoatBot.botOff = !currentOff;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = global.GoatBot.botOff;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji(global.GoatBot.botOff ? "❌" : "✅");
    }

    // Invalid argument
    return await reactEmoji("❌");
  }
};
