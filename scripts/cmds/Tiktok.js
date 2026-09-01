const axios = require("axios");

module.exports = {
  config: {
    name: "tiktok",
    aliases: ["tt", "tiksearch", "tiktoksearch", "tik"],
    version: "1.2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download TikTok video or audio"
    },
    longDescription: {
      en: "Search TikTok by keyword and download the matching video directly or audio using the -a flag"
    },
    category: "media",
    guide: {
      en: "{pn} <search query>\n{pn} -a <search query> (audio only)\n{pn} -v <search query>"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    if (!args[0]) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide a search query.\n\n📖 Usage:\n• ${prefix}${commandName} <keyword>\n• ${prefix}${commandName} -a <keyword> (audio only)\n\n💡 Example:\n• ${prefix}${commandName} Demon Slayer edit`
      );
    }

    let isAudio = false;
    let query = args.join(" ").trim();

    if (args[0] === "-a" || args[0] === "--audio" || args[0] === "-m" || args[0] === "audio") {
      isAudio = true;
      query = args.slice(1).join(" ").trim();
    } else if (args[0] === "-v" || args[0] === "--video" || args[0] === "video") {
      isAudio = false;
      query = args.slice(1).join(" ").trim();
    }

    if (!query) {
      return message.reply("❌ Please provide a search query.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🔎", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(query)}`;
      const res = await axios.get(apiUrl, { timeout: 30000 });

      if (!res.data || !res.data.success || !res.data.result) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No TikTok results found for "${query}".`);
      }

      const { title, author, duration, video, music } = res.data.result;
      const mediaUrl = isAudio ? (music || video) : video;

      if (!mediaUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Unable to retrieve media download link.");
      }

      const stream = await global.utils.getStreamFromURL(
        mediaUrl,
        isAudio ? "tiktok_audio.mp3" : "tiktok_video.mp4"
      );

      const bodyText = isAudio
        ? `🎵 TikTok Audio\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`
        : `🎬 TikTok Video\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`;

      await message.reply({
        body: bodyText,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("TikTok command error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to fetch TikTok media: ${error.message || error}`);
    }
  }
};
