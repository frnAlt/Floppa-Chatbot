/**
 * Unified System Functions Export (func/index.js)
 * 
 * Exports all utility modules cleanly.
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
  cacheManager
};
