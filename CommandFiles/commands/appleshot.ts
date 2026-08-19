import { formatCash, parseBet } from "@cass-modules/ArielUtils";

const command = defineCommand({
  meta: {
    name: "appleshot",
    otherNames: ["shootapple"],
    version: "1.0.0",
    author: "Francis Loyd Raval",
    description:
      "Take aim and shoot an arrow at an apple! Hit it to double or triple your bet, or miss and pay a random user your bet as compensation!",
    category: "Gambling Games",
    usage: "appleshot <bet> | appleshot cooldown",
    icon: "🏹",
    isGame: true,
  },
  style: {
    title: {
      text_font: "bold",
      content: "〘 🍎🏹 〙 APPLE SHOT",
      line_bottom: "default",
    },
    footer: {
      content: "**Developed by**: Francis Loyd Raval",
      text_font: "fancy",
    },
    titleFont: "bold",
    contentFont: "fancy",
  },
  async entry(ctx) {
    const { output, input, usersDB, args } = ctx;
    const userID = input.sid;
    const subcommand = (args[0] || "").toLowerCase();

    if (subcommand === "cooldown") {
      const userData = await usersDB.getItem(userID);
      if (!userData || !userData.name) {
        return await output.reply(
          "You need to register first! Use: changename <username>"
        );
      }
      const { appleWins = 0, appleCooldown = 0 } = userData;
      const timeNow = Date.now();
      const timeLeft = Math.max(0, Math.ceil((appleCooldown - timeNow) / 1000));

      if (timeLeft > 0) {
        return await output.reply(
          `Please wait for ${timeLeft} seconds before shooting again.\nTotal Wins: ${appleWins}`
        );
      }
      return await output.reply(
        `You can shoot now! Use: appleshot <bet>\nTotal Wins: ${appleWins}`
      );
    }

    const userData = await usersDB.getItem(userID);
    const bet = parseBet(args[0], userData.money);

    if (!userData || !userData.name) {
      return await output.reply(
        "You need to register first! Use: changename <username>"
      );
    }

    const { money = 0, appleWins = 0, appleCooldown = 0 } = userData;
    const cooldownTime = 10 * 1000;
    const timeNow = Date.now();
    const timeLeft = Math.max(0, appleCooldown - timeNow);

    if (timeLeft > 0 && !input.isAdmin) {
      return await output.reply(
        `Please wait for ${Math.ceil(
          timeLeft / 1000
        )} seconds before shooting again.\nTotal Wins: ${appleWins}`
      );
    }

    if (isNaN(bet) || bet < 20) {
      return await output.reply(
        `Minimum bet is 20 coins. Please enter a valid bet.\n\nTotal Wins: ${appleWins}\n\nExample: appleshot 100`
      );
    }

    if (money < bet) {
      return await output.reply(
        `You don't have enough coins to bet ${bet} coins. Current balance: ${formatCash(
          money,
          true
        )}.`
      );
    }

    const hitChance = 0.3;
    const isHit = Math.random() < hitChance;
    let resultMessage: string[] = [];
    let finalBalance = money;
    let newAppleWins = appleWins;

    if (isHit) {
      const multiplier = Math.random() < 0.9 ? 2 : 3;
      const winnings = bet * multiplier;
      finalBalance += winnings;
      newAppleWins += 1;
      resultMessage = [
        `🎯 **Bullseye!** You hit the apple!`,
        `🍎 You won **${winnings.toLocaleString(
          "en-US"
        )}** coins (${multiplier}x your bet)!`,
      ];
    } else {
      const allUsers = await usersDB.queryItemAll(
        { "value.name": { $exists: true } },
        "name",
        "userID",
        "money"
      );
      const userKeys = Object.keys(allUsers).filter(
        (key) => key !== userID && allUsers[key].name
      );
      if (userKeys.length === 0) {
        resultMessage = [
          `🏹 **Ouchh...** You missed the apple, but there's no one else to hit!`,
          `💸 Your bet of ${formatCash(bet, true)} coins is safe.`,
        ];
      } else {
        const paid = Math.floor(bet / 2);
        const randomUserID =
          userKeys[Math.floor(Math.random() * userKeys.length)];
        const randomUser = allUsers[randomUserID];
        finalBalance -= bet;

        await usersDB.setItem(randomUserID, {
          ...randomUser,
          balance: (randomUser.money || 0) + paid,
        });

        resultMessage = [
          `🏹 **Ouchh...** You've made a wrong target fam!!!`,
          `🍑 The arrow hit **${randomUser.name}**'s a__!`,
          `💸 You paid one half of ${formatCash(bet, true)} coins to **${
            randomUser.name
          }** as compensation, but you've lost the other half.`,
        ];
      }
    }

    await usersDB.setItem(userID, {
      ...userData,
      balance: finalBalance,
      appleWins: newAppleWins,
      appleCooldown: timeNow + cooldownTime,
    });

    resultMessage.push(
      `💰 **New Balance**: ${formatCash(finalBalance)} coins.`,
      `🎯 **Total Wins**: ${newAppleWins}`
    );

    await output.reply(resultMessage.join("\n"));
  },
});

export default command;
