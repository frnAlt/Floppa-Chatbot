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

    // Extract image URL from reply, direct attachments, or url argument
    if (event.messageReply?.attachments?.length > 0) {
      const att = event.messageReply.attachments.find(a => a.type === "photo" || a.type === "image");
      if (att && att.url) imgUrl = att.url;
    } else if (event.attachments?.length > 0) {
      const att = event.attachments.find(a => a.type === "photo" || a.type === "image");
      if (att && att.url) imgUrl = att.url;
    } else if (args.length > 0 && args[0].startsWith("http")) {
      imgUrl = args[0];
      prompt = args.slice(1).join(" ").trim();
    }

    if (!imgUrl && !prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `🖼️ Please reply to an image with an edit instruction/prompt.\n\n💡 Example: Reply to a photo with: ${prefix}${commandName} make it cyberpunk anime style`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    try {
      let finalStream = null;
      const editPrompt = prompt || "enhance and make it aesthetic";

      if (imgUrl) {
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
          ? `✨ AI Image Edit Applied!\n📝 Prompt: "${editPrompt}"`
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