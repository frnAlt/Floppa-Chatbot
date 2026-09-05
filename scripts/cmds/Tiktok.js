const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "tiktok",
    aliases: ["tt", "tiksearch", "tiktoksearch", "tik"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download TikTok video or audio"
    },
    longDescription: {
      en: "Search TikTok by keyword or direct URL and download the matching MP4 video or MP3 audio"
    },
    category: "media",
    guide: {
      en: "{pn} <search query or link>\n{pn} -a <query/link> (audio only)\n{pn} -v <query/link> (video only)"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    if (!args[0]) {
      const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide a search keyword or TikTok video link.\n\n📖 Usage:\n• ${prefix}${commandName} <keyword>\n• ${prefix}${commandName} -a <keyword> (audio only)\n\n💡 Example:\n• ${prefix}${commandName} cat funny\n• ${prefix}${commandName} Demon Slayer edit`
      );
    }

    let isAudio = false;
    let query = args.join(" ").trim();

    if (args[0] === "-a" || args[0] === "--audio" || args[0] === "-m" || args[0] === "audio") {
      isAudio = true;
      query = args.slice(1).join(" ").trim();
    } else if (args[0] === "-v" || args[0] === "--video" || args[0] === "video") {
      isAudio = false;
      query = args.slice(1).join(" ").trim();
    }

    if (!query) {
      return message.reply("❌ Please provide a search keyword or TikTok URL.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let tmpFile = null;

    try {
      let mediaUrl = "";
      let title = "TikTok Media";
      let author = "Unknown";
      let duration = 0;

      const isDirectLink = /(?:https?:\/\/)?(?:www\.|vt\.|vm\.)?tiktok\.com\//i.test(query);

      // ─── 1. Direct Link Handling ─────────────────────────────────────────
      if (isDirectLink) {
        // Toshiro AllDL API for direct TikTok links
        try {
          const toshiroDl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(query)}`;
          const dlRes = await axios.get(toshiroDl, { timeout: 15000 });
          if (dlRes.data?.success && dlRes.data?.result) {
            const r = dlRes.data.result;
            title = r.title || title;
            author = r.author || author;
            mediaUrl = isAudio ? (r.music || r.audio || r.video) : (r.video || r.music);
          }
        } catch (_) {}

        // Secondary fallback for direct links
        if (!mediaUrl) {
          try {
            const tikwm = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(query)}`, { timeout: 15000 });
            if (tikwm.data?.code === 0 && tikwm.data?.data) {
              const d = tikwm.data.data;
              title = d.title || title;
              author = d.author?.unique_id || d.author?.nickname || author;
              duration = d.duration || 0;
              mediaUrl = isAudio ? (d.music || d.play) : (d.play || d.music);
            }
          } catch (_) {}
        }
      }

      // ─── 2. Search Keyword Handling via Toshiro tiksearch API ──────────────
      if (!mediaUrl) {
        try {
          const searchApi = `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(query)}`;
          const searchRes = await axios.get(searchApi, { timeout: 15000 });
          if (searchRes.data?.success && searchRes.data?.result) {
            const r = searchRes.data.result;
            title = r.title || title;
            author = r.author || author;
            duration = r.duration || 0;
            mediaUrl = isAudio ? (r.music || r.video) : (r.video || r.preview || r.music);
          }
        } catch (err) {
          console.warn("[TIKTOK] Toshiro search API failed:", err.message);
        }

        // Secondary fallback: tikwm search
        if (!mediaUrl) {
          try {
            const tikwmSearch = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=1`, { timeout: 15000 });
            if (tikwmSearch.data?.data?.videos?.[0]) {
              const v = tikwmSearch.data.data.videos[0];
              title = v.title || title;
              author = v.author?.unique_id || v.author?.nickname || author;
              duration = v.duration || 0;
              mediaUrl = isAudio ? (v.music || v.play) : (v.play || v.music);
            }
          } catch (_) {}
        }
      }

      if (!mediaUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Could not find TikTok video for "${query}". Please try another keyword.`);
      }

      // Download media buffer and save to cache to ensure reliable MP4 delivery
      const ext = isAudio ? "mp3" : "mp4";
      tmpFile = path.join(cacheDir, `tiktok_${Date.now()}.${ext}`);

      const downloadRes = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        timeout: 45000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.tiktok.com/"
        }
      });

      await fs.writeFile(tmpFile, Buffer.from(downloadRes.data));

      const bodyText = isAudio
        ? `🎵 TikTok Audio\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`
        : `🎬 TikTok Video\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`;

      await message.reply({
        body: bodyText,
        attachment: fs.createReadStream(tmpFile)
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      fs.remove(tmpFile).catch(() => {});
    } catch (error) {
      console.error("[TIKTOK COMMAND ERROR]:", error);
      if (tmpFile) fs.remove(tmpFile).catch(() => {});
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to send TikTok video: ${error.message || error}`);
    }
  }
};
