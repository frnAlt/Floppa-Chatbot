const zaiApi = require("../../func/zaiApi");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function setReaction(api, message, emoji, messageID) {
  try {
    if (typeof message?.reaction === "function") {
      message.reaction(emoji, messageID);
    } else if (api && typeof api.setMessageReaction === "function") {
      api.setMessageReaction(emoji, messageID, () => {}, true);
    }
  } catch (e) {}
}

module.exports = {
  config: {
    name: "nanobananapro",
    aliases: ["nano-banana-pro", "nbpro", "bananapro"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "High-performance Nano Banana Pro AI" },
    longDescription: { en: "Advanced AI model for deep reasoning, complex code generation, high-res image editing, and conversation." },
    category: "ai",
    guide: { en: "{pn} <prompt> or reply to an image with instructions" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    const { type, messageReply, attachments } = event;
    let prompt = args.join(" ").trim();
    let imageUrl = null;

    if (type === "message_reply" && messageReply?.attachments?.length > 0) {
      if (messageReply.attachments[0].type === "photo") {
        imageUrl = messageReply.attachments[0].url;
      }
    } else if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
      imageUrl = attachments[0].url;
    }

    if (!prompt && !imageUrl) {
      return message.reply("⚡ Please provide a prompt or reply to an image for Nano Banana Pro AI.");
    }

    return this.handleNanoBananaPro({ message, event, api, prompt, imageUrl, commandName });
  },

  onReply: async function ({ message, event, api, Reply, commandName }) {
    const prompt = event.body?.trim();
    if (!prompt) return;

    if (prompt.toLowerCase() === "clear") {
      setReaction(api, message, "🧹", event.messageID);
      return message.reply("⚡ Nano Banana Pro conversation reset.");
    }

    const { attachments } = event;
    let imageUrl = (attachments?.length > 0 && attachments[0].type === "photo") ? attachments[0].url : null;

    return this.handleNanoBananaPro({
      message,
      event,
      api,
      prompt,
      imageUrl,
      commandName,
      history: Reply.history || []
    });
  },

  handleNanoBananaPro: async function ({ message, event, api, prompt, imageUrl, commandName, history = [] }) {
    setReaction(api, message, "⚡", event.messageID);

    try {
      const messages = [...history];
      const result = await zaiApi.chatCompletion({
        model: "nano-banana-pro",
        prompt: prompt || "Analyze and edit image",
        messages,
        imageUrl
      });

      let responseText = `⚡ **[Nano Banana Pro AI]**\n━━━━━━━━━━━━━━━━\n${result.content}`;

      let attachmentsToSend = [];
      if (result.image_urls && result.image_urls.length > 0) {
        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);

        for (let i = 0; i < result.image_urls.length; i++) {
          const imgPath = path.join(cacheDir, `nbpro_${Date.now()}_${i}.png`);
          const imgRes = await axios.get(result.image_urls[i], { responseType: "arraybuffer" });
          await fs.writeFile(imgPath, Buffer.from(imgRes.data));
          attachmentsToSend.push(fs.createReadStream(imgPath));
        }
      }

      const sendPayload = { body: responseText };
      if (attachmentsToSend.length > 0) {
        sendPayload.attachment = attachmentsToSend;
      }

      message.reply(sendPayload, (err, info) => {
        if (!err && info) {
          const updatedHistory = [
            ...messages,
            { role: "user", content: prompt },
            { role: "assistant", content: result.content }
          ];

          if (global.GoatBot?.onReply) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID,
              history: updatedHistory
            });
          }
        }
      });

      setReaction(api, message, "✅", event.messageID);
    } catch (error) {
      setReaction(api, message, "❌", event.messageID);
      message.reply(`❌ **Nano Banana Pro Error:** ${error.message}`);
    }
  }
};
