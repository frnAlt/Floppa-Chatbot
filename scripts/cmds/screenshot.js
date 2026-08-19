// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "screenshot",
  description: "Take a screenshot of a url.",
  author: "Liane Cagara | Haji Mix",
  version: "1.0.1",
  usage: "{prefix}{name}",
  category: "Media",
  permissions: [2],
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  otherNames: ["ss"],
  icon: "📸",
  noLevelUI: true,
};

import axios from "axios";

export const style = {
  title: "Screenshot 📸",
  contentFont: "fancy",
  titleFont: "bold",
};

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry({ input, output }) {
  if (!input.isAdmin) {
    return output.reaction("😂");
  }
  const url = input.arguments.join("");
  if (!url) {
    return output.reply("Please enter a URL as arguments.");
  }
  const res = await axios.get(
    "https://haji-mix.up.railway.app/api/screenshot",
    {
      params: {
        url,
      },
      responseType: "stream",
    }
  );
  return output.reply({
    attachment: res.data,
    body: "✅ Screenshot:",
  });
}
