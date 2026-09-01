const upscaleCmd = require("./upscale.js");

module.exports = {
  config: {
    ...upscaleCmd.config,
    name: "4k",
    aliases: ["4kres", "4khd"]
  },
  onStart: upscaleCmd.onStart
};
