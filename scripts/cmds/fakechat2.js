const axios = require("axios");
const { getAvatarUrl } = require("../../func/canvasHelper.js");

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports.config = {
  name: "fakechat2",
  aliases: ["fc2"],
  version: "3.3",
  role: 0,
  author: "frnAlt",
  description: "Generate Facebook fake chat and post",
  category: "Tools",
  guide: {
    en: "{prefix}fakechat2 @mention text\nExample:\n!fakechat2 @John Doe hello world"
  },
  coolDowns: 5,
};

module.exports.onStart = async function ({ api, event, args, usersData, message }) {
  let id;
  if (event.type === "message_reply" || event.messageReply) {
    id = event.messageReply.senderID;
  } else {
    id = Object.keys(event.mentions || {})[0] || event.senderID;
  }

  let text = args.join(" ").trim();

  if (event.mentions && Object.keys(event.mentions).length > 0) {
    for (const name of Object.values(event.mentions)) {
      const esc = escapeRegex(name);
      const reg = new RegExp("@?" + esc, "gi");
      text = text.replace(reg, " ");
    }
  }

  text = text.replace(/\s+/g, " ").trim();

  if (!text) {
    if (event.messageReply?.body) {
      text = event.messageReply.body;
    } else {
      return api.sendMessage(
        "❌ | Provide text after the command or mention.",
        event.threadID,
        event.messageID
      );
    }
  }

  if (api?.setMessageReaction) {
    api.setMessageReaction("💬", event.messageID, () => {}, true);
  }

  try {
    let userName = "Facebook User";
    try {
      if (usersData?.getName) {
        userName = (await usersData.getName(id).catch(() => null)) || userName;
      }
      if (userName === "Facebook User" && api?.getUserInfo) {
        const info = await api.getUserInfo(id);
        if (info?.[id]?.name) userName = info[id].name;
      }
    } catch (_) {}

    const avatar = getAvatarUrl(id);

    const params = new URLSearchParams({
      text: text,
      name: userName,
      avatar: avatar,
      verified: "false",
      time: "2h",
      likes: "256",
      comments: "32",
      shares: "5",
      theme: "light"
    }).toString();

    const imgUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/fbpost?${params}`;
    const stream = await global.utils.getStreamFromURL(imgUrl, `fakechat_${id}.png`, { timeout: 25000 });

    await api.sendMessage(
      {
        body: `🗨️ Fake chat generated for: ${userName}`,
        attachment: stream,
      },
      event.threadID,
      event.messageID
    );

    if (api?.setMessageReaction) {
      api.setMessageReaction("👍", event.messageID, () => {}, true);
    }
  } catch (error) {
    console.error("[FAKECHAT2 ERROR]:", error.message);
    if (api?.setMessageReaction) {
      api.setMessageReaction("👎", event.messageID, () => {}, true);
    }
    api.sendMessage(
      "❌ | Failed to generate fake chat.",
      event.threadID,
      event.messageID
    );
  }
};