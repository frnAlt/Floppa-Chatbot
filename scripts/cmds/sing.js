const axios = require("axios");
const yts = require("yt-search");
const btch = require("btch-downloader");
const fs = require("fs-extra");
const path = require("path");
const { createDecipheriv } = require("crypto");
let ffmpeg = require("fluent-ffmpeg");

// Configure ffmpeg path
let ffmpegPath = null;
try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch (_) {}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const client = axios.create({ timeout: 20000 });
const CACHE_DIR = path.join(__dirname, "cache");
const MAX_ATTACHMENT_SIZE = 24 * 1024 * 1024; // 24 MB safe Messenger limit

function sanitizeFilename(name) {
  return (name || "sing")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50) || "sing";
}

function isMp3File(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    // ID3 header
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
    // MPEG Audio frame sync
    if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  } catch (_) {}
  return false;
}

/**
 * Open-source Savetube AES decryptor
 */
function decodeSavetube(enc) {
  const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  const data = Buffer.from(enc, "base64");
  const iv = data.slice(0, 16);
  const content = data.slice(16);
  const key = Buffer.from(secretKey, "hex");
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  return JSON.parse(decrypted.toString());
}

/**
 * Savetube Open-Source MP3 Engine
 */
async function getSavetubeAudio(youtubeUrl, titleFallback = "") {
  try {
    const cdnRes = await axios.get("https://media.savetube.vip/api/random-cdn", { timeout: 8000 });
    const cdn = cdnRes.data?.cdn;
    if (!cdn) return null;

    const infoRes = await axios.post(`https://${cdn}/v2/info`, { url: youtubeUrl }, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
        "Referer": "https://save-tube.com/"
      },
      timeout: 10000
    });

    const info = decodeSavetube(infoRes.data.data);
    if (!info?.key) return null;

    const dlRes = await axios.post(`https://${cdn}/download`, {
      downloadType: "audio",
      quality: "128",
      key: info.key
    }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
        "Referer": "https://save-tube.com/"
      },
      timeout: 15000
    });

    const downloadUrl = dlRes.data?.data?.downloadUrl;
    if (downloadUrl) {
      return {
        url: downloadUrl,
        source: "savetube",
        title: info.title || titleFallback,
        author: info.author || "",
        headers: { "Referer": "https://save-tube.com/" }
      };
    }
  } catch (err) {
    console.warn("[SING] Savetube engine failed:", err.message);
  }
  return null;
}

/**
 * Collect prioritized audio stream candidates for a YouTube track
 */
async function getAudioCandidates(youtubeUrl, titleFallback = "") {
  const candidates = [];

  // Provider 1: Open-source Savetube VIP CDN (Direct, fast MP3)
  if (youtubeUrl) {
    const savetube = await getSavetubeAudio(youtubeUrl, titleFallback);
    if (savetube) {
      candidates.push(savetube);
    }
  }

  // Provider 2: btch-downloader MP3
  if (youtubeUrl) {
    try {
      const res = await btch.youtube(youtubeUrl);
      if (res && res.status !== false && res.mp3) {
        if (!res.mp3.includes("onrender.com")) {
          candidates.push({
            url: res.mp3,
            source: "btch",
            title: res.title || titleFallback,
            author: res.author || ""
          });
        }
      }
    } catch (_) {}
  }

  // Provider 3: Toshiro yta2 direct
  if (youtubeUrl) {
    try {
      const yta2Api = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(youtubeUrl)}`;
      const res = await client.get(yta2Api, { timeout: 15000 });
      const r = res.data?.result;
      const dl = r?.download_url || r?.preview;
      if (res.data?.success && dl && !dl.includes("onrender.com")) {
        candidates.push({
          url: dl,
          source: "yta2",
          title: r?.title || titleFallback,
          author: r?.author || ""
        });
      }
    } catch (_) {}
  }

  // Provider 4: Toshiro alldl direct
  if (youtubeUrl) {
    try {
      const alldlApi = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(youtubeUrl)}`;
      const res = await client.get(alldlApi, { timeout: 15000 });
      const r = res.data?.result;
      const dl = r?.video || r?.audio || r?.url;
      if (res.data?.success && dl && !dl.includes("onrender.com")) {
        candidates.push({
          url: dl,
          source: "alldl",
          title: r?.title || titleFallback,
          author: r?.author || ""
        });
      }
    } catch (_) {}
  }

  // Provider 5: Toshiro yta2 search fallback
  if (titleFallback) {
    try {
      const searchApi = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(titleFallback)}`;
      const res = await client.get(searchApi, { timeout: 15000 });
      const first = res.data?.results?.[0];
      if (first?.url) {
        const yta2Api = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(first.url)}`;
        const res2 = await client.get(yta2Api, { timeout: 15000 });
        const r2 = res2.data?.result;
        const dl2 = r2?.download_url || r2?.preview;
        if (res2.data?.success && dl2 && !dl2.includes("onrender.com")) {
          candidates.push({
            url: dl2,
            source: "yta2-search",
            title: r2?.title || first.title || titleFallback,
            author: r2?.author || ""
          });
        }
      }
    } catch (_) {}
  }

  return candidates;
}

/**
 * Resilient multi-source downloader and MP3 compressor
 */
async function downloadAndProcessAudio({ youtubeUrl = null, title = "song", durationSeconds = 0, directAudioUrl = null }) {
  await fs.ensureDir(CACHE_DIR);
  const safeBaseName = sanitizeFilename(title);
  const rand = Math.random().toString(36).slice(2, 7);
  const rawPath = path.join(CACHE_DIR, `raw_${Date.now()}_${rand}.tmp`);
  const mp3Path = path.join(CACHE_DIR, `${safeBaseName}_${Date.now()}_${rand}.mp3`);

  let candidateList = [];
  if (directAudioUrl) {
    candidateList.push({ url: directAudioUrl, source: "direct" });
  }

  if (youtubeUrl) {
    const fetched = await getAudioCandidates(youtubeUrl, title);
    candidateList.push(...fetched);
  }

  if (candidateList.length === 0) {
    throw new Error("No download sources could be resolved for this track.");
  }

  let downloaded = false;
  let lastError = null;

  for (const candidate of candidateList) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ...(candidate.headers || { "Referer": "https://www.youtube.com/" })
        };

        const dlRes = await axios({
          url: candidate.url,
          method: "GET",
          responseType: "stream",
          timeout: 45000,
          headers
        });

        const writer = fs.createWriteStream(rawPath);
        dlRes.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const rawSize = (await fs.stat(rawPath)).size;
        if (rawSize > 1000) {
          downloaded = true;
          break;
        } else {
          await fs.remove(rawPath).catch(() => {});
        }
      } catch (err) {
        lastError = err;
        await fs.remove(rawPath).catch(() => {});
        if (attempt < 2 && (err.response?.status === 403 || err.response?.status === 429)) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }
    if (downloaded) break;
  }

  if (!downloaded) {
    throw new Error(lastError?.message || "Failed to download audio from all available providers.");
  }

  const rawSize = (await fs.stat(rawPath)).size;
  const isBig = rawSize > MAX_ATTACHMENT_SIZE;
  const isAlreadyMp3 = isMp3File(rawPath);

  // Fast path: Already valid MP3 and within Messenger limit
  if (!isBig && isAlreadyMp3) {
    await fs.move(rawPath, mp3Path, { overwrite: true });
    return {
      filePath: mp3Path,
      rawSize,
      finalSize: rawSize,
      wasCompressed: false
    };
  }

  // Calculate compression bitrate dynamically if large
  let targetBitrate = "128k";
  if (isBig) {
    const safeDuration = durationSeconds > 0 ? durationSeconds : 300;
    let kbps = Math.floor((22 * 1024 * 8) / safeDuration) - 8;
    kbps = Math.max(32, Math.min(128, kbps));
    targetBitrate = `${kbps}k`;
  }

  let converted = false;
  if (ffmpegPath) {
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .audioCodec("libmp3lame")
          .audioBitrate(targetBitrate)
          .audioChannels(2)
          .audioFrequency(44100)
          .format("mp3")
          .save(mp3Path)
          .on("end", resolve)
          .on("error", reject);
      });
      converted = true;
    } catch (ffmpegErr) {
      console.warn("[SING] ffmpeg conversion warning:", ffmpegErr.message);
    }
  }

  if (converted && (await fs.pathExists(mp3Path))) {
    let finalSize = (await fs.stat(mp3Path)).size;

    // Secondary aggressive compression pass if still > MAX_ATTACHMENT_SIZE
    if (finalSize > MAX_ATTACHMENT_SIZE) {
      const recompressedPath = path.join(CACHE_DIR, `sing_recompressed_${Date.now()}_${rand}.mp3`);
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(rawPath)
            .audioCodec("libmp3lame")
            .audioBitrate("32k")
            .audioChannels(1)
            .audioFrequency(22050)
            .format("mp3")
            .save(recompressedPath)
            .on("end", resolve)
            .on("error", reject);
        });
        await fs.remove(mp3Path).catch(() => {});
        await fs.move(recompressedPath, mp3Path, { overwrite: true });
        finalSize = (await fs.stat(mp3Path)).size;
      } catch (_) {}
    }

    await fs.remove(rawPath).catch(() => {});

    if (finalSize > MAX_ATTACHMENT_SIZE) {
      await fs.remove(mp3Path).catch(() => {});
      throw new Error("Song exceeds Messenger 25MB limit even after maximum compression.");
    }

    return {
      filePath: mp3Path,
      rawSize,
      finalSize,
      wasCompressed: isBig || finalSize < rawSize
    };
  }

  // Graceful fallback if ffmpeg is unavailable or failed but raw fits in Messenger
  if (!isBig) {
    await fs.move(rawPath, mp3Path, { overwrite: true });
    return {
      filePath: mp3Path,
      rawSize,
      finalSize: rawSize,
      wasCompressed: false
    };
  }

  await fs.remove(rawPath).catch(() => {});
  throw new Error("Audio exceeds Messenger 25MB limit and compression could not be completed.");
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music", "play"],
    version: "3.4.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search, compress and download YouTube audio as MP3" },
    longDescription: { en: "Search YouTube or Spotify songs and download high-quality MP3 audio with automatic compression for large files to fit Facebook Messenger limits. Media-only output." },
    category: "media",
    guide: { en: "{pn} <song name or YouTube URL or Spotify URL>" }
  },

  onStart: async function ({ message, args, event, api }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("❌ Please provide a song name or YouTube/Spotify link.");

    const isSpotify = /(?:open\.spotify\.com\/track\/|spotify\.link\/|spotify:track:)/i.test(query);
    const isYtUrl = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(query);

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    }

    // ── Mode 1: Spotify URL ──
    if (isSpotify) {
      let songTitle = "Spotify Track";
      let artistName = "";
      let directAudioUrl = null;

      try {
        const spRes = await client.get(`https://toshiro-api-editz6t9.vercel.app/api/downloader/spdl?url=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (spRes.data?.success && spRes.data?.result) {
          songTitle = spRes.data.result.title || songTitle;
          artistName = spRes.data.result.artist || "";
          directAudioUrl = spRes.data.result.download_url || spRes.data.result.audio;
        }
      } catch (_) {}

      // Fallback metadata via Spotify oEmbed
      if (!songTitle || songTitle === "Spotify Track") {
        try {
          const oemb = await client.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`, { timeout: 8000 });
          if (oemb.data?.title) songTitle = oemb.data.title;
        } catch (_) {}
      }

      // If direct Spotify audio URL is available, try processing it
      if (directAudioUrl) {
        try {
          const result = await downloadAndProcessAudio({ title: songTitle, directAudioUrl });
          const stream = fs.createReadStream(result.filePath);

          if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

          return message.reply({ attachment: stream }, () => {
            fs.remove(result.filePath).catch(() => {});
          });
        } catch (err) {
          console.warn("[SING] Direct Spotify stream failed, falling back to YouTube match:", err.message);
        }
      }

      // Spotify resolution fallback: Search YouTube with "${songTitle} ${artistName}"
      const ytSearchQuery = `${songTitle} ${artistName}`.trim();
      try {
        const searchRes = await yts(ytSearchQuery);
        const video = searchRes?.videos?.[0];
        if (!video) throw new Error(`Could not find track on YouTube for "${ytSearchQuery}"`);

        const result = await downloadAndProcessAudio({
          youtubeUrl: video.url,
          title: songTitle,
          durationSeconds: video.seconds
        });

        const stream = fs.createReadStream(result.filePath);

        if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({ attachment: stream }, () => {
          fs.remove(result.filePath).catch(() => {});
        });
      } catch (err) {
        console.error("[SING] Spotify download error:", err.message);
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Spotify download failed: ${err.message || err}`);
      }
    }

    // ── Mode 2: Direct YouTube URL ──
    if (isYtUrl) {
      try {
        let videoTitle = "YouTube Audio";
        let durationSeconds = 0;

        try {
          const searchRes = await yts(query);
          const v = searchRes?.videos?.[0];
          if (v) {
            videoTitle = v.title || videoTitle;
            durationSeconds = v.seconds || 0;
          }
        } catch (_) {}

        const result = await downloadAndProcessAudio({
          youtubeUrl: query,
          title: videoTitle,
          durationSeconds
        });

        const stream = fs.createReadStream(result.filePath);

        if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({ attachment: stream }, () => {
          fs.remove(result.filePath).catch(() => {});
        });
      } catch (err) {
        console.error("[SING] Direct YouTube download error:", err.message);
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Download error: ${err.message || err}`);
      }
    }

    // ── Mode 3: YouTube Search & Accurate MP3 Download ──
    try {
      const searchRes = await yts(query);
      const videos = searchRes?.videos || [];

      if (videos.length === 0) {
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No songs found for "${query}". Please check the title and try again.`);
      }

      // Accurate video selection: Prefer non-live videos under 2 hours
      const selectedVideo = videos.find(v => v.seconds > 0 && v.seconds <= 7200) || videos[0];

      const result = await downloadAndProcessAudio({
        youtubeUrl: selectedVideo.url,
        title: selectedVideo.title,
        durationSeconds: selectedVideo.seconds
      });

      const stream = fs.createReadStream(result.filePath);

      if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({ attachment: stream }, () => {
        fs.remove(result.filePath).catch(() => {});
      });
    } catch (e) {
      console.error("[SING] Search/Download error:", e.message);
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply(`❌ Failed to download song: ${e.message || "Please try again later."}`);
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    if (!Reply || !Reply.results || String(event.senderID) !== String(Reply.author)) return;

    const match = String(event.body || "").trim().match(/\d+/);
    const choice = match ? parseInt(match[0], 10) : NaN;

    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return message.reply(`❌ Invalid choice. Please reply with a number between 1 and ${Reply.results.length}.`);
    }

    const selected = Reply.results[choice - 1];
    if (typeof Reply.delete === "function") Reply.delete();

    if (api && api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID, event.threadID).catch(() => {});
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const result = await downloadAndProcessAudio({
        youtubeUrl: selected.url,
        title: selected.title,
        durationSeconds: selected.seconds || 0
      });

      const stream = fs.createReadStream(result.filePath);

      if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({ attachment: stream }, () => {
        fs.remove(result.filePath).catch(() => {});
      });
    } catch (e) {
      console.error("[SING] onReply download error:", e.message);
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply(`❌ Failed to download audio: ${e.message || "Please try another song or reply again."}`);
    }
  }
};
