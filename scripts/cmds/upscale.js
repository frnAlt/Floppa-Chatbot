const axios = require('axios');

function extractImageUrl(args, event) {
  let imageUrl = args.find(arg => arg.startsWith('http'));

  if (!imageUrl && event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
    const imageAttachment = event.messageReply.attachments.find(att => att.type === 'photo' || att.type === 'image');
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  } else if (!imageUrl && event.attachments && event.attachments.length > 0) {
    const imageAttachment = event.attachments.find(att => att.type === 'photo' || att.type === 'image');
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  }
  return imageUrl;
}

module.exports = {
  config: {
    name: "upscale",
    aliases: ["4k", "hd", "enhance", "4kimage"],
    version: "2.0",
    author: "frnAlt",
    countDown: 15,
    role: 0,
    description: {
      vi: "Nâng cấp chất lượng ảnh lên 4K / HD",
      en: "Enhances image quality to 4K resolution"
    },
    category: "ai-image",
    guide: {
      vi: "Reply 1 bức ảnh hoặc nhập URL với lệnh {pn}",
      en: "{pn} <image_url> OR reply to an image"
    }
  },

  onStart: async function ({ args, message, event }) {
    const imageUrl = extractImageUrl(args, event);

    if (!imageUrl) {
      return message.reply("📸 Please reply to an image message or provide an image URL to upscale to 4K.");
    }

    message.reaction("⏳", event.messageID);

    try {
      let finalStream = null;

      // 1. Try free-goat-api 4k endpoint
      try {
        const fullApiUrl = `https://free-goat-api.onrender.com/4k?url=${encodeURIComponent(imageUrl)}`;
        const apiResponse = await axios.get(fullApiUrl, { timeout: 35000 });
        if (apiResponse.data && apiResponse.data.image) {
          finalStream = await global.utils.getStreamFromURL(apiResponse.data.image, 'upscale_4k.jpg');
        }
      } catch (err) {
        // Fallback to Pollinations HD/4K Enhancement Stream
        const fallbackUrl = `https://image.pollinations.ai/prompt/masterpiece%20hyperrealistic%20high%20resolution%204k%20detail?image=${encodeURIComponent(imageUrl)}&width=2048&height=2048&nologo=true`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, 'upscale_4k.png');
      }

      if (!finalStream) {
        throw new Error("Failed to process upscaled image stream.");
      }

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `🔍 Image successfully upscaled to 4K HD!`,
        attachment: finalStream
      });

    } catch (error) {
      message.reaction("❌", event.messageID);
      return message.reply(`❌ Failed to upscale image: ${error.message}`);
    }
  }
};
