const axios = require("axios");

module.exports = {
  config: {
    name: "map",
    aliases: ["route", "distance", "direction"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    category: "tools",
    description: "Get route distance, duration, and map screenshot between two locations.",
    guide: {
      en: "{pn} <from> to <to>\n{pn} <from> | <to>\nExample: {pn} dhaka to sandwip"
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

    const fullInput = args.join(" ").trim();
    let from = "";
    let to = "";

    if (fullInput.toLowerCase().includes(" to ")) {
      const parts = fullInput.split(/ to /i);
      from = (parts[0] || "").trim();
      to = (parts.slice(1).join(" to ") || "").trim();
    } else if (fullInput.includes("|")) {
      const parts = fullInput.split("|");
      from = (parts[0] || "").trim();
      to = (parts[1] || "").trim();
    } else if (fullInput.includes("-")) {
      const parts = fullInput.split("-");
      from = (parts[0] || "").trim();
      to = (parts[1] || "").trim();
    } else if (args.length >= 2) {
      from = args[0].trim();
      to = args.slice(1).join(" ").trim();
    }

    if (!from || !to) {
      return message.reply(
        `🗺️ Please provide starting and destination locations.\n\n` +
        `💡 Usage:\n` +
        `• ${prefix}${commandName} <from> to <to>\n` +
        `• ${prefix}${commandName} <from> | <to>\n\n` +
        `💡 Example: ${prefix}${commandName} dhaka to sandwip`
      );
    }

    await safeReact("🗺️");

    try {
      const apiUrl = `https://xalman-apis.vercel.app/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await axios.get(apiUrl, { timeout: 25000 });

      if (res.data && res.data.status === true) {
        const { distance, duration, image, thumbnail, route } = res.data;
        const imageUrl = image || thumbnail;

        if (!imageUrl) {
          throw new Error("No map image screenshot returned from route service.");
        }

        const stream = await global.utils.getStreamFromURL(imageUrl, "map_route.jpg", { timeout: 20000 });

        await safeReact("👍");

        const fromLabel = route?.from || from;
        const toLabel = route?.to || to;

        return message.reply({
          body: `🗺️ Route: ${fromLabel.toUpperCase()} ➔ ${toLabel.toUpperCase()}\n📏 Distance: ${distance}\n⏱️ Duration: ${duration}`,
          attachment: stream
        });
      } else {
        throw new Error(res.data?.message || "Route not found between specified locations.");
      }
    } catch (err) {
      console.error("[MAP COMMAND ERROR]:", err.message || err);
      await safeReact("👎");
      return message.reply(`👎 Failed to get map route: ${err.response?.data?.message || err.message || "Route could not be calculated."}`);
    }
  }
};
