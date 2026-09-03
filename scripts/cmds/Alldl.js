const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "ytdl", "dl"],
    version: "2.6",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Multi-platform video/audio downloader" },
    longDescription: { en: "Download videos or audio from FB, IG, TikTok, YT via link or auto-detection. Use --a for audio." },
    category: "media",
    guide: { en: "{pn} <url> [--a] or reply to a link. Use '{pn} auto' to toggle auto-download." }
  },

  onStart: async function ({ message, args, event, api }) {
    if (args[0] === "auto") {
      if (!global.alldl_auto) global.alldl_auto = {};
      const threadID = event.threadID;
      global.alldl_auto[threadID] = !global.alldl_auto[threadID];
      return message.reply(`Auto-download is now ${global.alldl_auto[threadID] ? "ON" : "OFF"}.`);
    }

    let url = args[0];
    let isAudio = args.includes("--a");

    if (event.type === "message_reply") {
      const urlMatch = event.messageReply.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
        if (args.includes("--a") || args[0] === "--a") isAudio = true;
      }
    }

    if (!url || !url.startsWith("http")) return message.reply("Please provide a valid link.");
    return this.handleDownload({ message, event, api, url, isAudio });
  },

  onChat: async function ({ message, event, api }) {
    const threadID = event.threadID;
    if (!global.alldl_auto?.[threadID] || !event.body) return;

    if (event.body.startsWith(global.GoatBot.config.prefix)) return;

    const urlMatch = event.body.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return this.handleDownload({ message, event, api, url: urlMatch[0], isAudio: false });
    }
  },

  handleDownload: async function ({ message, event, api, url, isAudio }) {
    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      let downloadUrl = "";
      let title = "Downloaded Media";

      // 1. Primary: Toshiro All Downloader (Most reliable from Goatbot-V2)
      try {
        const res = await axios.get(
          `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(url)}`,
          { timeout: 25000 }
        );

        if (res.data?.success && res.data?.result) {
          const r = res.data.result;
          title = r.title || title;
          if (isAudio) {
            downloadUrl = r.audio || r.video || r.url;
          } else {
            downloadUrl = r.video || r.high_quality || r.url;
          }
        }
      } catch (e) {
        console.warn("alldl v1 failed, trying alldlv2:", e.message);
      }

      // 2. Secondary: Toshiro All Downloader V2
      if (!downloadUrl) {
        try {
          const res = await axios.get(
            `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldlv2?url=${encodeURIComponent(url)}`,
            { timeout: 25000 }
          );

          if (res.data && res.data.success && res.data.result) {
            const r = res.data.result;
            title = r.title || title;

            if (isAudio && r.audios && r.audios.length > 0) {
              const m4a = r.audios.find(a => a.format === "M4A" || a.format === "MP3");
              downloadUrl = (m4a || r.audios[0]).url;
            } else if (r.medias && r.medias.length > 0) {
              const preferred = r.medias.find(m => m.quality === "720P" || m.quality === "480P" || m.quality === "360P");
              downloadUrl = (preferred || r.medias[0]).url;
            } else if (r.videos && r.videos.length > 0) {
              downloadUrl = r.videos[0].url;
            } else if (r.audios && r.audios.length > 0) {
              downloadUrl = r.audios[0].url;
            }
          }
        } catch (e) {
          console.warn("alldlv2 failed:", e.message);
        }
      }

      // 3. Fallback: YouTube Audio
      if (!downloadUrl && /(?:youtube\.com|youtu\.be)/i.test(url)) {
        try {
          const ytRes = await axios.get(
            `https://toshiro-api-editz6t9.vercel.app/api/downloader/yt-audio?url=${encodeURIComponent(url)}&quality=128`,
            { timeout: 25000 }
          );
          if (ytRes.data && ytRes.data.success && ytRes.data.result) {
            downloadUrl = ytRes.data.result.download_url || ytRes.data.result.preview;
            title = ytRes.data.result.title || title;
            isAudio = true;
          }
        } catch (_) {}
      }

      if (!downloadUrl) {
        throw new Error("Could not find a valid download link for this URL.");
      }

      const ext = isAudio ? "mp3" : "mp4";
      const mediaStream = await global.utils.getStreamFromURL(downloadUrl, `download.${ext}`);

      await message.reply({
        body: `📥 ${title}`,
        attachment: mediaStream
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("[ALLDL ERROR]:", error.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Could not download media: ${error.message || "Request timed out or unsupported link."}`);
    }
  }
};
