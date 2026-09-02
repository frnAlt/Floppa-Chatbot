let canvasPkg;
try {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 23) {
    canvasPkg = require("@napi-rs/canvas");
  }
} catch (_) {}

if (!canvasPkg) {
  let nodeCanvas;
  try {
    nodeCanvas = require("canvas");
  } catch (_) {}

  class Path2D {
    moveTo() {}
    lineTo() {}
    arc() {}
    closePath() {}
  }

  canvasPkg = {
    GlobalFonts: {
      registerFromPath(fontPath, name) {
        if (nodeCanvas?.registerFont) {
          try {
            nodeCanvas.registerFont(fontPath, { family: name });
          } catch (_) {}
        }
      },
      has() { return false; },
      getFamilies() { return []; },
      loadSystemFonts() {},
      loadFontsFromDir() {}
    },
    createCanvas(w, h) {
      if (nodeCanvas?.createCanvas) return nodeCanvas.createCanvas(w, h);
      return {
        width: w,
        height: h,
        getContext: () => ({
          fillRect() {},
          clearRect() {},
          drawImage() {},
          fillText() {},
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
      };
    },
    loadImage(src, opts) {
      if (nodeCanvas?.loadImage) return nodeCanvas.loadImage(src, opts);
      return Promise.resolve({ width: 100, height: 100 });
    },
    Path2D,
    Path: Path2D,
    ImageData: nodeCanvas?.ImageData || class ImageData {},
    Image: nodeCanvas?.Image || class Image {},
    Canvas: nodeCanvas?.Canvas || class Canvas {}
  };
}

module.exports = canvasPkg;
