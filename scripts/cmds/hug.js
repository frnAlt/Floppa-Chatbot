const fs = require("fs-extra");
const path = require("path");
const { Readable } = require("stream");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");
const { Jimp } = require("jimp");

module.exports = {
  config: {
    name: "hug",
    version: "2.2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Hug someone or two tagged users" },
    longDescription: "{p}hug @mention someone you want to hug that person 🫂",
    category: "funny",
    guide: "{p}hug @user or {p}hug @user1 @user2 or reply to a message"
  },

  onStart: async function ({ api, message, event, args, usersData }) {
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

    // Name match fallback if mentions was omitted
    if (!two && args && args.length > 0) {
      const raw = args.join(" ").replace(/^@/, "").trim().toLowerCase();
      const allM = global.db?.allThreadData?.find(t => t.threadID == event.threadID)?.members || [];
      const found = allM.find(m => m.name && m.name.toLowerCase().includes(raw)) ||
                    global.db?.allUserData?.find(u => u.name && u.name.toLowerCase().includes(raw));
      if (found) two = String(found.userID || found.id);
    }

    if (!two) {
      return message.reply("Please @mention 1 or 2 users, or reply to someone to hug them! 🫂");
    }

    try {
      const avatarURL1 = await usersData.getAvatarUrl(one);
      const avatarURL2 = await usersData.getAvatarUrl(two);
      const name1 = (await usersData.getName(one).catch(() => null)) || event.mentions?.[one]?.replace(/^@/, "").trim() || "You";
      const name2 = (await usersData.getName(two).catch(() => null)) || event.mentions?.[two]?.replace(/^@/, "").trim() || "Friend";

      // 1. Canvas Renderer
      if (isCanvasAvailable && typeof createCanvas === "function") {
        const canvas = createCanvas(850, 480);
        const ctx = canvas.getContext("2d");

        // Warm sunset gradient
        const grad = ctx.createLinearGradient(0, 0, 850, 480);
        grad.addColorStop(0, "#ff758c");
        grad.addColorStop(1, "#ff7eb3");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 850, 480);

        // Glassmorphic container
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(40, 40, 770, 400, 24);
          ctx.fill();
        } else {
          ctx.fillRect(40, 40, 770, 400);
        }

        // Title text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🫂 A WARM HUG 🫂", 425, 95);

        // Load avatars safely
        const av1 = await loadImage(avatarURL1).catch(() => null);
        const av2 = await loadImage(avatarURL2).catch(() => null);

        // Draw Avatar 1 (Left)
        if (av1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(260, 240, 80, 0, Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(av1, 180, 160, 160, 160);
          ctx.restore();
        }

        // Heart in center
        ctx.font = "52px sans-serif";
        ctx.fillText("💞", 425, 255);

        // Draw Avatar 2 (Right)
        if (av2) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(590, 240, 80, 0, Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(av2, 510, 160, 160, 160);
          ctx.restore();
        }

        // Names
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(name1, 260, 370);
        ctx.fillText(name2, 590, 370);

        const buffer = canvas.toBuffer("image/png");
        const stream = Readable.from(buffer);
        stream.path = "hug.png";

        return message.reply({
          body: `🫂 ${name1} gives ${name2} a warm and loving hug! 💞`,
          attachment: stream
        });
      }

      // 2. Jimp Fallback
      const bg = new Jimp({ width: 850, height: 480, color: 0xff758cff });
      const av1 = await Jimp.read(avatarURL1).catch(() => null);
      const av2 = await Jimp.read(avatarURL2).catch(() => null);

      if (av1) {
        av1.resize({ w: 160, h: 160 }).circle();
        bg.composite(av1, 180, 160);
      }
      if (av2) {
        av2.resize({ w: 160, h: 160 }).circle();
        bg.composite(av2, 510, 160);
      }

      const buffer = await bg.getBuffer("image/png");
      const stream = Readable.from(buffer);
      stream.path = "hug.png";

      return message.reply({
        body: `🫂 ${name1} gives ${name2} a warm and loving hug! 💞`,
        attachment: stream
      });
    } catch (error) {
      console.error("[HUG ERROR]:", error);
      return message.reply("An error occurred while generating the hug image. Please try again.");
    }
  }
};