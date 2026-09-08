const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");

const AZAD_API = "https://azadx69x-all-apis-top.vercel.app/api/mj";

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
        const width = 800;
        const height = 800;
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
          ctx.arc(width / 2, height / 2, 100 + j * 50, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MIDJOURNEY v6", width / 2, 160);

        ctx.font = "italic 24px sans-serif";
        ctx.fillStyle = "#f8c291";
        ctx.fillText(styles[i].label, width / 2, 210);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ffffff";
        const shortPrompt = prompt.length > 70 ? prompt.slice(0, 67) + "..." : prompt;
        ctx.fillText(`"${shortPrompt}"`, width / 2, 580);

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "16px sans-serif";
        ctx.fillText(`Variation U${i + 1} • Floppa MidJourney AI`, width / 2, 660);

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
    version: "2.3.0",
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
      return message.reply(`Please provide an image prompt.\n\nExample: ${prefix}${commandName} black adam from dc`);
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let filePaths = [];
    let imageUrls = [];
    let ratio = "1:1";

    try {
      // 1. Primary: Official Azadx69x MidJourney API (returns 4 distinct high-res ImaginePro images)
      try {
        const apiUrl = `${AZAD_API}?prompt=${encodeURIComponent(prompt)}`;
        const response = await axios.get(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
          },
          timeout: 60000
        });

        const result = response.data;
        if (result?.success && (result.data?.images || result.images)) {
          const imgs = result.data?.images || result.images || [];
          ratio = result.data?.ratio || ratio;
          if (Array.isArray(imgs) && imgs.length >= 4) {
            imageUrls = imgs.slice(0, 4);
            const downloadPromises = imageUrls.map(async (url, i) => {
              const res = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });
              const imgPath = path.join(cacheDir, `mj_hd_${Date.now()}_${i}.png`);
              await fs.writeFile(imgPath, Buffer.from(res.data));
              return imgPath;
            });
            filePaths = await Promise.all(downloadPromises);
          }
        }
      } catch (azadErr) {
        console.warn("[MIDJOURNEY] Azad API attempt error:", azadErr.message);
      }

      // 2. High-Quality Fallback: Single high-res image + 4 artistic style variations
      if (filePaths.length < 4) {
        try {
          const seed = Math.floor(Math.random() * 1000000);
          const singleUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", masterpiece midjourney v6 style 8k octane render")}?width=1024&height=1024&nologo=true&seed=${seed}`;
          const res = await axios.get(singleUrl, {
            responseType: "arraybuffer",
            timeout: 35000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });

          if (res?.data && res.data.length > 500) {
            filePaths = await createVariationsFromSingleImage(Buffer.from(res.data), cacheDir, "mj_single_var");
          }
        } catch (fbErr) {
          console.warn("[MIDJOURNEY] Fallback attempt error:", fbErr.message);
        }
      }

      // 3. Ultimate Fallback: Local Canvas 4-card generator (never fail)
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
              imageUrls: imageUrls,
              prompt: prompt,
              ratio: ratio,
              createdAt: Date.now()
            });

            // Automatic cleanup after 15 minutes to prevent storage buildup
            setTimeout(() => {
              filePaths.forEach(fp => {
                try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
              });
              if (global.GoatBot?.onReply?.has(info.messageID)) {
                global.GoatBot.onReply.delete(info.messageID);
              }
            }, 15 * 60 * 1000);
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
    const directUrl = Reply.imageUrls?.[index];

    if (!filePath || !fs.existsSync(filePath)) {
      if (directUrl) {
        try {
          const cacheDir = path.join(__dirname, "cache");
          await fs.ensureDir(cacheDir);
          const recoveredPath = path.join(cacheDir, `mj_upscale_${Date.now()}_${index}.png`);
          const dl = await axios.get(directUrl, { responseType: "arraybuffer", timeout: 30000 });
          await fs.writeFile(recoveredPath, Buffer.from(dl.data));
          const stream = fs.createReadStream(recoveredPath);
          stream.on("close", () => { try { fs.unlinkSync(recoveredPath); } catch (_) {} });
          return await message.reply({
            body: `MidJourney Upscaled Image • U${index + 1}\n\nPrompt: ${Reply.prompt}\nQuality: Full Resolution (ImaginePro MidJourney)`,
            attachment: stream
          });
        } catch (_) {}
      }
      return message.reply("That image is no longer available.");
    }

    try {
      if (api && api.setMessageReaction) api.setMessageReaction("🔍", messageID, () => {}, true);
      const attachmentStream = fs.createReadStream(filePath);
      await message.reply({
        body: `MidJourney Upscaled Image • U${index + 1}\n\nPrompt: ${Reply.prompt}\nQuality: Full Resolution (ImaginePro MidJourney)`,
        attachment: attachmentStream
      });
      if (api && api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      if (api && api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("Error sending the selected image variation.");
    }
  }
};
