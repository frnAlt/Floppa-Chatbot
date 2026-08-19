/**
 * Unified System Functions Export (func/index.js)
 * High-performance backend engine with typography, math, collections, task runner, and FCA enhancements.
 */

const colors = require("./colors.js");
const configHelper = require("./configHelper.js");
const cooldownManager = require("./cooldownManager.js");
const fcaOptimizer = require("./fcaOptimizer.js");
const gracefulShutdown = require("./gracefulShutdown.js");
const mdToText = require("./mdToText.js");
const messageQueue = require("./messageQueue.js");
const spamTracker = require("./spamTracker.js");
const analyticsBatcher = require("./analyticsBatcher.js");
const aiHelper = require("./aiHelper.js");
const systemStats = require("./systemStats.js");
const cacheManager = require("./cacheManager.js");

// Cassidy & Modern Subsystems
const FontSystem = require("./fonts.js");
const styler = require("./styler.js");
const Numero = require("./numero.js");
const BigMath = require("./bigMath.js");
const arielUtils = require("./arielUtils.js");
const collections = require("./collections.js");
const BackgroundTaskFB = require("./backgroundTask.js");
const InputClass = require("./inputClass.js");
const OutputClass = require("./outputClass.js");
const unisym = require("./unisym.js");
const definers = require("./definers.js");
const fcaExtension = require("./fcaExtension.js");
const cassidyUtils = require("./cassidyUtils.js");

module.exports = {
  ...colors,
  configHelper,
  cooldownManager,
  fcaOptimizer,
  gracefulShutdown,
  mdToText,
  messageQueue,
  spamTracker,
  analyticsBatcher,
  aiHelper,
  systemStats,
  cacheManager,

  // Typography & Styling
  FontSystem,
  ...styler,

  // Math & Numeric
  Numero,
  BigMath,

  // Ariel Utils & Formatting
  ...arielUtils,

  // Collections & Data
  ...collections,

  // Background Task Engine
  BackgroundTaskFB,

  // Input & Output Context Models
  InputClass,
  OutputClass,

  // Symbols & Definers
  ...unisym,
  ...definers,

  // General Cassidy Utils
  ...cassidyUtils,

  // FCA Extension Layer
  fcaExtension,
  extendFCA: fcaExtension
};
