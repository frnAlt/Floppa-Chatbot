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
      const enhancedPrompt = `${prompt.trim()}, google imagen 4 photorealistic style, 8k ultra high resolution`;
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

      const stream = await global.utils.getStreamFromURL(url, "imagen4.png", { timeout: 15000 });

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
