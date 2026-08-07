const zaiApi = require("../../func/zaiApi");

module.exports = {
  config: {
    name: "nbpro",
    version: "2.0.0",
    aliases: ["edit", "nb", "nanobanana", "nanobanana-pro", "nanobananapro", "g3pro", "aipedit"],
    author: "Tawsif~ & frnAlt",
    category: "ai",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Edit & generate images/text using Nano Banana Pro" },
    longDescription: { en: "Generate high quality AI images or edit reply images using Nano Banana Pro, Gemini 3 Pro, and zAI models." },
    guide: { en: "{pn} <prompt> [--ar=1:1] | reply to an image with prompt" }
  },

  onStart: async function ({ message, event, args }) {
    let prompt = args.join(" ").trim();
    const messageReply = event.messageReply;

    const hasAttachment = messageReply && messageReply.attachments && messageReply.attachments.length > 0;

    if (!prompt && !hasAttachment) {
      return message.reply("🍌 Please provide a prompt or reply to an image.");
    }

    let ratio = prompt.match(/--ar[= ](\d+:\d+)/)?.[1] || "1:1";
    if (ratio) {
      prompt = prompt.replace(/--ar[= ]\d+:\d+/, "").trim();
    }

    message.reaction("⏳", event.messageID);

    try {
      if (!hasAttachment) {
        // Image generation or text response
        const result = await zaiApi.generateOrEditImage({
          prompt: prompt || "Generate a beautiful landscape",
          model: "nano-banana-pro",
          ratio
        });

        message.reaction("✅", event.messageID);
        return message.reply({
          body: `✅ | Generated via ${result.provider}`,
          attachment: await global.utils.getStreamFromURL(result.imageUrl, "gen.png")
        });
      } else {
        // Image editing mode
        let imageUrls = [];
        for (let i = 0; i < messageReply.attachments.length; i++) {
          if (messageReply.attachments[i].type === "photo") {
            imageUrls.push(messageReply.attachments[i].url);
          }
        }

        if (imageUrls.length === 0) {
          message.reaction("❌", event.messageID);
          return message.reply("Please reply to a valid photo attachment.");
        }

        const result = await zaiApi.generateOrEditImage({
          prompt: prompt || "Enhance this image",
          model: "nano-banana-pro",
          imageUrls,
          ratio
        });

        message.reaction("✅", event.messageID);
        return message.reply({
          body: `✅ | Image Edited via ${result.provider}`,
          attachment: await global.utils.getStreamFromURL(result.imageUrl, "edit.png")
        });
      }
    } catch (error) {
      message.reaction("❌", event.messageID);
      return message.reply(`❌ Error processing request: ${error.message}`);
    }
  }
};