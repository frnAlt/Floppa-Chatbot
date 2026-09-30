const axios = require("axios");
const { getAvatarUrl } = require("../../func/canvasHelper.js");

module.exports = {
  config: {
    name: "fakechat",
    aliases: ["fc", "fake", "fakemsg"],
    version: "3.0.0",
    author: "frnAlt",
    role: 0,
    category: "fun",
    description: "Generate realistic fake chat / prank message for reply, mention, or UID",
    guide: "{p}fakechat @mention <text>\n{p}fakechat (reply) <text>\n{p}fakechat <uid> <text>",
    countDown: 5,
  },

  onStart: async ({ event, message, args, usersData, api }) => {
    try {
      if (api?.setMessageReaction) {
        api.setMessageReaction("💬", event.messageID, () => {}, true);
      }

      let targetId = null;
      let userText = args.join(" ").trim();

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetId = Object.keys(event.mentions)[0];
        const mentionName = event.mentions[targetId];
        userText = args.join(" ").replace(new RegExp(`@?${mentionName}`, "gi"), "").trim();
      } else if (event.messageReply) {
        targetId = event.messageReply.senderID || event.messageReply.sender?.id;
      } else if (args.length > 0 && /^\d+$/.test(args[0])) {
        targetId = args[0];
        userText = args.slice(1).join(" ").trim();
      } else {
        targetId = event.senderID;
      }

      if (!userText) {
        if (event.messageReply?.body) {
          userText = event.messageReply.body;
        } else {
          return message.reply("❌ Please provide text for the fake chat!\nUsage: fakechat @mention <text>");
        }
      }

      let userName = "Facebook User";
      try {
        if (usersData?.getName) {
          userName = (await usersData.getName(targetId).catch(() => null)) || userName;
        }
        if (userName === "Facebook User" && api?.getUserInfo) {
          const info = await api.getUserInfo(targetId);
          if (info?.[targetId]?.name) userName = info[targetId].name;
        }
      } catch (_) {}

      const avatar = getAvatarUrl(targetId);

      // Render via Toshiro high-accuracy canvas API
      const params = new URLSearchParams({
        text: userText,
        name: userName,
        avatar: avatar,
        verified: "false",
        time: "5m",
        likes: "128",
        comments: "14",
        shares: "2",
        theme: "dark"
      }).toString();

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/fbpost?${params}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, `fakechat_${targetId}.png`, { timeout: 25000 });

      await message.reply({
        body: `🗨️ Fake chat / post generated for: ${userName}`,
        attachment: stream
      });

      if (api?.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("[FAKECHAT ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate fake chat: ${err.message || err}`);
    }
  }
};
