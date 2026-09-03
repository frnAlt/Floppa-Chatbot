const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "on",
    aliases: ["boton"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 2,
    role: 2,
    shortDescription: { en: "Turn the bot ON" },
    longDescription: { en: "Turn the bot ON. All users will be able to use commands." },
    category: "admin",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message }) {
    const configPath = path.join(process.cwd(), "config.json");
    global.GoatBot.botOff = false;
    try {
      const conf = fs.readJsonSync(configPath);
      conf.botOff = false;
      fs.writeJsonSync(configPath, conf, { spaces: 2 });
    } catch (_) {}

    return message.reply("🟢 Bot is now turned ON. All users can now use commands.");
  }
};
