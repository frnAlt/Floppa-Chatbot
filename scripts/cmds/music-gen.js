const axios = require("axios");

module.exports = {
  config: {
    name: "music-gen",
    aliases: ["aimusic", "musicgen", "songgen", "aimusicgen"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Generate AI music from prompt"
    },
    longDescription: {
      en: "Generate realistic songs and audio tracks using AI with a custom prompt or lyrics description"
    },
    category: "ai",
    guide: {
      en: "{pn} <song prompt/style/lyrics>"
    }
  },

  langs: {
    en: {
      missingPrompt: "Please provide a description or prompt for the AI music (e.g. {pn} bangla romantic song)",
      error: "Failed to generate AI music. Please try again later.",
      timeout: "Music generation timed out. Please try with a simpler prompt."
    }
  },

  onStart: async function ({ api, event, args, message, getLang }) {
    let prompt = args.join(" ").trim();
    if (!prompt && event.messageReply && event.messageReply.body) {
      prompt = event.messageReply.body.trim();
    }

    if (!prompt) {
      return message.reply(getLang("missingPrompt"));
    }

    if (typeof message.reaction === "function") {
      try {
        message.reaction("⏳", event.messageID);
      } catch (_) {}
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/ai-music?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl, {
        timeout: 120000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const audioUrl = response.data?.result?.audio;
      if (!audioUrl) {
        if (typeof message.reaction === "function") {
          try { message.reaction("👎", event.messageID); } catch (_) {}
        }
        return message.reply(getLang("error"));
      }

      const stream = await global.utils.getStreamFromURL(audioUrl, "music.mp3");

      if (typeof message.reaction === "function") {
        try { message.reaction("🎵", event.messageID); } catch (_) {}
      }

      // User requirement: ONLY MP3 audio output, without text
      return message.reply({
        attachment: stream
      });
    } catch (err) {
      if (typeof message.reaction === "function") {
        try { message.reaction("❌", event.messageID); } catch (_) {}
      }
      return message.reply(getLang("error"));
    }
  }
};
