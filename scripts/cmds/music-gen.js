const axios = require("axios");
const { Readable } = require("stream");
const yts = require("yt-search");

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

/**
 * Phonetic Bengali-to-Latin transliterator
 * Converts Bengali script into Romanized phonetic text so international AI music engines
 * process the prompt/lyrics cleanly without returning 500 error or rate limit rejection.
 */
function romanizeBengali(text) {
  if (!text || !/[\u0980-\u09FF]/.test(text)) return text;
  const map = {
    "অ": "o", "আ": "a", "ই": "i", "ঈ": "ee", "উ": "u", "ঊ": "oo", "ঋ": "ri",
    "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
    "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
    "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
    "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
    "ত": "t", "থ": "th", "দ": "d", "dh": "dh", "ন": "n",
    "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m",
    "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h",
    "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t",
    "া": "a", "ি": "i", "ী": "ee", "ু": "u", "ূ": "oo", "ৃ": "ri",
    "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
    "্": "", "ং": "ng", "ঃ": "h", "ঁ": ""
  };
  return text.split("").map(c => map[c] !== undefined ? map[c] : c).join("");
}

async function queryToshiroEndpoint(promptCandidate) {
  const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/ai-music?prompt=${encodeURIComponent(promptCandidate)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  };

  try {
    const response = await axios.get(apiUrl, {
      timeout: 35000,
      headers,
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(35000) : undefined
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

async function fetchAiMusic(prompt) {
  // Candidate 1: Direct prompt
  let res = await queryToshiroEndpoint(prompt);
  if (res.success && res.audioUrl) return res;

  // Candidate 2: Romanized prompt if Bengali characters are present
  if (/[\u0980-\u09FF]/.test(prompt)) {
    const romanized = romanizeBengali(prompt).trim();
    if (romanized && romanized !== prompt) {
      res = await queryToshiroEndpoint(romanized);
      if (res.success && res.audioUrl) return res;
    }
  }

  // Candidate 3: Sub-style extraction if separator '-' or '|' is used (e.g. lyrics - style)
  if (prompt.includes("-") || prompt.includes("|")) {
    const parts = prompt.split(/[-|]/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const partQuery = romanizeBengali(part).trim();
      if (partQuery.length >= 3 && partQuery !== prompt) {
        res = await queryToshiroEndpoint(partQuery);
        if (res.success && res.audioUrl) return res;
      }
    }
  }

  return res;
}

/**
 * Resilient fallback audio downloader if pure AI music service is busy or offline
 */
async function fallbackAudioSearch(query) {
  try {
    // 1. Try toshiro yta2 audio search
    const searchApi = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(query)}`;
    const sRes = await axios.get(searchApi, { timeout: 8000 }).catch(() => null);
    const first = sRes?.data?.results?.[0];
    if (first?.url) {
      const yta2Api = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(first.url)}`;
      const yRes = await axios.get(yta2Api, { timeout: 8000 }).catch(() => null);
      const dl = yRes?.data?.result?.download_url || yRes?.data?.result?.preview;
      if (dl && !dl.includes("onrender.com")) {
        return dl;
      }
    }

    // 2. Try smfahim youtube mp3
    const ytsRes = await yts(query).catch(() => null);
    const video = ytsRes?.videos?.[0];
    if (video?.url) {
      const smApi = `https://smfahim.xyz/download/youtube/mp3/v1?url=${encodeURIComponent(video.url)}`;
      const smRes = await axios.get(smApi, { timeout: 8000 }).catch(() => null);
      const smDl = smRes?.data?.download || smRes?.data?.result?.download || smRes?.data?.url || smRes?.data?.mp3;
      if (smDl) return smDl;
    }
  } catch (_) {}
  return null;
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
    version: "1.4.0",
    author: "frnAlt",
    countDown: 1,
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
          api.setMessageReaction(emoji, event.messageID, () => {}, event.threadID);
        } else if (typeof message?.reaction === "function") {
          message.reaction(emoji, event.messageID);
        }
      } catch (_) {}
    };

    // Instant ⏳ reaction
    react("⏳");

    // Continuous typing indicator loop so Messenger stays active during generation
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
      // 1. Check in-memory cache for instant return
      let audioUrl = getCached(prompt);

      // 2. AI Music generation with phonetic Bengali support & multi-candidate fallback
      if (!audioUrl) {
        const result = await fetchAiMusic(prompt);
        if (result.success && result.audioUrl) {
          audioUrl = result.audioUrl;
        } else {
          // Fallback to high-speed audio search if pure AI generator is busy or offline
          const fallbackUrl = await fallbackAudioSearch(prompt);
          if (fallbackUrl) {
            audioUrl = fallbackUrl;
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
      }

      // Cache successful audio URL (in-memory LRU)
      setCached(prompt, audioUrl);

      // Stream into FCA uploader without saving to disk (100% memory-clean)
      const stream = await getAudioStream(audioUrl);

      clearInterval(typingInterval);

      // Success reaction (👍)
      react("👍");

      // ONLY MP3 audio output, without text
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
