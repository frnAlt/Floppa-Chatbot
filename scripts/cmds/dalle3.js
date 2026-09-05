const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');

const API_ENDPOINT = "https://neokex-img-api.vercel.app/generate"; 

module.exports = {
  config: {
    name: "dalle3",
    aliases: ["dalle-3", "dalle_3"],
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
      const enhancedPrompt = `${prompt.trim()}, dalle 3 masterpiece, ultra detailed, cinematic 8k photorealistic`;
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

      const stream = await global.utils.getStreamFromURL(url, "dalle3.png", { timeout: 15000 });

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
