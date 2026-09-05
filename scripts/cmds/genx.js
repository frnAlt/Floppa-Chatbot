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

      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;
      const stream = await global.utils.getStreamFromURL(url, `genx_${Date.now()}.png`, { timeout: 15000 });

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
