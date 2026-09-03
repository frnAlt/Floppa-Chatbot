const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "off",
    aliases: ["on", "botoff", "boton", "maintenance"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 2,
    role: 2,
    shortDescription: { en: "Turn the bot OFF or ON" },
    longDescription: { en: "Toggle bot status. When OFF, only bot admins can use the bot, and all regular responses are disabled." },
    category: "admin",
    guide: { en: "{pn} or {p}on or {p}off" }
  },

  onStart: async function ({ message, args, commandName }) {
    const configPath = path.join(process.cwd(), "config.json");
    let currentOff = global.GoatBot.botOff === true;

    if (commandName === "on" || args[0] === "on") {
      global.GoatBot.botOff = false;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = false;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return message.reply("🟢 Bot is now turned ON. All users can now use commands.");
    }

    if (commandName === "off" || args[0] === "off") {
      global.GoatBot.botOff = true;
      try {
        const conf = fs.readJsonSync(configPath);
        conf.botOff = true;
        fs.writeJsonSync(configPath, conf, { spaces: 2 });
      } catch (_) {}
      return message.reply("🔴 Bot is now turned OFF. Only bot admins can use commands.");
    }

    // Toggle if invoked without arguments
    global.GoatBot.botOff = !currentOff;
    try {
      const conf = fs.readJsonSync(configPath);
      conf.botOff = global.GoatBot.botOff;
      fs.writeJsonSync(configPath, conf, { spaces: 2 });
    } catch (_) {}

    return message.reply(
      global.GoatBot.botOff
        ? "🔴 Bot is now turned OFF. Only bot admins can use commands."
        : "🟢 Bot is now turned ON. All users can now use commands."
    );
  }
};
