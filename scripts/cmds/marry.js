const fs = require("fs-extra");
const path = require("path");
const { Readable } = require("stream");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");
const { Jimp } = require("jimp");

module.exports = {
    config: {
        name: "marry",
        aliases: ["biye", "hanga"],
        version: "2.2.0",
        author: "frnAlt",
        role: 0,
        countdown: 5,
        shortDescription: { en: "Marry someone or marry two tagged users" },
        description: "marry a person with mention or replying her/his message",
        guide: "{p}marry @mention or {p}marry @user1 @user2 or reply to a message",
        category: "funny"
    },

    onStart: async function ({ event, api, message, args, usersData }) {
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
            return message.reply("Please @mention 1 or 2 users, or reply to someone to marry them! 🐸👫");
        }

        try {
            const ppUrl1 = await usersData.getAvatarUrl(one);
            const ppUrl2 = await usersData.getAvatarUrl(two);
            const userName1 = await usersData.getName(one).catch(() => "User 1");
            const userName2 = await usersData.getName(two).catch(() => "User 2");

            // 1. Canvas Renderer
            if (isCanvasAvailable && typeof createCanvas === "function") {
                const canvas = createCanvas(850, 480);
                const ctx = canvas.getContext("2d");

                // Elegant royal violet / pink gradient
                const grad = ctx.createLinearGradient(0, 0, 850, 480);
                grad.addColorStop(0, "#a18cd1");
                grad.addColorStop(1, "#fbc2eb");
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
                ctx.font = "bold 30px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("💒 WEDDING CELEBRATION 💒", 425, 95);

                const pp1 = await loadImage(ppUrl1).catch(() => null);
                const pp2 = await loadImage(ppUrl2).catch(() => null);

                // Draw Avatar 1 (Left - Groom / Partner 1)
                if (pp1) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(260, 240, 80, 0, Math.PI * 2);
                    ctx.lineWidth = 6;
                    ctx.strokeStyle = "#00bfff";
                    ctx.stroke();
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(pp1, 180, 160, 160, 160);
                    ctx.restore();
                }

                // Wedding rings in center
                ctx.font = "52px sans-serif";
                ctx.fillText("💍", 425, 255);

                // Draw Avatar 2 (Right - Bride / Partner 2)
                if (pp2) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(590, 240, 80, 0, Math.PI * 2);
                    ctx.lineWidth = 6;
                    ctx.strokeStyle = "#ff69b4";
                    ctx.stroke();
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(pp2, 510, 160, 160, 160);
                    ctx.restore();
                }

                // Names
                ctx.font = "bold 22px sans-serif";
                ctx.fillText(userName1, 260, 370);
                ctx.fillText(userName2, 590, 370);

                const buffer = canvas.toBuffer("image/png");
                const stream = Readable.from(buffer);

                return message.reply({
                    body: `Congratulations ${userName1} and ${userName2} on your wedding! 💒💍🤵👰`,
                    attachment: stream
                });
            }

            // 2. Jimp Fallback
            const bg = new Jimp({ width: 850, height: 480, color: 0xa18cd1ff });
            const av1 = await Jimp.read(ppUrl1).catch(() => null);
            const av2 = await Jimp.read(ppUrl2).catch(() => null);

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

            return message.reply({
                body: `Congratulations ${userName1} and ${userName2} on your wedding! 💒💍🤵👰`,
                attachment: stream
            });
        } catch (error) {
            console.error("[MARRY ERROR]:", error);
            return message.reply("An error occurred while generating the marriage image. Please try again.");
        }
    }
};