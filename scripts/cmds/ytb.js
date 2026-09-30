const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const btch = require("btch-downloader");
const { createDecipheriv } = require("crypto");

function decodeSavetube(enc) {
  const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  const data = Buffer.from(enc, "base64");
  const iv = data.slice(0, 16);
  const content = data.slice(16);
  const key = Buffer.from(secretKey, "hex");
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  return JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
}

async function resolveYouTubeDownload(url, isAudio) {
  // 1. Primary: Savetube direct CDN
  try {
    const cdnRes = await axios.get("https://media.savetube.vip/api/random-cdn", { timeout: 4000 });
    const cdn = cdnRes.data?.cdn;
    if (cdn) {
      const infoRes = await axios.post(`https://${cdn}/v2/info`, { url }, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://save-tube.com/" },
        timeout: 5000
      });
      const info = decodeSavetube(infoRes.data?.data);
      if (info?.key) {
        const dlRes = await axios.post(`https://${cdn}/download`, {
          downloadType: isAudio ? "audio" : "video",
          quality: isAudio ? "128" : "720",
          key: info.key
        }, {
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Referer": "https://save-tube.com/" },
          timeout: 7000
        });
        if (dlRes.data?.data?.downloadUrl) {
          return dlRes.data.data.downloadUrl;
        }
      }
    }
  } catch (_) {}

  // 2. Secondary: Toshiro yta2 / alldl
  try {
    const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/alldl?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(toshiroUrl, { timeout: 12000 });
    if (data?.success && data?.result) {
      const r = data.result;
      const candidate = isAudio ? (r.audio || r.music || r.video) : (r.video || r.url);
      if (candidate) return candidate;
    }
  } catch (_) {}

  // 3. Fallback: btch-downloader
  try {
    const yt = await btch.youtube(url);
    if (yt && yt.status !== false) {
      const candidate = isAudio ? yt.mp3 : (yt.mp4 || yt.mp3);
      if (candidate) return candidate;
    }
  } catch (_) {}

  return null;
}

module.exports = {
  config: {
    name: "ytb",
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    noPrefix: "both",
    shortDescription: { en: "Search & download YouTube videos or audio" },
    longDescription: { en: "Search YouTube videos, browse thumbnails and duration, then reply with the number to download MP4 video or MP3 audio." },
    category: "media",
    guide: { en: "{pn} -a <query> (for audio search)\n{pn} -v <query> (for video search)\n{pn} <query>" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    let type = "-v";
    let query = args.join(" ").trim();

    if (args[0] === "-a" || args[0] === "--audio") {
      type = "-a";
      query = args.slice(1).join(" ").trim();
    } else if (args[0] === "-v" || args[0] === "--video") {
      type = "-v";
      query = args.slice(1).join(" ").trim();
    }

    if (!query) {
      return message.reply(`❌ Please provide a search query.\n\n📖 Usage:\n• ${commandName} -a <song name>\n• ${commandName} -v <video title>`);
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🔍", event.messageID, () => {}, true);
    }

    try {
      const searchRes = await yts(query);
      const videos = (searchRes?.videos || []).slice(0, 6);

      if (videos.length === 0) {
        if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply("❌ No YouTube results found for your search.");
      }

      let msg = `🎬 YouTube Search Results for "${query}":\n\n`;
      const attachments = [];
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        msg += `${i + 1}. ${v.title}\n⏱️ ${v.timestamp || "N/A"} | 👤 ${v.author?.name || "YouTube"}\n\n`;

        if (v.thumbnail && attachments.length < 4) {
          try {
            const imgPath = path.join(cacheDir, `yt_${Date.now()}_${i}.jpg`);
            const imgRes = await axios.get(v.thumbnail, { responseType: "arraybuffer", timeout: 6000 });
            await fs.writeFile(imgPath, Buffer.from(imgRes.data));
            attachments.push(fs.createReadStream(imgPath));
            setTimeout(() => fs.remove(imgPath).catch(() => {}), 15000);
          } catch (_) {}
        }
      }

      msg += `👉 Reply to this message with a number (1-${videos.length}) to download ${type === "-a" ? "Audio (MP3)" : "Video (MP4)"}.`;

      message.reply({ body: msg.trim(), attachment: attachments }, (err, info) => {
        if (info?.messageID) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            author: event.senderID,
            results: videos,
            downloadType: type === "-a" ? "audio" : "video"
          });
        }
      });
    } catch (e) {
      console.error("[YTB ERROR]:", e.message);
      if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      message.reply(`❌ YouTube search failed: ${e.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    const choice = parseInt(event.body?.trim());
    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return message.reply(`❌ Please reply with a valid number between 1 and ${Reply.results.length}.`);
    }

    const selected = Reply.results[choice - 1];
    if (api && api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID).catch(() => {});
    }
    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const isAudio = Reply.downloadType === "audio";
    let tmpFile = null;

    try {
      const streamUrl = await resolveYouTubeDownload(selected.url, isAudio);
      if (!streamUrl) {
        throw new Error("Could not extract download stream from YouTube.");
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const ext = isAudio ? "mp3" : "mp4";
      tmpFile = path.join(cacheDir, `ytb_${Date.now()}.${ext}`);

      const fileRes = await axios.get(streamUrl, {
        responseType: "arraybuffer",
        timeout: 50000,
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://save-tube.com/" }
      });

      const fileBuf = Buffer.from(fileRes.data);
      if (fileBuf.length > 25 * 1024 * 1024) {
        if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
        return message.reply(`⚠️ Media exceeds Facebook Messenger's 25MB attachment limit (${(fileBuf.length / (1024 * 1024)).toFixed(1)}MB).\n\n🔗 Direct download stream:\n${streamUrl}`);
      }

      await fs.writeFile(tmpFile, fileBuf);

      await message.reply({
        body: `${isAudio ? "🎵" : "🎬"} ${selected.title}\n⏱️ ${selected.timestamp || "N/A"}\n👤 ${selected.author?.name || "YouTube"}`,
        attachment: fs.createReadStream(tmpFile)
      });

      if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
    } catch (e) {
      console.error("[YTB DOWNLOAD ERROR]:", e.message);
      if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      message.reply(`❌ Download error: ${e.message}`);
    } finally {
      if (tmpFile) fs.remove(tmpFile).catch(() => {});
    }
  }
};
