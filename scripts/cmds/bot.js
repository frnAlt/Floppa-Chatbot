const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bot",
    aliases: [
      "off", "on", "botoff", "boton",
      "offeve", "oneve", "-offeve", "-oneve", "offevent", "onevent", "-offevent", "-onevent", "eventoff", "eventon", "eventsoff", "eventson",
      "offreact", "onreact", "-offreact", "-onreact", "reactoff", "reacton", "botreact",
      "maintenance"
    ],
    version: "2.3.0",
    author: "frnAlt",
    countDown: 2,
    role: 2,
    shortDescription: {
      en: "Control bot state, group events & reactions (ON/OFF/STATE)"
    },
    longDescription: {
      en: "Toggle overall bot availability, group event triggers (welcome, leave, join), or reaction feedback.\n• When Bot is OFF: Only Bot Admins can use commands. Non-admin commands are silently ignored.\n• When Events are OFF (-offeve): Group join, welcome, leave, and update event commands remain completely silent.\n• When Reactions are OFF (-offreact): The bot will not send reactions (👍/👎) to messages."
    },
    category: "admin",
    guide: {
      en: "• {pn} on : Turn bot ON (Available to all users)\n"
        + "• {pn} off : Turn bot OFF (Admin-only mode; non-admins silently ignored)\n"
        + "• {pn} -offeve / {pn} event off : Turn group events OFF (Mutes welcome, leave & group triggers)\n"
        + "• {pn} -oneve / {pn} event on : Turn group events ON (Enables welcome, leave & group triggers)\n"
        + "• {pn} -offreact / {pn} react off : Turn bot reactions OFF\n"
        + "• {pn} -onreact / {pn} react on : Turn bot reactions ON\n"
        + "• {pn} state : View live bot status, event status, reaction status, memory & uptime\n"
        + "\n💡 Shortcut commands:\n"
        + "• !on / !off : Directly toggle bot operational mode\n"
        + "• !-offeve / !offeve / !eventoff : Mute all group events\n"
        + "• !-oneve / !oneve / !eventon : Enable all group events\n"
        + "• !-offreact / !offreact / !reactoff : Turn bot reactions OFF\n"
        + "• !-onreact / !onreact / !reacton : Turn bot reactions ON"
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

    const cmdLower = (commandName || "").toLowerCase();
    const isOffEve = ["-offeve", "offeve", "-offevent", "offevent", "eventoff", "eventsoff"].includes(cmdLower);
    const isOnEve = ["-oneve", "oneve", "-onevent", "onevent", "eventon", "eventson"].includes(cmdLower);
    const isOffReact = ["-offreact", "offreact", "reactoff", "botreactoff"].includes(cmdLower);
    const isOnReact = ["-onreact", "onreact", "reacton", "botreacton"].includes(cmdLower);
    const isOffBot = ["off", "botoff"].includes(cmdLower);
    const isOnBot = ["on", "boton"].includes(cmdLower);

    const firstArg = (args[0] || "").toLowerCase();
    const secondArg = (args[1] || "").toLowerCase();

    // ─── Status / State Report ───────────────────────────────────────────────
    if (["status", "state", "info", "details"].includes(firstArg) || ["status", "state"].includes(cmdLower)) {
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
        ? "👎 OFF (Admin-Only Control)"
        : "👍 ON (Available to All Users)";
      const eventStatus = (global.GoatBot?.eventsOff ?? config.eventsOff)
        ? "👎 OFF (Disabled by config)"
        : "👍 ON (Active)";
      const reactStatus = (global.GoatBot?.reactOff ?? config.reactOff)
        ? "👎 OFF (Disabled by config)"
        : "👍 ON (Hand emojis 👍/👎 active)";

      const prefix = global.GoatBot?.config?.prefix || "!";
      const report =
`FLOPPA BOT STATUS & DETAILS

Operational State
• Bot Status: ${stateStatus}
• Group Events: ${eventStatus}
• Bot Reactions: ${reactStatus}
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

    // ─── Bot Reactions Control ───────────────────────────────────────────────
    if (
      isOffReact ||
      (firstArg === "react" && secondArg === "off") ||
      (firstArg === "reaction" && secondArg === "off") ||
      (firstArg === "reactions" && secondArg === "off") ||
      (firstArg === "off" && ["react", "reaction", "reactions"].includes(secondArg))
    ) {
      await reactEmoji("👎");
      global.GoatBot.reactOff = true;
      if (global.GoatBot.config) global.GoatBot.config.reactOff = true;
      if (global.FloppaBot) {
        global.FloppaBot.reactOff = true;
        if (global.FloppaBot.config) global.FloppaBot.config.reactOff = true;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.reactOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return message.reply("👎 Bot reactions have been turned OFF.");
    }

    if (
      isOnReact ||
      (firstArg === "react" && secondArg === "on") ||
      (firstArg === "reaction" && secondArg === "on") ||
      (firstArg === "reactions" && secondArg === "on") ||
      (firstArg === "on" && ["react", "reaction", "reactions"].includes(secondArg))
    ) {
      global.GoatBot.reactOff = false;
      if (global.GoatBot.config) global.GoatBot.config.reactOff = false;
      if (global.FloppaBot) {
        global.FloppaBot.reactOff = false;
        if (global.FloppaBot.config) global.FloppaBot.config.reactOff = false;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.reactOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      await reactEmoji("👍");
      return message.reply("👍 Bot reactions have been turned ON.");
    }

    if (["react", "reaction", "reactions", "botreact"].includes(firstArg) && !secondArg) {
      const currentReactOff = Boolean(global.GoatBot?.reactOff ?? global.GoatBot?.config?.reactOff);
      const nextReactOff = !currentReactOff;
      if (nextReactOff) await reactEmoji("👎");
      global.GoatBot.reactOff = nextReactOff;
      if (global.GoatBot.config) global.GoatBot.config.reactOff = nextReactOff;
      if (global.FloppaBot) {
        global.FloppaBot.reactOff = nextReactOff;
        if (global.FloppaBot.config) global.FloppaBot.config.reactOff = nextReactOff;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.reactOff = nextReactOff;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      if (!nextReactOff) await reactEmoji("👍");
      return message.reply(nextReactOff ? "👎 Bot reactions have been turned OFF." : "👍 Bot reactions have been turned ON.");
    }

    // ─── Group Events Control ────────────────────────────────────────────────
    if (
      isOffEve ||
      (firstArg === "events" && secondArg === "off") ||
      (firstArg === "event" && secondArg === "off") ||
      (firstArg === "eve" && secondArg === "off") ||
      (firstArg === "off" && ["event", "events", "eve"].includes(secondArg))
    ) {
      global.GoatBot.eventsOff = true;
      if (global.GoatBot.config) global.GoatBot.config.eventsOff = true;
      if (global.FloppaBot) {
        global.FloppaBot.eventsOff = true;
        if (global.FloppaBot.config) global.FloppaBot.config.eventsOff = true;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("👎");
    }

    if (
      isOnEve ||
      (firstArg === "events" && secondArg === "on") ||
      (firstArg === "event" && secondArg === "on") ||
      (firstArg === "eve" && secondArg === "on") ||
      (firstArg === "on" && ["event", "events", "eve"].includes(secondArg))
    ) {
      global.GoatBot.eventsOff = false;
      if (global.GoatBot.config) global.GoatBot.config.eventsOff = false;
      if (global.FloppaBot) {
        global.FloppaBot.eventsOff = false;
        if (global.FloppaBot.config) global.FloppaBot.config.eventsOff = false;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("👍");
    }

    if (["events", "event", "eve"].includes(firstArg) && !secondArg) {
      const currentEventsOff = Boolean(global.GoatBot?.eventsOff ?? global.GoatBot?.config?.eventsOff);
      const nextEventsOff = !currentEventsOff;
      global.GoatBot.eventsOff = nextEventsOff;
      if (global.GoatBot.config) global.GoatBot.config.eventsOff = nextEventsOff;
      if (global.FloppaBot) {
        global.FloppaBot.eventsOff = nextEventsOff;
        if (global.FloppaBot.config) global.FloppaBot.config.eventsOff = nextEventsOff;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.eventsOff = nextEventsOff;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji(nextEventsOff ? "👎" : "👍");
    }

    // ─── Bot Operational Control (ON/OFF) ────────────────────────────────────
    if (isOnBot || (firstArg === "on" && !secondArg)) {
      global.GoatBot.botOff = false;
      if (global.GoatBot.config) global.GoatBot.config.botOff = false;
      if (global.FloppaBot) {
        global.FloppaBot.botOff = false;
        if (global.FloppaBot.config) global.FloppaBot.config.botOff = false;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("👍");
    }

    if (isOffBot || (firstArg === "off" && !secondArg)) {
      global.GoatBot.botOff = true;
      if (global.GoatBot.config) global.GoatBot.config.botOff = true;
      if (global.FloppaBot) {
        global.FloppaBot.botOff = true;
        if (global.FloppaBot.config) global.FloppaBot.config.botOff = true;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji("👎");
    }

    if (firstArg === "") {
      // Toggle if invoked without arguments
      global.GoatBot.botOff = !currentOff;
      if (global.GoatBot.config) global.GoatBot.config.botOff = global.GoatBot.botOff;
      if (global.FloppaBot) {
        global.FloppaBot.botOff = global.GoatBot.botOff;
        if (global.FloppaBot.config) global.FloppaBot.config.botOff = global.GoatBot.botOff;
      }
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = global.GoatBot.botOff;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return await reactEmoji(global.GoatBot.botOff ? "👎" : "👍");
    }

    // Invalid argument
    return await reactEmoji("👎");
  }
};
