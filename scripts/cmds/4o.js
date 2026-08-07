const zaiApi = require("../../func/zaiApi");

module.exports = {
  config: {
    name: "4o",
    aliases: ["gpt4o", "dalle4o"],
    version: "2.0.0",
    author: "Neoaz ゐ & frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Generate AI image/chat with GPT-4o & zAI" },
    longDescription: { en: "Generate images or text using GPT-4o, Nano Banana Pro, and zAI model providers." },
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ message, event, api, args }) {
    const hasPrompt = args.length > 0;

    if (!hasPrompt) {
      return message.reply("Please provide a prompt.");
    }

    const prompt = args.join(" ").trim();

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const result = await zaiApi.generateOrEditImage({
        prompt,
        model: "gpt-4o",
        ratio: "1:1"
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: `✨ Image generated via ${result.provider}`,
        attachment: await global.utils.getStreamFromURL(result.imageUrl, "4o.png")
      });

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Error while generating image: ${err.message}`);
    }
  }
};
