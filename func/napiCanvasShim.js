"use strict";

/**
 * Universal High-Performance Canvas Adapter for Floppa-Chatbot
 * Bridges @napi-rs/canvas to provide 100% drop-in compatibility for both
 * @napi-rs/canvas and legacy node-canvas APIs across all Node.js versions.
 * Enhances text sharpness, anti-aliasing, and streams compatibility.
 */

const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");

let realNapi = null;
try {
  // Use direct filesystem path to prevent moduleResolver alias circular recursion
  const napiDirectPath = path.join(__dirname, "../node_modules/@napi-rs/canvas");
  realNapi = require(napiDirectPath);
} catch (_) {}

if (!realNapi) {
  try {
    const nodeCanvasPath = path.join(__dirname, "../node_modules/canvas");
    realNapi = require(nodeCanvasPath);
  } catch (_) {}
}

// 1. Initialize Fonts for crisp typography
if (realNapi?.GlobalFonts) {
  try {
    realNapi.GlobalFonts.loadSystemFonts();
  } catch (_) {}

  // Register bundled high-quality TrueType/OpenType fonts
  const fontDirs = [
    path.join(__dirname, "../scripts/cmds/assets/font"),
    path.join(__dirname, "../scripts/cmds/canvas/fonts")
  ];

  for (const fontDir of fontDirs) {
    if (fs.existsSync(fontDir)) {
      try {
        const files = fs.readdirSync(fontDir);
        for (const file of files) {
          if (file.endsWith(".ttf") || file.endsWith(".otf")) {
            const fontPath = path.join(fontDir, file);
            const rawName = file.replace(/\.(ttf|otf)$/, "");
            try {
              realNapi.GlobalFonts.registerFromPath(fontPath, rawName);
              // Register standard aliases for crisp fallback
              if (rawName.includes("NotoSans-Bold")) {
                realNapi.GlobalFonts.registerFromPath(fontPath, "sans-serif");
                realNapi.GlobalFonts.registerFromPath(fontPath, "Arial");
                realNapi.GlobalFonts.registerFromPath(fontPath, "Helvetica");
              }
              if (rawName.includes("NotoSans-Regular")) {
                realNapi.GlobalFonts.registerFromPath(fontPath, "Noto Sans");
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
  }
}

class FallbackPath2D {
  moveTo() {}
  lineTo() {}
  arc() {}
  closePath() {}
}

function applyCrispContextSettings(ctx) {
  if (!ctx) return;
  try {
    if ("textRendering" in ctx) ctx.textRendering = "optimizeLegibility";
    if ("imageSmoothingEnabled" in ctx) ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    if ("patternQuality" in ctx) ctx.patternQuality = "best";
    if ("quality" in ctx) ctx.quality = "best";
    if ("antialias" in ctx) ctx.antialias = "subpixel";
  } catch (_) {}

  // Wrap fillText and strokeText to guard against undefined / null TypeError
  const origFillText = ctx.fillText;
  if (typeof origFillText === "function") {
    ctx.fillText = function (text, x, y, maxWidth) {
      const safeText = text === undefined || text === null ? "" : String(text);
      if (maxWidth !== undefined) {
        return origFillText.call(this, safeText, x, y, maxWidth);
      }
      return origFillText.call(this, safeText, x, y);
    };
  }

  const origStrokeText = ctx.strokeText;
  if (typeof origStrokeText === "function") {
    ctx.strokeText = function (text, x, y, maxWidth) {
      const safeText = text === undefined || text === null ? "" : String(text);
      if (maxWidth !== undefined) {
        return origStrokeText.call(this, safeText, x, y, maxWidth);
      }
      return origStrokeText.call(this, safeText, x, y);
    };
  }

  const origMeasureText = ctx.measureText;
  if (typeof origMeasureText === "function") {
    ctx.measureText = function (text) {
      const safeText = text === undefined || text === null ? "" : String(text);
      return origMeasureText.call(this, safeText);
    };
  }
}

function wrapCanvasInstance(canvas) {
  if (!canvas) return canvas;

  // Enhance getContext
  const origGetContext = canvas.getContext;
  if (typeof origGetContext === "function") {
    canvas.getContext = function (type, ...args) {
      const ctx = origGetContext.call(this, type, ...args);
      if (type === "2d") {
        applyCrispContextSettings(ctx);
      }
      return ctx;
    };
  }

  // Node-canvas compatibility: createPNGStream & createJPEGStream
  if (!canvas.createPNGStream) {
    canvas.createPNGStream = function () {
      const buf = canvas.toBuffer("image/png");
      return Readable.from(buf);
    };
  }
  if (!canvas.createJPEGStream) {
    canvas.createJPEGStream = function () {
      const buf = canvas.toBuffer("image/jpeg");
      return Readable.from(buf);
    };
  }

  // Node-canvas compatibility: toBuffer callback support
  const origToBuffer = canvas.toBuffer?.bind(canvas);
  if (origToBuffer) {
    canvas.toBuffer = function (typeOrCb, ...args) {
      let mime = typeof typeOrCb === "string" ? typeOrCb : "image/png";
      let cb = typeof typeOrCb === "function" ? typeOrCb : (typeof args[0] === "function" ? args[0] : null);
      if (mime === "png") mime = "image/png";
      if (mime === "jpeg" || mime === "jpg") mime = "image/jpeg";
      try {
        const buf = origToBuffer(mime);
        if (cb) {
          process.nextTick(() => cb(null, buf));
          return;
        }
        return buf;
      } catch (err) {
        if (cb) {
          process.nextTick(() => cb(err));
          return;
        }
        throw err;
      }
    };
  }

  return canvas;
}

const canvasAdapter = {
  createCanvas(width, height) {
    if (realNapi?.createCanvas) {
      const cv = realNapi.createCanvas(width, height);
      return wrapCanvasInstance(cv);
    }
    return wrapCanvasInstance({
      width,
      height,
      getContext: () => ({
        fillRect() {},
        clearRect() {},
        drawImage() {},
        fillText() {},
        strokeText() {},
        measureText: () => ({ width: 0 }),
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        arc() {},
        stroke() {},
        fill() {},
        save() {},
        restore() {}
      }),
      toBuffer: () => Buffer.from([])
    });
  },

  loadImage(src, opts) {
    if (realNapi?.loadImage) {
      return realNapi.loadImage(src, opts);
    }
    return Promise.resolve({ width: 100, height: 100 });
  },

  registerFont(fontPath, options) {
    if (!fontPath) return false;
    const family = typeof options === "string" ? options : (options && options.family ? options.family : undefined);
    if (realNapi?.GlobalFonts?.registerFromPath) {
      try {
        return realNapi.GlobalFonts.registerFromPath(fontPath, family);
      } catch (_) {
        return false;
      }
    }
    if (realNapi?.registerFont) {
      try {
        return realNapi.registerFont(fontPath, typeof options === "object" ? options : { family });
      } catch (_) {
        return false;
      }
    }
    return false;
  },

  GlobalFonts: realNapi?.GlobalFonts || {
    registerFromPath(fontPath, name) {
      canvasAdapter.registerFont(fontPath, name);
    },
    has() { return false; },
    getFamilies() { return []; },
    loadSystemFonts() {},
    loadFontsFromDir() {}
  },

  Path2D: realNapi?.Path2D || FallbackPath2D,
  Path: realNapi?.Path2D || FallbackPath2D,
  ImageData: realNapi?.ImageData || class ImageData {},
  Image: realNapi?.Image || class Image {},
  Canvas: realNapi?.Canvas || class Canvas {}
};

module.exports = canvasAdapter;
module.exports.default = canvasAdapter;
