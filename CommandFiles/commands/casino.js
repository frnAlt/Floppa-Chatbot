import { parseBet } from "@cass-modules/ArielUtils";

// @ts-check
export const style = {
  title: "Casino 🎲",
  titleFont: "bold", // Options: fancy, fancy_italic, bold, bold_italic, double_struck, typewriter, none
  contentFont: "fancy",
};

const fruits = ["🍒", "🍎", "🍓", "🍌", "🍊", "🍇", "🍐", "🍋"];

const { parseCurrency: pCy } = global.utils;

const gamesInfo = {
  Blackjack: "**🎴 Blackjack** - Try to beat the dealer without going over 21.",
  Roulette:
    "**🎡 Roulette** - Bet on where the ball will land on the spinning wheel.",
  Poker: "**🃏 Poker** - Build the best hand and outplay your opponents.",
  Craps:
    "**🎲 Craps** - Roll the dice and try your luck with this fast-paced game.",
  Baccarat:
    "**👑 Baccarat** - Bet on the player, banker, or a tie in this classic card game.",
  Slots: "**🎰 Slots** - Spin the reels and match symbols to win big.",
  Sibco:
    "**🎯 Sibco** - A strategic dice game, where high stakes meet high rewards.",
};

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "casino",
  description: "Play various casino games",
  author: "MrkimstersDEV & Liane Cagara",
  version: "1.0.0",
  usage: "{prefix}{name} {gamename} {betamount} {additional arguments}",
  category: "Gambling Games",
  role: 0,
  noPrefix: false,
  waitingTime: 15,
  otherNames: ["cas", "cs"],
  shopPrice: 100000,
  requirement: "3.0.0",
  icon: "🎲",
  requiredLevel: 3,
  cmdType: "arl_g",
  isGame: true,
};

const { randArrValue } = global.utils;

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  input,
  output,
  money,
  cancelCooldown = function () {},
  Inventory,
  cooldown,
  CassExpress,
}) {
  /*if (input.isAdmin) {
    cancelCooldown();
  }*/

  /**
   * @type {Array<string | number>}
   */
  let [inf, bet, ...additionalArgs] = input.arguments;
  const game = Object.keys(gamesInfo).find(
    (i) => String(i).toLowerCase() === String(inf).toLowerCase()
  );
  const senderID = input.senderID;
  let {
    money: playerMoney,
    casinoWins = 0,
    casinoLosses = 0,
    winStreak = 0,
    loseStreak = 0,
    inventory: rawInv,
    casinoLuck = false,
  } = await money.getItem(senderID);
  const { invLimit } = global.Cassidy;

  if (casinoLuck) cancelCooldown();
  let inventory = new Inventory(rawInv);

  if (!game || !gamesInfo[game] || cooldown) {
    cancelCooldown();
    return output.reply(
      `🎲 **Casino Menu** 🎰\n\n${
        !cooldown
          ? `Available Games:`
          : `⏰ Cooling down, please wait for **${cooldown}**s!`
      }\n\n` +
        Object.values(gamesInfo).join("\n\n") +
        `\n\n[font=typewriter]Use the command: {prefix}casino {gamename} {betamount}[:font=typewriter]\n\n$**${pCy(
          playerMoney
        )}** **${inventory.size()}/${invLimit}**`
    );
  }

  const gamesWithBets = [
    "Blackjack",
    "Roulette",
    "Poker",
    "Craps",
    "Baccarat",
    "Slots",
    "Sibco",
  ];
  if (gamesWithBets.includes(game)) {
    // if (bet === "all") bet = parseInt(String(playerMoney * 0.75));
    // else bet = parseInt(String(CassExpress.parseAbbr(String(bet))));
    bet = parseBet(bet, playerMoney);

    if (isNaN(bet) || bet <= 0 || bet > playerMoney) {
      cancelCooldown();
      return output.reply(
        `Invalid bet amount. Your current balance is **${pCy(playerMoney)}**$.`
      );
    }
  }

  let resultMessage = "";
  let netGain = 0;

  const outcomes = {
    Blackjack() {
      const playerTotal = Math.floor(Math.random() * 10) + 12;
      const dealerTotal = Math.floor(Math.random() * 10) + 12;
      const win =
        (playerTotal > dealerTotal && playerTotal <= 21) || dealerTotal > 21;
      netGain = win ? Number(bet) : -bet;
      resultMessage =
        `**🎴 Blackjack Result**\n` +
        `Player's Total: ${playerTotal} ${
          playerTotal > 21 ? "💥 (Busted)" : ""
        }\n` +
        `Dealer's Total: ${dealerTotal} ${
          dealerTotal > 21 ? "💥 (Busted)" : ""
        }\n` +
        `${win ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
    Roulette() {
      const winningNumber = Math.floor(Math.random() * 37);
      const playerBet = additionalArgs[0];
      const win =
        (playerBet === "number" &&
          winningNumber === parseInt(String(additionalArgs[1]))) ||
        (playerBet === "red" && winningNumber % 2 !== 0) ||
        (playerBet === "black" && winningNumber % 2 === 0) ||
        (!playerBet && winningNumber % 2 !== 0);
      const ballPosition = `🎱 ${winningNumber}`;
      netGain = win
        ? playerBet === "number"
          ? Number(bet) * 25
          : Math.round(+bet / 2.2)
        : -bet;
      resultMessage =
        `**🎡 Roulette Result**\n` +
        `Ball landed on: ${ballPosition} ${
          playerBet === "black"
            ? `(You win if the number is even)`
            : playerBet === "red"
            ? `(You win if the number is not even)`
            : ""
        }\n` +
        `${win ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(
          netGain
        )}$\n\n**Guide:** roulette [bet] [red|black]`;
    },
    Poker() {
      const handStrength = Math.random();
      const hand = !(handStrength < 0.6) ? "👑 Royal Flush" : "💩 High Card";
      const win = !(handStrength < 0.6);
      netGain = win ? +bet : -bet;
      resultMessage =
        `**🃏 Poker Result**\n` +
        `Your Hand: ${hand}\n` +
        `${win ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
    Craps() {
      const roll = Math.floor(Math.random() * 12) + 1;
      const point = Math.floor(Math.random() * 12) + 1;
      const win = roll === 7 || roll === point;
      netGain = win ? +bet * 3 : -bet;
      resultMessage =
        `**🎲 Craps Result**\n` +
        `Roll: ${roll}\n` +
        `Point: ${point}\n` +
        `${win ? "🎉 You won!" : "❌ Not equal, You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
    Baccarat() {
      const playerHand = Math.floor(Math.random() * 10);
      const bankerHand = Math.floor(Math.random() * 10);
      const win = playerHand > bankerHand;
      netGain = win ? +bet : -bet;
      resultMessage =
        `**👑 Baccarat Result**\n` +
        `Player Hand: ${playerHand}\n` +
        `Banker Hand: ${bankerHand}\n` +
        `${win ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
    Slots() {
      const reelSymbols = Array.from({ length: 3 }, () => randArrValue(fruits));
      const allMatch = new Set(reelSymbols).size === 1;
      const twoMatch = new Set(reelSymbols).size === 2;
      netGain = allMatch ? +bet * 3 : twoMatch ? +bet * 2 : -bet;
      resultMessage =
        `**🎰 Slots Result**\n` +
        `Reel Symbols: ${reelSymbols.join(" | ")}\n` +
        `${allMatch || twoMatch ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
    Sibco() {
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      const win = diceRoll > 3;
      netGain = win ? +bet : -bet;
      resultMessage =
        `**🎯 Sibco Result**\n` +
        `Dice Roll: ${diceRoll} ${win ? `>` : `<=`} 3\n` +
        `${win ? "🎉 You won!" : "❌ You lost!"}\n` +
        `**Net Gain/Loss:** ${pCy(netGain)}$`;
    },
  };

  if (gamesWithBets.includes(game)) {
    outcomes[game]();
    if (netGain > 0) {
      winStreak++;
      loseStreak = 0;
      casinoWins += bet;
    } else {
      winStreak = 0;
      loseStreak++;
      casinoLosses += bet;
    }

    playerMoney += netGain;
    await money.set(senderID, {
      money: playerMoney,
      casinoWins,
      casinoLosses,
      winStreak,
      loseStreak,
    });
    resultMessage += `\n\n$**${pCy(
      playerMoney
    )}** **${inventory.size()}/${invLimit}** (**${
      netGain >= 0 ? `+${pCy(netGain)}` : pCy(netGain)
    }**)`;

    return output.reply(resultMessage);
  }
}

export const cooldown = entry;
