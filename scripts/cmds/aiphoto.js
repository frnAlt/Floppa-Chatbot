const zaiApi = require("../../func/zaiApi");

module.exports = {
  config: {
    name: "aiphoto",
    aliases: ["aip", "aiphotopro"],
    version: "2.0.0",
    author: "Neoaz ゐ & frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Generate AI photos with AI Photo & Nano Banana" },
    longDescription: { en: "Generate high-quality photographic images using AI Photo, Nano Banana Pro, and zAI models." },
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ message, event, api, args }) {
    const hasPrompt = args.length > 0;

    if (!hasPrompt) {
      return message.reply("Please provide a prompt for AI Photo.");
    }

    const prompt = args.join(" ").trim();

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const result = await zaiApi.generateOrEditImage({
        prompt,
        model: "ai-photo",
        ratio: "1:1"
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: `✨ Image generated via ${result.provider}`,
        attachment: await global.utils.getStreamFromURL(result.imageUrl, "aiphoto.png")
      });

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Error generating AI Photo: ${err.message}`);
    }
  }
};
