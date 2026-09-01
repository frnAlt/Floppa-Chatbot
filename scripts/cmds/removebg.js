const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function extractImageUrl(args, event) {
  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

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
  } else if (!imageUrl && event.mentions && Object.keys(event.mentions).length > 0) {
    const targetUID = Object.keys(event.mentions)[0];
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    imageUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
  } else if (!imageUrl && event.messageReply?.senderID) {
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    imageUrl = `https://graph.facebook.com/${event.messageReply.senderID}/picture?width=720&height=720&access_token=${token}`;
  }

  return imageUrl;
}

module.exports = {
  config: {
    name: "removebg",
    aliases: ["nobg", "bgremove", "rbg"],
    version: "3.0.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Remove image background and export transparent PNG"
    },
    longDescription: {
      en: "Automatically removes background from replied photos or URLs using Toshiro Background Remover API"
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
        `✂️ Please reply to an image or provide an image URL to remove its background.\n\n💡 Example: Reply to a photo with ${prefix}${commandName}`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("✂️", event.messageID, () => {}, true);
    }

    let tmpPath = null;

    try {
      let finalStream = null;

      // 1. Primary: Toshiro Background Remover API
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/rbg?imgUrl=${encodeURIComponent(imageUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 45000 });

        if (res.data && res.data.success && res.data.result?.image) {
          const imgData = res.data.result.image;
          if (imgData.startsWith("data:image")) {
            const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const cacheDir = path.join(__dirname, "cache");
            await fs.ensureDir(cacheDir);
            tmpPath = path.join(cacheDir, `rbg_${Date.now()}.png`);
            await fs.writeFile(tmpPath, buffer);
            finalStream = fs.createReadStream(tmpPath);
          } else {
            finalStream = await global.utils.getStreamFromURL(imgData, "removed_bg.png");
          }
        }
      } catch (err) {
        console.warn("Toshiro RBG failed, using fallback:", err.message);
      }

      // 2. Fallback: Pollinations transparent background
      if (!finalStream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/transparent%20background%20isolated%20subject%20no%20background?image=${encodeURIComponent(imageUrl)}&nologo=true`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, "removed_bg.png");
      }

      if (!finalStream) {
        throw new Error("Failed to process background removal stream.");
      }

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply(
        {
          body: `✂️ Background Removed Successfully (Transparent PNG)!`,
          attachment: finalStream
        },
        () => {
          if (tmpPath) fs.remove(tmpPath).catch(() => {});
        }
      );
    } catch (error) {
      console.error("RemoveBG error:", error);
      if (tmpPath) fs.remove(tmpPath).catch(() => {});
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to remove background: ${error.message || error}`);
    }
  }
};
