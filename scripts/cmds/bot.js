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
      en: "Toggle overall bot availability, group event triggers (welcome, leave, join), or reaction feedback.\n• When Bot is OFF: Only Bot Admins can use commands. Non-admin commands are silently ignored.\n• When Events are OFF (-offeve): Group join, welcome, leave, and update event commands remain completely silent.\n• When Reactions are OFF (-offreact): The bot will not send reactions to messages.\n• You can customize the reaction emoji (e.g. 👍, ❤️, 🔥) and trigger mode (media only vs all commands)."
    },
    category: "admin",
    guide: {
      en: "• {pn} on : Turn bot ON (Available to all users)\n"
        + "• {pn} off : Turn bot OFF (Admin-only mode; non-admins silently ignored)\n"
        + "• {pn} -offeve / {pn} event off : Turn group events OFF (Mutes welcome, leave & group triggers)\n"
        + "• {pn} -oneve / {pn} event on : Turn group events ON (Enables welcome, leave & group triggers)\n"
        + "• {pn} -offreact / {pn} react off : Turn bot reactions OFF\n"
        + "• {pn} -onreact / {pn} react on : Turn bot reactions ON\n"
        + "• {pn} react emoji <emoji> / {pn} react <emoji> : Set custom reaction emoji (e.g. {pn} react ❤️)\n"
        + "• {pn} react mode <media|all> : Set reaction trigger mode (media = media commands only, all = all commands)\n"
        + "• {pn} react reset : Reset reaction settings to defaults (ON, 👍, media)\n"
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
      const cmdReact = global.GoatBot?.commandReaction || config.commandReaction || {};
      const isReactOffCurrent = Boolean(global.GoatBot?.reactOff ?? config.reactOff);
      const reactStatus = isReactOffCurrent
        ? "👎 OFF (Disabled by config)"
        : `👍 ON (Emoji: ${cmdReact.emoji || "👍"} | Mode: ${cmdReact.mode || "media"})`;

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
      isOnReact ||
      ["react", "reaction", "reactions", "botreact"].includes(firstArg) ||
      (firstArg === "off" && ["react", "reaction", "reactions"].includes(secondArg)) ||
      (firstArg === "on" && ["react", "reaction", "reactions"].includes(secondArg))
    ) {
      // 1. Reset command reactions: !bot react reset
      if (secondArg === "reset") {
        const defaultReact = { enable: true, emoji: "👍", mode: "media" };
        global.GoatBot.reactOff = false;
        global.GoatBot.commandReaction = { ...defaultReact };
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = false;
          global.GoatBot.config.commandReaction = { ...defaultReact };
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = false;
          global.FloppaBot.commandReaction = { ...defaultReact };
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = false;
            global.FloppaBot.config.commandReaction = { ...defaultReact };
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = false;
          conf.commandReaction = {
            enable: true,
            emoji: "👍",
            mode: "media",
            notes: "Controls bot reactions on issued commands. 'enable': true/false; 'emoji': reaction emoji (e.g. 👍, ❤️, 🔥, ✨); 'mode': 'media' (react only on image/media commands) or 'all' (react on all commands)."
          };
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        await reactEmoji("👍");
        return message.reply("🔄 Bot command reactions have been reset to defaults:\n• Status: ON\n• Emoji: 👍\n• Mode: media (reacts to media/image commands only)");
      }

      // 2. Set Mode: !bot react mode <media|all> or !bot react all / !bot react media
      if (secondArg === "mode" || ["all", "media", "image", "images"].includes(secondArg)) {
        const rawMode = secondArg === "mode" ? (args[2] || "").toLowerCase() : secondArg;
        const targetMode = ["all", "every", "always"].includes(rawMode) ? "all" : "media";

        const currentCmdReact = global.GoatBot?.commandReaction || global.GoatBot?.config?.commandReaction || { enable: true, emoji: "👍", mode: "media" };
        currentCmdReact.mode = targetMode;
        currentCmdReact.enable = true;
        global.GoatBot.reactOff = false;
        global.GoatBot.commandReaction = currentCmdReact;
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = false;
          global.GoatBot.config.commandReaction = currentCmdReact;
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = false;
          global.FloppaBot.commandReaction = currentCmdReact;
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = false;
            global.FloppaBot.config.commandReaction = currentCmdReact;
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = false;
          conf.commandReaction = conf.commandReaction || {};
          conf.commandReaction.mode = targetMode;
          conf.commandReaction.enable = true;
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        const activeEmoji = currentCmdReact.emoji || "👍";
        await reactEmoji(activeEmoji);
        return message.reply(`⚙️ Bot command reaction mode set to: ${targetMode.toUpperCase()}\n• ${targetMode === "all" ? "Reacts to all successful commands" : "Reacts to media/image commands only"}\n• Reaction Emoji: ${activeEmoji}`);
      }

      // 3. Set Emoji: !bot react emoji <emoji> OR !bot react <emoji> (e.g. !bot react ❤️)
      const isEmojiExplicit = secondArg === "emoji";
      const isCustomEmojiArg = secondArg && !["on", "off", "mode", "all", "media", "reset", "status", "state"].includes(secondArg);
      if (isEmojiExplicit || isCustomEmojiArg) {
        const newEmoji = isEmojiExplicit ? (args[2] || "").trim() : (args[1] || "").trim();
        if (!newEmoji) {
          return message.reply("⚠️ Please provide an emoji to use as command reaction (e.g. !bot react emoji ❤️ or !bot react 🔥)");
        }

        const currentCmdReact = global.GoatBot?.commandReaction || global.GoatBot?.config?.commandReaction || { enable: true, emoji: "👍", mode: "media" };
        currentCmdReact.emoji = newEmoji;
        currentCmdReact.enable = true;
        global.GoatBot.reactOff = false;
        global.GoatBot.commandReaction = currentCmdReact;
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = false;
          global.GoatBot.config.commandReaction = currentCmdReact;
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = false;
          global.FloppaBot.commandReaction = currentCmdReact;
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = false;
            global.FloppaBot.config.commandReaction = currentCmdReact;
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = false;
          conf.commandReaction = conf.commandReaction || {};
          conf.commandReaction.emoji = newEmoji;
          conf.commandReaction.enable = true;
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        await reactEmoji(newEmoji);
        return message.reply(`✨ Bot command reaction emoji set to: ${newEmoji}\n• Status: ON\n• Mode: ${(currentCmdReact.mode || "media").toUpperCase()}`);
      }

      // 4. Turn OFF: !bot react off / !bot -offreact / !offreact / !bot off react
      if (
        isOffReact ||
        secondArg === "off" ||
        (firstArg === "off" && ["react", "reaction", "reactions"].includes(secondArg))
      ) {
        await reactEmoji("👎");
        global.GoatBot.reactOff = true;
        if (global.GoatBot.commandReaction) global.GoatBot.commandReaction.enable = false;
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = true;
          if (global.GoatBot.config.commandReaction) global.GoatBot.config.commandReaction.enable = false;
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = true;
          if (global.FloppaBot.commandReaction) global.FloppaBot.commandReaction.enable = false;
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = true;
            if (global.FloppaBot.config.commandReaction) global.FloppaBot.config.commandReaction.enable = false;
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = true;
          if (conf.commandReaction) conf.commandReaction.enable = false;
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        return message.reply("👎 Bot reactions have been turned OFF.");
      }

      // 5. Turn ON: !bot react on / !bot -onreact / !onreact / !bot on react
      if (
        isOnReact ||
        secondArg === "on" ||
        (firstArg === "on" && ["react", "reaction", "reactions"].includes(secondArg))
      ) {
        global.GoatBot.reactOff = false;
        if (global.GoatBot.commandReaction) global.GoatBot.commandReaction.enable = true;
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = false;
          if (global.GoatBot.config.commandReaction) global.GoatBot.config.commandReaction.enable = true;
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = false;
          if (global.FloppaBot.commandReaction) global.FloppaBot.commandReaction.enable = true;
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = false;
            if (global.FloppaBot.config.commandReaction) global.FloppaBot.config.commandReaction.enable = true;
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = false;
          if (conf.commandReaction) conf.commandReaction.enable = true;
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        await reactEmoji("👍");
        const activeEmoji = global.GoatBot?.commandReaction?.emoji || global.GoatBot?.config?.commandReaction?.emoji || "👍";
        return message.reply(`👍 Bot reactions have been turned ON (Emoji: ${activeEmoji}).`);
      }

      // 6. Toggle: !bot react (without sub-arguments)
      if (!secondArg) {
        const currentReactOff = Boolean(global.GoatBot?.reactOff ?? global.GoatBot?.config?.reactOff);
        const nextReactOff = !currentReactOff;
        if (nextReactOff) await reactEmoji("👎");
        global.GoatBot.reactOff = nextReactOff;
        if (global.GoatBot.commandReaction) global.GoatBot.commandReaction.enable = !nextReactOff;
        if (global.GoatBot.config) {
          global.GoatBot.config.reactOff = nextReactOff;
          if (global.GoatBot.config.commandReaction) global.GoatBot.config.commandReaction.enable = !nextReactOff;
        }
        if (global.FloppaBot) {
          global.FloppaBot.reactOff = nextReactOff;
          if (global.FloppaBot.commandReaction) global.FloppaBot.commandReaction.enable = !nextReactOff;
          if (global.FloppaBot.config) {
            global.FloppaBot.config.reactOff = nextReactOff;
            if (global.FloppaBot.config.commandReaction) global.FloppaBot.config.commandReaction.enable = !nextReactOff;
          }
        }
        try {
          const conf = fs.readJsonSync(configPath);
          conf.reactOff = nextReactOff;
          if (conf.commandReaction) conf.commandReaction.enable = !nextReactOff;
          fs.writeJsonSync(configPath, conf, { spaces: 2 });
        } catch (_) {}
        const activeEmoji = global.GoatBot?.commandReaction?.emoji || global.GoatBot?.config?.commandReaction?.emoji || "👍";
        if (!nextReactOff) await reactEmoji(activeEmoji);
        return message.reply(nextReactOff ? "👎 Bot reactions have been turned OFF." : `👍 Bot reactions have been turned ON (Emoji: ${activeEmoji}).`);
      }
    }

    // ─── Group Events Control ────────────────────────────────────────────────
    const targetEventName = (args[2] || "").toLowerCase();

    // 1. List loaded event commands: !bot event list / !bot events list
    if (["events", "event", "eve"].includes(firstArg) && ["list", "all", "ls"].includes(secondArg)) {
      const eventCmds = Array.from(global.GoatBot?.eventCommands?.keys() || []);
      const isEventsOff = Boolean(global.GoatBot?.eventsOff ?? config.eventsOff);
      const statusIcon = isEventsOff ? "👎 OFF" : "👍 ON";
      let msg = `📅 EVENT COMMANDS (${eventCmds.length})\n• Global Execution: ${statusIcon}\n\n`;
      if (eventCmds.length === 0) {
        msg += "No event commands registered in memory.";
      } else {
        msg += eventCmds.map((name, i) => `${i + 1}. ${name}`).join("\n");
      }
      return message.reply(msg);
    }

    // 2. Disable specific event command: !bot event off <name> / !bot event unload <name>
    if (["events", "event", "eve"].includes(firstArg) && (secondArg === "off" || secondArg === "unload" || secondArg === "disable") && targetEventName) {
      if (global.GoatBot?.eventCommands?.has(targetEventName)) {
        global.GoatBot.eventCommands.delete(targetEventName);
        if (global.FloppaBot?.eventCommands) global.FloppaBot.eventCommands.delete(targetEventName);
        await reactEmoji("👎");
        return message.reply(`👎 Event command "${targetEventName}" has been disabled.`);
      } else {
        return message.reply(`⚠️ Event command "${targetEventName}" is not currently loaded.`);
      }
    }

    // 3. Enable specific event command: !bot event on <name> / !bot event load <name>
    if (["events", "event", "eve"].includes(firstArg) && (secondArg === "on" || secondArg === "load" || secondArg === "enable") && targetEventName) {
      try {
        const eventFilePath = path.join(process.cwd(), "scripts/events", `${targetEventName}.js`);
        if (fs.existsSync(eventFilePath)) {
          delete require.cache[require.resolve(eventFilePath)];
          const evtModule = require(eventFilePath);
          const evtName = evtModule?.config?.name || targetEventName;
          global.GoatBot.eventCommands.set(evtName, evtModule);
          if (global.FloppaBot?.eventCommands) global.FloppaBot.eventCommands.set(evtName, evtModule);
          await reactEmoji("👍");
          return message.reply(`👍 Event command "${evtName}" has been loaded and enabled.`);
        } else {
          return message.reply(`⚠️ Event command file "${targetEventName}.js" not found in scripts/events/.`);
        }
      } catch (err) {
        return message.reply(`❌ Failed to load event command "${targetEventName}": ${err.message}`);
      }
    }

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
