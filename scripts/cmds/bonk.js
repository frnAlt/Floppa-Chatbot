const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bonk",
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Bonk someone"
    },
    longDescription: {
      en: "Create a bonk canvas with target and your PFP"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply to a user)"
    }
  },

  onStart: async function ({ api, event, message, args, usersData }) {
    try {
      let one = String(event.senderID);
      let two = null;
      const mentions = event.mentions ? Object.keys(event.mentions) : [];

      if (mentions.length >= 2) {
        one = mentions[0];
        two = mentions[1];
      } else if (mentions.length === 1) {
        two = mentions[0];
        if (event.messageReply) {
          const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
          if (rUid && rUid !== two) one = String(rUid);
        }
      } else if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
        if (rUid) two = String(rUid);
      } else if (args && args.length >= 2 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
        one = args[0];
        two = args[1];
      } else if (args && args.length >= 1 && /^\d+$/.test(args[0])) {
        two = args[0];
      }

      // Fallback: name search if mentions omitted
      if (!two && args && args.length > 0) {
        const raw = args.join(" ").replace(/^@/, "").trim().toLowerCase();
        const allM = global.db?.allThreadData?.find(t => t.threadID == event.threadID)?.members || [];
        const found = allM.find(m => m.name && m.name.toLowerCase().includes(raw)) ||
                      global.db?.allUserData?.find(u => u.name && u.name.toLowerCase().includes(raw));
        if (found) two = String(found.userID || found.id);
      }

      if (!two) {
        return message.reply("👤 Please reply to or mention someone to bonk!");
      }

      const targetName = await usersData.getName(two).catch(() => "Target");
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avatar1 = `https://graph.facebook.com/${two}/picture?width=720&height=720&access_token=${token}`;
      const avatar2 = `https://graph.facebook.com/${one}/picture?width=720&height=720&access_token=${token}`;

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/bonk?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}`;

      const stream = await global.utils.getStreamFromURL(apiUrl, "bonk.png");

      return message.reply({
        body: `🔨 Bonk!\n🎯 ${targetName}`,
        attachment: stream
      });

    } catch (error) {
      console.error("Bonk error:", error.message);
      return message.reply(`❌ Failed to generate bonk canvas: ${error.message}`);
    }
  }
};