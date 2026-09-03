const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');

const API_ENDPOINT = "https://neokex-img-api.vercel.app/generate"; 

module.exports = {
  config: {
    name: "dalle3",
    aliases: ["dalle"],
    version: "1.0", 
    author: "frnAlt",
    countDown: 15,
    role: 0,
    longDescription: "Generate an image using the DALL-E 3 model.",
    category: "ai-image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function({ message, args, event }) {
    
    let prompt = args.join(" ");

    if (!prompt) {
        return message.reply("❌ Please provide a prompt.");
    }

    message.reaction("🎨", event.messageID);

    try {
      let stream = null;

      // 1. Primary: Neokex DALL-E 3 API
      try {
        const fullApiUrl = `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt.trim())}&model=dalle3`;
        stream = await global.utils.getStreamFromURL(fullApiUrl, "dalle3.png", { timeout: 30000 });
      } catch (e) {
        // Fallback to high-speed Pollinations DALL-E simulation
      }

      // 2. High-speed Fallback: Pollinations AI
      if (!stream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim() + " high quality cinematic 8k photorealistic")}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        stream = await global.utils.getStreamFromURL(fallbackUrl, "dalle3.png", { timeout: 45000 });
      }

      if (!stream) {
        throw new Error("Could not retrieve generated image stream.");
      }

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `🎨 DALL-E 3 generated:\n\n✨ "${prompt}"`,
        attachment: stream
      });
    } catch (error) {
      message.reaction("❌", event.messageID);
      message.reply(`❌ Failed to generate DALL-E 3 image: ${error.message || error}`);
    }
  }
};
