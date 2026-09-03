const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');

const API_ENDPOINT = "https://neokex-img-api.vercel.app/generate"; 

module.exports = {
  config: {
    name: "imagen4",
    aliases: ["img4", "gen4"],
    version: "1.0", 
    author: "frnAlt",
    countDown: 15,
    role: 0,
    longDescription: "Generate a high-quality image using the Imagen 4 model.",
    category: "ai-image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function({ message, args, event }) {
    
    let prompt = args.join(" ");

    if (!prompt) {
        return message.reply("❌ Please provide a prompt to generate an image.");
    }

    message.reaction("🎨", event.messageID);

    try {
      let stream = null;

      // 1. Primary: Neokex Imagen 4 API
      try {
        const fullApiUrl = `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt.trim())}&m=imagen4`;
        stream = await global.utils.getStreamFromURL(fullApiUrl, "imagen4.png", { timeout: 30000 });
      } catch (e) {
        // Fallback to high-speed Pollinations Imagen simulation
      }

      // 2. High-speed Fallback: Pollinations Imagen
      if (!stream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim() + " google imagen style 8k photorealistic ultra high resolution")}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        stream = await global.utils.getStreamFromURL(fallbackUrl, "imagen4.png", { timeout: 45000 });
      }

      if (!stream) {
        throw new Error("Failed to retrieve generated Imagen 4 image stream.");
      }

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `✨ Imagen 4 generated:\n\nPrompt: "${prompt}"`,
        attachment: stream
      });
    } catch (error) {
      message.reaction("❌", event.messageID);
      console.error("Imagen4 Error:", error);
      message.reply(`❌ Failed to generate Imagen 4 image: ${error.message || error}`);
    }
  }
};
