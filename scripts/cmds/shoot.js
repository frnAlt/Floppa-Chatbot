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
  name: "shoot",
  description:
    "Test your skills in a high-stakes basketball shooting game to win big or lose it all.",
  version: "1.1.5",
  author: "original idea by Duke Agustin, recreated by Liane Cagara",
  otherNames: ["bball", "shot", "bb"],
  usage: "{prefix}{name} [mtls_key] <bet>",
  category: "Gambling Games",
  permissions: [0],
  noPrefix: false,
  waitingTime: 0.1,
  icon: "🏀",
  shopPrice: 2500,
  requiredLevel: 10,
  requirement: "3.0.0",
  cmdType: "arl_g",
  isGame: true,
};

export class style {
  preset = ["cash_games_new.json"];
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  output,
  money,
  input,
  styler,
  cancelCooldown,
  Inventory,
}) {
  let userData = await money.getItem(input.senderID);
  let { inventory: r, bbWins = 0, bbLooses = 0 } = userData;
  const inventory = new Inventory(r);
  let hasPass = inventory.has("highRollPass");

  const isWin = Math.random() < 0.3;

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

  let amount = parseBet(bet, infoT.amount);

  if (isNaN(amount) || amount <= 0) {
    cancelCooldown();
    return output.reply(`⚠️ Invalid bet amount.`);
  }

  if (amount > infoT.amount) {
    cancelCooldown();
    return output.reply(
      `⚠️ You do not have enough ${formatTokens(
        infoT,
        amount
      )}. You only had ${formatTokens(infoT, infoT.amount)}`
    );
  }

  if (!hasPass && amount > global.Cassidy.highRoll) {
    return output.reply(
      `You need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
    );
  }

  const cashField = styler.getField("cashField");
  const resultText = styler.getField("resultText");

  if (!isWin) {
    amount = Math.min(amount, infoT.amount);

    cashField.applyTemplate({
      cash: formatTokens(infoT, amount),
    });
    bbLooses += amount;

    resultText.changeContent("You lost:");

    await money.setItem(input.senderID, {
      ...updatedTokensInfo(infoT, infoT.amount - amount),
      bbLooses,
      bbWins,
    });
    const newInfo = getTokensInfo(
      infoT.refKey,
      await money.getCache(input.sid)
    );
    output.reply(
      `💥 The Ball ⛹🏻‍♂️ missed🏀\nYour new amount is ${formatTokens(
        newInfo,
        newInfo.amount
      )}`
    );
  } else {
    bbWins += amount;

    cashField.applyTemplate({
      cash: formatTokens(infoT, amount),
    });

    resultText.changeContent("You Won:");
    await money.setItem(input.senderID, {
      ...updatedTokensInfo(infoT, infoT.amount + amount),
      bbWins,
      bbLooses,
    });
    const newInfo = getTokensInfo(
      infoT.refKey,
      await money.getCache(input.sid)
    );
    output.reply(
      `💥 The Ball ⛹🏻‍♂️ was shot successfully🏀\nYour new amount is ${formatTokens(
        newInfo,
        newInfo.amount
      )}`
    );
  }
}
