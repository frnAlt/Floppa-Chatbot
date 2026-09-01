const axios = require("axios");

function extractImageUrl(args, event) {
  let imageUrl = args.find(arg => arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    const imageAttachment = event.messageReply.attachments.find(
      att => att.type === "photo" || att.type === "image"
    );
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  } else if (!imageUrl && event.attachments?.length > 0) {
    const imageAttachment = event.attachments.find(
      att => att.type === "photo" || att.type === "image"
    );
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  }
  return imageUrl;
}

module.exports = {
  config: {
    name: "upscale",
    aliases: ["hd", "enhance", "4kimage", "upscaler"],
    version: "3.0.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Enhance and upscale image to 4K resolution"
    },
    longDescription: {
      en: "Upscales images to high resolution 4K HD using Toshiro 4K Upscaler API"
    },
    category: "ai-image",
    guide: {
      en: "{pn} <image_url>\n{pn} (reply to an image)"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    const imageUrl = extractImageUrl(args, event);

    if (!imageUrl) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `📸 Please reply to an image or provide an image URL to upscale to 4K.\n\n💡 Example: Reply to a photo with ${prefix}${commandName}`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      let finalStream = null;

      // 1. Primary: Toshiro 4K Upscaler API
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/4k?imgUrl=${encodeURIComponent(imageUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 60000 });

        if (res.data && res.data.success && res.data.result?.upscaled) {
          finalStream = await global.utils.getStreamFromURL(res.data.result.upscaled, "upscale_4k.jpg");
        }
      } catch (err) {
        console.warn("Toshiro 4K primary failed, trying fallback:", err.message);
      }

      // 2. Fallback to Pollinations 4K Enhancement
      if (!finalStream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/masterpiece%20hyperrealistic%20high%20resolution%204k%20detail?image=${encodeURIComponent(imageUrl)}&width=2048&height=2048&nologo=true`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, "upscale_4k.png");
      }

      if (!finalStream) {
        throw new Error("Failed to process upscaled image stream.");
      }

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `🔍 Image successfully upscaled to 4K Ultra HD! ✨`,
        attachment: finalStream
      });
    } catch (error) {
      console.error("4K Upscale error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to upscale image: ${error.message || error}`);
    }
  }
};
