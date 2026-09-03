const axios = require("axios");

const client = axios.create({ timeout: 25000 });

async function getYouTubeAudio(youtubeUrl, titleFallback = "") {
  // 1. Primary: yta2 API (Fast CDN ymcdn.org)
  try {
    const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await client.get(apiUrl, { timeout: 25000 });

    if (res.data && res.data.success && res.data.result) {
      const r = res.data.result;
      const candidates = [r.download_url, r.preview].filter(Boolean);
      for (const candidate of candidates) {
        if (candidate.includes("onrender.com")) continue;
        return {
          audioUrl: candidate,
          title: r.title || titleFallback || "YouTube Audio",
          quality: r.quality || "128kbps",
          duration: r.duration || "N/A"
        };
      }
    }
  } catch (err) {
    console.warn("[SING] yta2 primary failed:", err.message);
  }

  // 2. Secondary fallback: yt-audio with short timeout
  try {
    const ytAudioUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yt-audio?url=${encodeURIComponent(youtubeUrl)}&quality=128`;
    const res = await client.get(ytAudioUrl, { timeout: 8000 });
    if (res.data && res.data.success && res.data.result) {
      const r = res.data.result;
      const candidates = [r.download_url, r.preview].filter(Boolean);
      for (const candidate of candidates) {
        return {
          audioUrl: candidate,
          title: r.title || titleFallback || "YouTube Audio",
          quality: r.quality || "128kbps",
          duration: r.duration || "N/A"
        };
      }
    }
  } catch (err) {
    console.warn("[SING] yt-audio secondary failed:", err.message);
  }

  // 3. Tertiary fallback: nkx.lol music search
  if (titleFallback) {
    try {
      const searchRes = await client.get(`https://play.nkx.lol/search?q=${encodeURIComponent(titleFallback)}&limit=1`, { timeout: 10000 });
      const top = searchRes.data?.results?.[0];
      if (top?.audio_cdn_url) {
        return {
          audioUrl: top.audio_cdn_url,
          title: top.title || titleFallback,
          quality: "128kbps",
          duration: "N/A"
        };
      }
    } catch (e) {
      console.warn("[SING] nkx tertiary failed:", e.message);
    }
  }

  return null;
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music", "play"],
    version: "2.1.0",
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
        const spUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/spdl?url=${encodeURIComponent(query)}`;
        const res = await client.get(spUrl, { timeout: 30000 });

        let audioUrl = null;
        let title = "Spotify Track";
        let artist = "";

        if (res.data && res.data.success && res.data.result) {
          const r = res.data.result;
          audioUrl = r.download_url || r.audio || r.url || r.preview;
          title = r.title || r.name || title;
          artist = r.artist || r.author || "";
        } else if (res.data && res.data.download_url) {
          audioUrl = res.data.download_url;
          title = res.data.title || title;
        }

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
      const searchUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(query)}`;
      const res = await client.get(searchUrl, { timeout: 25000 });

      if (!res.data || !res.data.success || !res.data.results || res.data.results.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No songs found for "${query}".`);
      }

      const results = res.data.results.slice(0, 6);
      let msg = `🎶 Search results for "${query}":\n\n`;
      const thumbnailPromises = [];

      results.forEach((item, index) => {
        msg += `${index + 1}. ${item.title}\n[⏱️ ${item.duration || "N/A"}]\n\n`;
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

    // Robust number extraction (supports "1", "#1", "1.", "song 1", etc.)
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
        body: `🎧 ${audioData.title || selected.title}\n⏱️ Duration: ${selected.duration || audioData.duration || "N/A"}\n🎼 Quality: ${audioData.quality || "128kbps"}`,
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
