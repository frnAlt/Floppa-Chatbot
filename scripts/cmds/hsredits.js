// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "hsrEdits",
  description: "Fetches and sends a random Honkai Star Rail edits.",
  author: "frnAlt",
  version: "1.0.0",
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

export const entry = defineEntry(async ({ output }) => {
  const API_URL =
    "https://haji-mix.up.railway.app/api/tiktok?search=Hsr+edits&stream=true";
  try {
    await output.reply(
      "🔎 | Fetching Honkai Star Rail Edits...\n⏳ | Please **wait**...💖"
    );

    await output.reply({
      body: "Here's your Star Rail Edit おさま! 💖🥀\nMay This Journey Lead Us Starward! 🌌",
      attachment: await global.utils.getStreamFromURL(API_URL),
    });
  } catch (error) {
    console.error("Entry error:", error.message);
    output.reply(`Error fetching image: ${error.message}`);
  }
});
