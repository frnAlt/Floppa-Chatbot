module.exports = {
  config: {
    name: "ping",
    aliases: ["pong"],
    version: "2.0",
    author: "frnAlt",
    countDown: 2,
    role: 0,
    description: {
      vi: "Kiểm tra độ trễ phản hồi của bot",
      en: "Check bot response latency"
    },
    category: "utility",
    guide: {
      vi: "{pn}",
      en: "{pn}"
    }
  },

  onStart: async function ({ message, event }) {
    const startTime = Date.now();
    message.reaction("🏓", event.messageID);
    const sentMsg = await message.reply("🏓 Pinging...");
    const latency = Date.now() - startTime;
    await message.reply(`🏓 Pong! Response latency: ${latency}ms`);
  }
};
