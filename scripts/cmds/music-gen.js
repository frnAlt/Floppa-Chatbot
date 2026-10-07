const axios = require("axios");

// In-memory zero-latency cache for generated tracks with automatic storage cleanup
const audioCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

function pruneCache() {
  const now = Date.now();
  for (const [key, item] of audioCache.entries()) {
    if (now - item.time > CACHE_TTL_MS) {
      audioCache.delete(key);
    }
  }
  while (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value;
    audioCache.delete(oldestKey);
  }
}

function getCached(key) {
  pruneCache();
  const item = audioCache.get(key.toLowerCase().trim());
  if (item && Date.now() - item.time < CACHE_TTL_MS) {
    return item.audioUrl;
  }
  return null;
}

function setCached(key, audioUrl) {
  if (audioUrl) {
    pruneCache();
    audioCache.set(key.toLowerCase().trim(), { audioUrl, time: Date.now() });
  }
}

async function fetchAiMusic(prompt) {
  const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/ai-music?prompt=${encodeURIComponent(prompt)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.get(apiUrl, { timeout: 60000, headers });
      const audioUrl = response.data?.result?.audio;
      if (audioUrl) return audioUrl;
    } catch (err) {
      if (attempt === 1 && err.response?.status === 500) {
        // Quick retry if temporarily throttled
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
    }
  }
  return null;
}

module.exports = {
  config: {
    name: "music-gen",
    aliases: ["aimusic", "musicgen", "songgen", "songen", "aimusicgen", "gensong"],
    version: "1.2.0",
    author: "frnAlt",
    countDown: 1, // Minimal cooldown to eliminate command delay
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

  onStart: async function ({ api, event, args, message, getLang, commandName }) {
    // Very first response like edit.js: instant ⏳ reaction
    if (api?.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    } else if (typeof message.reaction === "function") {
      try { message.reaction("⏳", event.messageID); } catch (_) {}
    }

    if (typeof message.typing === "function") {
      message.typing(true, event.threadID).catch(() => {});
    } else if (typeof api?.sendTypingIndicator === "function") {
      api.sendTypingIndicator(event.threadID, () => {});
    }

    let prompt = args.join(" ").trim();
    if (!prompt && event.messageReply && event.messageReply.body) {
      prompt = event.messageReply.body.trim();
    }

    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
      return message.reply(
        `🎵 Please provide a description or prompt for the AI music.\n\n💡 Usage: ${prefix}${commandName || "songen"} <prompt/style/lyrics>\n💡 Examples:\n• ${prefix}${commandName || "songen"} bangla romantic song\n• ${prefix}${commandName || "songen"} chill lofi beat\n• ${prefix}${commandName || "songen"} acoustic guitar with male vocal`
      );
    }

    try {
      // 1. Check in-memory cache for instant 0ms return
      let audioUrl = getCached(prompt);

      // 2. Pure AI Music generation via Toshiro AI Music API (only AI music, no external downloaders)
      if (!audioUrl) {
        audioUrl = await fetchAiMusic(prompt);
      }

      if (!audioUrl) {
        if (api?.setMessageReaction) {
          api.setMessageReaction("👎", event.messageID, () => {}, true);
        } else if (typeof message.reaction === "function") {
          try { message.reaction("👎", event.messageID); } catch (_) {}
        }
        return message.reply(getLang("error"));
      }

      // Cache successful audio URL
      setCached(prompt, audioUrl);

      // Stream directly into FCA uploader without saving to disk first
      let stream;
      if (global.utils && typeof global.utils.getStreamFromURL === "function") {
        stream = await global.utils.getStreamFromURL(audioUrl, "music.mp3", {
          timeout: 30000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      } else {
        const res = await axios({
          method: "GET",
          url: audioUrl,
          responseType: "stream",
          timeout: 30000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        res.data.path = "music.mp3";
        stream = res.data;
      }

      // Success reaction matching edit.js (👍)
      if (api?.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      } else if (typeof message.reaction === "function") {
        try { message.reaction("👍", event.messageID); } catch (_) {}
      }

      // User requirement: ONLY MP3 audio output, without text
      return message.reply({
        attachment: stream
      });
    } catch (err) {
      if (api?.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      } else if (typeof message.reaction === "function") {
        try { message.reaction("👎", event.messageID); } catch (_) {}
      }
      return message.reply(getLang("error"));
    }
  }
};
