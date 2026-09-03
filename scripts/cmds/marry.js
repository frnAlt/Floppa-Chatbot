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
        name: "marry",
        aliases: ["biye", "hanga"],
        version: "2.0.0",
        author: "frnAlt",
        role: 0,
        countdown: 5,
        shortDescription: { en: "Marry someone or marry two tagged users" },
        description: "marry a person with mention or replying her/his message",
        guide: "{p}marry @mention or {p}marry @user1 @user2 or reply to a message",
        category: "funny"
    },

    onStart: async function ({ event, api, message, args, usersData }) {
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
            return message.reply("Please @mention 1 or 2 users, or reply to someone to marry them! 🐸👫");
        }

        try {
            const ppUrl1 = await usersData.getAvatarUrl(one);
            const ppUrl2 = await usersData.getAvatarUrl(two);
            const canvas = createCanvas(900, 850);
            const ctx = canvas.getContext("2d");
            const bgImg = await loadImage("https://files.catbox.moe/pxougj.jpg");
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

            const pp1 = await loadImage(ppUrl1);
            const pp2 = await loadImage(ppUrl2);

            ctx.save();
            ctx.beginPath();
            ctx.arc(635, 255, 85, 0, Math.PI * 2);
            ctx.lineWidth = 5;
            ctx.strokeStyle = "rgb(255, 105, 180)";
            ctx.stroke();
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(pp1, 550, 170, 170, 170);
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(235, 255, 85, 0, Math.PI * 2);
            ctx.lineWidth = 5;
            ctx.strokeStyle = "rgb(0, 191, 255)";
            ctx.stroke();
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(pp2, 150, 170, 170, 170);
            ctx.restore();

            const buffer = canvas.toBuffer("image/png");
            const stream = Readable.from(buffer);

            const userName1 = await usersData.getName(one).catch(() => "User 1");
            const userName2 = await usersData.getName(two).catch(() => "User 2");

            return message.reply({
                body: `${userName1} married ${userName2}, congratulations to both of you! 😊💐`,
                attachment: stream
            });
        } catch (e) {
            console.error("[MARRY ERROR]:", e);
            return message.reply("An error occurred while processing the marriage image. Please try again later.");
        }
    }
};