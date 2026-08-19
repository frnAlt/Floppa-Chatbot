const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "wl",
    aliases: ["wlistmode"],
    version: "2.0.0",
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

  onStart: async function ({ message, args, event }) {
    const { dirConfig } = global.client;

    if (!config.whiteListMode) {
      config.whiteListMode = {
        enable: false,
        whiteListIds: []
      };
    }
    if (!config.threadWhiteListMode) {
      config.threadWhiteListMode = {
        enable: false,
        whiteListIds: []
      };
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "status" || !args[0]) {
      const userWl = config.whiteListMode;
      const threadWl = config.threadWhiteListMode;
      return message.reply(
        `📊 Whitelist Status:\n` +
        `• User Whitelist Mode: ${userWl.enable ? "✅ ON" : "❌ OFF"} (${userWl.whiteListIds.length} users)\n` +
        `• Thread Whitelist Mode: ${threadWl.enable ? "✅ ON" : "❌ OFF"} (${threadWl.whiteListIds.length} threads)\n\n` +
        `Type '{pn} user list' or '{pn} thread list' to see all whitelisted IDs.`
      );
    }

    if (sub === "user") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        config.whiteListMode.enable = true;
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply("✅ User whitelist mode has been enabled.");
      }
      if (action === "off") {
        config.whiteListMode.enable = false;
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply("❌ User whitelist mode has been disabled.");
      }
      if (action === "list") {
        const ids = config.whiteListMode.whiteListIds || [];
        if (ids.length === 0) return message.reply("📋 User whitelist is currently empty.");
        return message.reply(`📋 Whitelisted Users (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
      }
      if (action === "add") {
        let targetID = args[2];
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          targetID = Object.keys(event.mentions)[0];
        } else if (event.messageReply) {
          targetID = event.messageReply.senderID;
        }
        if (!targetID) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
        targetID = String(targetID);
        if (config.whiteListMode.whiteListIds.includes(targetID)) {
          return message.reply(`⚠️ User ID ${targetID} is already in the whitelist.`);
        }
        config.whiteListMode.whiteListIds.push(targetID);
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Added user ID ${targetID} to whitelist.`);
      }
      if (action === "remove") {
        let targetID = args[2];
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          targetID = Object.keys(event.mentions)[0];
        } else if (event.messageReply) {
          targetID = event.messageReply.senderID;
        }
        if (!targetID) return message.reply("⚠️ Please provide a UID, mention someone, or reply to a message.");
        targetID = String(targetID);
        const index = config.whiteListMode.whiteListIds.indexOf(targetID);
        if (index === -1) return message.reply(`⚠️ User ID ${targetID} is not in the whitelist.`);
        config.whiteListMode.whiteListIds.splice(index, 1);
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Removed user ID ${targetID} from whitelist.`);
      }
    }

    if (sub === "thread") {
      const action = (args[1] || "").toLowerCase();
      if (action === "on") {
        config.threadWhiteListMode.enable = true;
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply("✅ Thread whitelist mode has been enabled.");
      }
      if (action === "off") {
        config.threadWhiteListMode.enable = false;
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply("❌ Thread whitelist mode has been disabled.");
      }
      if (action === "list") {
        const ids = config.threadWhiteListMode.whiteListIds || [];
        if (ids.length === 0) return message.reply("📋 Thread whitelist is currently empty.");
        return message.reply(`📋 Whitelisted Threads (${ids.length}):\n${ids.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
      }
      if (action === "add") {
        const targetTID = String(args[2] || event.threadID);
        if (config.threadWhiteListMode.whiteListIds.includes(targetTID)) {
          return message.reply(`⚠️ Thread ID ${targetTID} is already in the whitelist.`);
        }
        config.threadWhiteListMode.whiteListIds.push(targetTID);
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Added thread ID ${targetTID} to whitelist.`);
      }
      if (action === "remove") {
        const targetTID = String(args[2] || event.threadID);
        const index = config.threadWhiteListMode.whiteListIds.indexOf(targetTID);
        if (index === -1) return message.reply(`⚠️ Thread ID ${targetTID} is not in the whitelist.`);
        config.threadWhiteListMode.whiteListIds.splice(index, 1);
        writeFileSync(dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Removed thread ID ${targetTID} from whitelist.`);
      }
    }

    return message.reply(
      `⚠️ Invalid option! Use:\n` +
      `• {pn} status\n` +
      `• {pn} user <on|off|list|add|remove>\n` +
      `• {pn} thread <on|off|list|add|remove>`
    );
  }
};
