// @ts-check

import { abbreviateNumber, parseBet } from "@cass-modules/ArielUtils";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "numberize",
  description: "Turn your bet back to a readable number.",
  author: "@lianecagara",
  version: "1.0.0",
  usage: "{prefix}{name}num <bet>",
  category: "Utilities",
  permissions: [0],
  noPrefix: false,
  otherNames: ["num"],
  botAdmin: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "💰",
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "💰 Numberize",
  titleFont: "bold_italic",
  contentFont: "none",
};

/**
 * @param {CassidySpectra.CommandContext} ctx
 */
export async function entry({ input, output, args, money }) {
  const user = await money.getItem(input.sid);
  const bet = parseBet(args[0], user.money);
  if (isNaN(bet)) {
    return output.reply("Invalid number.");
  }
  return output.reply(
    `**Your Input**:\n${
      args[0]
    }\n\n**Translated**:\n${bet}\n\n**Exponential**:\n${bet.toExponential()}\n\n**Locale**:\n${bet.toLocaleString()}\n\n**Abbr (2 Decimals)**:\n${abbreviateNumber(
      bet,
      2
    )}\n\n**Abbr (2 Decimals, FULL)**:\n${abbreviateNumber(bet, 2, true)}\n\n${
      bet <= user.money
        ? "***Is not higher than your balance***"
        : "***Higher than your balance.***"
    }\n\n**GUIDE**:\n1. You can use **"allin"** or **"all"** to bet your **entire balance** or **entire bank account** (depends).\n2. You can use abbr like **1M, 2.9B, 69Sx**, etc!\n3. You can use exponential notation like **1e+219**\n4. You can use percentage like **50% relative to your balance** or bank account (depends).`
  );
}
