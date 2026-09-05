const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "imgbb",
    aliases: ["imgb", "imgupload"],
    version: "1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    description: {
      en: "Upload image(s) to imgbb"
    },
    category: "uploader",
    guide: {
      en: "{pn} (reply to one or more images)"
    }
  },

  onStart: async function ({ api, event }) {
    const imgbbApiKey = "1b4d99fa0c3195efe42ceb62670f2a25";
    const rawList = event.messageReply?.attachments || event.attachments || [];
    const targetUrls = [];

    for (const att of rawList) {
      const u = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url;
      if (u) targetUrls.push(u);
    }

    if (targetUrls.length === 0) {
      return api.sendMessage("Please reply to one or more image attachments or attach images.", event.threadID, event.messageID);
    }

    try {
      const uploadedLinks = await Promise.all(
        targetUrls.map(async (imgUrl, index) => {
          const response = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 30000 });
          const formData = new FormData();
          formData.append("image", Buffer.from(response.data), { filename: `image${index}.jpg` });

          const res = await axios.post("https://api.imgbb.com/1/upload", formData, {
            headers: formData.getHeaders(),
            params: {
              key: imgbbApiKey
            }
          });

          return res.data.data.url;
        })
      );

      return api.sendMessage(uploadedLinks.join("\n"), event.threadID, event.messageID);

    } catch (err) {
      console.error("Upload error:", err);
      return api.sendMessage("Failed to upload one or more images to imgbb.", event.threadID, event.messageID);
    }
  }
};