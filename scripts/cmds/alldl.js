const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const btch = require("btch-downloader");
const { createDecipheriv } = require("crypto");

/**
 * Unwrap Facebook redirect link (e.g. l.facebook.com/l.php?u=...)
 */
function unwrapUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  try {
    if (rawUrl.includes("facebook.com/l.php") || rawUrl.includes("l.facebook.com")) {
      const parsed = new URL(rawUrl);
      const target = parsed.searchParams.get("u");
      if (target) return decodeURIComponent(target);
    }
  } catch (_) {}
  return rawUrl.trim();
}

/**
 * Expand short URLs (e.g. vt.tiktok.com, vm.tiktok.com, fb.watch, youtu.be, bit.ly)
 */
async function unshortenUrl(rawUrl) {
  const unwrapped = unwrapUrl(rawUrl);
  try {
    if (!/fb\.watch|vt\.tiktok\.com|vm\.tiktok\.com|youtu\.be|t\.co|bit\.ly|tinyurl\.com/i.test(unwrapped)) {
      return unwrapped;
    }
    const resp = await axios.get(unwrapped, {
      maxRedirects: 5,
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      validateStatus: () => true
    });
    const finalUrl = resp.request?.res?.responseUrl || resp.headers?.location || unwrapped;
    return unwrapUrl(finalUrl);
  } catch (_) {
    return unwrapped;
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

function resolveMediaSource(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string")
    return { url: null, isVideo: false, headers: null };
  const token = (rawUrl.match(/[?&]token=([^&]+)/) || [])[1];
  if (token) {
    const payload = decodeJwtPayload(decodeURIComponent(token));
    if (payload && payload.url) {
      const inner = payload.url;
      const isVideo = /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(inner)
        || /video|reels|dash|progressive|xpv|clip/i.test(inner);
      return { url: inner, isVideo, headers: payload.headers || null };
    }
  }
  return { url: rawUrl, isVideo: /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(rawUrl), headers: null };
}

/**
 * Extract media URL from command args, event body, reply or attachments
 */
function extractMediaUrlFromEvent(args, event) {
  // 1. Direct argument search
  for (const arg of args) {
    if (typeof arg === "string") {
      const match = arg.match(/https?:\/\/[^\s]+/i);
      if (match) return unwrapUrl(match[0]);
    }
  }

  // 2. Full event body search (e.g. "alldl check this https://...")
  if (event?.body && typeof event.body === "string") {
    const match = event.body.match(/https?:\/\/[^\s]+/i);
    if (match) return unwrapUrl(match[0]);
  }

  // 3. Message reply (tap-to-reply)
  const reply = event?.messageReply;
  if (reply) {
    if (typeof reply.body === "string") {
      const match = reply.body.match(/https?:\/\/[^\s]+/i);
      if (match) return unwrapUrl(match[0]);
    }
    if (Array.isArray(reply.attachments) && reply.attachments.length > 0) {
      for (const att of reply.attachments) {
        const candidate = att.playableUrl || att.url || att.facebookUrl || att.target?.url || att.href || att.source || att.previewUrl || att.shareUrl;
        if (candidate && typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
          return unwrapUrl(candidate);
        }
      }
    }
  }

  // 4. Current event attachments
  if (Array.isArray(event?.attachments) && event.attachments.length > 0) {
    for (const att of event.attachments) {
      const candidate = att.playableUrl || att.url || att.facebookUrl || att.target?.url || att.href || att.source || att.previewUrl || att.shareUrl;
      if (candidate && typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        return unwrapUrl(candidate);
      }
    }
  }

  return null;
}

const withTimeout = (promise, ms = 7000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Engine timed out")), ms))
  ]);

/**
 * Savetube AES-128 decryptor for YouTube media
 */
function decodeSavetube(enc) {
  const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  const data = Buffer.from(enc, "base64");
  const iv = data.slice(0, 16);
  const content = data.slice(16);
  const key = Buffer.from(secretKey, "hex");
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  return JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
}

/**
 * Fast direct YouTube resolver via Savetube CDN
 */
async function resolveYouTubeSavetube(youtubeUrl, isAudio = false) {
  try {
    const cdnRes = await axios.get("https://media.savetube.vip/api/random-cdn", { timeout: 4000 });
    const cdn = cdnRes.data?.cdn;
    if (!cdn) return null;

    const infoRes = await axios.post(`https://${cdn}/v2/info`, { url: youtubeUrl }, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://save-tube.com/"
      },
      timeout: 5000
    });

    const info = decodeSavetube(infoRes.data?.data);
    if (!info?.key) return null;

    const dlRes = await axios.post(`https://${cdn}/download`, {
      downloadType: isAudio ? "audio" : "video",
      quality: isAudio ? "128" : "720",
      key: info.key
    }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://save-tube.com/"
      },
      timeout: 7000
    });

    const downloadUrl = dlRes.data?.data?.downloadUrl;
    if (downloadUrl) {
      return {
        downloadUrl,
        title: info.title || "YouTube Media",
        author: info.author || "",
        headers: { Referer: "https://save-tube.com/" }
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Buffer downloader with automatic Referer retry
 */
async function downloadMediaBuffer(downloadUrl, referer) {
  const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*"
  };

  try {
    return await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 50000,
      headers: referer ? { ...defaultHeaders, Referer: referer } : defaultHeaders
    });
  } catch (err) {
    // Retry without Referer (fixes hotlink CDN protection)
    return await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 50000,
      headers: defaultHeaders
    });
  }
}

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "dl", "autodl", "tiktokdl", "ytdl_all"],
    version: "3.5.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    noPrefix: "both",
    shortDescription: { en: "Multi-platform video/audio downloader" },
    longDescription: { en: "Download videos or audio from TikTok, Facebook, Instagram, YouTube, Twitter/X via link or tap-to-reply. Use --a for audio." },
    category: "media",
    guide: { en: "{pn} <url> [--a] or tap-to-reply to any video/link.\nUse '{pn} auto' to toggle auto-download in this chat." }
  },

  onStart: async function ({ message, args, event, api }) {
    if (args[0] === "auto") {
      if (!global.alldl_auto) global.alldl_auto = {};
      const threadID = event.threadID;
      global.alldl_auto[threadID] = !global.alldl_auto[threadID];
      return message.reply(`Auto-download is now ${global.alldl_auto[threadID] ? "ON" : "OFF"}.`);
    }

    const isAudio = args.some(a => a === "--a" || a === "-a" || a === "audio" || a === "mp3");
    const rawUrl = extractMediaUrlFromEvent(args, event);

    if (!rawUrl) {
      return message.reply("⚠️ Please provide a video link or tap-to-reply to a message/video with this command.\n\n💡 Example: alldl https://vt.tiktok.com/...");
    }

    const finalUrl = await unshortenUrl(rawUrl);
    return this.handleDownload({ message, event, api, url: finalUrl, isAudio });
  },

  onChat: async function ({ message, event, api, threadsData }) {
    const threadID = event.threadID;
    let isAuto = Boolean(global.alldl_auto?.[threadID]);
    if (!isAuto && threadsData) {
      try {
        const tData = await threadsData.get(threadID);
        if (tData?.data?.autodl || tData?.data?.autoDownload) isAuto = true;
      } catch (_) {}
    }

    if (!isAuto || !event.body) return;
    const prefix = global.GoatBot?.config?.prefix || "!";
    if (event.body.startsWith(prefix)) return;

    const urlMatch = event.body.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      const finalUrl = await unshortenUrl(urlMatch[0]);
      if (/tiktok\.com|facebook\.com|fb\.watch|instagram\.com|youtube\.com|youtu\.be|x\.com|twitter\.com/i.test(finalUrl)) {
        return this.handleDownload({ message, event, api, url: finalUrl, isAudio: false });
      }
    }
  },

  handleDownload: async function ({ message, event, api, url, isAudio }) {
    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let tmpFile = null;

    try {
      let downloadUrl = "";
      let musicUrl = "";
      let title = "Downloaded Media";
      let author = "";
      let photoList = null;

      // ── 0. Direct media file stream ──
      if (/\.(mp4|mov|webm|mp3|m4a|wav)(\?|$)/i.test(url) || /fbcdn\.net|fbsbx\.com/i.test(url)) {
        downloadUrl = url;
        title = "Direct Media Stream";
      }

      // ── 1. TikTok Engine (TikWM: fast, unwatermarked, supports video, audio & photo carousels) ──
      if (!downloadUrl && /tiktok\.com/i.test(url)) {
        try {
          const tikwm = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            timeout: 9000
          });
          if (tikwm.data?.code === 0 && tikwm.data?.data) {
            const d = tikwm.data.data;
            title = d.title || title;
            author = d.author?.nickname || d.author?.unique_id || "";
            musicUrl = d.music || "";

            // Check if photo slideshow
            if (Array.isArray(d.images) && d.images.length > 0 && !isAudio) {
              photoList = d.images;
            } else {
              const chosen = isAudio ? (d.music || d.play) : (d.play || d.music);
              if (chosen) {
                downloadUrl = chosen.startsWith("http") ? chosen : `https://www.tikwm.com${chosen}`;
              }
            }
          }
        } catch (_) {}
      }

      // ── 2. YouTube Engine (Savetube: ultra fast direct CDN streams) ──
      if (!downloadUrl && !photoList && /youtube\.com|youtu\.be/i.test(url)) {
        try {
          const ytRes = await resolveYouTubeSavetube(url, isAudio);
          if (ytRes?.downloadUrl) {
            downloadUrl = ytRes.downloadUrl;
            title = ytRes.title || title;
            author = ytRes.author || author;
          }
        } catch (_) {}
      }

      // ── 3. Primary Universal Engine: Toshiro AllDL API ──
      if (!downloadUrl && !photoList) {
        try {
          const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(toshiroUrl, {
            timeout: 15000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (data && (data.success || data.status)) {
            const r = data.result || data.data || data;
            if (r && r.status !== false) {
              title = r.title || title;
              author = r.author || author;
              musicUrl = r.audio || r.music || "";
              downloadUrl = isAudio
                ? (r.audio || r.music || r.video || r.high_quality || r.url || r.low_quality)
                : (r.video || r.high_quality || r.url || r.low_quality || r.audio || r.music);
            }
          }
        } catch (_) {}
      }

      // ── 4. Secondary Universal Engine: Toshiro AllDL V2 Fallback ──
      if (!downloadUrl && !photoList) {
        try {
          const v2Res = await axios.get(
            `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldlv2?url=${encodeURIComponent(url)}`,
            {
              timeout: 12000,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            }
          );
          const d = v2Res.data;
          if (d?.success) {
            const resObj = d.result || d;
            title = resObj.title || d.title || title;
            const streamCandidate = d.preview || resObj.video_url || resObj.video || resObj.url || resObj.download || (Array.isArray(resObj.downloads) && resObj.downloads[0]?.url);
            if (streamCandidate) downloadUrl = streamCandidate;
          }
        } catch (_) {}
      }

      // ── 5. Platform-Specific btch-downloader Fallbacks ──
      if (!downloadUrl && !photoList) {
        try {
          if (/tiktok\.com/i.test(url)) {
            const res = await withTimeout(btch.ttdl(url), 6000);
            if (res && res.status !== false) {
              title = res.title || title;
              musicUrl = res.audio || "";
              downloadUrl = isAudio ? (res.audio || res.video) : (res.video || res.audio);
            }
          } else if (/youtube\.com|youtu\.be/i.test(url)) {
            const res = await withTimeout(btch.youtube(url), 6000);
            if (res && res.status !== false) {
              title = res.title || title;
              musicUrl = res.mp3 || "";
              downloadUrl = isAudio ? res.mp3 : (res.mp4 || res.mp3);
            }
          } else if (/facebook\.com|fb\.watch/i.test(url)) {
            const res = await withTimeout(btch.fbdown(url), 6000);
            if (res && res.status !== false) {
              title = res.title || title;
              musicUrl = res.audio || "";
              downloadUrl = res.Normal_video || res.HD || res.audio;
            }
          } else if (/instagram\.com/i.test(url)) {
            const res = await withTimeout(btch.igdl(url), 6000);
            if (res && res.status !== false && Array.isArray(res.result) && res.result.length > 0) {
              title = "Instagram Media";
              downloadUrl = res.result[0]?.url || res.result[0];
            }
          } else if (/twitter\.com|x\.com/i.test(url)) {
            const res = await withTimeout(btch.twitter(url), 6000);
            if (res && res.status !== false) {
              title = res.title || title;
              downloadUrl = res.url ? (res.url[0]?.hd || res.url[0]?.sd) : "";
            }
          }
        } catch (e) {
          console.warn("[ALLDL] btch platform fallback skipped:", e.message);
        }
      }

      // ── 6. Ultimate Engine: btch All-In-One (aio) Fallback ──
      if (!downloadUrl && !photoList) {
        try {
          const aioRes = await withTimeout(btch.aio(url), 6000);
          if (aioRes && aioRes.status !== false && aioRes.data) {
            title = aioRes.data.title || title;
            const chosen = isAudio ? (aioRes.data.audio || aioRes.data.video) : (aioRes.data.video || aioRes.data.url);
            if (chosen) downloadUrl = chosen;
          }
        } catch (_) {}
      }

      // ── Handle Photo Carousel Slideshows (e.g. TikTok photos) ──
      if (photoList && photoList.length > 0) {
        const imageAttachments = [];
        const maxPhotos = Math.min(photoList.length, 8);
        for (let i = 0; i < maxPhotos; i++) {
          try {
            const imgRes = await axios.get(photoList[i], {
              responseType: "arraybuffer",
              timeout: 10000,
              headers: { "User-Agent": "Mozilla/5.0" }
            });
            const pPath = path.join(cacheDir, `alldl_img_${Date.now()}_${i}.jpg`);
            await fs.writeFile(pPath, Buffer.from(imgRes.data));
            imageAttachments.push(fs.createReadStream(pPath));
            setTimeout(() => fs.remove(pPath).catch(() => {}), 30000);
          } catch (_) {}
        }

        if (imageAttachments.length > 0) {
          if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
          return await message.reply({
            body: `📸 ${title}${author ? `\n👤 Creator: ${author}` : ""}`,
            attachment: imageAttachments
          });
        }
      }

      if (!downloadUrl) {
        throw new Error("Could not extract a downloadable stream for this link. The service may be temporarily unavailable or the content is private.");
      }

      let ext = isAudio ? "mp3" : "mp4";
      tmpFile = path.join(cacheDir, `alldl_${Date.now()}.${ext}`);

      // Set proper request headers for protected CDN hotlinking
      let referer = "https://www.google.com/";
      if (/tiktok\.com/i.test(downloadUrl) || /tiktok\.com/i.test(url)) referer = "https://www.tiktok.com/";
      else if (/instagram\.com/i.test(downloadUrl) || /instagram\.com/i.test(url)) referer = "https://www.instagram.com/";
      else if (/facebook\.com|fb\.watch/i.test(downloadUrl) || /facebook\.com|fb\.watch/i.test(url)) referer = "https://www.facebook.com/";
      else if (/youtube\.com|youtu\.be/i.test(downloadUrl)) referer = "https://save-tube.com/";

      const downloadRes = await downloadMediaBuffer(downloadUrl, referer);
      let fileBuffer = Buffer.from(downloadRes.data);

      if (!fileBuffer || fileBuffer.length < 1000) {
        throw new Error("Downloaded media file was empty or corrupted.");
      }

      const maxUploadSize = 25 * 1024 * 1024; // 25MB Facebook Messenger limit
      let usedAudioFallback = false;

      // Facebook Messenger 25MB attachment limit protection
      if (!isAudio && fileBuffer.length > maxUploadSize) {
        if (musicUrl) {
          try {
            const audioRes = await downloadMediaBuffer(musicUrl, referer);
            if (audioRes.data && audioRes.data.length < maxUploadSize) {
              fileBuffer = Buffer.from(audioRes.data);
              ext = "mp3";
              tmpFile = path.join(cacheDir, `alldl_${Date.now()}.mp3`);
              usedAudioFallback = true;
            }
          } catch (_) {}
        }

        if (!usedAudioFallback) {
          if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
          return message.reply(`⚠️ Media exceeds Facebook Messenger's 25MB limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB).\n\n🔗 Direct download link:\n${downloadUrl}`);
        }
      }

      await fs.writeFile(tmpFile, fileBuffer);

      const caption = isAudio
        ? `🎵 ${title}${author ? `\n👤 Artist: ${author}` : ""}`
        : `🎬 ${title}${author ? `\n👤 Creator: ${author}` : ""}`;

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(tmpFile)
      });

      if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
    } catch (error) {
      console.error("[ALLDL ERROR]:", error.message);
      if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      return message.reply(`❌ Download failed: ${error.message || "Unsupported URL or service timeout."}`);
    } finally {
      if (tmpFile) {
        fs.remove(tmpFile).catch(() => {});
      }
    }
  }
};
