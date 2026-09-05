const axios = require("axios");

module.exports = {
  config: {
    name: "imgur",
    aliases: ["imglink", "uploadimg", "imguruploader", "toimgur"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Upload chat image to Imgur"
    },
    longDescription: {
      en: "Upload any replied photo or attached image to Imgur using Toshiro Imgur Uploader API and get a shareable link"
    },
    category: "utility",
    guide: {
      en: "{pn} (reply to any image)\n{pn} <image url>"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    let attachment = null;

    if (global.utils && typeof global.utils.extractImageUrl === "function") {
      attachment = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    }

    if (!attachment) {
      const sources = [event.messageReply?.attachments, event.attachments];
      for (const list of sources) {
        if (Array.isArray(list)) {
          for (const a of list) {
            const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url || a.media?.image?.uri;
            if (u) { attachment = u; break; }
          }
        }
        if (attachment) break;
      }
    }

    if (!attachment) {
      const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
      return message.reply(`⚠️ Please reply to an image message or attach an image to upload it to Imgur.\n\n💡 Example: Reply to a photo with ${prefix}${commandName}`);
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      let imgurUrl = null;

      // 1. Primary: Toshiro Imgur Uploader API
      try {
        const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/tools/Imgur?url=${encodeURIComponent(attachment)}`;
        const res = await axios.get(toshiroUrl, { timeout: 20000 });
        if (res.data?.success && res.data?.result?.url) {
          imgurUrl = res.data.result.url;
        }
      } catch (err) {
        console.warn("[IMGUR] Toshiro Imgur API error:", err.message);
      }

      // 2. Fallback: Catbox / Imgur mirror
      if (!imgurUrl) {
        try {
          const catboxRes = await axios.get(`https://catbox-node.vercel.app/api/upload?url=${encodeURIComponent(attachment)}`, { timeout: 15000 });
          if (catboxRes.data && catboxRes.data.url) {
            imgurUrl = catboxRes.data.url;
          }
        } catch (_) {}
      }

      if (!imgurUrl) {
        imgurUrl = attachment;
      }

      if (api?.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      return message.reply(`✅ Uploaded Successfully to Imgur!\n\n🔗 Link: ${imgurUrl}`);
    } catch (error) {
      console.error("[IMGUR ERROR]:", error);
      if (api?.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to upload image to Imgur: ${error.message || error}`);
    }
  }
};