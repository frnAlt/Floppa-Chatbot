// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "tiktok",
  description:
    "Searches for TikTok videos based on your query and sends a video.",
  author: "Gtajisan (Farhan Muh Tasim)",
  version: "1.2.0",
  usage: "{prefix}{name} <search query>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["tt", "tiktoksearch", "tiksearch", "tik"],
  icon: "🎵",
  noLevelUI: true,
  noWeb: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "TikTok Video 🎵",
  titleFont: "bold",
  contentFont: "fancy",
};

import { defineEntry } from "@cass/define";
import axios from "axios";

export const entry = defineEntry(
  async ({ input, output, prefix, commandName }) => {
    const query = input.arguments.join(" ") || "";

    if (!query) {
      await output.reply(
        `***Guide***\n\nPlease provide a search query. **Example**: ${prefix}${commandName} Demon Slayer edits`
      );
      return;
    }

    try {
      await output.reply(
        `🔎 | Searching TikTok for "${query}"...\n⏳ | Please **wait**...🎵`
      );

      const API_URL = `https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=${encodeURIComponent(query)}`;
      const res = await axios.get(API_URL, { timeout: 30000 });

      if (!res.data || !res.data.success || !res.data.result || !res.data.result.video) {
        await output.reply(`❌ | No TikTok videos found for "${query}".`);
        return;
      }

      const { title, author, duration, video } = res.data.result;

      await output.attach(
        `🎬 **Title**: ${title || "N/A"}\n👤 **Creator**: @${author || "Unknown"}\n⏱️ **Duration**: ${duration || 0}s`,
        video,
        style
      );
    } catch (error) {
      console.error("TikTok error:", error.message);
      await output.reply(`❌ | Error fetching TikTok video: ${error.message}`);
    }
  }
);
