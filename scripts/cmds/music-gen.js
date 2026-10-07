const axios = require("axios");
const { Readable } = require("stream");

// In-memory zero-latency cache for generated tracks with automatic storage cleanup
const audioCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

function normalizeKey(str) {
  return String(str || "").toLowerCase().replace(/\s+/g, " ").trim();
}


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
  const item = audioCache.get(normalizeKey(key));
  if (item && Date.now() - item.time < CACHE_TTL_MS) {
    return item.audioUrl;
  }
  return null;
}

function setCached(key, audioUrl) {
  if (audioUrl) {
    pruneCache();
    audioCache.set(normalizeKey(key), { audioUrl, time: Date.now() });
  }
}

async function fetchAiMusic(prompt) {
  const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/ai-music?prompt=${encodeURIComponent(prompt)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  };

  try {
    const response = await axios.get(apiUrl, {
      timeout: 120000,
      headers,
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(120000) : undefined
    });

    const audioUrl = response.data?.result?.audio;
    if (audioUrl) {
      return { success: true, audioUrl };
    }

    const msg = response.data?.message || response.data?.error || "";
    return {
      success: false,
      isRateLimited: msg.toLowerCase().includes("too many requests") || response.status === 429,
      message: msg
    };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || "";
    const isTimeout = err.code === "ECONNABORTED" || err.name === "AbortError" || msg.toLowerCase().includes("timeout");
    const isRateLimited = status === 429 || msg.toLowerCase().includes("too many requests");

    return {
      success: false,
      isTimeout,
      isRateLimited,
      message: msg
    };
  }
}

async function getAudioStream(audioUrl) {
  // Download into in-memory buffer: zero disk writes, 100% reliable Mercury upload
  try {
    const res = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      timeout: 45000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const stream = Readable.from(Buffer.from(res.data));
    stream.path = "music.mp3";
    return stream;
  } catch (_) {
    if (global.utils && typeof global.utils.getStreamFromURL === "function") {
      return await global.utils.getStreamFromURL(audioUrl, "music.mp3", {
        timeout: 45000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    }
    throw _;
  }
}

module.exports = {
  config: {
    name: "music-gen",
    aliases: [
      "aimusic",
      "musicgen",
      "songgen",
      "songen",
      "singgen",
      "singen",
      "aimusicgen",
      "gensong",
      "genmusic",
      "songai",
      "aisong",
      "sing-gen",
      "song-gen",
      "music-ai",
      "aimusic-gen"
    ],
    version: "1.3.1",
    author: "frnAlt",
    countDown: 1, // Minimal cooldown to eliminate command delay
    role: 0,
    noPrefix: "both",
    shortDescription: {
      en: "Generate AI music from prompt"
    },
    longDescription: {
      en: "Generate realistic songs and audio tracks using AI with a custom prompt or lyrics description. Supports both prefix and non-prefix execution."
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
    const react = (emoji) => {
      try {
        if (api?.setMessageReaction) {
          api.setMessageReaction(emoji, event.messageID, () => {}, true);
        } else if (typeof message?.reaction === "function") {
          message.reaction(emoji, event.messageID);
        }
      } catch (_) {}
    };

    // Very first response like edit.js: instant ⏳ reaction
    react("⏳");

    // Continuous typing indicator loop so Messenger stays active during long generation
    const sendTyping = () => {
      try {
        if (typeof message?.typing === "function") {
          message.typing(true, event.threadID).catch(() => {});
        } else if (typeof api?.sendTypingIndicator === "function") {
          api.sendTypingIndicator(event.threadID, () => {});
        }
      } catch (_) {}
    };
    sendTyping();
    const typingInterval = setInterval(sendTyping, 6000);

    let prompt = args.join(" ").trim();
    if (!prompt && event.messageReply && event.messageReply.body) {
      prompt = event.messageReply.body.trim();
    }

    if (!prompt) {
      clearInterval(typingInterval);
      react("👎");
      const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
      return message.reply(
        `🎵 Please provide a description or prompt for the AI music.\n\n💡 Usage: ${prefix}${commandName || "songen"} <prompt/style/lyrics>\n💡 Examples:\n• ${prefix}${commandName || "songen"} bangla romantic song\n• ${prefix}${commandName || "songen"} chill lofi beat\n• ${prefix}${commandName || "songen"} acoustic guitar with male vocal`
      );
    }

    try {
      // 1. Check in-memory cache for instant 0ms return
      let audioUrl = getCached(prompt);

      // 2. Pure AI Music generation via Toshiro AI Music API (strictly only AI music, no external downloaders)
      if (!audioUrl) {
        const result = await fetchAiMusic(prompt);
        if (result.success && result.audioUrl) {
          audioUrl = result.audioUrl;
        } else {
          clearInterval(typingInterval);
          react("👎");
          if (result.isRateLimited) {
            return message.reply("⚠️ The AI music generator is currently busy (\"Too many requests. Please wait.\"). Please wait a moment and try again.");
          }
          if (result.isTimeout) {
            return message.reply(getLang("timeout"));
          }
          return message.reply(getLang("error"));
        }
      }

      // Cache successful audio URL (in-memory LRU)
      setCached(prompt, audioUrl);

      // Stream into FCA uploader without saving to disk (100% memory-clean)
      const stream = await getAudioStream(audioUrl);

      clearInterval(typingInterval);

      // Success reaction matching edit.js (👍)
      react("👍");

      // User requirement: ONLY MP3 audio output, without text
      return await message.reply({
        attachment: stream
      });
    } catch (err) {
      clearInterval(typingInterval);
      react("👎");
      return message.reply(getLang("error"));
    } finally {
      clearInterval(typingInterval);
    }
  }
};
