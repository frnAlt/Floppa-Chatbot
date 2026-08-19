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
    name: "removebg",
    aliases: ["nobg", "bgremove", "rbg"],
    version: "2.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    description: {
      vi: "Xóa nền bức ảnh (Xuất PNG trong suốt)",
      en: "Removes backgrounds and exports transparent PNGs"
    },
    category: "ai-image",
    guide: {
      vi: "Reply 1 bức ảnh với lệnh {pn}",
      en: "Reply to an image with {pn}"
    }
  },

  onStart: async function ({ args, message, event }) {
    const imageUrl = extractImageUrl(args, event);

    if (!imageUrl) {
      return message.reply("✂️ Please reply to an image message or provide an image URL to remove its background.");
    }

    message.reaction("✂️", event.messageID);

    try {
      let finalStream = null;

      // 1. Try free-goat-api removebg endpoint
      try {
        const fullApiUrl = `https://free-goat-api.onrender.com/removebg?url=${encodeURIComponent(imageUrl)}`;
        const apiResponse = await axios.get(fullApiUrl, { timeout: 35000 });
        if (apiResponse.data && apiResponse.data.image) {
          finalStream = await global.utils.getStreamFromURL(apiResponse.data.image, 'removed_bg.png');
        }
      } catch (err) {
        // Fallback to Pollinations transparent background stream
        const fallbackUrl = `https://image.pollinations.ai/prompt/transparent%20background%20isolated%20subject%20no%20background?image=${encodeURIComponent(imageUrl)}&nologo=true`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, 'removed_bg.png');
      }

      if (!finalStream) {
        throw new Error("Failed to process background removal stream.");
      }

      message.reaction("✅", event.messageID);
      await message.reply({
        body: `✂️ Background Removed (Transparent PNG)!`,
        attachment: finalStream
      });

    } catch (error) {
      message.reaction("❌", event.messageID);
      return message.reply(`❌ Failed to remove background: ${error.message}`);
    }
  }
};
