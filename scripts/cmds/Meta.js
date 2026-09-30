const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const aiCore = require("../../system/ai-core.js");

module.exports = {
  config: {
    name: "metaai",
    aliases: ["meta", "llama", "meta-ai"],
    version: "2.6pro",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    noPrefix: "both",
    shortDescription: { en: "Meta AI Assistant" },
    longDescription: { en: "Chat with Meta LLaMA / Meta AI assistant with multi-engine failover." },
    category: "ai",
    guide: { en: "{pn} <prompt> or reply to an image with {pn} <prompt>" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    const { messageReply } = event;
    let prompt = args.join(" ").trim();
    let imageUrl = null;

    if (global.utils && typeof global.utils.extractImageUrl === "function") {
      imageUrl = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    }
    if (!imageUrl && messageReply?.attachments?.length > 0) {
      for (const a of messageReply.attachments) {
        const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl;
        if (u) { imageUrl = u; break; }
      }
    }

    if (!prompt && !imageUrl) return message.reply("Please provide a prompt or reply to an image.");

    return this.handleMetaChat({ message, event, api, prompt, imageUrl, commandName, history: null });
  },

  onReply: async function ({ message, event, api, Reply, commandName }) {
    const prompt = event.body?.trim();
    if (!prompt) return;

    if (prompt.toLowerCase() === "clear") {
      if (api && api.setMessageReaction) api.setMessageReaction("🧹", event.messageID, () => {}, true);
      return message.reply("Context cleared.");
    }

    const { attachments } = event;
    let imageUrl = (attachments?.length > 0 && attachments[0].type === "photo") ? attachments[0].url : null;

    return this.handleMetaChat({ 
      message, 
      event, 
      api, 
      prompt, 
      imageUrl, 
      commandName, 
      history: Reply.conversation_id 
    });
  },

  handleMetaChat: async function ({ message, event, api, prompt, imageUrl, commandName, history }) {
    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const paths = [];

    try {
      let replyText = "";
      let image_urls = [];
      let conversation_id = history || `meta_${event.senderID}`;

      // 1. Try Meta endpoint if online
      try {
        const params = {
          message: prompt || "Analyze this image",
          new_conversation: history ? "false" : "true"
        };
        if (history) params.conversation_id = history;
        if (imageUrl) params.img_url = imageUrl;

        const response = await axios.get("https://metakexbyneokex.vercel.app/chat", { params, timeout: 8000 });
        if (response.data && response.data.success) {
          replyText = response.data.message;
          image_urls = response.data.image_urls || [];
          conversation_id = response.data.conversation_id || conversation_id;
        }
      } catch (_) {
        // Fallback to AI Core
      }

      // 2. High-speed AI Core Failover
      if (!replyText) {
        const contextId = `meta_${event.threadID}_${event.senderID}`;
        replyText = await aiCore.generateCompletion({
          prompt: imageUrl ? `${prompt || "Analyze this"}\nImage: ${imageUrl}` : prompt,
          contextId,
          image: imageUrl
        });
      }

      if (!replyText) {
        throw new Error("Could not retrieve a response from Meta AI services.");
      }

      let sendData = { body: `🤖 [Meta AI]\n\n${replyText}` };

      if (image_urls && image_urls.length > 0) {
        const attachment = [];
        for (let i = 0; i < image_urls.length; i++) {
          try {
            const imgPath = path.join(cacheDir, `meta_${Date.now()}_${i}.png`);
            const imgRes = await axios.get(image_urls[i], { responseType: "arraybuffer", timeout: 8000 });
            await fs.writeFile(imgPath, Buffer.from(imgRes.data));
            attachment.push(fs.createReadStream(imgPath));
            paths.push(imgPath);
          } catch (_) {}
        }
        if (attachment.length > 0) sendData.attachment = attachment;
      }

      message.reply(sendData, (err, info) => {
        if (!err && info?.messageID) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            conversation_id: conversation_id
          });
        }
        paths.forEach(p => fs.remove(p).catch(() => {}));
      });

      if (api && api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

    } catch (error) {
      if (api && api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      message.reply(`❌ Meta AI Error: ${error.message}`);
      paths.forEach(p => fs.remove(p).catch(() => {}));
    }
  }
};
