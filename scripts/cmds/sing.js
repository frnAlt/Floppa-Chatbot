const axios = require("axios");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music"],
    version: "2.0.0",
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

    if (isSpotify) {
      try {
        const spUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/spdl?url=${encodeURIComponent(query)}`;
        const res = await axios.get(spUrl, { timeout: 35000 });

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

        if (!audioUrl) {
          throw new Error("Could not extract Spotify audio URL.");
        }

        const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing_spotify.mp3");
        if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

        return message.reply({
          body: `🎵 Title: ${title}${artist ? `\n👤 Artist: ${artist}` : ""}\n🎼 Source: Spotify`,
          attachment: audioStream
        });
      } catch (err) {
        console.error("Spotify download error:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Spotify download failed: ${err.message || err}`);
      }
    }

    if (isYtUrl) {
      try {
        let audioUrl = null;
        let title = "Audio Track";
        let quality = "128kbps";

        // 1. Try Toshiro YouTube Audio (yt-audio)
        try {
          const ytAudioUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yt-audio?url=${encodeURIComponent(query)}&quality=128`;
          const ytRes = await axios.get(ytAudioUrl, { timeout: 35000 });
          if (ytRes.data && ytRes.data.success && ytRes.data.result) {
            const r = ytRes.data.result;
            audioUrl = r.download_url || r.preview;
            title = r.title || title;
            quality = r.quality || quality;
          }
        } catch (e) {
          console.warn("yt-audio failed, falling back to yta2:", e.message);
        }

        // 2. Fallback to yta2
        if (!audioUrl) {
          const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(query)}`;
          const res = await axios.get(apiUrl, { timeout: 35000 });
          if (res.data && res.data.success && res.data.result) {
            audioUrl = res.data.result.download_url || res.data.result.preview;
            title = res.data.result.title || title;
            quality = res.data.result.quality || quality;
          }
        }

        if (!audioUrl) {
          if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ Could not download YouTube audio from this URL.");
        }

        const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing.mp3");

        await message.reply({
          body: `🎧 Title: ${title}\n🎼 Quality: ${quality}`,
          attachment: audioStream
        });

        if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
        return;
      } catch (err) {
        console.error("Sing URL download error:", err);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Download error: ${err.message || err}`);
      }
    } else {
      try {
        const res = await axios.get(
          `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(query)}`,
          { timeout: 30000 }
        );

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

        msg += `👉 Reply with a number (1-${results.length}) to download the audio track.`;

        const thumbnails = (await Promise.all(thumbnailPromises)).filter(Boolean);

        message.reply(
          { body: msg.trim(), attachment: thumbnails },
          (err, info) => {
            if (err) return;
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              author: event.senderID,
              results
            });
          }
        );
      } catch (e) {
        console.error("Sing search error:", e);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        message.reply("❌ Search error. Please try again later.");
      }
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    if (event.senderID !== Reply.author) return;

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return message.reply(`❌ Invalid choice. Please choose a number between 1 and ${Reply.results.length}.`);
    }

    const selected = Reply.results[choice - 1];

    if (api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID);
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      let audioUrl = null;
      let title = selected.title || "Audio";
      let quality = "128kbps";

      // 1. Try yt-audio
      try {
        const ytAudioUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yt-audio?url=${encodeURIComponent(selected.url)}&quality=128`;
        const ytRes = await axios.get(ytAudioUrl, { timeout: 35000 });
        if (ytRes.data && ytRes.data.success && ytRes.data.result) {
          const r = ytRes.data.result;
          audioUrl = r.download_url || r.preview;
          title = r.title || title;
          quality = r.quality || quality;
        }
      } catch (e) {
        console.warn("onReply yt-audio failed, falling back to yta2:", e.message);
      }

      // 2. Fallback to yta2
      if (!audioUrl) {
        const res = await axios.get(
          `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(selected.url)}`,
          { timeout: 45000 }
        );
        if (res.data && res.data.success && res.data.result) {
          audioUrl = res.data.result.download_url || res.data.result.preview;
          title = res.data.result.title || title;
          quality = res.data.result.quality || quality;
        }
      }

      if (!audioUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Audio processing failed.");
      }

      const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing.mp3");

      await message.reply({
        body: `🎧 ${title}\n⏱️ Duration: ${selected.duration || "N/A"}\n🎼 Quality: ${quality}`,
        attachment: audioStream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (e) {
      console.error("Sing download error:", e);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      message.reply("❌ Download error.");
    }
  }
};
