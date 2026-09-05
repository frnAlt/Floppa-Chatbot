const axios = require("axios");

module.exports = {
  config: {
    name: "gptimg",
    aliases: ["gptimage", "gpt4img", "gptart"],
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
      let stream = null;
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/gptimg?prompt=${encodeURIComponent(prompt)}`;
        const res = await axios.get(apiUrl, { timeout: 2500 });
        if (res.data?.success && res.data.result?.image) {
          stream = await global.utils.getStreamFromURL(res.data.result.image, "gptimg.jpg", { timeout: 10000 });
        }
      } catch (_) {}

      if (!stream) {
        const enhancedPrompt = `${prompt}, photorealistic, high resolution, hyperdetailed, masterpiece`;
        const seed = Math.floor(Math.random() * 1000000);
        const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;
        stream = await global.utils.getStreamFromURL(turboUrl, "gptimg.jpg", { timeout: 15000 });
      }

      await message.reply({
        body: `✨ GPT Image Generated:\n\n📝 Prompt: "${prompt}"`,
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
