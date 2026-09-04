const axios = require("axios");
const yts = require("yt-search");
const btch = require("btch-downloader");

const client = axios.create({ timeout: 25000 });

async function getYouTubeAudio(youtubeUrl, titleFallback = "") {
  // 1. Primary: btch-downloader (high-speed ymcdn / fast MP3 stream)
  try {
    const res = await btch.youtube(youtubeUrl);
    if (res && res.status !== false && res.mp3) {
      return {
        audioUrl: res.mp3,
        title: res.title || titleFallback || "YouTube Audio",
        quality: "128kbps",
        duration: res.duration || "N/A"
      };
    }
  } catch (err) {
    console.warn("[SING] btch.youtube primary failed:", err.message);
  }

  // 2. Secondary fallback: public high-reliability ytdl mirror
  try {
    const mirrorUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const { data } = await client.get(mirrorUrl, { timeout: 15000 });
    if (data?.status && (data?.data?.dl || data?.data?.url)) {
      return {
        audioUrl: data.data.dl || data.data.url,
        title: data.data.title || titleFallback || "YouTube Audio",
        quality: "128kbps",
        duration: "N/A"
      };
    }
  } catch (err) {
    console.warn("[SING] Secondary mirror failed:", err.message);
  }

  return null;
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music", "play"],
    version: "3.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search and download YouTube audio" },
    longDescription: { en: "Search YouTube songs and download audio directly or via interactive reply selection" },
    category: "media",
    guide: { en: "{pn} <song name or YouTube URL>" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("❌ Please provide a song name or YouTube link.");

    const isSpotify = /(?:open\.spotify\.com\/track\/|spotify\.link\/|spotify:track:)/i.test(query);
    const isYtUrl = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(query);

    if (api.setMessageReaction) {
      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    }

    // ── Mode 1: Spotify URL ──
    if (isSpotify) {
      try {
        const spUrl = `https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(query)}`;
        const res = await client.get(spUrl, { timeout: 25000 });
        let audioUrl = res.data?.data?.download || res.data?.data?.url || res.data?.download_url;
        let title = res.data?.data?.title || "Spotify Track";
        let artist = res.data?.data?.artist || "";

        if (!audioUrl) throw new Error("Could not extract Spotify audio stream.");

        const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing_spotify.mp3");
        if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({
          body: `🎵 Title: ${title}${artist ? `\n👤 Artist: ${artist}` : ""}\n🎼 Source: Spotify`,
          attachment: audioStream
        });
      } catch (err) {
        console.error("[SING] Spotify download error:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Spotify download failed: ${err.message || err}`);
      }
    }

    // ── Mode 2: Direct YouTube URL ──
    if (isYtUrl) {
      try {
        const audioData = await getYouTubeAudio(query);
        if (!audioData || !audioData.audioUrl) {
          if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ Could not download YouTube audio from this link.");
        }

        const audioStream = await global.utils.getStreamFromURL(audioData.audioUrl, "sing.mp3");
        if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({
          body: `🎧 Title: ${audioData.title}\n🎼 Quality: ${audioData.quality}`,
          attachment: audioStream
        });
      } catch (err) {
        console.error("[SING] Direct YouTube download error:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Download error: ${err.message || err}`);
      }
    }

    // ── Mode 3: YouTube Search & Interactive Reply ──
    try {
      const searchRes = await yts(query);
      const videos = searchRes?.videos || [];

      if (videos.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No songs found for "${query}".`);
      }

      const results = videos.slice(0, 6).map(v => ({
        title: v.title,
        url: v.url,
        duration: v.timestamp || (v.seconds ? `${Math.floor(v.seconds / 60)}:${v.seconds % 60}` : "N/A"),
        thumbnail: v.thumbnail,
        author: v.author?.name || "Unknown"
      }));

      let msg = `🎶 Search results for "${query}":\n\n`;
      const thumbnailPromises = [];

      results.forEach((item, index) => {
        msg += `${index + 1}. ${item.title}\n[⏱️ ${item.duration} | 👤 ${item.author}]\n\n`;
        if (item.thumbnail) {
          thumbnailPromises.push(
            global.utils.getStreamFromURL(item.thumbnail, `sing_thumb_${index}.jpg`).catch(() => null)
          );
        }
      });

      msg += `👉 Reply with the song number (1-${results.length}) to get the MP3 audio.`;

      const thumbnails = (await Promise.all(thumbnailPromises)).filter(Boolean);

      message.reply(
        { body: msg.trim(), attachment: thumbnails },
        (err, info) => {
          if (err || !info) return;
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            author: event.senderID,
            threadID: event.threadID,
            timestamp: Date.now(),
            results
          });
        }
      );
    } catch (e) {
      console.error("[SING] Search error:", e.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Search error. Please try again later.");
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    if (String(event.senderID) !== String(Reply.author)) return;

    const match = String(event.body || "").trim().match(/\d+/);
    const choice = match ? parseInt(match[0], 10) : NaN;

    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return message.reply(`❌ Invalid choice. Please reply with a number between 1 and ${Reply.results.length}.`);
    }

    const selected = Reply.results[choice - 1];

    if (api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID).catch(() => {});
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const audioData = await getYouTubeAudio(selected.url, selected.title);
      if (!audioData || !audioData.audioUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Could not fetch audio stream for "${selected.title}".`);
      }

      const audioStream = await global.utils.getStreamFromURL(audioData.audioUrl, "sing.mp3");

      await message.reply({
        body: `🎧 ${audioData.title || selected.title}\n⏱️ Duration: ${selected.duration || "N/A"}\n🎼 Quality: ${audioData.quality || "128kbps"}`,
        attachment: audioStream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (e) {
      console.error("[SING] onReply download error:", e.message);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      message.reply("❌ Failed to download audio. Please try another song or reply again.");
    }
  }
};
