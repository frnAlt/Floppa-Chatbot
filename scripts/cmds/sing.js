const axios = require("axios");
const yts = require("yt-search");
const btch = require("btch-downloader");
const { Readable } = require("stream");

const client = axios.create({ timeout: 15000 });

async function getAudioForTrack(titleFallback = "", youtubeUrl = "") {
  const cleanTitle = (titleFallback || "").replace(/\[[^\]]*\]|\([^\)]*\)/g, "").trim();
  const searchQueries = [cleanTitle, titleFallback].filter(Boolean);

  // 1. Primary: High-speed music audio stream via audio search engine
  for (const q of searchQueries) {
    try {
      const searchApi = `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(q)}`;
      const res = await client.get(searchApi, { timeout: 8000 });
      const r = res.data?.result;
      const musicUrl = r?.music;

      if (musicUrl) {
        const audioRes = await axios.get(musicUrl, {
          responseType: "arraybuffer",
          timeout: 20000,
          headers: {
            "Range": "bytes=0-",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.tiktok.com/"
          }
        });

        if (audioRes.data && audioRes.data.length > 30000) {
          const stream = Readable.from(Buffer.from(audioRes.data));
          stream.path = "sing.mp3";
          return {
            stream,
            title: r.title || titleFallback || "Audio Track",
            duration: r.duration ? `${r.duration}s` : "N/A",
            quality: "128kbps"
          };
        }
      }
    } catch (err) {
      // proceed to next query / provider
    }
  }

  // 2. Secondary: Toshiro YouTube Audio API
  if (youtubeUrl) {
    try {
      const ytAudioUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yt-audio?url=${encodeURIComponent(youtubeUrl)}&quality=128`;
      const res = await client.get(ytAudioUrl, { timeout: 10000 });
      const r = res.data?.result;
      const dl = r?.download_url || r?.preview;

      if (res.data?.success && dl) {
        const audioRes = await axios.get(dl, { responseType: "arraybuffer", timeout: 20000 });
        if (audioRes.data && audioRes.data.length > 30000) {
          const stream = Readable.from(Buffer.from(audioRes.data));
          stream.path = "sing.mp3";
          return {
            stream,
            title: r.title || titleFallback || "YouTube Audio",
            duration: r.duration || "N/A",
            quality: r.quality || "128kbps"
          };
        }
      }
    } catch (_) {}
  }

  // 3. Tertiary: btch-downloader MP3
  if (youtubeUrl) {
    try {
      const res = await btch.youtube(youtubeUrl);
      if (res && res.status !== false && res.mp3) {
        const stream = await global.utils.getStreamFromURL(res.mp3, "sing.mp3");
        return {
          stream,
          title: res.title || titleFallback || "YouTube Audio",
          duration: res.duration || "N/A",
          quality: "128kbps"
        };
      }
    } catch (_) {}
  }

  // 4. Quaternary: Public mirror
  if (youtubeUrl) {
    try {
      const mirrorUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
      const { data } = await client.get(mirrorUrl, { timeout: 10000 });
      const dl = data?.data?.dl || data?.data?.url;
      if (dl) {
        const stream = await global.utils.getStreamFromURL(dl, "sing.mp3");
        return {
          stream,
          title: data.data.title || titleFallback || "YouTube Audio",
          duration: "N/A",
          quality: "128kbps"
        };
      }
    } catch (_) {}
  }

  return null;
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music", "play"],
    version: "3.1.0",
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

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    }

    // ── Mode 1: Spotify URL ──
    if (isSpotify) {
      try {
        let audioUrl = null;
        let title = "Spotify Track";
        let artist = "";

        // 1. Primary: Toshiro spdl
        try {
          const spRes = await client.get(`https://toshiro-api-editz6t9.vercel.app/api/downloader/spdl?url=${encodeURIComponent(query)}`, { timeout: 15000 });
          if (spRes.data?.success && (spRes.data?.result?.download_url || spRes.data?.result?.audio)) {
            audioUrl = spRes.data.result.download_url || spRes.data.result.audio;
            title = spRes.data.result.title || title;
            artist = spRes.data.result.artist || "";
          }
        } catch (_) {}

        if (!audioUrl) throw new Error("Could not extract Spotify audio stream.");

        const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing_spotify.mp3");
        if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({
          body: `🎵 Title: ${title}${artist ? `\n👤 Artist: ${artist}` : ""}\n🎼 Source: Spotify`,
          attachment: audioStream
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
        let searchTitle = "YouTube Audio";
        try {
          const searchRes = await yts(query);
          if (searchRes?.videos?.[0]) searchTitle = searchRes.videos[0].title;
        } catch (_) {}

        const audioData = await getAudioForTrack(searchTitle, query);
        if (!audioData || !audioData.stream) {
          if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ Could not download audio from this YouTube link.");
        }

        if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({
          body: `🎧 Title: ${audioData.title || searchTitle}\n🎼 Quality: ${audioData.quality || "128kbps"}`,
          attachment: audioData.stream
        });
      } catch (err) {
        console.error("[SING] Direct YouTube download error:", err.message);
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Download error: ${err.message || err}`);
      }
    }

    // ── Mode 3: YouTube Search & Interactive Reply ──
    try {
      const searchRes = await yts(query);
      const videos = searchRes?.videos || [];

      if (videos.length === 0) {
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
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
        if (item.thumbnail && global.utils?.getStreamFromURL) {
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
          if (global.GoatBot?.onReply) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              author: event.senderID,
              threadID: event.threadID,
              timestamp: Date.now(),
              results
            });
          }
        }
      );
    } catch (e) {
      console.error("[SING] Search error:", e.message);
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
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
    if (typeof Reply.delete === 'function') Reply.delete();

    if (api && api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID, event.threadID).catch(() => {});
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const audioData = await getAudioForTrack(selected.title, selected.url);
      if (!audioData || !audioData.stream) {
        if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Could not fetch audio stream for "${selected.title}". Please try another song.`);
      }

      await message.reply({
        body: `🎧 ${audioData.title || selected.title}\n⏱️ Duration: ${audioData.duration || selected.duration || "N/A"}\n🎼 Quality: ${audioData.quality || "128kbps"}`,
        attachment: audioData.stream
      });

      if (api && api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (e) {
      console.error("[SING] onReply download error:", e.message);
      if (api && api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      message.reply("❌ Failed to download audio. Please try another song or reply again.");
    }
  }
};
