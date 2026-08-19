// @ts-check

import { abbreviateNumber, parseBet } from "@cass-modules/ArielUtils";
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
  name: "richroll",
  description:
    "Roll your way to riches as you test your luck in a high-stakes game of fortune.",
  version: "1.1.5",
  author: "frnAlt",
  otherNames: ["rr"],
  usage: "{prefix}{name}",
  category: "Gambling Games",
  permissions: [0],
  noPrefix: false,
  waitingTime: 0.1,
  icon: "🌪️",
  shopPrice: 2500,
  requiredLevel: 10,
  requirement: "3.0.0",
  cmdType: "arl_g",
  isGame: true,
};

const outcomes = [
  "💰 ***CHA-CHING!*** You hit the jackpot! You win <amount>💵 and roll your way to riches.",
  "🔔 ***DING-DING-DING!*** Lucky roll! You win <amount>💵 on your way to becoming the wealthiest.",
  "💥 ***THUD...*** Oops, the dice turned against you. You lose <amount>💵 in a bad roll.",
  "💥 ***THUD...*** Oops, the dice turned against you. You lose <amount>💵 in a bad roll.",
  "😅 ***WHEW!*** A close call! You win <amount>💵 as your luck holds out just a bit longer.",
  "💎 ***BLING-BLING!*** What a roll! You gain <amount>💵 as fortune smiles upon you.",
  "💣 ***CRASH!*** The dice betrayed you. You lose <amount>💵 in a risky gamble.",
  "💣 ***CRASH!*** The dice betrayed you. You lose <amount>💵 in a risky gamble.",
  "🔔 ***DING!*** A lucky streak! You gain <amount>💵 as your fortunes rise.",
  "🌪️ ***WOOSH...*** Unlucky roll! You lose <amount>💵 and your riches slip away.",
  "🌪️ ***WOOSH...*** Unlucky roll! You lose <amount>💵 and your riches slip away.",
  "💥 ***THUD...*** Oh no! The dice turned cold. You lose <amount>💵 as the luck fades.",
  "💎 ***BLING!*** Rolling high! You earn <amount>💵 as you get closer to untold riches.",
  "💥 ***BAM!*** Bad luck strikes! You lose <amount>💵 in a devastating roll.",
  "💥 ***BAM!*** Bad luck strikes! You lose <amount>💵 in a devastating roll.",
  "⚡ ***ZING!*** You're on a roll! You win <amount>💵 and get one step closer to the fortune.",
];

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
  let { inventory: r, rrWins = 0, rrLooses = 0, badLuck = false } = userData;
  const inventory = new Inventory(r);
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

  const outcomeIndex = Math.floor(Math.random() * outcomes.length);

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
        `⚠️ Wrong syntax!\n\n**Guide**: ${input.words[0]} <mtls_key> <bet>\n\nYou can check your **collectibles** or visit **MTLS** to mint one!\nMTLS Key shoud have no "mtls_" prefix.`
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

  if (isNaN(amount) || amount < 1) {
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

  let outcome = outcomes.toSorted(() => Math.random() - 0.5)[outcomeIndex];
  const basis = Math.random();

  while (basis < 0.3 ? outcome.includes(" lose") : outcome.includes(" win")) {
    outcome = outcomes.toSorted(() => Math.random() - 0.5)[outcomeIndex];
  }

  while (badLuck && !outcome.includes(" lose")) {
    outcome = outcomes.toSorted(() => Math.random() - 0.5)[outcomeIndex];
  }

  if (!hasPass && amount > global.Cassidy.highRoll) {
    return output.reply(
      `You need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
    );
  }

  const cashField = styler.getField("cashField");
  const resultText = styler.getField("resultText");
  let xText = "";

  if (outcome.includes(" lose")) {
    amount = Math.min(amount, infoT.amount);

    cashField.applyTemplate({
      cash: formatTokens(infoT, amount),
    });
    rrLooses += amount;

    resultText.changeContent("You lost:");

    await money.setItem(input.senderID, {
      ...updatedTokensInfo(infoT, infoT.amount - amount),
      rrLooses,
      rrWins,
    });
  } else {
    rrWins += amount;

    cashField.applyTemplate({
      cash: formatTokens(infoT, amount),
    });

    resultText.changeContent("You Won:");
    await money.setItem(input.senderID, {
      ...updatedTokensInfo(infoT, amount + infoT.amount),
      rrWins,
      rrLooses,
    });
  }
  const newInfo = getTokensInfo(infoT.refKey, await money.getCache(input.sid));

  output.reply(
    `💥 ` +
      outcome.replace("<amount>", formatTokens(infoT, amount)) +
      xText +
      ` Your new amount is ${formatTokens(newInfo, newInfo.amount)}`
  );
}
