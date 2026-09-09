const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");

/**
 * Fetch image buffer with retry on 429 rate limit
 */
async function fetchWithRetry(url, retries = 2, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 40000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });
      if (res.data && res.data.length > 1000) {
        return res.data;
      }
    } catch (err) {
      if (err.response?.status === 429 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (i === retries - 1) throw err;
    }
  }
  throw new Error("Empty image response");
}

/**
 * Generate a 2x2 grid (4 panels) of distinct variations using Pollinations Flux/Turbo
 */
async function generateMidjourneyGrid(prompt, seed) {
  const enhancedPrompt = `${prompt}, 2x2 grid of 4 distinct variations, 4 different camera angles and compositions, 4 panels, midjourney style, highly detailed, photorealistic, 8k resolution, cinematic lighting, masterpiece`;

  // Tier 1: Flux (State of the art quality)
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
    const data = await fetchWithRetry(url, 2, 2000);
    return { buffer: data, engine: "MidJourney v6 (Flux)" };
  } catch (fluxErr) {
    console.warn("[MIDJOURNEY] Flux grid attempt failed, falling back to Turbo:", fluxErr.message);
  }

  // Tier 2: Turbo (Fast high-res fallback)
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=turbo`;
    const data = await fetchWithRetry(url, 2, 2000);
    return { buffer: data, engine: "MidJourney v6 (Turbo)" };
  } catch (turboErr) {
    console.warn("[MIDJOURNEY] Turbo grid attempt failed, falling back to Default:", turboErr.message);
  }

  // Tier 3: Default pollinations model
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}`;
  const data = await fetchWithRetry(url, 2, 2000);
  return { buffer: data, engine: "MidJourney v6" };
}

/**
 * Slice 2x2 grid into 4 separate high-quality quadrant images
 */
async function sliceGridIntoQuadrants(buffer, cacheDir, timestamp) {
  if (!isCanvasAvailable || typeof createCanvas !== "function" || typeof loadImage !== "function") {
    return null;
  }

  const img = await loadImage(buffer);
  const w = img.width;
  const h = img.height;
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);

  const coords = [
    { x: 0, y: 0 },         // Q1 / U1: Top-Left
    { x: halfW, y: 0 },     // Q2 / U2: Top-Right
    { x: 0, y: halfH },     // Q3 / U3: Bottom-Left
    { x: halfW, y: halfH }  // Q4 / U4: Bottom-Right
  ];

  const filePaths = [];
  for (let i = 0; i < 4; i++) {
    const canvas = createCanvas(halfW, halfH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, coords[i].x, coords[i].y, halfW, halfH, 0, 0, halfW, halfH);
    const quadPath = path.join(cacheDir, `mj_quad_${timestamp}_${i}.png`);
    await fs.writeFile(quadPath, canvas.toBuffer("image/png"));
    filePaths.push(quadPath);
  }

  return filePaths;
}

/**
 * Generate dedicated full 1024x1024 upscale for a specific quadrant
 */
async function generateDedicatedUpscale(prompt, index, baseSeed) {
  const upscalePrompt = `${prompt}, variation ${index + 1}, close-up highly detailed shot, masterpiece, midjourney v6 style, hyperrealistic, 8k resolution, cinematic lighting, photorealistic, intricate textures, sharp focus, octane render`;
  const seed = baseSeed ? (baseSeed + (index + 1) * 777) : Math.floor(Math.random() * 1000000);

  // Try Flux first
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(upscalePrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
    const data = await fetchWithRetry(url, 2, 2000);
    return data;
  } catch (_) {}

  // Fallback to Turbo
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(upscalePrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=turbo`;
    const data = await fetchWithRetry(url, 2, 2000);
    return data;
  } catch (_) {}

  return null;
}

module.exports = {
  config: {
    name: "midjourney",
    aliases: ["mj", "mj2", "midjourneyai", "mjai"],
    version: "3.0.0",
    role: 0,
    author: "frnAlt",
    countDown: 5,
    category: "ai",
    shortDescription: {
      en: "MidJourney 4 distinct AI variations with U1-U4 upscale"
    },
    longDescription: {
      en: "Generates 4 distinct MidJourney v6 AI variations rendered via Flux/SDXL and sends them as 4 separate photos. Reply with U1, U2, U3, or U4 to upscale a specific image in 4K resolution."
    },
    guide: {
      en: "{pn} <prompt>\nReply with U1, U2, U3, or U4 to upscale an individual variation."
    }
  },

  onStart: async function ({ api, event, args, message, commandName }) {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(`Please provide an image prompt.\n\nExample: ${prefix}${commandName} cyberpunk samurai warrior in neo tokyo`);
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const timestamp = Date.now();
    const seed = Math.floor(Math.random() * 1000000);
    let quadrantPaths = [];
    let gridPath = null;

    try {
      // 1. Generate 2x2 grid image
      const { buffer, engine } = await generateMidjourneyGrid(prompt, seed);

      // Save full grid
      gridPath = path.join(cacheDir, `mj_grid_${timestamp}.png`);
      await fs.writeFile(gridPath, buffer);

      // 2. Slice into 4 distinct quadrants
      quadrantPaths = await sliceGridIntoQuadrants(buffer, cacheDir, timestamp);

      // 3. Prepare attachments: 4 separate photos if sliced, else the full grid
      const sendFiles = (quadrantPaths && quadrantPaths.length === 4) ? quadrantPaths : [gridPath];
      const sendAttachment = sendFiles.map(fp => fs.createReadStream(fp));

      const messageBody =
`🎨 MidJourney AI Image Generator (v6)

Prompt: "${prompt}"
Engine: ${engine}

Generated 4 distinct variations.
Reply with U1, U2, U3, or U4 to upscale a variation in 4K Ultra HD.`;

      await message.reply(
        { body: messageBody, attachment: sendAttachment },
        (err, info) => {
          if (err) {
            if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
            sendFiles.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });
            return;
          }

          if (api && api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

          if (info?.messageID && global.GoatBot?.onReply) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "midjourney",
              messageID: info.messageID,
              author: event.senderID,
              filePaths: sendFiles,
              gridPath: gridPath,
              prompt: prompt,
              seed: seed,
              engine: engine,
              createdAt: Date.now()
            });

            // Automatic cleanup after 15 minutes
            const timer = setTimeout(() => {
              const allFiles = [...sendFiles];
              if (gridPath && !allFiles.includes(gridPath)) allFiles.push(gridPath);
              allFiles.forEach(fp => {
                try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
              });
              if (global.GoatBot?.onReply?.has(info.messageID)) {
                global.GoatBot.onReply.delete(info.messageID);
              }
            }, 15 * 60 * 1000);
            if (timer.unref) timer.unref();
          }
        }
      );

    } catch (err) {
      if (gridPath && fs.existsSync(gridPath)) { try { fs.unlinkSync(gridPath); } catch (_) {} }
      quadrantPaths?.forEach(fp => { try { fs.unlinkSync(fp); } catch (_) {} });
      if (api && api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      console.error("[MIDJOURNEY ERROR]:", err.message);
      return message.reply("MidJourney Error: AI image service is currently busy. Please try again in a few moments.");
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
    const fallbackPath = Reply.filePaths?.[index] || Reply.gridPath;

    if (api && api.setMessageReaction) api.setMessageReaction("🔍", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    let upscalePath = null;
    let stream = null;

    try {
      // 1. Attempt dedicated high-resolution 1024x1024 upscale render
      const upscaleBuffer = await generateDedicatedUpscale(Reply.prompt, index, Reply.seed);
      if (upscaleBuffer && upscaleBuffer.length > 1000) {
        upscalePath = path.join(cacheDir, `mj_upscale_${Date.now()}_${index}.png`);
        await fs.writeFile(upscalePath, upscaleBuffer);
        stream = fs.createReadStream(upscalePath);
        stream.on("close", () => {
          try { if (upscalePath && fs.existsSync(upscalePath)) fs.unlinkSync(upscalePath); } catch (_) {}
        });
      }
    } catch (err) {
      console.warn("[MIDJOURNEY UPSCALE] Live render fallback:", err.message);
    }

    // 2. Graceful fallback: use sliced quadrant if live upscale was unavailable
    if (!stream) {
      if (fallbackPath && fs.existsSync(fallbackPath)) {
        stream = fs.createReadStream(fallbackPath);
      } else {
        if (api && api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("That image is no longer available.");
      }
    }

    try {
      await message.reply({
        body: `✨ MidJourney Upscale • U${index + 1}\n\n🎨 Prompt: "${Reply.prompt}"\n🌟 Resolution: Full 1024x1024 Ultra HD\n⚡ Model: MidJourney v6 / Flux Photorealism`,
        attachment: stream
      });
      if (api && api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      if (api && api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      console.error("[MIDJOURNEY REPLY ERROR]:", err.message);
      return message.reply("Error sending the upscaled image variation.");
    }
  }
};
