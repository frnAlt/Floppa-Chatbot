const axios = require("axios");

// In-memory zero-latency cache for generated/resolved tracks (TTL: 30 minutes)
const audioCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key) {
  const item = audioCache.get(key.toLowerCase().trim());
  if (item && Date.now() - item.time < CACHE_TTL_MS) {
    return item.audioUrl;
  }
  return null;
}

function setCached(key, audioUrl) {
  if (audioUrl) {
    audioCache.set(key.toLowerCase().trim(), { audioUrl, time: Date.now() });
  }
}

async function fetchAiMusic(prompt) {
  try {
    const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/ai-music?prompt=${encodeURIComponent(prompt)}`;
    const response = await axios.get(apiUrl, {
      timeout: 25000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    return response.data?.result?.audio || null;
  } catch (_) {
    return null;
  }
}

async function searchFacebookMusic(api, query) {
  try {
    let tracks = [];
    if (typeof api?.searchMusic === "function") {
      const res = await api.searchMusic(query, { count: 3 });
      tracks = res?.tracks || [];
    } else if (typeof api?.music?.search === "function") {
      const res = await api.music.search(query, { count: 3 });
      tracks = res?.tracks || [];
    } else if (typeof global.GoatBot?.fcaApi?.searchMusic === "function") {
      const res = await global.GoatBot.fcaApi.searchMusic(query, { count: 3 });
      tracks = res?.tracks || [];
    } else {
      const searchMusicFactory = require("../../fca/src/searchMusic");
      const defaultFuncs = api?.__defaultFuncs || api?.defaultFuncs;
      if (defaultFuncs) {
        const fn = searchMusicFactory(defaultFuncs, api, api?.ctx || {});
        const res = await fn(query, { count: 3 });
        tracks = res?.tracks || [];
      }
    }
    const found = tracks.find(t => t && t.audioUrl);
    return found?.audioUrl || null;
  } catch (_) {
    return null;
  }
}

async function searchSoundCloud(query) {
  try {
    const scUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/scdl?search=${encodeURIComponent(query)}&download=1`;
    const res = await axios.get(scUrl, { timeout: 12000 });
    const match = res.data?.results?.find(r => r && (r.download_url || r.mp3 || r.preview));
    return match?.download_url || match?.mp3 || match?.preview || null;
  } catch (_) {
    return null;
  }
}

async function searchYouTubeAudio(query) {
  try {
    const ytaUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(query)}&download=1`;
    const res = await axios.get(ytaUrl, { timeout: 15000 });
    return res.data?.result?.download_url || res.data?.result?.preview || null;
  } catch (_) {
    return null;
  }
}

module.exports = {
  config: {
    name: "music-gen",
    aliases: ["aimusic", "musicgen", "songgen", "songen", "aimusicgen", "gensong"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 1, // Minimal cooldown to eliminate command delay
    role: 0,
    shortDescription: {
      en: "Generate AI music from prompt"
    },
    longDescription: {
      en: "Generate realistic songs and audio tracks using AI or direct stream from prompt"
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
        if (typeof message.reaction === "function") {
          message.reaction(emoji, event.messageID);
        } else if (typeof api?.setMessageReaction === "function") {
          api.setMessageReaction(emoji, event.messageID, () => {}, true);
        }
      } catch (_) {}
    };

    // Instant acceptance reaction like edit.js
    react("⏳");

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
        `🎵 Please provide a song name, style, or lyrics prompt.\n\n💡 Usage: ${prefix}${commandName || "songen"} <song prompt>\n💡 Examples:\n• ${prefix}${commandName || "songen"} believer\n• ${prefix}${commandName || "songen"} bangla romantic song\n• ${prefix}${commandName || "songen"} chill lofi beat`
      );
    }

    try {
      // 1. Check in-memory cache for instant 0ms return
      let audioUrl = getCached(prompt);

      // 2. High-speed Facebook Stories Music Catalog first (resolves in ~250ms with direct CDN stream)
      if (!audioUrl) {
        audioUrl = await searchFacebookMusic(api, prompt);
      }

      // 3. AI music generation (if not in catalog or for custom lyrics)
      if (!audioUrl) {
        audioUrl = await fetchAiMusic(prompt);
      }

      // 4. Ultra-fast fallbacks: SoundCloud & YouTube Audio
      if (!audioUrl) {
        audioUrl = await searchSoundCloud(prompt);
      }
      if (!audioUrl) {
        audioUrl = await searchYouTubeAudio(prompt);
      }

      if (!audioUrl) {
        react("👎");
        return message.reply(getLang("error"));
      }

      // Cache successful audio URL
      setCached(prompt, audioUrl);

      // Stream directly into FCA uploader without saving to disk first
      let stream;
      if (global.utils && typeof global.utils.getStreamFromURL === "function") {
        stream = await global.utils.getStreamFromURL(audioUrl, "music.mp3", {
          timeout: 25000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      } else {
        const res = await axios({
          method: "GET",
          url: audioUrl,
          responseType: "stream",
          timeout: 25000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        res.data.path = "music.mp3";
        stream = res.data;
      }

      // Success reaction matching edit.js (👍)
      react("👍");

      // User requirement: ONLY MP3 audio output, without text
      return message.reply({
        attachment: stream
      });
    } catch (err) {
      react("👎");
      return message.reply(getLang("error"));
    }
  }
};
