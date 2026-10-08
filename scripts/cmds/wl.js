const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "wl",
    aliases: ["wlistmode", "whitelist", "whitelistmode"],
    version: "2.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 2,
    description: {
      en: "Quick whitelist manager for users and threads - Control bot access"
    },
    category: "owner",
    guide: {
      en: '📋 USER WHITELIST:\n' +
        '   {pn} user add <uid | @tag>: Add user to whitelist\n' +
        '   {pn} user remove <uid | @tag>: Remove user from whitelist\n' +
        '   {pn} user list: List all whitelisted users\n' +
        '   {pn} user on/off: Enable/disable user whitelist mode\n\n' +
        '📋 THREAD WHITELIST:\n' +
        '   {pn} thread add [threadID]: Add thread to whitelist (current if no ID)\n' +
        '   {pn} thread remove [threadID]: Remove thread from whitelist\n' +
        '   {pn} thread list: List all whitelisted threads\n' +
        '   {pn} thread on/off: Enable/disable thread whitelist mode\n\n' +
        '📊 STATUS:\n' +
        '   {pn} status: View whitelist status for both users and threads'
    }
  },

  onStart: async function ({ message, args, event, usersData, threadsData }) {
    const { dirConfig } = global.client;

    if (!config.whiteListMode) {
      config.whiteListMode = {
        enable: false,
        whiteListIds: []
      };
    }
    if (!config.whiteListModeThread) {
      config.whiteListModeThread = {
        enable: false,
        whiteListThreadIds: []
      };
    }
    if (!config.threadWhiteListMode) {
      config.threadWhiteListMode = config.whiteListModeThread;
    }

    if (!Array.isArray(config.whiteListMode.whiteListIds)) config.whiteListMode.whiteListIds = [];
    if (!Array.isArray(config.whiteListModeThread.whiteListThreadIds)) config.whiteListModeThread.whiteListThreadIds = [];
    // Keep threadWhiteListMode synced
    config.threadWhiteListMode.enable = config.whiteListModeThread.enable;
    config.threadWhiteListMode.whiteListIds = config.whiteListModeThread.whiteListThreadIds;

    const save = () => {
      config.threadWhiteListMode.enable = config.whiteListModeThread.enable;
      config.threadWhiteListMode.whiteListIds = config.whiteListModeThread.whiteListThreadIds;
      writeFileSync(dirConfig, JSON.stringify(config, null, 2));
    };

    const collectUids = (rest) => {
      if (event.mentions && Object.keys(event.mentions).length > 0)
        return Object.keys(event.mentions);
      if (event.messageReply)
        return [String(event.messageReply.senderID)];
      return rest.filter(arg => /^\d+$/.test(arg)).map(String);
    };

    const sub = (args[0] || "").toLowerCase();
    const rest = args.slice(1);

    if (sub === "status" || !args[0]) {
      const userWl = config.whiteListMode;
      const threadWl = config.whiteListModeThread;
      return message.reply(
        `📊 Whitelist Status:\n` +
        `• User Whitelist Mode: ${userWl.enable ? "✅ ON" : "❌ OFF"} (${userWl.whiteListIds.length} users)\n` +
        `• Thread Whitelist Mode: ${threadWl.enable ? "✅ ON" : "❌ OFF"} (${threadWl.whiteListThreadIds.length} threads)\n\n` +
        `Type '{pn} list' or '{pn} listthread' to see all whitelisted IDs.`
      );
    }

    if (sub === "thread") {
      const subAction = (rest[0] || "").toLowerCase();
      if (subAction === "on") {
        config.whiteListModeThread.enable = true;
        save();
        return message.reply("✅ Thread whitelist mode has been enabled.");
      }
      if (subAction === "off") {
        config.whiteListModeThread.enable = false;
        save();
        return message.reply("❌ Thread whitelist mode has been disabled.");
      }
      if (subAction === "list") {
        const ids = config.whiteListModeThread.whiteListThreadIds;
        if (ids.length === 0) return message.reply("📋 Thread whitelist is currently empty.");
        return message.reply(`📋 Whitelisted Threads (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
      }
      if (subAction === "add") {
        const tid = String(rest[1] || event.threadID);
        if (config.whiteListModeThread.whiteListThreadIds.includes(tid)) {
          return message.reply(`⚠️ Thread ID ${tid} is already in the whitelist.`);
        }
        config.whiteListModeThread.whiteListThreadIds.push(tid);
        save();
        return message.reply(`✅ Added thread ID ${tid} to whitelist.`);
      }
      if (subAction === "remove" || subAction === "rm" || subAction === "del") {
        const tid = String(rest[1] || event.threadID);
        const idx = config.whiteListModeThread.whiteListThreadIds.indexOf(tid);
        if (idx === -1) return message.reply(`⚠️ Thread ID ${tid} is not in the whitelist.`);
        config.whiteListModeThread.whiteListThreadIds.splice(idx, 1);
        save();
        return message.reply(`✅ Removed thread ID ${tid} from whitelist.`);
      }
    }

    if (sub === "user") {
      const subAction = (rest[0] || "").toLowerCase();
      if (subAction === "on") {
        config.whiteListMode.enable = true;
        save();
        return message.reply("✅ User whitelist mode has been enabled.");
      }
      if (subAction === "off") {
        config.whiteListMode.enable = false;
        save();
        return message.reply("❌ User whitelist mode has been disabled.");
      }
      if (subAction === "list") {
        const ids = config.whiteListMode.whiteListIds;
        if (ids.length === 0) return message.reply("📋 User whitelist is currently empty.");
        return message.reply(`📋 Whitelisted Users (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
      }
      if (subAction === "add") {
        const uids = collectUids(rest.slice(1));
        if (uids.length === 0) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
        const added = [];
        for (const uid of uids) {
          if (!config.whiteListMode.whiteListIds.includes(uid)) {
            config.whiteListMode.whiteListIds.push(uid);
            added.push(uid);
          }
        }
        save();
        return message.reply(`✅ Added ${added.length} user(s) to whitelist:\n${added.map(u => `• ${u}`).join("\n")}`);
      }
      if (subAction === "remove" || subAction === "rm" || subAction === "del") {
        const uids = collectUids(rest.slice(1));
        if (uids.length === 0) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
        const removed = [];
        for (const uid of uids) {
          const idx = config.whiteListMode.whiteListIds.indexOf(uid);
          if (idx !== -1) {
            config.whiteListMode.whiteListIds.splice(idx, 1);
            removed.push(uid);
          }
        }
        save();
        return message.reply(`✅ Removed ${removed.length} user(s) from whitelist:\n${removed.map(u => `• ${u}`).join("\n")}`);
      }
    }

    if (sub === "on") {
      config.whiteListMode.enable = true;
      save();
      return message.reply("✅ User whitelist mode has been enabled.");
    }
    if (sub === "off") {
      config.whiteListMode.enable = false;
      save();
      return message.reply("❌ User whitelist mode has been disabled.");
    }

    if (sub === "add") {
      const uids = collectUids(rest);
      if (uids.length === 0) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
      const added = [];
      for (const uid of uids) {
        if (!config.whiteListMode.whiteListIds.includes(uid)) {
          config.whiteListMode.whiteListIds.push(uid);
          added.push(uid);
        }
      }
      save();
      return message.reply(`✅ Added ${added.length} user(s) to whitelist:\n${added.map(u => `• ${u}`).join("\n")}`);
    }

    if (sub === "remove" || sub === "rm" || sub === "del") {
      const uids = collectUids(rest);
      if (uids.length === 0) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
      const removed = [];
      for (const uid of uids) {
        const idx = config.whiteListMode.whiteListIds.indexOf(uid);
        if (idx !== -1) {
          config.whiteListMode.whiteListIds.splice(idx, 1);
          removed.push(uid);
        }
      }
      save();
      return message.reply(`✅ Removed ${removed.length} user(s) from whitelist:\n${removed.map(u => `• ${u}`).join("\n")}`);
    }

    if (sub === "addthread" || sub === "addt") {
      const tid = String(rest.find(arg => /^\d+$/.test(arg)) || event.threadID);
      if (config.whiteListModeThread.whiteListThreadIds.includes(tid)) {
        return message.reply(`⚠️ Thread ${tid} is already in the whitelist.`);
      }
      config.whiteListModeThread.whiteListThreadIds.push(tid);
      save();
      return message.reply(`✅ Added thread ${tid} to the whitelist.`);
    }

    if (sub === "removethread" || sub === "removet" || sub === "delthread") {
      const tid = String(rest.find(arg => /^\d+$/.test(arg)) || event.threadID);
      const idx = config.whiteListModeThread.whiteListThreadIds.indexOf(tid);
      if (idx === -1) {
        return message.reply(`⚠️ Thread ${tid} is not in the whitelist.`);
      }
      config.whiteListModeThread.whiteListThreadIds.splice(idx, 1);
      save();
      return message.reply(`✅ Removed thread ${tid} from the whitelist.`);
    }

    if (sub === "list" || sub === "-l") {
      const ids = config.whiteListMode.whiteListIds || [];
      if (ids.length === 0) return message.reply("📋 User whitelist is currently empty.");
      return message.reply(`📋 Whitelisted Users (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
    }

    if (sub === "listthread" || sub === "listt") {
      const ids = config.whiteListModeThread.whiteListThreadIds || [];
      if (ids.length === 0) return message.reply("📋 Thread whitelist is currently empty.");
      return message.reply(`📋 Whitelisted Threads (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
    }

    return message.reply(
      `⚠️ Invalid option! Use:\n` +
      `• {pn} status\n` +
      `• {pn} [on | off]: turn user whitelist on/off\n` +
      `• {pn} thread [on | off]: turn thread whitelist on/off\n` +
      `• {pn} add / remove <uid | @tag | reply>\n` +
      `• {pn} addthread / removethread [threadID]\n` +
      `• {pn} list / listthread`
    );
  }
};
