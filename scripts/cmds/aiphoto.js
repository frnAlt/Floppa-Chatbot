const axios = require("axios");

module.exports = {
  config: {
    name: "photo",
    aliases: ["aiphoto", "aip", "aiimage"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 8,
    role: 0,
    shortDescription: { en: "Generate AI images from text prompts" },
    longDescription: { en: "Generate high-resolution AI art using Flux and SDXL via Pollinations AI" },
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ message, event, api, args }) {
    if (!args[0]) {
      return message.reply("❌ Please provide a prompt describing the image you want to generate.\nExample: {p}photo beautiful sunset over futuristic cyberpunk city");
    }

    const prompt = args.join(" ").trim();

    try {
      if (api.setMessageReaction) {
        api.setMessageReaction("🎨", event.messageID, () => {}, true);
      }

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

      const stream = await global.utils.getStreamFromURL(imageUrl, `photo_${Date.now()}.jpg`);

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `🎨 Generated Image for: "${prompt}"`,
        attachment: stream
      });
    } catch (err) {
      console.error("[PHOTO ERROR]:", err.message);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate image: ${err.message || "Request timed out."}`);
    }
  }
};
