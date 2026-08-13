const upscaleCmd = require('./upscale.js');

module.exports = {
  config: {
    ...upscaleCmd.config,
    name: "4k",
    aliases: ["4kimage", "hd", "upscale", "enhance"]
  },
  onStart: upscaleCmd.onStart
};
