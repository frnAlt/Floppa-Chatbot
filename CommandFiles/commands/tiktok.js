// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "tiktok",
  description:
    "Searches for TikTok videos based on your query and sends a video.",
  author: "MrKimstersDev | haji-mix-api",
  version: "1.0.0",
  usage: "{prefix}{name} <search query>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["tt", "tiktoksearch"],
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

export const entry = defineEntry(
  async ({ input, output, prefix, commandName }) => {
    const BASE_API_URL = "https://haji-mix-api.gleeze.com/api/tiktok";
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

      const apiUrl = `${BASE_API_URL}?search=${encodeURIComponent(
        query
      )}&stream=true`;

      await output.attach(
        `Here's your TikTok video for "${query}"! 🎬✨`,
        apiUrl
      );
    } catch (error) {
      console.error("Entry error:", error.message);
      await output.reply(`❌ | Error fetching TikTok video: ${error.message}`);
    }
  }
);
