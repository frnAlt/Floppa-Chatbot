const axios = require("axios");
const btch = require("btch-downloader");

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "dl", "autodl"],
    version: "3.0.0",
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
    let isAudio = args.includes("--a") || args.includes("-a");

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

      // 1. Primary engine: btch-downloader
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
        console.warn("[ALLDL] btch-downloader engine error:", e.message);
      }

      // 2. Secondary fallback: public mirror
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
