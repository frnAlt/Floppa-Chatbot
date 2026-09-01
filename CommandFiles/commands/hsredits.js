// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "hsrEdits",
  description: "Fetches and sends a random Honkai Star Rail edits.",
  author: "frnAlt",
  version: "1.1.0",
  usage: "{prefix}{name}",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["honkaistarrailedit", "StarRailEdits"],
  icon: "🌌",
  noLevelUI: true,
  noWeb: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Honkai Star Rail Edits 🌃",
  titleFont: "bold",
  contentFont: "fancy",
};

import { defineEntry } from "@cass/define";
import axios from "axios";

export const entry = defineEntry(async ({ output }) => {
  const API_URL =
    "https://toshiro-api-editz6t9.vercel.app/api/search/tiksearch?keyword=Hsr+edits";
  try {
    await output.reply(
      "🔎 | Fetching Honkai Star Rail Edits...\n⏳ | Please **wait**...💖"
    );

    const res = await axios.get(API_URL, { timeout: 30000 });
    if (!res.data || !res.data.success || !res.data.result || !res.data.result.video) {
      return output.reply("❌ | Could not find any Honkai Star Rail edits.");
    }

    const { video } = res.data.result;
    const stream = await global.utils.getStreamFromURL(video, "hsr_edit.mp4");

    await output.reply({
      body: "Here's your Star Rail Edit おさま! 💖🥀\nMay This Journey Lead Us Starward! 🌌",
      attachment: stream,
    });
  } catch (error) {
    console.error("Entry error:", error.message);
    output.reply(`❌ | Error fetching video: ${error.message}`);
  }
});
