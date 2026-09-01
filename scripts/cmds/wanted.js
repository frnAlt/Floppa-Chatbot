const axios = require("axios");

module.exports = {
  config: {
    name: "wanted",
    aliases: ["bounty", "want"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Create a Wanted bounty poster"
    },
    longDescription: {
      en: "Create a One Piece / Wild West style Wanted poster for yourself, a mentioned user, or a replied photo/user avatar"
    },
    category: "canvas",
    guide: {
      en: "{pn} (self avatar)\n{pn} @mention\n{pn} (reply to user or image)"
    }
  },

  onStart: async function ({ api, event, message, args }) {
    let imageUrl = "";
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    // 1. Check for image attachment in replied message
    if (event.messageReply?.attachments?.length > 0 && event.messageReply.attachments[0].type === "photo") {
      imageUrl = event.messageReply.attachments[0].url;
    }
    // 2. Check for mentioned user
    else if (event.mentions && Object.keys(event.mentions).length > 0) {
      const targetUID = Object.keys(event.mentions)[0];
      imageUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
    }
    // 3. Check for replied message sender
    else if (event.messageReply?.senderID) {
      imageUrl = `https://graph.facebook.com/${event.messageReply.senderID}/picture?width=720&height=720&access_token=${token}`;
    }
    // 4. Check for direct URL argument
    else if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    }
    // 5. Default to sender's own avatar
    else {
      imageUrl = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=${token}`;
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎯", event.messageID, () => {}, true);
    }

    try {
      const bounty = Math.floor(100000 + Math.random() * 900000);
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/wanted?image=${encodeURIComponent(imageUrl)}&currency=${bounty}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "wanted.png");

      await message.reply({
        body: `☠️ WANTED DEAD OR ALIVE! 🎯\n💰 Bounty Reward: $${bounty.toLocaleString()}`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("Wanted command error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate wanted poster: ${error.message || error}`);
    }
  }
};