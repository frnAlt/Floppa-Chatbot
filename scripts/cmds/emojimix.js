const axios = require("axios");

async function generateEmojimix(emoji1, emoji2) {
  try {
    const res = await axios.get("https://toshiro-api-editz6t9.vercel.app/api/tools/emojimix", {
      params: {
        emoji1,
        emoji2,
        size: 256
      },
      timeout: 15000
    });

    if (res.data && res.data.success && res.data.result?.image) {
      return await global.utils.getStreamFromURL(res.data.result.image, `emojimix_${Date.now()}.png`);
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  config: {
    name: "emojimix",
    aliases: ["mixemoji", "emojicombine"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "Mix 2 emoji lại với nhau",
      en: "Mix 2 emojis together"
    },
    longDescription: {
      en: "Combines two emojis into a unique single sticker/image using Toshiro EmojiMix API"
    },
    guide: {
      vi: "{pn} <emoji1> <emoji2>\nVí dụ: {pn} 🐱 🚀",
      en: "{pn} <emoji1> <emoji2>\nExample: {pn} 🐱 🚀"
    },
    category: "fun"
  },

  langs: {
    vi: {
      error: "Rất tiếc, emoji %1 và %2 không mix được",
      success: "Emoji %1 và %2 mix được %3 ảnh"
    },
    en: {
      error: "Sorry, emoji %1 and %2 cannot be mixed",
      success: "Successfully mixed %1 and %2!"
    }
  },

  onStart: async function ({ message, args, getLang, event, api }) {
    const emoji1 = args[0];
    const emoji2 = args[1];

    if (!emoji1 || !emoji2) {
      return message.reply("❌ Please provide two emojis to mix. Example: emojimix 🐱 🚀");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    const readStream = [];
    const generate1 = await generateEmojimix(emoji1, emoji2);
    if (generate1) readStream.push(generate1);

    const generate2 = await generateEmojimix(emoji2, emoji1);
    if (generate2 && (!generate1 || emoji1 !== emoji2)) readStream.push(generate2);

    if (readStream.length === 0) {
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(getLang("error", emoji1, emoji2));
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

    message.reply({
      body: getLang("success", emoji1, emoji2, readStream.length),
      attachment: readStream
    });
  }
};