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
    name: "zai",
    aliases: ["zaiapi", "zaichat", "zais2api"],
    version: "1.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "zAI Multi-Platform API Gateway Command" },
    longDescription: { en: "Access all zAI supported models: Nano Banana, Nano Banana Pro, Gemini 3 Pro Preview, GPT-4o, Claude 3.5 Sonnet, Sora 2." },
    category: "ai",
    guide: { en: "{pn} models | {pn} <model_name> <prompt> | {pn} <prompt>" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    if (!args.length) {
      return message.reply(
        "🤖 **zAI API Gateway Usage:**\n" +
        "• `!zai models` - List all supported AI models\n" +
        "• `!zai nano-banana <prompt>` - Use Nano Banana AI\n" +
        "• `!zai nano-banana-pro <prompt>` - Use Nano Banana Pro AI\n" +
        "• `!zai gemini-3-pro-preview <prompt>` - Use Gemini 3 Pro Preview\n" +
        "• `!zai <prompt>` - Ask default model (Gemini 3 Pro Preview)"
      );
    }

    const sub = args[0].toLowerCase();
    if (sub === "models" || sub === "list") {
      const models = Object.values(zaiApi.SUPPORTED_MODELS);
      let text = "🤖 **zAI Gateway Available Models:**\n━━━━━━━━━━━━━━━━━━━━\n";
      for (const m of models) {
        text += `• **${m.name}** (\`${m.id}\`)\n  _${m.description}_\n`;
      }
      return message.reply(text);
    }

    let targetModel = "gemini-3-pro-preview";
    let prompt = args.join(" ").trim();

    for (const [key, m] of Object.entries(zaiApi.SUPPORTED_MODELS)) {
      if (key === sub || m.id === sub || m.aliases.includes(sub)) {
        targetModel = m.id;
        prompt = args.slice(1).join(" ").trim();
        break;
      }
    }

    const { type, messageReply, attachments } = event;
    let imageUrl = null;
    if (type === "message_reply" && messageReply?.attachments?.length > 0) {
      if (messageReply.attachments[0].type === "photo") {
        imageUrl = messageReply.attachments[0].url;
      }
    } else if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
      imageUrl = attachments[0].url;
    }

    if (!prompt && !imageUrl) {
      return message.reply(`Please provide a prompt for model \`${targetModel}\`.`);
    }

    return this.handleZaiChat({ message, event, api, model: targetModel, prompt, imageUrl, commandName });
  },

  onReply: async function ({ message, event, api, Reply, commandName }) {
    const prompt = event.body?.trim();
    if (!prompt) return;

    if (prompt.toLowerCase() === "clear") {
      setReaction(api, message, "🧹", event.messageID);
      return message.reply("zAI conversation cleared.");
    }

    const { attachments } = event;
    let imageUrl = (attachments?.length > 0 && attachments[0].type === "photo") ? attachments[0].url : null;

    return this.handleZaiChat({
      message,
      event,
      api,
      model: Reply.model || "gemini-3-pro-preview",
      prompt,
      imageUrl,
      commandName,
      history: Reply.history || []
    });
  },

  handleZaiChat: async function ({ message, event, api, model, prompt, imageUrl, commandName, history = [] }) {
    setReaction(api, message, "🤖", event.messageID);

    try {
      const messages = [...history];
      const result = await zaiApi.chatCompletion({
        model,
        prompt: prompt || "Analyze this image",
        messages,
        imageUrl
      });

      const modelMeta = zaiApi.SUPPORTED_MODELS[model] || { name: model };
      let responseText = `🤖 **[${modelMeta.name}]**\n━━━━━━━━━━━━━━━━\n${result.content}`;

      let attachmentsToSend = [];
      if (result.image_urls && result.image_urls.length > 0) {
        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);

        for (let i = 0; i < result.image_urls.length; i++) {
          const imgPath = path.join(cacheDir, `zai_${Date.now()}_${i}.png`);
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
              model,
              history: updatedHistory
            });
          }
        }
      });

      setReaction(api, message, "✅", event.messageID);
    } catch (error) {
      setReaction(api, message, "❌", event.messageID);
      message.reply(`❌ **zAI Gateway Error:** ${error.message}`);
    }
  }
};
