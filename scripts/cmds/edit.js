const axios = require("axios");

module.exports = {
  config: {
    name: "edit",
    aliases: ["filter", "imagedit", "ai-edit", "transform"],
    version: "3.0.0",
    author: "frnAlt",
    countDown: 8,
    role: 0,
    shortDescription: {
      en: "AI Image Editor and Transformation"
    },
    longDescription: {
      en: "Applies AI image edits and transformations to photos based on your text prompt using Toshiro AI Image Editor"
    },
    category: "ai-image",
    guide: {
      en: "{pn} <prompt> | Reply to an image\n\nExample:\n• Reply to an image with: {pn} make it anime\n• Reply to an image with: {pn} add sunglasses and cyberpunk neon lighting"
    }
  },

  onStart: async function ({ message, event, args, api, commandName }) {
    let prompt = args.join(" ").trim();
    let imgUrl = null;

    // Extract image URL from reply, direct attachments, URL argument, mentions, or sender
    if (event.messageReply?.attachments?.length > 0) {
      for (const a of event.messageReply.attachments) {
        const u = a.url || a.previewUrl || a.largePreviewUrl || a.thumbnailUrl;
        if (u) { imgUrl = u; break; }
      }
    }
    if (!imgUrl && event.attachments?.length > 0) {
      for (const a of event.attachments) {
        const u = a.url || a.previewUrl || a.largePreviewUrl || a.thumbnailUrl;
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

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    const CANVAS_ACTIONS = [
      "circle", "rounded", "resize", "crop", "rotate", "flip",
      "blur", "sharpen", "grayscale", "sepia", "invert",
      "brightness", "contrast", "saturation", "hue"
    ];

    try {
      let finalStream = null;
      let appliedType = "AI Edit";
      const editPrompt = prompt || "enhance and make it aesthetic";
      const firstArg = (args[0] || "").toLowerCase();

      if (imgUrl && CANVAS_ACTIONS.includes(firstArg)) {
        appliedType = `Canvas: ${firstArg.toUpperCase()}`;
        const action = firstArg;
        const val = args[1];
        const params = new URLSearchParams();
        params.append("action", action);
        params.append("imgUrl", imgUrl);
        if (action === "rotate" || action === "angle") {
          if (val) params.append("angle", val);
        } else if (action === "flip") {
          params.append("mode", val && val.startsWith("v") ? "vertical" : "horizontal");
        } else if (action === "rounded" || action === "circle") {
          if (val) params.append("radius", val);
        } else if (action === "resize" && args[2]) {
          params.append("width", args[1]);
          params.append("height", args[2]);
        } else if (val && !isNaN(Number(val))) {
          params.append("value", val);
        }

        try {
          const canvasApiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/canvas?${params.toString()}`;
          finalStream = await global.utils.getStreamFromURL(canvasApiUrl, `edit_${action}.jpg`);
        } catch (e) {
          console.warn("Toshiro canvas action failed:", e.message);
        }
      }

      if (imgUrl) {
        if (!finalStream) {
          // 1. Primary: Toshiro AI Image Edit API
          try {
            const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/edit?url=${encodeURIComponent(imgUrl)}&prompt=${encodeURIComponent(editPrompt)}`;
            finalStream = await global.utils.getStreamFromURL(apiUrl, "edit.jpg");
          } catch (e) {
            console.warn("Toshiro Image Edit failed, using fallback:", e.message);
          }

          // 2. Fallback: Pollinations img2img
          if (!finalStream) {
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(editPrompt)}?image=${encodeURIComponent(imgUrl)}&width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
            finalStream = await global.utils.getStreamFromURL(fallbackUrl, "edit.png");
          }
        }
      } else {
        // Text-to-Image mode if no image provided
        try {
          const genUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/gptimg?prompt=${encodeURIComponent(prompt)}`;
          const res = await axios.get(genUrl, { timeout: 60000 });
          if (res.data && res.data.success && res.data.result?.image) {
            finalStream = await global.utils.getStreamFromURL(res.data.result.image, "gen.jpg");
          }
        } catch (e) {
          console.warn("GPTImg gen failed, using Pollinations:", e.message);
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
          finalStream = await global.utils.getStreamFromURL(pollinationsUrl, "gen.png");
        }
      }

      if (!finalStream) {
        throw new Error("Could not process edited image stream.");
      }

      if (api.setMessageReaction) {
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
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to edit/transform image: ${err.message || err}`);
    }
  }
};