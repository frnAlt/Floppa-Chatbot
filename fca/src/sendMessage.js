"use strict";

/**
 * Universal sendMessage interface for FCA engine.
 * Delegates to the high-performance realtime MQTT LightSpeed sender (with HTTP fallback).
 */
module.exports = function (defaultFuncs, api, ctx) {
  return require("./apis/sendMessage.js")(defaultFuncs, api, ctx);
};
