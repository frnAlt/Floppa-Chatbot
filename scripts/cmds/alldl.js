const axios = require("axios");
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

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "dl", "autodl"],
    version: "3.2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Multi-platform video/audio downloader" },
    longDescription: { en: "Download videos or audio from FB, IG, TikTok, YT via link, tap-to-reply, or auto-detection. Use --a for audio." },
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
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      let downloadUrl = "";
      let title = "Downloaded Media";

      // 0. If it is already a direct media stream or CDN attachment
      if (/fbcdn\.net|fbsbx\.com|\.mp4|\.mov|\.webm|\.mp3|\.m4a|\.wav/i.test(url)) {
        downloadUrl = url;
        title = "Direct Media Stream";
      }

      // 1. Primary engine: btch-downloader
      if (!downloadUrl) {
        try {
          if (/tiktok\.com/i.test(url)) {
            const res = await btch.ttdl(url);
            if (res && res.status !== false) {
              title = res.title || "TikTok Media";
              downloadUrl = isAudio ? (res.audio || res.video) : (res.video || res.audio);
            }
          } else if (/youtube\.com|youtu\.be/i.test(url)) {
            const res = await btch.youtube(url);
            if (res && res.status !== false) {
              title = res.title || "YouTube Media";
              downloadUrl = isAudio ? res.mp3 : (res.mp4 || res.mp3);
            }
          } else if (/facebook\.com|fb\.watch/i.test(url)) {
            const res = await btch.fbdown(url);
            if (res && res.status !== false) {
              title = res.title || "Facebook Video";
              downloadUrl = res.Normal_video || res.HD || res.audio;
            }
          } else if (/instagram\.com/i.test(url)) {
            const res = await btch.igdl(url);
            if (res && res.status !== false && res.result && res.result.length > 0) {
              title = "Instagram Media";
              downloadUrl = res.result[0].url;
            }
          } else if (/twitter\.com|x\.com/i.test(url)) {
            const res = await btch.twitter(url);
            if (res && res.status !== false) {
              title = res.title || "Twitter Media";
              downloadUrl = res.url ? (res.url[0]?.hd || res.url[0]?.sd) : "";
            }
          }
        } catch (e) {
          console.warn("[ALLDL] btch engine error:", e.message);
        }
      }

      // 2. Secondary engine: Toshiro All Downloader
      if (!downloadUrl) {
        try {
          const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(toshiroUrl, { timeout: 15000 });
          if (data?.success && data?.result) {
            const r = data.result;
            title = r.title || title;
            downloadUrl = isAudio ? (r.audio || r.video || r.url || r.high_quality) : (r.video || r.high_quality || r.url || r.low_quality);
          }
        } catch (_) {}
      }

      // 3. Tertiary fallback: public mirror
      if (!downloadUrl) {
        try {
          const mirror = `https://api.siputzx.my.id/api/d/alldl?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(mirror, { timeout: 20000 });
          if (data?.status && data?.data) {
            const r = data.data;
            title = r.title || title;
            downloadUrl = isAudio ? (r.audio || r.video || r.url) : (r.video || r.url);
          }
        } catch (_) {}
      }

      if (!downloadUrl) {
        throw new Error("Could not extract a downloadable stream for this link.");
      }

      const ext = isAudio ? "mp3" : "mp4";
      const mediaStream = await global.utils.getStreamFromURL(downloadUrl, `download_${Date.now()}.${ext}`);

      await message.reply({
        body: `📥 ${title}`,
        attachment: mediaStream
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("[ALLDL ERROR]:", error.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Download failed: ${error.message || "Unsupported URL or service timeout."}`);
    }
  }
};
