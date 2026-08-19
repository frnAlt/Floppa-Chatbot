// @ts-check
import { parseBet } from "@cass-modules/ArielUtils";
import { secureRandom } from "../modules/unisym.js";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "roll",
  version: "2.0.4",
  description: "Roll dice against AI and test your luck!",
  author: "Jenica Ferrer",
  usage: "roll <bet> <times>",
  waitingTime: 10,
  permissions: [0, 1, 2],
  adminOnly: false,
  icon: "🎲",
  otherNames: ["dice"],
  category: "Gambling Games",
  cmdType: "arl_g",
  isGame: true,
};

export const style = {
  title: "🎲 Dice Roll",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function cooldown({ input, output, cooldown, money: botData }) {
  const data = await botData.getItem(input.senderID);
  const { diceWins } = data;

  if (cooldown) {
    return output.reply(
      `Please wait for ${cooldown} seconds before rolling again.
  Total Wins: ${diceWins ?? 0}`
    );
  }
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  input,
  output,
  money: botData,
  cancelCooldown,
  prefix,
  commandName,
}) {
  const times = parseInt(input.arguments[1]);
  const data = await botData.getItem(input.senderID);
  const bet = parseBet(input.arguments[0], data.money);
  const { money, diceWins } = data;

  if (input.isAdmin) {
    cancelCooldown();
  }

  if (isNaN(bet) || isNaN(times)) {
    return output.reply(
      `Minimum bet per dice is 20 coins. Please enter a valid bet as first argument.\nPlease enter a valid number of dice as second argument (1-30). The more dice, the more risk!\n\nTotal Wins: ${
        diceWins ?? 0
      }\n\nExample: ${prefix}${commandName} 10000 20`
    );
  }

  if (isNaN(times) || times < 1 || times > 10) {
    cancelCooldown();
    return output.reply(
      "Please enter a valid number of dice as second argument (1-10). The more dice, the more risk!"
    );
  }

  if (isNaN(bet) || bet < 20) {
    cancelCooldown();
    return output.reply(
      "Minimum bet per dice is 20 coins. Please enter a valid bet as first argument"
    );
  }

  if (money < bet * times) {
    cancelCooldown();
    return output.reply(
      `You don't have enough coins to bet ${bet * times} coins.`
    );
  }
  let winTexts = [];
  let totalWin = 0;
  let totalLoss = 0;
  const getDieNum = () => Math.floor(secureRandom() * 6) + 1;

  const devRoll = (aiRoll) => {
    // if (secureRandom() < 0.7) {
    //   return Math.floor(secureRandom() * (6 - aiRoll)) + aiRoll + 1;
    // }
    // return getDieNum();
    if (secureRandom() < 0.5) {
      return getDieNum();
    }
    return Math.floor(secureRandom() * aiRoll) + 1;
  };

  for (let i = 0; i < times; i++) {
    const aiRoll = Math.floor(secureRandom() * 6) + 1;
    const playerRoll = devRoll(aiRoll);

    let isWin = playerRoll > aiRoll;
    let isLoss = playerRoll < aiRoll;

    winTexts.push(
      `${getDiceSymbol(playerRoll)} ${
        isWin ? "✅" : isLoss ? "❌" : "🟰"
      } ${getDiceSymbol(aiRoll)} | ${
        isWin ? `+${bet}$` : isLoss ? `-${bet}$` : "-0"
      }`
    );

    if (isWin) {
      totalWin += bet;
    } else if (isLoss) {
      totalLoss += bet;
    }
  }

  const finalBalance = money + totalWin - totalLoss;
  await botData.set(input.senderID, {
    money: finalBalance,
    diceWins: (diceWins ?? 0) + (totalWin > 0 ? 1 : 0),
  });

  let resultMessage = `🎲 **Your Rolls** (left)\n🤖 **AI Rolls:** (right)\n\n${winTexts.join(
    "\n"
  )}\n\n`;

  if (totalWin > totalLoss) {
    resultMessage += `🎉 You won **${totalWin - totalLoss}** coins!`;
  } else if (totalLoss > totalWin) {
    resultMessage += `💸 You lost **${totalLoss - totalWin}** coins.`;
  } else {
    resultMessage += `😐 It's a draw! No net win/loss.`;
  }

  resultMessage += `\n💰 **New Balance:** ${finalBalance} coins.`;

  output.reply(resultMessage);
}

function getDiceSymbol(number) {
  const diceSymbols = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return diceSymbols[number - 1];
}
