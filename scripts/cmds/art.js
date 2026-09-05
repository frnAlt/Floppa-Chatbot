const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');

const API_ENDPOINT = "https://dev.oculux.xyz/api/artv1"; 

module.exports = {
  config: {
    name: "art",
    aliases: ["artv1", "draw"],
    version: "1.0", 
    author: "frnAlt",
    countDown: 15,
    role: 0,
    longDescription: "Generate an image using the ArtV1 model.",
    category: "ai-image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function({ message, args, event }) {
    
    let prompt = args.join(" ");

    if (!prompt || !/^[\x00-\x7F]*$/.test(prompt)) {
        return message.reply("❌ Please provide a valid English prompt to generate an image.");
    }

    message.reaction("⏳", event.messageID);
    let tempFilePath; 

    try {
      const enhancedPrompt = `${prompt.trim()}, digital art masterpiece, highly detailed concept art, vibrant colors, trending on artstation`;
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

      const stream = await global.utils.getStreamFromURL(url, `art_${Date.now()}.png`, { timeout: 15000 });

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `🎨 Art generated ✨\nPrompt: "${prompt}"`,
        attachment: stream
      });
    } catch (error) {
      message.reaction("❌", event.messageID);
      
      let errorMessage = "An error occurred during image generation.";
      if (error.response) {
         if (error.response.status === 404) {
             errorMessage = "API Endpoint not found (404).";
         } else {
             errorMessage = `HTTP Error: ${error.response.status}`;
         }
      } else if (error.code === 'ETIMEDOUT') {
         errorMessage = `Generation timed out. Try a simpler prompt or check API status.`;
      } else if (error.message) {
         errorMessage = `${error.message}`;
      } else {
         errorMessage = `Unknown error.`;
      }

      console.error("ArtV1 Command Error:", error);
      message.reply(`❌ ${errorMessage}`);
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath); 
      }
    }
  }
};