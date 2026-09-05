const axios = require("axios");
const { Jimp } = require("jimp");
const { Readable } = require("stream");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "https://meta.nkx.lol";
const MAX_ATTACHMENT_BYTES = 26214400;

function formatError(res) {
  if (res.status === 422 && Array.isArray(res.data?.detail)) {
    return res.data.detail.map((d) => d.msg || d).join("; ");
  }
  if (res.status === 401) return "The API server rejected its own API key.";
  if (res.status === 404) return "That project/image could not be found.";
  if (res.status === 502) return "The Vibes provider failed to fulfill this request. Try again.";
  if (res.status === 503) return "The API server's Vibes session is misconfigured.";
  return res.data?.message || res.data?.error || `Request failed (status ${res.status}).`;
}

function extractEditedImageUrl(data) {
  const contentItem = data?.result?.contentItem;
  return contentItem?.imageUrl || contentItem?.structuredOutput?.image || null;
}

function extractImageUrlFromEvent(event, args = []) {
  // 1. Check core utils extractor first
  if (global.utils && typeof global.utils.extractImageUrl === "function") {
    const extracted = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    if (extracted) return extracted;
  }

  // 2. Direct check on replied message attachments
  if (event.messageReply?.attachments?.length > 0) {
    for (const a of event.messageReply.attachments) {
      const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url || a.media?.image?.uri || a.facebookUrl;
      if (u) return u;
    }
  }

  // 3. Direct check on current message attachments
  if (event.attachments?.length > 0) {
    for (const a of event.attachments) {
      const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url || a.media?.image?.uri || a.facebookUrl;
      if (u) return u;
    }
  }

  // 4. Check if replied message body contains an image link
  if (event.messageReply?.body) {
    const match = event.messageReply.body.match(/https?:\/\/[^\s]+/i);
    if (match && /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(match[0])) {
      return match[0];
    }
  }

  // 5. URL in command arguments
  if (Array.isArray(args) && args.length > 0 && typeof args[0] === "string" && /^https?:\/\//i.test(args[0])) {
    return args[0];
  }

  return null;
}

async function downloadToBuffer(fileUrl) {
  const res = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxContentLength: MAX_ATTACHMENT_BYTES,
    maxBodyLength: MAX_ATTACHMENT_BYTES,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  return Buffer.from(res.data);
}

module.exports = {
  config: {
    name: "edit",
    aliases: ["filter", "imagedit", "ai-edit", "transform", "editimg"],
    version: "4.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "AI image editing & transformation"
    },
    longDescription: {
      en: "Reply to an image with an edit instruction/prompt to transform it using AI image engines or local Canvas effects"
    },
    category: "ai-image",
    guide: {
      en: "Reply to an image with: {pn} <edit prompt>\n\nExamples:\n• Reply to photo: {pn} make it cyberpunk anime style\n• Reply to photo: {pn} 3D Pixar cartoon version\n• Reply to photo: {pn} blur 10\n• Reply to photo: {pn} circle"
    }
  },

  onStart: async function ({ message, event, args, api, commandName }) {
    const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
    let prompt = args.join(" ").trim();
    let imageUrl = extractImageUrlFromEvent(event, args);

    if (imageUrl && args.length > 0 && args[0].startsWith("http")) {
      prompt = args.slice(1).join(" ").trim();
    }

    // Must have a chat image to edit
    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image message or attach an image to edit it.\n\n💡 Example: Reply to an image with: ${prefix}${commandName} turn into cyberpunk anime`
      );
    }

    // Must provide prompt / instruction
    if (!prompt) {
      return message.reply(
        `⚠️ Please provide an edit prompt or effect instruction.\n\n💡 Usage: (reply to image) ${prefix}${commandName} <edit prompt>\n💡 Example: ${prefix}${commandName} make it 3D Pixar cartoon style\n💡 Canvas actions: circle, rounded, blur, sharpen, grayscale, sepia, invert, rotate, flip, resize`
      );
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const CANVAS_ACTIONS = [
      "circle", "rounded", "resize", "crop", "rotate", "flip",
      "blur", "sharpen", "grayscale", "greyscale", "sepia", "invert",
      "brightness", "contrast"
    ];
    const firstArg = (args[0] || "").toLowerCase();

    try {
      let finalStream = null;
      let appliedType = "AI Edit";

      // ─── 1. Local Jimp Canvas Actions (Instant) ───────────────────────────
      if (CANVAS_ACTIONS.includes(firstArg)) {
        appliedType = `Canvas: ${firstArg.toUpperCase()}`;
        const action = firstArg;
        const jimg = await Jimp.read(imageUrl);

        if (action === "circle" || action === "rounded") {
          jimg.circle();
        } else if (action === "grayscale" || action === "greyscale") {
          jimg.greyscale();
        } else if (action === "sepia") {
          jimg.sepia();
        } else if (action === "invert") {
          jimg.invert();
        } else if (action === "blur") {
          const radius = parseInt(args[1], 10) || 5;
          jimg.blur(Math.min(25, Math.max(1, radius)));
        } else if (action === "rotate") {
          const deg = parseInt(args[1], 10) || 90;
          jimg.rotate(deg);
        } else if (action === "flip") {
          const vertical = (args[1] || "").toLowerCase().startsWith("v");
          jimg.flip({ horizontal: !vertical, vertical });
        } else if (action === "resize" && args[1] && args[2]) {
          const w = parseInt(args[1], 10) || 512;
          const h = parseInt(args[2], 10) || 512;
          jimg.resize({ w: Math.min(1920, w), h: Math.min(1920, h) });
        } else if (action === "brightness") {
          const val = parseInt(args[1], 10) || 20;
          jimg.color([{ apply: val >= 0 ? "brighten" : "darken", params: [Math.abs(val)] }]);
        } else if (action === "contrast") {
          const val = parseFloat(args[1]) || 0.3;
          jimg.contrast(Math.min(1, Math.max(-1, val)));
        }

        const buf = await jimg.getBuffer("image/png");
        finalStream = Readable.from(buf);
        finalStream.path = `edit_${action}.png`;
      }

      // ─── 2. Primary: Toshiro AI Image Edit API with Imgur Upload ──────────
      if (!finalStream) {
        let imgurUrl = null;

        // Step A: Upload image to Imgur via Toshiro Imgur API
        try {
          if (imageUrl.includes("imgur.com")) {
            imgurUrl = imageUrl;
          } else {
            const imgurRes = await axios.get(`https://toshiro-api-editz6t9.vercel.app/api/tools/Imgur?url=${encodeURIComponent(imageUrl)}`, { timeout: 15000 });
            if (imgurRes.data?.success && imgurRes.data?.result?.url) {
              imgurUrl = imgurRes.data.result.url;
            }
          }
        } catch (imgErr) {
          console.warn("[EDIT] Imgur upload warning:", imgErr.message);
        }

        const targetUrl = imgurUrl || imageUrl;

        // Step B: Call Toshiro Image Edit API
        try {
          const editApiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/edit?url=${encodeURIComponent(targetUrl)}&prompt=${encodeURIComponent(prompt)}`;
          const editRes = await axios.get(editApiUrl, { timeout: 45000 });
          if (editRes.data?.success && editRes.data?.url) {
            const buffer = await downloadToBuffer(editRes.data.url);
            finalStream = Readable.from(buffer);
            finalStream.path = "edited.png";
            appliedType = `AI Edit (${editRes.data.operator || "Toshiro Editz"})`;
          }
        } catch (editApiErr) {
          console.warn("[EDIT] Toshiro edit API error:", editApiErr.message);
        }
      }

      // ─── 3. Fallback: Goatbot-V2 Edit API (meta.nkx.lol) ──────────────────
      if (!finalStream) {
        try {
          const res = await axios.post(`${BASE_URL}/v1/images/edit`, {
            image_url: imageUrl,
            prompt: prompt,
            project_name: "Floppa image edit"
          }, {
            timeout: 25000,
            validateStatus: () => true
          });

          if (res.status < 400 && res.data) {
            const editedUrl = extractEditedImageUrl(res.data);
            if (editedUrl) {
              const buffer = await downloadToBuffer(editedUrl);
              finalStream = Readable.from(buffer);
              finalStream.path = "edit.jpg";
              appliedType = "AI Transform";
            }
          }
        } catch (_) {
          // Fall through to next fallback
        }
      }

      // ─── 4. Fallback: Pollinations Turbo Img2Img Engine ───────────────────
      if (!finalStream) {
        try {
          const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?image=${encodeURIComponent(imageUrl)}&width=768&height=768&model=turbo&nologo=true`;
          finalStream = await global.utils.getStreamFromURL(turboUrl, "edit.jpg", { timeout: 25000 });
          appliedType = "AI Turbo Edit";
        } catch (turboErr) {
          console.warn("[EDIT] Pollinations turbo failed, using local Jimp fallback:", turboErr.message);
          const jimg = await Jimp.read(imageUrl);
          jimg.contrast(0.2);
          const buf = await jimg.getBuffer("image/png");
          finalStream = Readable.from(buf);
          finalStream.path = "edit.png";
          appliedType = "Enhanced Edit";
        }
      }

      if (!finalStream) {
        throw new Error("Could not produce edited image stream.");
      }

      if (api?.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `✨ ${appliedType} Applied!\n📝 Prompt: "${prompt}"`,
        attachment: finalStream
      });
    } catch (err) {
      console.error("[EDIT COMMAND ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to edit image: ${err.message || err}`);
    }
  }
};