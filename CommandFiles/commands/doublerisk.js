// @ts-check

import { parseBet } from "@cass-modules/ArielUtils";
import {
  formatTokens,
  getTokensInfo,
  updatedTokensInfo,
} from "@cass-modules/MTLSUtils";

const isT = Cassidy.config.gambleNeedsMint ?? false;

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "doublerisk",
  description: "Risk your money to potentially double it, or lose it all!",
  version: "1.1.4",
  author: "@lianecagara",
  usage: "{prefix}doublerisk [mtls_key] <amount>",
  category: "Gambling Games",
  role: 0,
  noPrefix: false,
  otherNames: ["doubleorlose", "riskitall", "doubleornothing", "don"],
  waitingTime: 30,
  shopPrice: 50000,
  requirement: "3.0.0",
  icon: "💥",
  cmdType: "arl_g",
  isGame: true,
};

export class style {
  title = {
    text_font: "double_struck",
    content: "Double Risk 💥",
    line_bottom_inside_text_elegant: "Results",
  };
  content = {
    text_font: "fancy",
    line_bottom_: "14chars",
    // text_prefix: "✦ ",
  };
}

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry({
  input,
  output,
  money,
  styler,
  Inventory,
  cancelCooldown,
}) {
  let userData = await money.getItem(input.senderID);
  let {
    inventory: rawInv,
    drWin = 0,
    drLost = 0,
    slotWins = 0,
    slotLooses = 0,
  } = userData;
  const inventory = new Inventory(rawInv);
  let hasPass = inventory.has("highRollPass");

  /**
   * @type {string}
   */
  let bet;
  /**
   * @type {string}
   */
  let KEY;
  /**
   * @type {ReturnType<typeof getTokensInfo>}
   */
  let infoT;

  if (isT) {
    [KEY = "", bet = ""] = input.arguments;
    if (KEY.startsWith("mtls_")) {
      KEY = KEY.replace("mtls_", "");
    }
    if (Cassidy.config.strictGambleNeedsMint && KEY === "money") {
      cancelCooldown();
      return output.reply("⚠️ We do not allow money bets!");
    }
    if (!KEY || !isNaN(parseBet(KEY, Infinity)) || !bet?.length) {
      cancelCooldown();
      return output.reply(
        `⚠️ Wrong syntax!\n\n**Guide**: ${input.words[0]} <mtls_key> <bet>\n\nYou can check your **collectibles** or visit **MTLS** to mint one!\nMTLS Key should have no "mtls_" prefix.`
      );
    }
    infoT = getTokensInfo(KEY, userData);
  } else {
    [bet] = input.arguments;
    if (!bet?.length) {
      cancelCooldown();
      return output.reply(
        `⚠️ Wrong syntax!\n\n**Guide**: ${input.words[0]} <bet>`
      );
    }
    infoT = getTokensInfo("money", userData);
  }

  const betAmount = parseBet(bet, infoT.amount);
  const title = styler.getField("title");

  if (input.isAdmin) {
    cancelCooldown();
  }

  if (isNaN(betAmount) || betAmount <= 0) {
    cancelCooldown();
    return output.reply("Please enter a valid bet amount greater than 0.");
  }

  if (!hasPass && betAmount > global.Cassidy.highRoll) {
    cancelCooldown();
    return output.reply(
      `You need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
    );
  }

  if (betAmount > infoT.amount) {
    cancelCooldown();
    return output.reply(
      `⚠️ You do not have enough ${formatTokens(
        infoT,
        betAmount
      )}. You only had ${formatTokens(infoT, infoT.amount)}`
    );
  }

  let outcome = Math.random() < 0.3 ? "win" : "lose";
  let resultText;
  let newBalance;
  const winnings = Math.floor(betAmount * 0.5);

  if (outcome === "win") {
    newBalance = infoT.amount + winnings;
    drWin += betAmount;

    title.style.line_bottom_inside_text_elegant = `Won`;
    resultText = `🎉 Congratulations! You won ${formatTokens(
      infoT,
      winnings
    )} and now have ${formatTokens(infoT, newBalance)}.`;
  } else {
    newBalance = infoT.amount - betAmount;
    drLost += betAmount;
    title.style.line_bottom_inside_text_elegant = `Lost`;
    resultText = `😢 You lost your bet and now have ${formatTokens(
      infoT,
      newBalance
    )}.`;
  }

  await money.setItem(input.senderID, {
    ...updatedTokensInfo(infoT, newBalance),
    drWin,
    drLost,
    slotWins,
    slotLooses,
  });

  const i = slotWins - slotLooses;

  output.reply(`**Double Risk**:
You bet: ${formatTokens(infoT, betAmount)}
Outcome: ${outcome === "win" ? "Win" : "Lose"}
\n${resultText}\n\n**Total Wins**: ${formatTokens(infoT, drWin - drLost)}${
    i < 0
      ? `\n[font=typewriter]Are you playing this because you lost in slot?[:font=typewriter]`
      : ``
  }`);
}
