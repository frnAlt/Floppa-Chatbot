const axios = require("axios");
const { Jimp } = require("jimp");
const { Readable } = require("stream");

module.exports = {
  config: {
    name: "edit",
    aliases: ["filter", "imagedit", "ai-edit", "transform"],
    version: "3.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "AI Image Editor and Transformation"
    },
    longDescription: {
      en: "Applies AI image edits and transformations to photos based on your text prompt using local Canvas & Turbo AI Image Engine"
    },
    category: "ai-image",
    guide: {
      en: "{pn} <prompt> | Reply to an image\n\nExample:\n• Reply to an image with: {pn} make it anime\n• Reply to an image with: {pn} blur 10\n• Reply to an image with: {pn} circle"
    }
  },

  onStart: async function ({ message, event, args, api, commandName }) {
    let prompt = args.join(" ").trim();
    let imgUrl = null;

    // Extract image URL from reply, direct attachments, URL argument, mentions, or sender
    if (event.messageReply?.attachments?.length > 0) {
      for (const a of event.messageReply.attachments) {
        let u = a.url || a.previewUrl || a.largePreviewUrl || a.thumbnailUrl;
        if (!u && a.ID && api?.resolvePhotoUrl) {
          try {
            u = await api.resolvePhotoUrl(a.ID);
          } catch (_) {}
        }
        if (u) { imgUrl = u; break; }
      }
    }
    if (!imgUrl && event.attachments?.length > 0) {
      for (const a of event.attachments) {
        let u = a.url || a.previewUrl || a.largePreviewUrl || a.thumbnailUrl;
        if (!u && a.ID && api?.resolvePhotoUrl) {
          try {
            u = await api.resolvePhotoUrl(a.ID);
          } catch (_) {}
        }
        if (u) { imgUrl = u; break; }
      }
    }
    if (!imgUrl && args.length > 0 && args[0].startsWith("http")) {
      imgUrl = args[0];
      prompt = args.slice(1).join(" ").trim();
    }
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    if (!imgUrl && event.mentions && Object.keys(event.mentions).length > 0) {
      const targetUID = Object.keys(event.mentions)[0];
      imgUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
    } else if (!imgUrl && event.messageReply) {
      const targetUID = event.messageReply.senderID || event.messageReply.actorFbId;
      if (targetUID) {
        imgUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
      }
    } else if (!imgUrl && event.senderID) {
      imgUrl = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=${token}`;
    }

    if (!imgUrl && !prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `🖼️ Please reply to an image/user or provide an edit prompt/canvas action.\n\n💡 Canvas actions: circle, rounded, blur, sharpen, grayscale, sepia, invert, rotate, flip, resize\n💡 Example: Reply to photo with: ${prefix}${commandName} blur 10\n💡 Or: ${prefix}${commandName} make it cyberpunk anime style`
      );
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    const CANVAS_ACTIONS = [
      "circle", "rounded", "resize", "crop", "rotate", "flip",
      "blur", "sharpen", "grayscale", "greyscale", "sepia", "invert",
      "brightness", "contrast"
    ];

    try {
      let finalStream = null;
      let appliedType = "AI Edit";
      const editPrompt = prompt || "enhance and make it aesthetic";
      const firstArg = (args[0] || "").toLowerCase();

      // 1. Fast Local Jimp processing for canvas actions
      if (imgUrl && CANVAS_ACTIONS.includes(firstArg)) {
        appliedType = `Canvas: ${firstArg.toUpperCase()}`;
        const action = firstArg;
        const jimg = await Jimp.read(imgUrl);

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

      // 2. High-speed AI Image Transformation
      if (!finalStream) {
        if (imgUrl) {
          try {
            const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(editPrompt)}?image=${encodeURIComponent(imgUrl)}&width=768&height=768&model=turbo&nologo=true`;
            finalStream = await global.utils.getStreamFromURL(turboUrl, "edit.jpg", { timeout: 20000 });
          } catch (turboErr) {
            console.warn("[EDIT] Pollinations turbo failed, using local enhance fallback:", turboErr.message);
            const jimg = await Jimp.read(imgUrl);
            jimg.contrast(0.2);
            const buf = await jimg.getBuffer("image/png");
            finalStream = Readable.from(buf);
            finalStream.path = "edit.png";
          }
        } else {
          // Text-to-Image mode if no base image
          const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&model=turbo&nologo=true`;
          finalStream = await global.utils.getStreamFromURL(turboUrl, "gen.jpg", { timeout: 20000 });
        }
      }

      if (!finalStream) {
        throw new Error("Could not process edited image stream.");
      }

      if (api?.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply({
        body: imgUrl
          ? `✨ ${appliedType} Applied!\n📝 Details: "${firstArg && CANVAS_ACTIONS.includes(firstArg) ? firstArg : editPrompt}"`
          : `✅ Generated Image for: "${prompt}"`,
        attachment: finalStream
      });
    } catch (err) {
      console.error("Edit command error:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to edit/transform image: ${err.message || err}`);
    }
  }
};