const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");

const baseApi = "https://azadx69x-all-apis-top.vercel.app/api/mj";

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "mj2", "midjourneyai", "mjai"],
    version: "2.0.0",
    role: 0,
    author: "opu sensei / frnAlt",
    countDown: 5,
    category: "ai",
    shortDescription: {
      en: "MidJourney 4-grid AI image generator with U1-U4 upscale"
    },
    longDescription: {
      en: "Generates 4 MidJourney AI image variations in a 2x2 grid using Azadx69x API with fallback, and allows replying with U1-U4 to upscale or retrieve individual variations."
    },
    guide: {
      en: "{pn} <prompt>\nReply with U1, U2, U3, or U4 to upscale/extract that image separately."
    }
  },

  onStart: async function ({ api, event, args, message, commandName }) {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(`⚠️ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} futuristic cyber samurai in Tokyo neon rain`);
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let gridPath = null;
    let filePaths = [];

    try {
      let imageUrls = [];

      // 1. Primary: Azadx69x MidJourney API
      try {
        const apiUrl = `${baseApi}?prompt=${encodeURIComponent(prompt)}`;
        const response = await axios.get(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
          },
          timeout: 15000
        });

        const result = response.data;
        if (result?.success && Array.isArray(result.data?.images) && result.data.images.length > 0) {
          imageUrls = result.data.images.slice(0, 4);
        }
      } catch (primaryErr) {
        // Primary endpoint unavailable or timed out, seamlessly proceed to fallback
      }

      if (imageUrls.length >= 4) {
        // Method A: Download 4 distinct images from primary API and composite them
        const downloadPromises = imageUrls.map(async (url, i) => {
          const res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 25000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          const buf = Buffer.from(res.data);
          const imgPath = path.join(cacheDir, `mj_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.png`);
          await fs.writeFile(imgPath, buf);
          return { buf, imgPath };
        });

        const results = await Promise.all(downloadPromises);
        filePaths = results.map(r => r.imgPath);
        const buffers = results.map(r => r.buf);

        if (isCanvasAvailable && typeof createCanvas === "function" && typeof loadImage === "function") {
          const cellSize = 512;
          const canvas = createCanvas(cellSize * 2, cellSize * 2);
          const ctx = canvas.getContext("2d");
          const loadedImages = await Promise.all(buffers.map(b => loadImage(b)));

          ctx.drawImage(loadedImages[0], 0, 0, cellSize, cellSize);
          if (loadedImages[1]) ctx.drawImage(loadedImages[1], cellSize, 0, cellSize, cellSize);
          if (loadedImages[2]) ctx.drawImage(loadedImages[2], 0, cellSize, cellSize, cellSize);
          if (loadedImages[3]) ctx.drawImage(loadedImages[3], cellSize, cellSize, cellSize, cellSize);

          // Subtle quadrant grid dividers
          ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cellSize, 0);
          ctx.lineTo(cellSize, cellSize * 2);
          ctx.moveTo(0, cellSize);
          ctx.lineTo(cellSize * 2, cellSize);
          ctx.stroke();

          gridPath = path.join(cacheDir, `mj_grid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`);
          await fs.writeFile(gridPath, canvas.toBuffer("image/png"));
        }
      } else {
        // Method B: High-res MidJourney 2x2 grid generation and quadrant slicing
        const seed = Math.floor(Math.random() * 1000000);
        const gridUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " midjourney v6 style 2x2 grid 4 variations octane render 8k cinematic lighting")}?width=1024&height=1024&nologo=true&seed=${seed}`;

        const res = await axios.get(gridUrl, {
          responseType: "arraybuffer",
          timeout: 25000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        const mainBuf = Buffer.from(res.data);
        const mainImg = await loadImage(mainBuf);

        // Render full 1024x1024 grid with subtle divider lines
        const fullCanvas = createCanvas(1024, 1024);
        const fullCtx = fullCanvas.getContext("2d");
        fullCtx.drawImage(mainImg, 0, 0, 1024, 1024);

        fullCtx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        fullCtx.lineWidth = 4;
        fullCtx.beginPath();
        fullCtx.moveTo(512, 0);
        fullCtx.lineTo(512, 1024);
        fullCtx.moveTo(0, 512);
        fullCtx.lineTo(1024, 512);
        fullCtx.stroke();

        gridPath = path.join(cacheDir, `mj_grid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`);
        await fs.writeFile(gridPath, fullCanvas.toBuffer("image/png"));

        // Crop the 4 individual quadrants (U1: Top-Left, U2: Top-Right, U3: Bottom-Left, U4: Bottom-Right)
        const coords = [
          { x: 0, y: 0 },
          { x: 512, y: 0 },
          { x: 0, y: 512 },
          { x: 512, y: 512 }
        ];

        for (let i = 0; i < 4; i++) {
          const quadCanvas = createCanvas(512, 512);
          const quadCtx = quadCanvas.getContext("2d");
          quadCtx.drawImage(mainImg, coords[i].x, coords[i].y, 512, 512, 0, 0, 512, 512);
          const qPath = path.join(cacheDir, `mj_quad_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.png`);
          await fs.writeFile(qPath, quadCanvas.toBuffer("image/png"));
          filePaths.push(qPath);
        }
      }

      let sendAttachment = null;
      if (gridPath && fs.existsSync(gridPath)) {
        const stream = fs.createReadStream(gridPath);
        stream.on("close", () => {
          fs.unlink(gridPath).catch(() => {});
        });
        stream.on("error", () => {
          fs.unlink(gridPath).catch(() => {});
        });
        sendAttachment = stream;
      } else {
        sendAttachment = filePaths.map(fp => fs.createReadStream(fp));
      }

      const messageBody =
`🎨 NEXORA AI MIDJOURNEY IMAGE GENERATOR 

📝 𝐏𝐫𝐨𝐦𝐩𝐭 :
${prompt}

📌 Reply with U1, U2, U3 or U4 to get that image separately.`;

      await message.reply(
        { body: messageBody, attachment: sendAttachment },
        (err, info) => {
          if (err) {
            if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
            filePaths.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });
            if (gridPath) fs.unlink(gridPath).catch(() => {});
            return;
          }

          if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

          if (info?.messageID && global.GoatBot?.onReply) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "midjourney",
              messageID: info.messageID,
              author: event.senderID,
              filePaths: filePaths,
              prompt: prompt,
              createdAt: Date.now()
            });

            // Automatic cleanup after 10 minutes to prevent storage buildup
            setTimeout(() => {
              filePaths.forEach(fp => {
                try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
              });
              if (global.GoatBot?.onReply?.has(info.messageID)) {
                global.GoatBot.onReply.delete(info.messageID);
              }
            }, 10 * 60 * 1000);
          }
        }
      );

    } catch (err) {
      if (gridPath) {
        fs.unlink(gridPath).catch(() => {});
      }
      filePaths.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });

      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "⚠️ Error while generating image.";
      return message.reply(`❌ MidJourney Error: ${msg}`);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { messageID, senderID, body } = event;

    if (senderID !== Reply.author) {
      return message.reply("❌ Only the person who used this command can pick U1-U4.");
    }

    const match = (body || "").trim().toUpperCase().match(/^U([1-4])$/);
    if (!match) {
      return message.reply("⚠️ Please reply with U1, U2, U3 or U4.");
    }

    const index = parseInt(match[1], 10) - 1;
    const filePath = Reply.filePaths?.[index];

    if (!filePath || !fs.existsSync(filePath)) {
      return message.reply("❌ That image is no longer available.");
    }

    try {
      if (api && api.setMessageReaction) api.setMessageReaction("🔍", messageID, () => {}, true);
      const attachmentStream = fs.createReadStream(filePath);
      await message.reply({
        body: `🔍 Upscaled U${index + 1}\n📝 Prompt: ${Reply.prompt}`,
        attachment: attachmentStream
      });
      if (api && api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      if (api && api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("⚠️ Error while sending the selected image.");
    }
  }
};
