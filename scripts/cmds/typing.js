const fs = require("fs-extra");

module.exports = {
  config: {
    name: "typing",
    aliases: ["typingindicator"],
    version: "2.4.78",
    author: "frnAlt",
    countDown: 5,
    role: 2,
    description: {
      vi: "Quản lý chỉ báo gõ phím của bot",
      en: "Manage typing indicator settings for bot messages"
    },
    category: "config",
    guide: {
      en: "{pn} status\n{pn} on|off\n{pn} duration <milliseconds>"
    }
  },

  onStart: async function ({ message, args }) {
    const command = args[0] ? args[0].toString().toLowerCase() : "";
    const config = global.GoatBot.config || {};

    if (!command || command === "status") {
      const enabled = config.enableTypingIndicator ? "ON" : "OFF";
      const duration = Number(config.typingDuration) || 4000;
      return message.reply(`⌨️ Typing Indicator: ${enabled}\n⏱️ Duration: ${duration} ms`);
    }

    if (command === "on" || command === "off") {
      config.enableTypingIndicator = command === "on";
      if (global.client && global.client.dirConfig) {
        fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
      }
      return message.reply(`⌨️ Typing indicator is now ${config.enableTypingIndicator ? "ENABLED" : "DISABLED"}.`);
    }

    if (command === "duration") {
      if (!args[1]) return message.reply("❌ Please specify duration in ms. Example: /typing duration 4000");
      const duration = parseInt(args[1]);
      if (isNaN(duration) || duration <= 0) return message.reply("❌ Invalid duration (must be number > 0).");
      config.typingDuration = duration;
      if (global.client && global.client.dirConfig) {
        fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
      }
      return message.reply(`⏱️ Typing duration set to ${duration} ms.`);
    }

    return message.reply("❌ Invalid syntax. Use: /typing on|off|status|duration <ms>");
  }
};
