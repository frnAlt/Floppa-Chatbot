"use strict";

/**
 * Universal Canvas Helper for Floppa-Chatbot
 * Gracefully resolves @napi-rs/canvas or node-canvas
 */

let createCanvas = null;
let loadImage = null;
let isCanvasAvailable = false;

// 1. Try @napi-rs/canvas
try {
  const napi = require("@napi-rs/canvas");
  const cFunc = napi.createCanvas || napi.default?.createCanvas;
  const lFunc = napi.loadImage || napi.default?.loadImage;
  if (typeof cFunc === "function" && typeof lFunc === "function") {
    createCanvas = cFunc;
    loadImage = lFunc;
    isCanvasAvailable = true;
  }
} catch (_) {}

// 2. Try node-canvas (canvas)
if (!isCanvasAvailable) {
  try {
    const nodeCanvas = require("canvas");
    const cFunc = nodeCanvas.createCanvas || nodeCanvas.default?.createCanvas;
    const lFunc = nodeCanvas.loadImage || nodeCanvas.default?.loadImage;
    if (typeof cFunc === "function" && typeof lFunc === "function") {
      createCanvas = cFunc;
      loadImage = lFunc;
      isCanvasAvailable = true;
    }
  } catch (_) {}
}

async function renderJailEffect(imageSource) {
  if (!isCanvasAvailable || typeof createCanvas !== "function" || typeof loadImage !== "function") {
    throw new Error("Canvas is not available on this platform");
  }

  let img;
  if (typeof imageSource === "string" && imageSource.startsWith("http")) {
    const axios = require("axios");
    const res = await axios.get(imageSource, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    img = await loadImage(Buffer.from(res.data));
  } else if (Buffer.isBuffer(imageSource)) {
    img = await loadImage(imageSource);
  } else {
    img = await loadImage(imageSource);
  }

  const width = img.width || 512;
  const height = img.height || 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Draw original image
  ctx.drawImage(img, 0, 0, width, height);

  // 2. Prison bars configuration
  const barCount = Math.max(5, Math.floor(width / 70));
  const barWidth = Math.max(8, Math.floor(width / 36));
  const spacing = width / (barCount + 1);

  // 3. Horizontal support crossbars (one at ~18%, one at ~82%)
  const horizY = [height * 0.18, height * 0.82];
  const horizHeight = Math.max(10, Math.floor(barWidth * 1.1));

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  for (const y of horizY) {
    ctx.fillRect(0, y - horizHeight / 2 + 4, width, horizHeight);
  }
  for (const y of horizY) {
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, y - horizHeight / 2, width, horizHeight);
    ctx.fillStyle = "#636e72";
    ctx.fillRect(0, y - horizHeight / 2 + 2, width, Math.max(2, Math.floor(horizHeight * 0.25)));
  }

  // 4. Vertical iron bars
  for (let i = 1; i <= barCount; i++) {
    const x = Math.round(i * spacing - barWidth / 2);

    // Drop shadow behind bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(x + Math.max(3, Math.floor(barWidth * 0.25)), 0, barWidth, height);

    // Main steel iron bar
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(x, 0, barWidth, height);

    // Highlight stripe (specular cylinder shine)
    ctx.fillStyle = "#636e72";
    ctx.fillRect(x + Math.floor(barWidth * 0.2), 0, Math.max(2, Math.floor(barWidth * 0.25)), height);

    ctx.fillStyle = "#dfe6e9";
    ctx.fillRect(x + Math.floor(barWidth * 0.25), 0, Math.max(1, Math.floor(barWidth * 0.1)), height);

    // Rivets / bolts at intersections
    for (const y of horizY) {
      const r = Math.max(3, Math.floor(barWidth * 0.35));
      ctx.beginPath();
      ctx.arc(x + barWidth / 2, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#1e272e";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + barWidth / 2 - 1, y - 1, Math.max(1, Math.floor(r * 0.4)), 0, Math.PI * 2);
      ctx.fillStyle = "#b2bec3";
      ctx.fill();
    }
  }

  // 5. Dark atmospheric vignette overlay
  const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.75);
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  return canvas.toBuffer("image/png");
}

module.exports = {
  createCanvas,
  loadImage,
  isCanvasAvailable,
  renderJailEffect
};
