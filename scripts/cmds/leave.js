const axios = require("axios");

module.exports = {
  config: {
    name: "leave",
    aliases: ["out", "leavegroup"],
    version: "2.4.78",
    author: "frnAlt",
    countDown: 5,
    role: 2,
    description: "Make bot leave thread or specified thread",
    guide: "/leave or /leave [threadID]"
  },

  onStart: async function ({ api, event, args, message }) {
    const targetThread = args[0] || event.threadID;

    try {
      await message.reply(`👋 Goodbye! Leaving thread ${targetThread}...`);
      if (api.removeUserFromGroup) {
        api.removeUserFromGroup(api.getCurrentUserID(), targetThread);
      }
    } catch (e) {
      return message.reply("❌ Error leaving group: " + e.message);
    }
  }
};
