const removeBgCmd = require('./removebg.js');

module.exports = {
  config: {
    ...removeBgCmd.config,
    name: "rbg",
    aliases: ["nobg", "bgremove", "removebg"]
  },
  onStart: removeBgCmd.onStart
};