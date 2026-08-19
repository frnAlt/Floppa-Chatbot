// @ts-check
import { parseBet } from "@cass-modules/ArielUtils";
import crypto from "crypto";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "lotto",
  description: "Test your luck with the lotto game!",
  version: "1.0.0",
  author: "@lianecagara",
  usage: "{prefix}lotto <...numbers>",
  category: "Gambling Games",
  permissions: [0],
  noPrefix: false,
  waitingTime: 24,
  requirement: "3.0.0",
  icon: "🔖",
  cmdType: "arl_g",
  isGame: true,
};
export const style = {
  title: "Lotto 🔖",
  contentFont: "fancy",
  titleFont: "bold",
};
function hasDuplicate(args) {
  for (let i = 0; i < args.length; i++) {
    for (let j = i + 1; j < args.length; j++) {
      if (args[i] === args[j]) {
        return true;
      }
    }
  }
  return false;
}

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry({ input, output, money, cancelCooldown }) {
  const lottoLen = 4;
  const rangeB = 75;
  const {
    money: userMoney,
    lastLottoWin,
    lottoLooses = 0,
  } = await money.getItem(input.senderID);

  checkLottoWin: {
    if (isNaN(lastLottoWin)) {
      break checkLottoWin;
    }

    const interval = Date.now() - lastLottoWin;
    const timeElapsed = interval / 1000;
    if (timeElapsed < 120 && !input.isAdmin) {
      cancelCooldown();
      return output.reply(
        `⏳ You have already won the lottery in the last hour. Please wait for ${Math.ceil(
          120 - timeElapsed
        )} seconds before trying again.`
      );
    }
  }
  const bet = parseBet(input.arguments.shift(), userMoney);
  const args = input.arguments
    .map(Number)
    .filter((num) => !isNaN(num) && num > 0 && num < rangeB + 1);

  if (args.length !== lottoLen) {
    output.reply(
      `Please provide a bet as first argument and exactly ${lottoLen} valid numbers between 1 and ${rangeB}.`
    );
    cancelCooldown();
    return;
  }
  if (isNaN(bet)) {
    return output.reply("❌ Invalid bet.");
  }
  if (bet > userMoney) {
    return output.reply(
      `❌ You do not have this enough money, you only have ${userMoney}$`
    );
  }
  if (hasDuplicate(args)) {
    output.reply(`❌ Duplicate numbers are not allowed.`);
    cancelCooldown();
    return;
  }

  function secureRandomInt(min, max) {
    const range = max - min + 1;

    const randomBytes = crypto.randomBytes(8);
    const randomInt = randomBytes.readUInt32BE(0) ^ randomBytes.readUInt32BE(4);

    const timeEntropy = Date.now() & 0xfffffff;
    return min + ((((randomInt ^ timeEntropy) % range) + range) % range);
  }

  const lottoNumbers = Array.from({ length: lottoLen }, () =>
    secureRandomInt(1, rangeB)
  ).map((i) => {
    if (args.includes(i) && Math.random() < 0.7) {
      return i + (Math.random() < 0.5 ? 1 : -1);
    } else {
      return i;
    }
  });

  const matchedNumbers = args.filter((num) => lottoNumbers.includes(num));
  let winnings = 0;

  let resultText;
  const isLoose = matchedNumbers.length === 0;
  if (isLoose) {
    resultText = `🥲 Sorry, you lost ${bet}$ because no matched numbers.. Better luck next time!`;
  } else {
    // winnings = 125000000 * 2 ** matchedNumbers.length;
    winnings = bet * 2 ** matchedNumbers.length;

    // each prize
    // = winnings >> matchedNumbers.length;
    resultText = `🎉 Congratulations! You won ${winnings}$.`;
  }

  const text = `**Lotto numbers**:
${lottoNumbers.join(", ")}\n**Your numbers**:
${args.join(", ")}\n\n${resultText}\n\n$**${Number(
    userMoney + (isLoose ? 0 : winnings)
  ).toLocaleString()}**${!isLoose ? ` **(+${winnings})**` : ""}`;
  output.reply(`${text}`);

  if (matchedNumbers.length > 0 && winnings) {
    await money.set(input.senderID, {
      money: userMoney + winnings,
      lastLottoWin: Date.now(),
    });
  } else {
    await money.set(input.senderID, {
      lottoLooses: lottoLooses + 1000,
    });
  }
}
