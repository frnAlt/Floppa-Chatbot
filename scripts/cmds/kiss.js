const fs = require("fs-extra");
const path = require("path");
const { Readable } = require("stream");

let createCanvas = null, loadImage = null;
try {
  const _c = require("@napi-rs/canvas");
  createCanvas = _c.createCanvas;
  loadImage = _c.loadImage;
} catch (_) {
  try {
    const _c = require("canvas");
    createCanvas = _c.createCanvas;
    loadImage = _c.loadImage;
  } catch (__) {}
}

module.exports = {
  config: {
    name: "kiss",
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Kiss someone or two tagged users" },
    longDescription: "{p}kiss @mention or reply someone you want to kiss that person 😚",
    category: "funny",
    guide: "{p}kiss @user or {p}kiss @user1 @user2 or reply to a message"
  },

  onStart: async function ({ api, message, event, args, usersData }) {
    if (!createCanvas || !loadImage) {
      return message.reply("Canvas rendering library is currently unavailable on this system.");
    }

    let one = String(event.senderID);
    let two = null;
    const mentions = event.mentions ? Object.keys(event.mentions) : [];

    if (mentions.length >= 2) {
      one = mentions[0];
      two = mentions[1];
    } else if (mentions.length === 1) {
      two = mentions[0];
      if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
        if (rUid && rUid !== two) one = String(rUid);
      }
    } else if (event.messageReply) {
      const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
      if (rUid) two = String(rUid);
    } else if (args && args.length >= 2 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
      one = args[0];
      two = args[1];
    } else if (args && args.length >= 1 && /^\d+$/.test(args[0])) {
      two = args[0];
    }

    if (!two) {
      return message.reply("Please @mention 1 or 2 users, or reply to someone to kiss them! 😚");
    }

    try {
      const avatarURL1 = await usersData.getAvatarUrl(one);
      const avatarURL2 = await usersData.getAvatarUrl(two);

      const canvas = createCanvas(950, 850);
      const ctx = canvas.getContext("2d");

      const background = await loadImage("https://files.catbox.moe/6qg782.jpg");
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      const avatar1 = await loadImage(avatarURL1);
      const avatar2 = await loadImage(avatarURL2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(725, 250, 85, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar1, 640, 170, 170, 170);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(175, 370, 85, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar2, 90, 280, 170, 170);
      ctx.restore();

      const buffer = canvas.toBuffer("image/png");
      const stream = Readable.from(buffer);

      return message.reply({
        body: "Ummmmaaaaahhh! 😽😘",
        attachment: stream
      });
    } catch (error) {
      console.error("[KISS ERROR]:", error);
      return message.reply("An error occurred while generating the kiss image. Please try again.");
    }
  }
};