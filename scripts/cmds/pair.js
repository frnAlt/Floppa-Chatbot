const axios = require("axios");

module.exports = {
  config: {
    name: "pair",
    aliases: ["match", "love", "pairing"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Pair two people with canvas card"
    },
    longDescription: {
      en: "Pairs you with a random group member or a mentioned user with love percentage and custom canvas graphic"
    },
    category: "fun",
    guide: {
      en: "{pn} (pair with random member)\n{pn} @mention (pair with mentioned member)"
    }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { threadID, messageID, senderID, mentions } = event;
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    try {
      const { participantIDs } = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();
      let uid1 = String(senderID);
      let uid2 = null;
      const mentionKeys = mentions ? Object.keys(mentions) : [];

      if (mentionKeys.length >= 2) {
        uid1 = mentionKeys[0];
        uid2 = mentionKeys[1];
      } else if (mentionKeys.length === 1) {
        uid2 = mentionKeys[0];
        if (event.messageReply) {
          const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
          if (rUid && rUid !== uid2) uid1 = String(rUid);
        }
      } else if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
        if (rUid) uid2 = String(rUid);
      }

      if (!uid2) {
        const listUserID = participantIDs.filter(id => id != botID && id != senderID);
        if (listUserID.length === 0) {
          return message.reply("❌ Not enough members to pair in this chat.");
        }
        uid2 = listUserID[Math.floor(Math.random() * listUserID.length)];
      }

      const nameSender = await usersData.getName(uid1).catch(() => "User 1");
      const name2 = await usersData.getName(uid2).catch(() => "User 2");

      if (api.setMessageReaction) {
        api.setMessageReaction("💖", messageID, () => {}, true);
      }

      const avatar1 = `https://graph.facebook.com/${uid1}/picture?width=512&height=512&access_token=${token}`;
      const avatar2 = `https://graph.facebook.com/${uid2}/picture?width=512&height=512&access_token=${token}`;
      const lovePercent = Math.floor(Math.random() * 51) + 50; // 50% to 100%

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/pair?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}&name1=${encodeURIComponent(nameSender)}&name2=${encodeURIComponent(name2)}`;

      const stream = await global.utils.getStreamFromURL(apiUrl, "pair.png");

      const arrayTag = [
        { id: uid1, tag: nameSender },
        { id: uid2, tag: name2 }
      ];

      await message.reply({
        body: `🥰 Match Made in Heaven! 💌 Wishing you both endless happiness 💕\n\n💞 Love Ratio: ${lovePercent}%\n👥 ${nameSender} 💖 ${name2}`,
        mentions: arrayTag,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", messageID, () => {}, true);
      }
    } catch (err) {
      console.error("Pair command error:", err);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate pair canvas: ${err.message || err}`);
    }
  }
};
