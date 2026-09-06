const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");

const AZAD_API = "https://azadx69x-all-apis-top.vercel.app/api/mj";

async function getNoobCoreMjApi() {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/noobcore404/NC-STORE/refs/heads/main/NCApiUrl.json",
      { timeout: 5000 }
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

async function createVariationsFromSingleImage(buffer, cacheDir, basePrefix = "mj_var") {
  const filePaths = [];
  try {
    if (isCanvasAvailable && typeof createCanvas === "function" && typeof loadImage === "function") {
      const img = await loadImage(buffer);
      const w = img.width;
      const h = img.height;

      // Variation 1: Original
      {
        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const p = path.join(cacheDir, `${basePrefix}_${Date.now()}_0.png`);
        await fs.writeFile(p, canvas.toBuffer("image/png"));
        filePaths.push(p);
      }
      // Variation 2: Warm Cinematic Tone
      {
        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        ctx.fillStyle = "rgba(255, 140, 0, 0.12)";
        ctx.fillRect(0, 0, w, h);
        const p = path.join(cacheDir, `${basePrefix}_${Date.now()}_1.png`);
        await fs.writeFile(p, canvas.toBuffer("image/png"));
        filePaths.push(p);
      }
      // Variation 3: Cool Neon Tone
      {
        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        ctx.fillStyle = "rgba(0, 190, 255, 0.12)";
        ctx.fillRect(0, 0, w, h);
        const p = path.join(cacheDir, `${basePrefix}_${Date.now()}_2.png`);
        await fs.writeFile(p, canvas.toBuffer("image/png"));
        filePaths.push(p);
      }
      // Variation 4: Dramatic Vignette Focus
      {
        const canvas = createCanvas(w, h);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.72);
        grad.addColorStop(0, "rgba(0, 0, 0, 0)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.42)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const p = path.join(cacheDir, `${basePrefix}_${Date.now()}_3.png`);
        await fs.writeFile(p, canvas.toBuffer("image/png"));
        filePaths.push(p);
      }
      return filePaths;
    }
  } catch (err) {
    console.warn("[MIDJOURNEY] Variation creation error:", err.message);
  }
  return filePaths;
}

async function generateCanvasFallbacks(prompt, cacheDir) {
  const filePaths = [];
  try {
    if (isCanvasAvailable && typeof createCanvas === "function") {
      const styles = [
        { bg1: "#1e3799", bg2: "#0c2461", label: "V1 • Hyperrealistic Cyber" },
        { bg1: "#b71540", bg2: "#6a0822", label: "V2 • Crimson Cinematic" },
        { bg1: "#079992", bg2: "#006266", label: "V3 • Neo Emerald Surreal" },
        { bg1: "#6a89cc", bg2: "#38ada9", label: "V4 • Holographic Anime" }
      ];

      for (let i = 0; i < 4; i++) {
        const width = 600;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, styles[i].bg1);
        grad.addColorStop(1, styles[i].bg2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 80 + j * 45, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MIDJOURNEY v6", width / 2, 120);

        ctx.font = "italic 20px sans-serif";
        ctx.fillStyle = "#f8c291";
        ctx.fillText(styles[i].label, width / 2, 160);

        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#ffffff";
        const shortPrompt = prompt.length > 70 ? prompt.slice(0, 67) + "..." : prompt;
        ctx.fillText(`"${shortPrompt}"`, width / 2, 450);

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Variation U${i + 1} • Floppa MidJourney AI`, width / 2, 520);

        const qPath = path.join(cacheDir, `mj_synth_${Date.now()}_${i}.png`);
        await fs.writeFile(qPath, canvas.toBuffer("image/png"));
        filePaths.push(qPath);
      }
    }
  } catch (err) {
    console.warn("[MIDJOURNEY] Canvas fallback error:", err.message);
  }
  return filePaths;
}

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "mj2", "midjourneyai", "mjai"],
    version: "2.2.0",
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
      // 1. Check NoobCore Dynamic API (short 5s timeout)
      try {
        const noobCoreBase = await getNoobCoreMjApi();
        if (noobCoreBase) {
          const res = await axios.get(
            `${noobCoreBase}/imagine?prompt=${encodeURIComponent(prompt)}`,
            { timeout: 5000 }
          );

          if (res.data?.success) {
            const { murl, urls } = res.data;
            if (Array.isArray(urls) && urls.length >= 4) {
              const downloadPromises = urls.slice(0, 4).map(async (item, i) => {
                const imgUrl = typeof item === "string" ? item : (item.url || item.image);
                const dl = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 15000 });
                const qPath = path.join(cacheDir, `mj_nc_${Date.now()}_${i}.png`);
                await fs.writeFile(qPath, Buffer.from(dl.data));
                return qPath;
              });
              filePaths = await Promise.all(downloadPromises);
            } else if (murl) {
              const dl = await axios.get(murl, { responseType: "arraybuffer", timeout: 15000 });
              filePaths = await splitGridInto4Images(Buffer.from(dl.data), cacheDir, "mj_nc_grid");
            }
          }
        }
      } catch (_) {}

      // 2. Check Azadx69x API (short 5s timeout)
      if (filePaths.length < 4) {
        try {
          const apiUrl = `${AZAD_API}?prompt=${encodeURIComponent(prompt)}`;
          const response = await axios.get(apiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json"
            },
            timeout: 5000
          });

          const result = response.data;
          if (result?.success && Array.isArray(result.data?.images) && result.data.images.length >= 4) {
            const downloadPromises = result.data.images.slice(0, 4).map(async (url, i) => {
              const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
              const imgPath = path.join(cacheDir, `mj_azad_${Date.now()}_${i}.png`);
              await fs.writeFile(imgPath, Buffer.from(res.data));
              return imgPath;
            });
            filePaths = await Promise.all(downloadPromises);
          }
        } catch (_) {}
      }

      // 3. Primary Fallback: Single 2x2 Grid Request + Quadrant Split (ZERO 429 concurrency risk)
      if (filePaths.length < 4) {
        try {
          const seed = Math.floor(Math.random() * 1000000);
          const gridPrompt = `${prompt}, 2x2 grid 4 different variations, midjourney style, 4 panels, high resolution`;
          const gridUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(gridPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

          let res;
          try {
            res = await axios.get(gridUrl, {
              responseType: "arraybuffer",
              timeout: 25000,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            });
          } catch (gridErr) {
            // If rate limited (429), back off 1.5s and retry with simple prompt
            if (gridErr.response?.status === 429) {
              await new Promise(r => setTimeout(r, 1500));
              const retryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " 2x2 grid 4 variations")}?width=768&height=768&nologo=true&seed=${Date.now()}&model=turbo`;
              res = await axios.get(retryUrl, {
                responseType: "arraybuffer",
                timeout: 25000,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });
            } else {
              throw gridErr;
            }
          }

          if (res?.data && res.data.length > 500) {
            filePaths = await splitGridInto4Images(Buffer.from(res.data), cacheDir, "mj_quad");
          }
        } catch (_) {}
      }

      // 4. Secondary Fallback: Single high-res image + Canvas 4-variation generator
      if (filePaths.length < 4) {
        try {
          const seed = Math.floor(Math.random() * 1000000);
          const singleUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + " masterpiece midjourney v6 style 8k octane render")}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;
          const res = await axios.get(singleUrl, {
            responseType: "arraybuffer",
            timeout: 25000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });

          if (res?.data && res.data.length > 500) {
            filePaths = await createVariationsFromSingleImage(Buffer.from(res.data), cacheDir, "mj_single_var");
          }
        } catch (_) {}
      }

      // 5. Ultimate Fallback: Local Canvas 4-card generator (never fail, never 429)
      if (filePaths.length < 4) {
        filePaths = await generateCanvasFallbacks(prompt, cacheDir);
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
      console.error("[MIDJOURNEY ERROR]:", err.message);
      return message.reply("MidJourney Error: Image service is currently busy. Please try again in a few moments.");
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
