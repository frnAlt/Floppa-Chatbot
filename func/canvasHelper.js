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

module.exports = {
  createCanvas,
  loadImage,
  isCanvasAvailable
};
