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

    const isUrl = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(query);

    if (api.setMessageReaction) {
      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    }

    if (isUrl) {
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(query)}`;
        const res = await axios.get(apiUrl, { timeout: 45000 });

        if (!res.data || !res.data.success || !res.data.result) {
          if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ Could not download audio from this URL.");
        }

        const { title, download_url, preview, quality } = res.data.result;
        const audioUrl = download_url || preview;
        const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing.mp3");

        await message.reply({
          body: `🎧 Title: ${title || "Audio"}\n🎼 Quality: ${quality || "128kbps"}`,
          attachment: audioStream
        });

        if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
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
      const res = await axios.get(
        `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(selected.url)}`,
        { timeout: 60000 }
      );

      if (!res.data || !res.data.success || !res.data.result) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Audio processing failed.");
      }

      const { title, download_url, preview, quality } = res.data.result;
      const audioUrl = download_url || preview;
      const audioStream = await global.utils.getStreamFromURL(audioUrl, "sing.mp3");

      await message.reply({
        body: `🎧 ${title || selected.title}\n⏱️ Duration: ${selected.duration || "N/A"}\n🎼 Quality: ${quality || "128kbps"}`,
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
