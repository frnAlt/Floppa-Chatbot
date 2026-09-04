const axios = require("axios");

module.exports = {
  config: {
    name: "search",
    aliases: ["google", "gsearch", "find"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search the web" },
    longDescription: { en: "Search the web for instant answers, news, and links" },
    category: "utility",
    guide: { en: "{pn} <search keywords>" }
  },

  onStart: async function ({ message, args, event, api }) {
    if (!args[0]) {
      return message.reply("❌ Please enter what you want to search for.\nExample: {p}search latest space missions");
    }

    const query = args.join(" ").trim();
    if (api.setMessageReaction) {
      api.setMessageReaction("🔍", event.messageID, () => {}, true);
    }

    try {
      const res = await axios.get("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 15000
      });

      const regex = /<h2 class="result__title">[\s\S]*?<a class="result__url" href="([^"]*)"[\s\S]*?>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      const results = [];
      let m;

      while ((m = regex.exec(res.data)) !== null && results.length < 5) {
        let rawUrl = m[1];
        if (rawUrl.includes("uddg=")) {
          const uMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uMatch) rawUrl = decodeURIComponent(uMatch[1]);
        }
        const title = m[2].replace(/<[^>]+>/g, "").trim();
        const snippet = m[3].replace(/<[^>]+>/g, "").trim();
        if (title && snippet) {
          results.push({ title, snippet, url: rawUrl });
        }
      }

      if (results.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply(`❌ No web results found for "${query}".`);
      }

      let replyText = `🔎 Search results for "${query}":\n\n`;
      results.forEach((r, idx) => {
        replyText += `[${idx + 1}] ${r.title}\n📝 ${r.snippet}\n🔗 ${r.url}\n\n`;
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);
      return message.reply(replyText.trim());
    } catch (err) {
      console.error("[SEARCH ERROR]:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Search failed: ${err.message || "Network timeout."}`);
    }
  }
};
