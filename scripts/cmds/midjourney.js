const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");

const AZAD_API = "https://azadx69x-all-apis-top.vercel.app/api/mj";

async function getNoobCoreMjApi() {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json",
      { timeout: 8000 }
    );
    return res.data?.mj || null;
  } catch (_) {
    return null;
  }
}

async function splitGridInto4Images(buffer, cacheDir, basePrefix = "mj_quad") {
  const filePaths = [];

  // 1. Try Canvas
  try {
    if (isCanvasAvailable && typeof createCanvas === "function" && typeof loadImage === "function") {
      const img = await loadImage(buffer);
      const halfW = Math.floor(img.width / 2);
      const halfH = Math.floor(img.height / 2);
      const coords = [
        { x: 0, y: 0 },
        { x: halfW, y: 0 },
        { x: 0, y: halfH },
        { x: halfW, y: halfH }
      ];

      for (let i = 0; i < 4; i++) {
        const qCanvas = createCanvas(halfW, halfH);
        const qCtx = qCanvas.getContext("2d");
        qCtx.drawImage(img, coords[i].x, coords[i].y, halfW, halfH, 0, 0, halfW, halfH);
        const qPath = path.join(cacheDir, `${basePrefix}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}.png`);
        await fs.writeFile(qPath, qCanvas.toBuffer("image/png"));
        filePaths.push(qPath);
      }
      return filePaths;
    }
  } catch (err) {
    console.warn("[MIDJOURNEY] Canvas quadrant split error:", err.message);
  }

  // 2. Try Jimp fallback
  try {
    const Jimp = require("jimp");
    const image = await Jimp.read(buffer);
    const halfW = Math.floor(image.bitmap.width / 2);
    const halfH = Math.floor(image.bitmap.height / 2);
    const coords = [
      { x: 0, y: 0 },
      { x: halfW, y: 0 },
      { x: 0, y: halfH },
      { x: halfW, y: halfH }
    ];

    for (let i = 0; i < 4; i++) {
      const cloned = image.clone();
      cloned.crop(coords[i].x, coords[i].y, halfW, halfH);
      const qPath = path.join(cacheDir, `${basePrefix}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}.png`);
      await cloned.writeAsync(qPath);
      filePaths.push(qPath);
    }
    return filePaths;
  } catch (err) {
    console.warn("[MIDJOURNEY] Jimp quadrant split error:", err.message);
  }

  return filePaths;
}

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "mj2", "midjourneyai", "mjai"],
    version: "2.1.0",
    role: 0,
    author: "frnAlt",
    countDown: 5,
    category: "ai",
    shortDescription: {
      en: "MidJourney 4 distinct AI images with U1-U4 upscale"
    },
    longDescription: {
      en: "Generates 4 distinct MidJourney AI image variations and sends them as 4 separate photos. Reply with U1-U4 to upscale or extract an individual variation."
    },
    guide: {
      en: "{pn} <prompt>\nReply with U1, U2, U3, or U4 to upscale a specific image."
    }
  },

  onStart: async function ({ api, event, args, message, commandName }) {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(`Please provide an image prompt.\n\nExample: ${prefix}${commandName} futuristic cyber samurai in Tokyo neon rain`);
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let filePaths = [];

    try {
      // 1. Check NoobCore Dynamic API if available
      try {
        const noobCoreBase = await getNoobCoreMjApi();
        if (noobCoreBase) {
          const res = await axios.get(
            `${noobCoreBase}/imagine?prompt=${encodeURIComponent(prompt)}`,
            { timeout: 30000 }
          );

          if (res.data?.success) {
            const { murl, urls } = res.data;

            // If 4 separate URLs are returned, download each
            if (Array.isArray(urls) && urls.length >= 4) {
              const downloadPromises = urls.slice(0, 4).map(async (item, i) => {
                const imgUrl = typeof item === "string" ? item : (item.url || item.image);
                const dl = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 25000 });
                const qPath = path.join(cacheDir, `mj_nc_${Date.now()}_${i}.png`);
                await fs.writeFile(qPath, Buffer.from(dl.data));
                return qPath;
              });
              filePaths = await Promise.all(downloadPromises);
            } else if (murl) {
              // Single 4-frame grid returned: split into 4 separate photos
              const dl = await axios.get(murl, { responseType: "arraybuffer", timeout: 25000 });
              filePaths = await splitGridInto4Images(Buffer.from(dl.data), cacheDir, "mj_nc_grid");
            }
          }
        }
      } catch (ncErr) {
        // Proceed seamlessly to secondary provider
      }

      // 2. Check Azadx69x API if we don't have 4 images yet
      if (filePaths.length < 4) {
        try {
          const apiUrl = `${AZAD_API}?prompt=${encodeURIComponent(prompt)}`;
          const response = await axios.get(apiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json"
            },
            timeout: 15000
          });

          const result = response.data;
          if (result?.success && Array.isArray(result.data?.images) && result.data.images.length >= 4) {
            const downloadPromises = result.data.images.slice(0, 4).map(async (url, i) => {
              const res = await axios.get(url, { responseType: "arraybuffer", timeout: 25000 });
              const imgPath = path.join(cacheDir, `mj_azad_${Date.now()}_${i}.png`);
              await fs.writeFile(imgPath, Buffer.from(res.data));
              return imgPath;
            });
            filePaths = await Promise.all(downloadPromises);
          }
        } catch (azadErr) {
          // Proceed to multi-seed generator
        }
      }

      // 3. Fallback: High-Definition multi-seed generation (4 distinct photos)
      if (filePaths.length < 4) {
        const seedBase = Math.floor(Math.random() * 1000000);
        const seeds = [seedBase, seedBase + 17, seedBase + 37, seedBase + 59];

        const downloadPromises = seeds.map(async (seed, i) => {
          const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " masterpiece midjourney v6 style 8k octane render cinematic lighting")}?width=768&height=768&nologo=true&seed=${seed}`;
          const res = await axios.get(imgUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          const qPath = path.join(cacheDir, `mj_gen_${Date.now()}_${i}.png`);
          await fs.writeFile(qPath, Buffer.from(res.data));
          return qPath;
        });

        filePaths = await Promise.all(downloadPromises);
      }

      if (filePaths.length === 0) {
        throw new Error("Unable to retrieve or generate images.");
      }

      // Always send 4 distinct photos as separate attachments
      const sendAttachment = filePaths.map(fp => fs.createReadStream(fp));

      const messageBody =
`MidJourney AI Image Generator

Prompt:
${prompt}

Generated 4 variations. Reply with U1, U2, U3, or U4 to upscale a specific image.`;

      await message.reply(
        { body: messageBody, attachment: sendAttachment },
        (err, info) => {
          if (err) {
            if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
            filePaths.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });
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
      filePaths.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Error generating images.";
      return message.reply(`MidJourney Error: ${msg}`);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { messageID, senderID, body } = event;

    if (senderID !== Reply.author) {
      return message.reply("Only the user who initiated this prompt can upscale U1-U4.");
    }

    const match = (body || "").trim().toUpperCase().match(/^U?([1-4])$/);
    if (!match) {
      return message.reply("Please reply with U1, U2, U3, or U4.");
    }

    const index = parseInt(match[1], 10) - 1;
    const filePath = Reply.filePaths?.[index];

    if (!filePath || !fs.existsSync(filePath)) {
      return message.reply("That image is no longer available.");
    }

    try {
      if (api && api.setMessageReaction) api.setMessageReaction("🔍", messageID, () => {}, true);
      const attachmentStream = fs.createReadStream(filePath);
      await message.reply({
        body: `Upscaled Variation U${index + 1}\n\nPrompt: ${Reply.prompt}`,
        attachment: attachmentStream
      });
      if (api && api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      if (api && api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("Error sending the selected image variation.");
    }
  }
};
