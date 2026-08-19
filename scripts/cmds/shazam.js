const axios = require("axios");

let recognizeSong = null;
try {
  recognizeSong = require("st-shazam").recognizeSong;
} catch (e) {}

module.exports = {
  config: {
    name: "shazam",
    aliases: ["findsong", "songid"],
    version: "2.4.77",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Identify songs from audio/video" },
    longDescription: { en: "Reply to an audio or video message to identify the song" },
    category: "music",
    guide: { en: "Reply to an audio/video message with /shazam" }
  },

  onStart: async function ({ message, args, event, usersData }) {
    if (!event.messageReply) {
      return message.reply("⚠️ Please reply to an audio or video message with /shazam");
    }

    const attachments = event.messageReply.attachments;
    if (!attachments || attachments.length === 0) {
      return message.reply("⚠️ The message you replied to doesn't contain any audio or video.");
    }

    const mediaAttachment = attachments.find(att => att.type === "audio" || att.type === "video");
    if (!mediaAttachment) {
      return message.reply("⚠️ Please reply to a message containing audio or video.");
    }

    message.reaction("🎵", event.messageID);

    try {
      if (recognizeSong) {
        const stream = await global.utils.getStreamFromURL(mediaAttachment.url, "audio.mp3");
        const result = await recognizeSong(stream);
        if (result && result.results && result.results.matches && result.results.matches.length > 0) {
          const matchId = result.results.matches[0].id;
          const songData = result.resources['shazam-songs']?.[matchId];
          if (songData) {
            message.reaction("✅", event.messageID);
            return message.reply(`✅ Song Found!\n\n🎵 Title: ${songData.attributes.title}\n👤 Artist: ${songData.attributes.artist}`);
          }
        }
      }

      message.reaction("✅", event.messageID);
      return message.reply(`🎵 Media Attachment Detected!\nURL: ${mediaAttachment.url}`);
    } catch (err) {
      message.reaction("❌", event.messageID);
      return message.reply("⚠️ Error during recognition: " + err.message);
    }
  }
};