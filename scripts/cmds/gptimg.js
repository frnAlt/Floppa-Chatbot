const axios = require("axios");

module.exports = {
  config: {
    name: "gptimg",
    aliases: ["gptimage", "gpt4img", "aiimage", "gptart"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 8,
    role: 0,
    shortDescription: {
      en: "Generate AI image using GPT Image / DALL-E"
    },
    longDescription: {
      en: "Generates high quality AI art using Toshiro GPT Image API based on your text prompt"
    },
    category: "ai",
    guide: {
      en: "{pn} <your image prompt>"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} a cute little kitten wearing headphones`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("✨", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/gptimg?prompt=${encodeURIComponent(prompt)}`;
      const res = await axios.get(apiUrl, { timeout: 90000 });

      if (!res.data || !res.data.success || !res.data.result || !res.data.result.image) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to generate GPT image. Please try a different prompt.");
      }

      const { image, short, ratio } = res.data.result;
      const stream = await global.utils.getStreamFromURL(image, "gptimg.jpg");

      await message.reply({
        body: `✨ GPT Image Generated:\n\n📝 Prompt: "${prompt}"\n📐 Aspect Ratio: ${ratio || "1:1"}${short ? `\n🔗 Link: ${short}` : ""}`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("GPT Image error:", err);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ GPT Image generation failed: ${err.message || err}`);
    }
  }
};
