const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: "genx",
    aliases: [],
    version: "1.0",
    author: "frnAlt",
    countDown: 50,
    role: 0,
    longDescription: {
      vi: '',
      en: "Generate images"
    },
    category: "ai",
    guide: {
      vi: '',
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ api, message, commandName, event, args }) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return message ? message.reply("❌ Please provide a prompt.") : api.sendMessage("❌ Please provide a prompt.", event.threadID, event.messageID);
    }

    try {
      if (api.setMessageReaction) api.setMessageReaction("🎨", event.messageID, () => {}, true);

      let stream = null;
      try {
        const response = await axios.get(`https://dall-e-tau-steel.vercel.app/kshitiz?prompt=${encodeURIComponent(prompt)}`, { timeout: 25000 });
        const imageUrl = response.data?.response;
        if (imageUrl) {
          stream = await global.utils.getStreamFromURL(imageUrl, `genx_${Date.now()}.jpg`);
        }
      } catch (e) {
        // Fallback
      }

      if (!stream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        stream = await global.utils.getStreamFromURL(fallbackUrl, `genx_${Date.now()}.png`, { timeout: 45000 });
      }

      if (!stream) throw new Error("Failed to generate image.");

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
      const msgData = { body: `🎨 GenX generated:\n\n✨ "${prompt}"`, attachment: stream };
      if (message?.reply) {
        await message.reply(msgData);
      } else {
        await api.sendMessage(msgData, event.threadID, event.messageID);
      }
    } catch (error) {
      console.error("GenX Error:", error);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      const errMsg = "❌ Error generating image. Please try again later.";
      if (message?.reply) {
        await message.reply(errMsg);
      } else {
        await api.sendMessage(errMsg, event.threadID, event.messageID);
      }
    }
  }
};
