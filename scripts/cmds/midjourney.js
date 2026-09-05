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
      let attachments = [];

      // 1. Primary: Toshiro MidJourney API (with fast 2.5s timeout)
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/mj?prompt=${encodeURIComponent(prompt)}`;
        const res = await axios.get(apiUrl, { timeout: 2500 });

        if (res.data && res.data.success && res.data.result) {
          const { images, image } = res.data.result;
          const imageUrls = images && images.length > 0 ? images : (image ? [image] : []);
          if (imageUrls.length > 0) {
            const streamPromises = imageUrls.map((url, i) =>
              global.utils.getStreamFromURL(url, `mj_${Date.now()}_${i}.png`).catch(() => null)
            );
            attachments = (await Promise.all(streamPromises)).filter(Boolean);
          }
        }
      } catch (primaryErr) {
        // Fast failover to high-speed Pollinations turbo
      }

      // 2. High-speed Fallback: Pollinations MidJourney simulation
      if (attachments.length === 0) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " masterpiece midjourney v6 style 8k octane render cinematic lighting")}?width=768&height=768&nologo=true&seed=${Date.now()}&model=turbo`;
        const stream = await global.utils.getStreamFromURL(fallbackUrl, `mj_${Date.now()}.png`, { timeout: 15000 }).catch(() => null);
        if (stream) {
          attachments.push(stream);
        }
      }

      if (attachments.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to generate MidJourney images. Please try a different prompt.");
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
