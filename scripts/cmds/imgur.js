const axios = require("axios");

module.exports = {
  config: {
    name: "imgur",
    aliases: ["imglink", "uploadimg"],
    version: "1.1",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    category: "Image Url",
    description: "Upload an image to get a public image URL link",
    guide: "Reply to an image with /imgur"
  },

  onStart: async function ({ api, event, message }) {
    const attachment = event.messageReply?.attachments?.[0]?.url || event.attachments?.[0]?.url;

    if (!attachment) {
      return message.reply("⚠️ Please reply to an image message or attach an image to upload it.");
    }

    try {
      // Free Catbox / Imgur public link generator fallback
      const catboxRes = await axios.get(`https://catbox-node.vercel.app/api/upload?url=${encodeURIComponent(attachment)}`, { timeout: 15000 });
      if (catboxRes.data && catboxRes.data.url) {
        return message.reply(`✅ Uploaded Image URL:\n${catboxRes.data.url}`);
      }

      return message.reply(`✅ Direct Image URL:\n${attachment}`);
    } catch (error) {
      return message.reply(`✅ Direct Image URL:\n${attachment}`);
    }
  }
};