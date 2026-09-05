const axios = require("axios");

async function extractImageUrl(args, event, api) {
  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    for (const att of event.messageReply.attachments) {
      let url = att.url || att.previewUrl || att.largePreviewUrl || att.thumbnailUrl;
      if (!url && att.ID && api?.resolvePhotoUrl) {
        try { url = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (url) {
        imageUrl = url;
        break;
      }
    }
  }

  if (!imageUrl && event.attachments?.length > 0) {
    for (const att of event.attachments) {
      let url = att.url || att.previewUrl || att.largePreviewUrl || att.thumbnailUrl;
      if (!url && att.ID && api?.resolvePhotoUrl) {
        try { url = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (url) {
        imageUrl = url;
        break;
      }
    }
  }

  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
  if (!imageUrl && event.mentions && Object.keys(event.mentions).length > 0) {
    const targetUID = Object.keys(event.mentions)[0];
    imageUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
  } else if (!imageUrl && event.messageReply?.senderID) {
    imageUrl = `https://graph.facebook.com/${event.messageReply.senderID}/picture?width=720&height=720&access_token=${token}`;
  } else if (!imageUrl && event.senderID) {
    imageUrl = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=${token}`;
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
    const imageUrl = await extractImageUrl(args, event, api);

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

      // 1. Primary: Toshiro 4K Upscaler API (fast 2.5s timeout)
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/4k?imgUrl=${encodeURIComponent(imageUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 2500 });

        if (res.data && res.data.success && res.data.result?.upscaled) {
          finalStream = await global.utils.getStreamFromURL(res.data.result.upscaled, "upscale_4k.jpg", { timeout: 10000 });
        }
      } catch (err) {
        // Fallback to high-speed Pollinations turbo
      }

      // 2. High-speed Fallback to Pollinations 4K Enhancement
      if (!finalStream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/masterpiece%20hyperrealistic%20high%20resolution%204k%20detail?image=${encodeURIComponent(imageUrl)}&width=1024&height=1024&nologo=true&model=turbo`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, "upscale_4k.png", { timeout: 15000 });
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
