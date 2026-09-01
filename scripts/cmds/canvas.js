const axios = require("axios");

function extractImageUrl(args, event) {
  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    const imageAttachment = event.messageReply.attachments.find(
      att => att.type === "photo" || att.type === "image"
    );
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  } else if (!imageUrl && event.attachments?.length > 0) {
    const imageAttachment = event.attachments.find(
      att => att.type === "photo" || att.type === "image"
    );
    if (imageAttachment && imageAttachment.url) {
      imageUrl = imageAttachment.url;
    }
  } else if (!imageUrl && event.mentions && Object.keys(event.mentions).length > 0) {
    const targetUID = Object.keys(event.mentions)[0];
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    imageUrl = `https://graph.facebook.com/${targetUID}/picture?width=720&height=720&access_token=${token}`;
  } else if (!imageUrl && event.messageReply?.senderID) {
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    imageUrl = `https://graph.facebook.com/${event.messageReply.senderID}/picture?width=720&height=720&access_token=${token}`;
  }

  return imageUrl;
}

const AVAILABLE_ACTIONS = [
  "circle", "rounded", "resize", "crop", "rotate", "flip",
  "blur", "sharpen", "grayscale", "sepia", "invert",
  "brightness", "contrast", "saturation", "hue"
];

module.exports = {
  config: {
    name: "canvas",
    aliases: ["imgcanvas", "canvasfx", "filterimg"],
    version: "1.0.0",
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
      en: "{pn} <action> [value] | Reply to an image\n\nActions:\ncircle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, saturation, hue, rotate, flip\n\nExample:\n• {pn} grayscale\n• {pn} blur 10\n• {pn} circle"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const action = args[0]?.toLowerCase();
    const prefix = global.GoatBot?.config?.prefix || "";

    if (!action || !AVAILABLE_ACTIONS.includes(action)) {
      return message.reply(
        `🎨 **Available Canvas Actions**:\n\n` +
        `• Filters: grayscale, sepia, invert, blur [val], sharpen [val]\n` +
        `• Adjustments: brightness [val], contrast [val], saturation [val], hue [val]\n` +
        `• Shapes & Transforms: circle, rounded, rotate [deg], flip [h/v], resize [w] [h]\n\n` +
        `💡 Usage: Reply to an image with:\n${prefix}${commandName} <action> [value]`
      );
    }

    const imageUrl = extractImageUrl(args.slice(1), event);
    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image or mention a user to apply the '${action}' effect.`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      const params = new URLSearchParams();
      params.append("action", action);
      params.append("imgUrl", imageUrl);

      // Handle extra arguments (e.g. value, radius, angle, mode, width, height)
      if (args[1]) {
        const val = args[1];
        if (action === "rotate" || action === "angle") {
          params.append("angle", val);
        } else if (action === "flip") {
          params.append("mode", val.startsWith("v") ? "vertical" : "horizontal");
        } else if (action === "rounded" || action === "circle") {
          params.append("radius", val);
        } else if (action === "resize" && args[2]) {
          params.append("width", args[1]);
          params.append("height", args[2]);
        } else if (!isNaN(Number(val))) {
          params.append("value", val);
        }
      }

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/canvas?${params.toString()}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, `canvas_${action}.jpg`);

      await message.reply({
        body: `✨ Canvas Action: **${action.toUpperCase()}** applied!`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("Canvas command error:", err);
      if (api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to process canvas effect: ${err.message || err}`);
    }
  }
};
