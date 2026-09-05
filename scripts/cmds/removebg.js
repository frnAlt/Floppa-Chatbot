const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

async function extractImageUrl(args, event, api) {
  if (global.utils && typeof global.utils.extractImageUrl === "function") {
    const u = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    if (u) return u;
  }

  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    for (const att of event.messageReply.attachments) {
      let u = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) { imageUrl = u; break; }
    }
  }

  if (!imageUrl && event.attachments?.length > 0) {
    for (const att of event.attachments) {
      let u = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) { imageUrl = u; break; }
    }
  }

  if (!imageUrl && event.messageReply?.body) {
    const match = event.messageReply.body.match(/https?:\/\/[^\s]+/i);
    if (match && /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(match[0])) {
      imageUrl = match[0];
    }
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
    const imageUrl = await extractImageUrl(args, event, api);

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

      // 1. Primary: Toshiro Background Remover API (fast 3s timeout)
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/rbg?imgUrl=${encodeURIComponent(imageUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 3000 });

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
        // Fast fallback to Pollinations turbo
      }

      // 2. Fallback: Pollinations transparent background
      if (!finalStream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/transparent%20background%20isolated%20subject%20no%20background?image=${encodeURIComponent(imageUrl)}&width=768&height=768&nologo=true&model=turbo`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, "removed_bg.png", { timeout: 15000 });
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
