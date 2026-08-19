// @ts-check
const fruits = ["🍒", "🍎", "🍓", "🍌", "🍊", "🍇", "🍐", "🍋"];
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
  name: "slot",
  description: "Play the slot machine game",
  author: "@lianecagara",
  version: "1.1.9",
  usage: "{prefix}{name} [mtls_key] <bet>",
  category: "Gambling Games",
  permissions: [0],
  noPrefix: false,
  waitingTime: 30,
  shopPrice: 1000,
  requirement: "3.0.0",
  icon: "🍒",
  cmdType: "arl_g",
  isGame: true,
};

const { randArrValue } = global.utils;

const highRollPass = {
  name: "HighRoll Pass",
  key: "highRollPass",
  flavorText:
    "A pass won by achieving a 7-win streak in slots. This pass allows you to place slot bets over 100000, unlocking bigger wins and higher stakes. Remember, with great risk comes great reward. Surprisingly easy to toss away like a normal item!",
  icon: "🃏",
  sellPrice: 2500000,
  type: "armor",
  def: 15,
};
global.items.push(highRollPass);

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  input,
  output,
  money,
  icon,
  cancelCooldown,
  Inventory,
}) {
  const senderID = input.senderID;
  let userData = await money.getItem(senderID);
  let {
    inventory: ri,
    slotWins = 0,
    slotLooses = 0,
    winStreak = 0,
    slotLuck = false,
  } = userData;
  if (slotLuck) {
    cancelCooldown();
  }
  const inventory = new Inventory(ri);
  const top = `𝖲𝗅𝗈𝗍 𝖱𝖾𝗌𝗎𝗅𝗍 | •~•`;
  const bottom = `𝗬𝗼𝘂 𝘄𝗼𝗻: x
𝗬𝗼𝘂 𝗹𝗼𝘀𝘁: y`;
  let isBad = slotWins - slotLooses < 0;

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

  if (isNaN(betAmount) || betAmount <= 0) {
    cancelCooldown();
    return output.reply(
      `${icon}\n\nInvalid bet amount. Your current balance is ${formatTokens(
        infoT,
        infoT.amount
      )}.\n\n**Total ${isBad ? `Looses` : `Wins`}:** ${formatTokens(
        infoT,
        Math.abs(slotWins - slotLooses)
      )}`
    );
  }

  let hasPass = inventory.has(highRollPass.key);
  if (!hasPass && betAmount > global.Cassidy.highRoll) {
    cancelCooldown();
    return output.reply(
      `${icon}\n\nYou need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
    );
  }

  if (betAmount > infoT.amount * 0.75) {
    cancelCooldown();
    return output.reply(
      `${icon}\n\nYou cannot bet more than 75% of your balance.`
    );
  }

  if (betAmount > infoT.amount) {
    cancelCooldown();
    return output.reply(
      `${icon}\n\n⚠️ You do not have enough ${formatTokens(
        infoT,
        betAmount
      )}. You only had ${formatTokens(infoT, infoT.amount)}`
    );
  }

  let result;
  let same = 0;
  const multipliers = {
    0: 0,
    1: 2,
    2: 3,
  };
  do {
    result = [randArrValue(fruits), randArrValue(fruits), randArrValue(fruits)];

    for (let i = 0; i < result.length; i++) {
      const currFruit = result[i];
      const hasMatchingFruit = result
        .slice(i + 1)
        .some((fruit) => fruit === currFruit);
      if (hasMatchingFruit) {
        same++;
      }
    }
  } while (slotLuck && same === 0 && betAmount % 2 !== 0);

  const multiplier = multipliers[same];
  let isWinPass = false;
  if (same) {
    winStreak++;
    if (
      !inventory.has(highRollPass.key) &&
      inventory.has("cardBook") &&
      winStreak >= 7
    ) {
      inventory.addOne(highRollPass);
      inventory.deleteOne("cardBook");
      isWinPass = true;
    }
  } else if (winStreak > 0) {
    winStreak--;
  }

  const won = betAmount * multiplier;
  const lost = !same ? betAmount : 0;
  slotWins += Number(same ? won : 0);
  slotLooses += Number(same ? 0 : lost);
  isBad = slotWins - slotLooses < 0;

  output.reply(`${icon}

${top}

{ ${result.join(" , ")} }

${bottom
  .replace(/x/, formatTokens(infoT, won))
  .replace(/y/, formatTokens(infoT, lost))}

**Total ${isBad ? `Looses` : `Wins`}:** ${formatTokens(
    infoT,
    Math.abs(slotWins - slotLooses)
  )}
**Win Streak:** ${winStreak}${winStreak > 7 ? "" : "/7"}${
    isWinPass ? "\n🃏 You won a **HighRoll** pass!" : ""
  }`);

  await money.setItem(senderID, {
    ...updatedTokensInfo(infoT, infoT.amount + won - lost),
    slotWins,
    slotLooses,
    winStreak,
    inventory: Array.from(inventory),
  });
}

/*𝖲𝗅𝗈𝗍 𝖱𝖾𝗌𝗎𝗅𝗍 | •~•

{ 🍊 , 🍓 , 🍇 }

𝗬𝗼𝘂 𝘄𝗼𝗻: 0$
𝗬𝗼𝘂 𝗹𝗼𝘀𝘁: 5000$*/
