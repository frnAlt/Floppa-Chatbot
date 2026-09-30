const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage, isCanvasAvailable, fetchAvatarBuffer, getAvatarUrl } = require('../../func/canvasHelper.js');

module.exports = {
  config: {
    name: "hack",
    aliases: ["fbhack", "hacked", "hck"],
    version: "2.0.0",
    author: "frnAlt",
    description: "Create a fake hacked image / canvas prank for mentioned user or sender",
    guide: "use {p}hack or {p}hack @mention or reply to someone's message",
    countDown: 5,
    role: 0,
    category: "fun",
    usePrefix: true,
    premium: false
  },

  wrapText: async (text, ctx, maxWidth) => {
    return new Promise((resolve) => {
      if (ctx.measureText(text).width < maxWidth) return resolve([text]);
      if (ctx.measureText("W").width > maxWidth) return resolve(null);
      const words = text.split(" ");
      const lines = [];
      let line = "";
      while (words.length > 0) {
        let split = false;
        while (ctx.measureText(words[0]).width >= maxWidth) {
          const temp = words[0];
          words[0] = temp.slice(0, -1);
          if (split) words[1] = `${temp.slice(-1)}${words[1]}`;
          else {
            split = true;
            words.splice(1, 0, temp.slice(-1));
          }
        }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line += `${words.shift()} `;
        else {
          lines.push(line.trim());
          line = "";
        }
        if (words.length === 0) lines.push(line.trim());
      }
      return resolve(lines);
    });
  },

  onStart: async ({ args, api, event, message, usersData }) => {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const randSuffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const pathImg = path.join(cacheDir, `hack_bg_${randSuffix}.png`);

    const mentionIds = Object.keys(event.mentions || {});
    const targetId = (event.messageReply && event.messageReply.senderID)
      ? event.messageReply.senderID
      : (mentionIds.length ? mentionIds[0] : event.senderID);

    let name = "Unknown";
    try {
      if (usersData?.getName) {
        name = (await usersData.getName(targetId).catch(() => null)) || name;
      }
      if (name === "Unknown" && api?.getUserInfo) {
        const info = await api.getUserInfo(targetId);
        if (info?.[targetId]?.name) name = info[targetId].name;
      }
    } catch (_) {}

    if (api?.setMessageReaction) {
      api.setMessageReaction("💻", event.messageID, () => {}, true);
    }

    // Try Method 1: Local Canvas rendering (high precision Facebook Lite template)
    if (isCanvasAvailable && typeof createCanvas === "function" && typeof loadImage === "function") {
      try {
        const bgImg = "https://i.ibb.co/zTf5GSs2/Screenshot-2025-03-03-22-28-20-197-com-facebook-lite-1.png";
        const [bgRes, avatarBuf] = await Promise.all([
          axios.get(bgImg, { responseType: "arraybuffer", timeout: 10000 }),
          fetchAvatarBuffer(targetId, { api })
        ]);

        const baseImg = await loadImage(Buffer.from(bgRes.data));
        const baseAvt = await loadImage(avatarBuf.length > 500 ? avatarBuf : Buffer.from(bgRes.data));

        const canvas = createCanvas(baseImg.width, baseImg.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

        ctx.font = "35px Arial";
        ctx.fillStyle = "#1878F3";
        ctx.textAlign = "left";

        const lines = await module.exports.wrapText(name, ctx, 350);
        let x = 300;
        let y = 740;
        if (lines && Array.isArray(lines)) {
          for (let line of lines) {
            ctx.fillText(line, x, y);
            y += 33;
          }
        } else {
          ctx.fillText(name, x, y);
        }

        ctx.drawImage(baseAvt, 127, 660, 130, 140);

        const imageBuffer = canvas.toBuffer("image/png");
        await fs.writeFile(pathImg, imageBuffer);

        await api.sendMessage(
          {
            body: "✅ hacked done, please check your inbox for pass ⚠️",
            attachment: fs.createReadStream(pathImg)
          },
          event.threadID,
          () => {
            fs.remove(pathImg).catch(() => {});
          },
          event.messageID
        );
        return;
      } catch (canvasErr) {
        console.warn("[HACK] Local canvas rendering failed, falling back to Toshiro prank canvas:", canvasErr.message);
      }
    }

    // Fallback Method 2: High-accuracy Toshiro Facebook prank canvas API
    try {
      const targetAvatar = getAvatarUrl(targetId);
      const params = new URLSearchParams({
        text: `🚨 CRITICAL SECURITY ALERT: Account "${name}" has been hijacked. Password reset triggered from unauthorized IP. 💀🔓`,
        name: name,
        avatar: targetAvatar,
        verified: "false",
        time: "10m",
        likes: "6.2K",
        comments: "1.2K",
        shares: "419",
        theme: "dark",
        c_text: "Meta Security: Session terminated. Please confirm identity.",
        c_name: "Meta Security Operations",
        c_time: "5m",
        c_verified: "true",
        c_avatar: "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png"
      }).toString();

      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/fbpost?${params}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "hack_prank.png", { timeout: 25000 });

      return message.reply({
        body: "✅ hacked done, please check your inbox for pass ⚠️",
        attachment: stream
      });
    } catch (err) {
      console.error("[HACK ERROR]:", err);
      return message.reply("❌ Failed to create hack image. Try again later.");
    } finally {
      if (await fs.pathExists(pathImg)) {
        await fs.remove(pathImg).catch(() => {});
      }
    }
  }
};
