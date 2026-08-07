const zaiApi = require("../../func/zaiApi");

module.exports = {
  config: {
    name: "gpt2",
    aliases: ["gpt", "gptimg"],
    version: "2.0.0",
    author: "Neoaz 🐦 & frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Generate or edit images with GPT & Nano Banana" },
    longDescription: { en: "Generate high-quality images or edit them via reply using GPT-4o, Nano Banana Pro, and zAI logic." },
    category: "ai",
    guide: { en: "{pn} <prompt> [--ar 1:1] (or reply to an image)" }
  },

  onStart: async function ({ message, event, args }) {
    let prompt = args.join(" ").trim();
    let imageUrl = null;
    let aspectRatio = "16:9";

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    if (arMatch) {
      aspectRatio = arMatch[1];
      prompt = prompt.replace(arMatch[0], "").trim();
    }

    if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
      const attachment = event.messageReply.attachments[0];
      if (attachment.type === "photo") imageUrl = attachment.url;
    }

    if (!prompt && !imageUrl) return message.reply("Please provide a prompt or reply to an image.");

    const statusMsg = imageUrl ? "✂️ Editing..." : "⏳ Generating...";
    await message.reply(statusMsg);

    try {
      const result = await zaiApi.generateOrEditImage({
        prompt: prompt || "Process image",
        model: "gpt-4o",
        imageUrls: imageUrl ? [imageUrl] : [],
        ratio: aspectRatio
      });

      return message.reply({
        body: `✅ Result via ${result.provider}:`,
        attachment: await global.utils.getStreamFromURL(result.imageUrl, "gpt.png")
      });

    } catch (error) {
      message.reply(`❌ Error: ${error.message}`);
    }
  }
};
