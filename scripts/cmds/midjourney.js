const axios = require("axios");

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "midjourneyai", "mjai"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Generate AI images with MidJourney"
    },
    longDescription: {
      en: "Generates 4 high quality AI image variations based on your prompt using Toshiro MidJourney API"
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
        `❌ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} a futuristic cyber samurai in Tokyo neon rain`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/mj?prompt=${encodeURIComponent(prompt)}`;
      const res = await axios.get(apiUrl, { timeout: 90000 });

      if (!res.data || !res.data.success || !res.data.result) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to generate MidJourney images. Please try a different prompt.");
      }

      const { images, image } = res.data.result;
      const imageUrls = images && images.length > 0 ? images : (image ? [image] : []);

      if (imageUrls.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ No image data returned from MidJourney API.");
      }

      const streamPromises = imageUrls.map((url, i) =>
        global.utils.getStreamFromURL(url, `mj_${Date.now()}_${i}.png`).catch(() => null)
      );

      const attachments = (await Promise.all(streamPromises)).filter(Boolean);

      if (attachments.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to load image attachments.");
      }

      await message.reply({
        body: `🎨 MidJourney AI Generated:\n\n✨ Prompt: "${prompt}"\n🖼️ Variations: ${attachments.length}`,
        attachment: attachments
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("MidJourney command error:", err);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ MidJourney generation failed: ${err.message || err}`);
    }
  }
};
