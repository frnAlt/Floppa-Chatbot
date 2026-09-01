const removeBgCmd = require('./removebg.js');

module.exports = {
  config: {
    ...removeBgCmd.config,
    name: "rbg",
    aliases: ["nobg"]
  },
  onStart: removeBgCmd.onStart
};