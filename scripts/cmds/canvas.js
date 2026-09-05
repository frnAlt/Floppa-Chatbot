const axios = require("axios");
const { Jimp } = require("jimp");
const { Readable } = require("stream");

async function extractImageUrl(args, event, api) {
  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    const imageAttachment = event.messageReply.attachments.find(
      att => att.type === "photo" || att.type === "image" || att.url || att.ID
    );
    if (imageAttachment) {
      imageUrl = imageAttachment.url || imageAttachment.previewUrl || imageAttachment.largePreviewUrl;
      if (!imageUrl && imageAttachment.ID && api?.resolvePhotoUrl) {
        try {
          imageUrl = await api.resolvePhotoUrl(imageAttachment.ID);
        } catch (_) {}
      }
    }
  }
  if (!imageUrl && event.attachments?.length > 0) {
    const imageAttachment = event.attachments.find(
      att => att.type === "photo" || att.type === "image" || att.url || att.ID
    );
    if (imageAttachment) {
      imageUrl = imageAttachment.url || imageAttachment.previewUrl || imageAttachment.largePreviewUrl;
      if (!imageUrl && imageAttachment.ID && api?.resolvePhotoUrl) {
        try {
          imageUrl = await api.resolvePhotoUrl(imageAttachment.ID);
        } catch (_) {}
      }
    }
  }
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
  if (!imageUrl && event.mentions && Object.keys(event.mentions).length > 0) {
    const targetUID = Object.keys(event.mentions)[0];
    imageUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
  }
  if (!imageUrl && event.messageReply?.senderID) {
    imageUrl = `https://graph.facebook.com/${event.messageReply.senderID}/picture?width=720&height=720&access_token=${token}`;
  }
  if (!imageUrl && event.senderID) {
    imageUrl = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=${token}`;
  }

  return imageUrl;
}

const AVAILABLE_ACTIONS = [
  "circle", "rounded", "resize", "crop", "rotate", "flip",
  "blur", "sharpen", "grayscale", "greyscale", "sepia", "invert",
  "brightness", "contrast"
];

module.exports = {
  config: {
    name: "canvas",
    aliases: ["imgcanvas", "canvasfx", "filterimg"],
    version: "2.1.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Apply image manipulations and filters using Canvas API"
    },
    longDescription: {
      en: "Apply various canvas actions and filters: circle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, saturation, hue, rotate, flip, resize"
    },
    category: "image",
    guide: {
      en: "{pn} <action> [value] | Reply to an image\n\nActions:\ncircle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, rotate, flip\n\nExample:\n• {pn} grayscale\n• {pn} blur 10\n• {pn} circle"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const action = args[0]?.toLowerCase();
    const prefix = global.GoatBot?.config?.prefix || "";

    if (!action || !AVAILABLE_ACTIONS.includes(action)) {
      return message.reply(
        `🎨 Available Canvas Actions:\n\n` +
        `• Filters: grayscale, sepia, invert, blur [val]\n` +
        `• Adjustments: brightness [val], contrast [val]\n` +
        `• Shapes & Transforms: circle, rounded, rotate [deg], flip [h/v], resize [w] [h]\n\n` +
        `💡 Usage: Reply to an image (or mention a user) with:\n${prefix}${commandName} <action> [value]\n` +
        `Example: ${prefix}${commandName} circle`
      );
    }

    const imageUrl = await extractImageUrl(args.slice(1), event, api);
    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image or mention a user to apply the '${action}' effect.`
      );
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      const jimg = await Jimp.read(imageUrl);
      if (action === "circle" || action === "rounded") {
        jimg.circle();
      } else if (action === "grayscale" || action === "greyscale") {
        jimg.greyscale();
      } else if (action === "sepia") {
        jimg.sepia();
      } else if (action === "invert") {
        jimg.invert();
      } else if (action === "blur") {
        const radius = parseInt(args[1], 10) || 5;
        jimg.blur(Math.min(25, Math.max(1, radius)));
      } else if (action === "rotate") {
        const deg = parseInt(args[1], 10) || 90;
        jimg.rotate(deg);
      } else if (action === "flip") {
        const vertical = (args[1] || "").toLowerCase().startsWith("v");
        jimg.flip({ horizontal: !vertical, vertical });
      } else if (action === "resize" && args[1] && args[2]) {
        const w = parseInt(args[1], 10) || 512;
        const h = parseInt(args[2], 10) || 512;
        jimg.resize({ w: Math.min(1920, w), h: Math.min(1920, h) });
      } else if (action === "brightness") {
        const val = parseInt(args[1], 10) || 20;
        jimg.color([{ apply: val >= 0 ? "brighten" : "darken", params: [Math.abs(val)] }]);
      } else if (action === "contrast") {
        const val = parseFloat(args[1]) || 0.3;
        jimg.contrast(Math.min(1, Math.max(-1, val)));
      }

      const buf = await jimg.getBuffer("image/png");
      const stream = Readable.from(buf);
      stream.path = `canvas_${action}.png`;

      if (api?.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `✨ Canvas Action: ${action.toUpperCase()} applied!`,
        attachment: stream
      });
    } catch (err) {
      console.error("[CANVAS ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to process canvas effect: ${err.message || err}`);
    }
  }
};
