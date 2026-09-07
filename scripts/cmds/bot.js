const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bot",
    aliases: ["off", "on", "botoff", "boton", "offeve", "oneve", "-offeve", "-oneve", "maintenance"],
    version: "2.2.0",
    author: "frnAlt",
    countDown: 2,
    role: 2,
    shortDescription: {
      en: "Control bot state & group event triggers (ON/OFF/STATE)"
    },
    longDescription: {
      en: "Toggle overall bot availability or group event triggers (welcome, leave, join).\n• When Bot is OFF: Only Bot Admins can use commands. Non-admin commands are silently ignored with no reactions.\n• When Events are OFF (-offeve): Group join, welcome, leave, and update event commands remain completely silent with zero output."
    },
    category: "admin",
    guide: {
      en: "• {pn} on : Turn bot ON (Available to all users)\n"
        + "• {pn} off : Turn bot OFF (Admin-only mode; non-admins silently ignored)\n"
        + "• {pn} -offeve : Turn group events OFF (Mutes welcome, leave & group triggers)\n"
        + "• {pn} -oneve : Turn group events ON (Enables welcome, leave & group triggers)\n"
        + "• {pn} state : View live bot status, event status, memory & uptime\n"
        + "\n💡 Shortcut commands:\n"
        + "• !on / !off : Directly toggle bot operational mode\n"
        + "• !-offeve / !offeve : Directly mute all group events\n"
        + "• !-oneve / !oneve : Directly enable all group events"
    }
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

    const targetAction = (
      commandName === "-offeve" || commandName === "offeve" ? "-offeve" :
      commandName === "-oneve" || commandName === "oneve" ? "-oneve" :
      commandName === "on" ? "on" :
      commandName === "off" ? "off" :
      (args[0] || "")
    ).toLowerCase();

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
      const eventStatus = global.GoatBot?.eventsOff
        ? "❌ OFF (Disabled by config)"
        : "✅ ON (Active)";

      const prefix = global.GoatBot?.config?.prefix || "!";
      const report =
`FLOPPA BOT STATUS & DETAILS

Operational State
• Bot Status: ${stateStatus}
• Group Events: ${eventStatus}
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

    if (targetAction === "-offeve" || targetAction === "offeve" || targetAction === "-offevent" || (targetAction === "events" && args[1] === "off") || (targetAction === "event" && args[1] === "off")) {
      global.GoatBot.eventsOff = true;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("❌");
    }

    if (targetAction === "-oneve" || targetAction === "oneve" || targetAction === "-onevent" || (targetAction === "events" && args[1] === "on") || (targetAction === "event" && args[1] === "on")) {
      global.GoatBot.eventsOff = false;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("✅");
    }

    if (targetAction === "events" || targetAction === "event") {
      global.GoatBot.eventsOff = !global.GoatBot.eventsOff;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = global.GoatBot.eventsOff;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji(global.GoatBot.eventsOff ? "❌" : "✅");
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
