const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const btch = require("btch-downloader");

async function unshortenUrl(rawUrl) {
  try {
    if (!/fb\.watch|vt\.tiktok\.com|vm\.tiktok\.com|youtu\.be|t\.co|bit\.ly|tinyurl\.com/i.test(rawUrl)) {
      return rawUrl;
    }
    const resp = await axios.get(rawUrl, {
      maxRedirects: 5,
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      validateStatus: () => true
    });
    return resp.request?.res?.responseUrl || resp.headers?.location || rawUrl;
  } catch (_) {
    return rawUrl;
  }
}

function extractMediaUrlFromEvent(args, event) {
  // 1. Check direct args
  for (const arg of args) {
    if (typeof arg === "string" && /^https?:\/\//i.test(arg)) {
      return arg.trim();
    }
  }

  // 2. Check message reply (tap-to-reply)
  const reply = event.messageReply;
  if (reply) {
    if (typeof reply.body === "string") {
      const match = reply.body.match(/https?:\/\/[^\s]+/i);
      if (match) return match[0];
    }
    if (Array.isArray(reply.attachments) && reply.attachments.length > 0) {
      for (const att of reply.attachments) {
        const candidate = att.playableUrl || att.url || att.facebookUrl || att.target?.url || att.href || att.source;
        if (candidate && typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
          return candidate;
        }
      }
    }
  }

  // 3. Check event attachments
  if (Array.isArray(event.attachments) && event.attachments.length > 0) {
    for (const att of event.attachments) {
      const candidate = att.playableUrl || att.url || att.facebookUrl || att.target?.url || att.href || att.source;
      if (candidate && typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

const withTimeout = (promise, ms = 6000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Engine timed out")), ms))
  ]);

async function downloadMediaBuffer(downloadUrl, referer) {
  const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*"
  };

  try {
    return await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 45000,
      headers: referer ? { ...defaultHeaders, Referer: referer } : defaultHeaders
    });
  } catch (err) {
    // Retry without Referer (often fixes hotlink protection)
    return await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 45000,
      headers: defaultHeaders
    });
  }
}

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "dl", "autodl"],
    version: "3.3.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Multi-platform video/audio downloader" },
    longDescription: { en: "Download videos or audio from FB, IG, TikTok, YouTube via link or tap-to-reply. Use --a for audio." },
    category: "media",
    guide: { en: "{pn} <url> [--a] or tap-to-reply to any video/link. Use '{pn} auto' to toggle auto-download in this chat." }
  },

  onStart: async function ({ message, args, event, api }) {
    if (args[0] === "auto") {
      if (!global.alldl_auto) global.alldl_auto = {};
      const threadID = event.threadID;
      global.alldl_auto[threadID] = !global.alldl_auto[threadID];
      return message.reply(`Auto-download is now ${global.alldl_auto[threadID] ? "ON" : "OFF"}.`);
    }

    const isAudio = args.some(a => a === "--a" || a === "-a" || a === "audio" || a === "mp3");
    let rawUrl = extractMediaUrlFromEvent(args, event);

    if (!rawUrl) {
      return message.reply("⚠️ Please provide a video link or tap-to-reply to a message/video with this command.");
    }

    const finalUrl = await unshortenUrl(rawUrl);
    return this.handleDownload({ message, event, api, url: finalUrl, isAudio });
  },

  onChat: async function ({ message, event, api }) {
    const threadID = event.threadID;
    if (!global.alldl_auto?.[threadID] || !event.body) return;
    if (event.body.startsWith(global.GoatBot.config.prefix)) return;

    const urlMatch = event.body.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      const finalUrl = await unshortenUrl(urlMatch[0]);
      return this.handleDownload({ message, event, api, url: finalUrl, isAudio: false });
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

      // 0. Direct media stream
      if (/\.(mp4|mov|webm|mp3|m4a|wav)(\?|$)/i.test(url) || /fbcdn\.net|fbsbx\.com/i.test(url)) {
        downloadUrl = url;
        title = "Direct Media Stream";
      }

      // 1. Primary Engine: Toshiro AllDL API (Explicitly configured)
      if (!downloadUrl) {
        try {
          const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(toshiroUrl, {
            timeout: 20000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (data && (data.success || data.status)) {
            const r = data.result || data.data || data;
            if (r && r.status !== false) {
              title = r.title || title;
              musicUrl = r.audio || r.music || "";
              downloadUrl = isAudio
                ? (r.audio || r.music || r.video || r.high_quality || r.url || r.low_quality)
                : (r.video || r.high_quality || r.url || r.low_quality || r.audio || r.music);
            }
          }
        } catch (_) {}
      }

      // 2. Secondary Engine: Toshiro AllDL V2 Fallback
      if (!downloadUrl) {
        try {
          const v2Res = await axios.get(
            `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldlv2?url=${encodeURIComponent(url)}`,
            {
              timeout: 15000,
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
            if (streamCandidate) {
              downloadUrl = streamCandidate;
            }
          }
        } catch (_) {}
      }

      // 3. Tertiary Engine: TikWM for TikTok
      if (!downloadUrl && /tiktok\.com/i.test(url)) {
        try {
          const tikwm = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            timeout: 8000
          });
          if (tikwm.data?.code === 0 && tikwm.data?.data) {
            const d = tikwm.data.data;
            title = d.title || title;
            musicUrl = d.music || "";
            const chosen = isAudio ? (d.music || d.play) : (d.play || d.music);
            if (chosen) {
              downloadUrl = chosen.startsWith("http") ? chosen : `https://www.tikwm.com${chosen}`;
            }
          }
        } catch (_) {}
      }

      // 4. Quaternary Engine: btch-downloader with strict 6s timeout
      if (!downloadUrl) {
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
              downloadUrl = res.result[0].url;
            }
          } else if (/twitter\.com|x\.com/i.test(url)) {
            const res = await withTimeout(btch.twitter(url), 6000);
            if (res && res.status !== false) {
              title = res.title || title;
              downloadUrl = res.url ? (res.url[0]?.hd || res.url[0]?.sd) : "";
            }
          }
        } catch (e) {
          console.warn("[ALLDL] btch fallback skipped:", e.message);
        }
      }

      if (!downloadUrl) {
        throw new Error("Could not extract a downloadable stream for this link. The service may be temporarily unavailable or the content is private.");
      }

      let ext = isAudio ? "mp3" : "mp4";
      tmpFile = path.join(cacheDir, `alldl_${Date.now()}.${ext}`);

      // Set proper headers
      let referer = "https://www.google.com/";
      if (/tiktok\.com/i.test(downloadUrl) || /tiktok\.com/i.test(url)) referer = "https://www.tiktok.com/";
      else if (/instagram\.com/i.test(downloadUrl) || /instagram\.com/i.test(url)) referer = "https://www.instagram.com/";
      else if (/facebook\.com|fb\.watch/i.test(downloadUrl) || /facebook\.com|fb\.watch/i.test(url)) referer = "https://www.facebook.com/";

      const downloadRes = await downloadMediaBuffer(downloadUrl, referer);
      let fileBuffer = Buffer.from(downloadRes.data);
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
          if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
          return message.reply(`⚠️ Media exceeds Facebook Messenger's 25MB attachment limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB).\n\n🔗 Direct download link:\n${downloadUrl}`);
        }
      }

      await fs.writeFile(tmpFile, fileBuffer);

      let bodyText;
      if (usedAudioFallback) {
        bodyText = `⚠️ Video exceeded Messenger's 25MB limit. Sent audio instead!\n\n📥 Title: ${title}\n🔗 Watch/Download Video: ${downloadUrl}`;
      } else {
        bodyText = `📥 ${title}`;
      }

      await message.reply({
        body: bodyText,
        attachment: fs.createReadStream(tmpFile)
      });

      if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
      fs.remove(tmpFile).catch(() => {});
    } catch (error) {
      console.error("[ALLDL ERROR]:", error.message);
      if (tmpFile) fs.remove(tmpFile).catch(() => {});
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Download failed: ${error.message || "Unsupported URL or service timeout."}`);
    }
  }
};
