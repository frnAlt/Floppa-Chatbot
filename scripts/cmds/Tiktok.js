const axios = require("axios");

module.exports = {
  config: {
    name: "tiktok",
    aliases: ["tt", "tiksearch", "tiktoksearch", "tik"],
    version: "1.2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download TikTok video or audio"
    },
    longDescription: {
      en: "Search TikTok by keyword and download the matching video directly or audio using the -a flag"
    },
    category: "media",
    guide: {
      en: "{pn} <search query>\n{pn} -a <search query> (audio only)\n{pn} -v <search query>"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    if (!args[0]) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide a search query.\n\n📖 Usage:\n• ${prefix}${commandName} <keyword>\n• ${prefix}${commandName} -a <keyword> (audio only)\n\n💡 Example:\n• ${prefix}${commandName} Demon Slayer edit`
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
      return message.reply("❌ Please provide a search query.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🔎", event.messageID, () => {}, true);
    }

    try {
      let mediaUrl = "";
      let title = "TikTok Media";
      let author = "Unknown";
      let duration = 0;

      const isDirectLink = /(?:https?:\/\/)?(?:www\.|vt\.|vm\.)?tiktok\.com\//i.test(query);

      if (isDirectLink) {
        // Direct link download via btch-downloader
        const btch = require("btch-downloader");
        try {
          const res = await btch.ttdl(query);
          if (res && res.status !== false) {
            title = res.title || title;
            author = res.developer || "TikTok Creator";
            mediaUrl = isAudio ? (res.audio || res.video) : (res.video || res.audio);
          }
        } catch (e) {
          console.warn("[TIKTOK] btch.ttdl direct failed:", e.message);
        }

        // Secondary fallback for direct link
        if (!mediaUrl) {
          try {
            const tikwm = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(query)}`, { timeout: 15000 });
            if (tikwm.data?.code === 0 && tikwm.data?.data) {
              const d = tikwm.data.data;
              title = d.title || title;
              author = d.author?.unique_id || author;
              duration = d.duration || 0;
              mediaUrl = isAudio ? (d.music || d.play) : (d.play || d.music);
            }
          } catch (_) {}
        }
      } else {
        // Search query: search via public mirror
        try {
          const mirrorSearch = `https://api.siputzx.my.id/api/s/tiktok?query=${encodeURIComponent(query)}`;
          const res = await axios.get(mirrorSearch, { timeout: 20000 });
          if (res.data?.status && res.data?.data?.[0]) {
            const first = res.data.data[0];
            title = first.title || title;
            author = first.author?.nickname || author;
            mediaUrl = isAudio ? (first.music || first.nowm || first.play) : (first.nowm || first.play || first.music);
          }
        } catch (e) {
          console.warn("[TIKTOK] Search mirror failed:", e.message);
        }
      }

      if (!mediaUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ Could not retrieve TikTok media for "${query}". Please check the link or search keyword.`);
      }

      const stream = await global.utils.getStreamFromURL(
        mediaUrl,
        isAudio ? `tiktok_${Date.now()}.mp3` : `tiktok_${Date.now()}.mp4`
      );

      const bodyText = isAudio
        ? `🎵 TikTok Audio\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`
        : `🎬 TikTok Video\n\n📌 Title: ${title || "N/A"}\n👤 Creator: @${author || "Unknown"}\n⏱️ Duration: ${duration || 0}s`;

      await message.reply({
        body: bodyText,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("TikTok command error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to fetch TikTok media: ${error.message || error}`);
    }
  }
};
