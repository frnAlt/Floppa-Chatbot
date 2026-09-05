const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gay",
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Apply Gay overlay to PFP"
    },
    longDescription: {
      en: "Apply Gay overlay to a user's profile picture"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply to a user)"
    }
  },

  onStart: async function ({ api, event, message, args, usersData }) {
    let imageUrl = "";
    let uid = String(event.senderID);
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    if (event.messageReply?.attachments?.length > 0 && (event.messageReply.attachments[0].type === "photo" || event.messageReply.attachments[0].type === "image")) {
      imageUrl = event.messageReply.attachments[0].url;
      if (event.messageReply.senderID || event.messageReply.actorFbId) {
        uid = String(event.messageReply.senderID || event.messageReply.actorFbId);
      }
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      uid = Object.keys(event.mentions)[0];
      imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
    } else if (event.messageReply) {
      const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
      if (rUid) {
        uid = String(rUid);
        imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
      }
    } else if (args[0] && /^\d+$/.test(args[0].trim())) {
      uid = args[0].trim();
      imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
    } else if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    } else {
      imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🏳️‍🌈", event.messageID, () => {}, true);
    }

    try {
      const name = event.mentions?.[uid]?.replace(/^@/, "").trim() || (await usersData.getName(uid).catch(() => null)) || "User";
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/gay?image=${encodeURIComponent(imageUrl)}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "gay.png");

      return message.reply({
        body: `🏳️‍🌈 Gay Canvas\n👤 ${name}`,
        attachment: stream
      });
    } catch (error) {
      console.error("Gay canvas error:", error.message);
      return message.reply(`❌ Failed to generate canvas: ${error.message}`);
    }
  }
};