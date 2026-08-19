// @ts-check
const fruitIcons = ["🍒", "🍊", "🍋", "🍇", "🍓", "🍍"];

function getTopUsers(bankData, count) {
  const entries = Object.entries(bankData);

  return entries.sort((a, b) => b[1].bank - a[1].bank).slice(0, count);
}

function getTotalMoney(topUsers) {
  let totalMoney = 0;
  for (const [, data] of topUsers) {
    totalMoney += data.bank || 0;
  }
  return totalMoney;
}

function deductMoneyFromTopUsers(topUsers, amount) {
  const deductedUsers = [];
  for (const [userID, data] of topUsers) {
    if (amount <= 0) break;

    const deduction = Math.min(amount, data.bank);
    data.bank -= deduction;
    amount -= deduction;

    deductedUsers.push({
      userID,
      deduction,
    });
  }
  return deductedUsers;
}

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "nbank",
  version: "2.3.0",
  author: "Liane Cagara | JenicaDev",
  waitingTime: 5,
  description: "Liane's Bank",
  category: "Finance",
  noPrefix: false,
  otherNames: ["nb", "nicabank"],
  // botAdmin: true,
  cmdType: "arl_g",
  icon: "🏦",
  isGame: true,
};

export const style = {
  title: "🏦 Nica Bank™",
  titleFont: "fancy",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  args,
  output: message,
  event,
  money: usersData,
  api,
}) {
  return message.reply("Bruh it is deprecated, use a different bank");
  const { money: userMoney, name = "Chara" } = await usersData.getItem(
    event.senderID
  );
  async function loadAllBankData() {
    const allData = await usersData.getAllCache();
    const final = {};
    for (const [userID, data] of Object.entries(allData)) {
      const { bankData = { bank: 0, lastInterestClaimed: Date.now() } } = data;
      final[userID] = bankData;
    }
    return final;
  }
  const user = String(event.senderID);
  const bankData = await loadAllBankData();
  //const lianeBank = "💰 𝓛𝓲𝓪𝓷𝓮 𝓑𝓪𝓷𝓴 💼";
  const lianeBank = ``;
  const getUserInfo = async (_, userID) => {
    try {
      if (String(userID) !== user) {
        const { name = "Chara" } = await usersData.getItem(String(userID));
        return name;
      }
      return name;
    } catch (error) {
      console.error(error);
    }
  };

  let { senderID } = event;
  const userName = await getUserInfo(api, senderID);

  if (!bankData[user]) {
    bankData[user] = { bank: 0, lastInterestClaimed: Date.now() };
    await usersData.set(user, {
      bankData: bankData[user],
    });
  }
  const command = args[0];
  const amount = parseInt(args[1]);
  const recipientUID = String(args[2]);

  if (command === "richest") {
    let page = parseInt(args[1]);

    if (isNaN(page) || page <= 0) {
      page = 1;
    }

    const pageSize = 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const entries = Object.entries(bankData);
    const totalEntries = entries.length;

    const topTen = entries
      .sort((a, b) => b[1].bank - a[1].bank)
      .slice(start, end);

    const messageText = `𝓣𝓸𝓹 𝟙𝟘 𝓡𝓲𝓬𝓱𝓮𝓼𝓽 👑🤴🏻 \n\n${(
      await Promise.all(
        topTen.map(async ([userID, data], index) => {
          const userData = await usersData.getItem(userID);
          return `${index + start + 1}. ${userData.name ?? "Chara"}:\n Bal: $${
            data.bank
          }`;
        })
      )
    ).join("\n\n")}`;

    const totalPages = Math.ceil(totalEntries / pageSize);
    const currentPage = Math.min(page, totalPages);

    const nextPage = currentPage + 1;
    const nextPageMessage =
      nextPage <= totalPages
        ? `⦿ Type bank richest ${nextPage} to view the next page.\n`
        : "";
    const pageInfo = `page ${currentPage}/${totalPages}`;

    return message.reply(`${messageText}\n\n${nextPageMessage}${pageInfo}`);
  }

  if (command === "deposit") {
    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `✧ Hello ${userName}! Please enter the amount you wish to deposit in the bank.\n\nMore Options:\n⦿ Balance`
      );
    }
    if (userMoney < amount) {
      return message.reply(
        `✧ Hello ${userName}, The amount you wished is greater than your balance.\n\nMore Options:\n⦿ Balance`
      );
    }

    bankData[user].bank += amount;
    await usersData.set(event.senderID, {
      money: userMoney - amount,
      bankData: bankData[user],
    });

    return message.reply(
      `✧ Congratulations ${userName}! ${amount}💵 has been deposited into your bank account.\n\nMore Options:\n⦿ Balance\n⦿ Bank Balance\n⦿ Bank Interest\n⦿ Bank Transfer`
    );
  } else if (command === "withdraw") {
    const balance = bankData[user].bank || 0;

    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `✧ Hello ${userName}! Please enter the amount you wish to withdraw from the bank.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance\n⦿ Bank Interest`
      );
    }
    if (amount > balance) {
      return message.reply(
        `✧ Hello ${userName}, the amount you wished is greater than your bank balance.\n\nMore Options:\n⦿ Bank Balance`
      );
    }
    bankData[user].bank = balance - amount;
    await usersData.set(event.senderID, {
      money: userMoney + amount,
      bankData: bankData[user],
    });
    return message.reply(
      `✧ Congratulations ${userName}! ${amount}💵 has been succesfully withdrawn from your bank account. Use it wisely! \n\nMore Options:\n⦿ Balance\n⦿ Bank Balance`
    );
  } else if (command === "dice") {
    const userDice = Math.floor(Math.random() * 6) + 1;
    const cassidyBotDice = Math.floor(Math.random() * 6) + 1;

    const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    const userDiceEmoji = diceEmojis[userDice - 1];
    const cassidyBotDiceEmoji = diceEmojis[cassidyBotDice - 1];

    let outcomeMessage = `You got: ${userDiceEmoji}\nCassidy bot got: ${cassidyBotDiceEmoji}\n\n`;

    if (userDice > cassidyBotDice) {
      outcomeMessage += `Congratulations! You won $100 with a result of ${userDice}.`;
      bankData[user].bank += 100;
    } else if (userDice < cassidyBotDice) {
      outcomeMessage += `Cassidy bot won $100 with a result of ${cassidyBotDice}.`;
      bankData[user].bank -= 100;
    } else {
      outcomeMessage += `It's a tie! No money exchanged.`;
    }
    await usersData.set(event.senderID, {
      bankData: bankData[user],
    });

    return message.reply(`✧ Let's roll the dice!\n\n${outcomeMessage}`);
  } else if (command === "heist") {
    return message.reply(`🧪 This command is under maintenance.`);
    const lastHeistTime = bankData[user].lastHeistTime || 0;
    const cooldown = 5 * 60 * 1000;

    if (args[1] === "confirm") {
      if (Date.now() - lastHeistTime < cooldown) {
        const remainingTime = cooldown - (Date.now() - lastHeistTime);
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.ceil(
          (remainingTime % (60 * 60 * 1000)) / (60 * 1000)
        );

        return message.reply(
          `✧ Sorry ${userName}, you need to wait ${hours} hours and ${minutes} minutes before starting another heist.`
        );
      }

      const amountToSteal = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

      const successRate = Math.random();
      if (successRate < 0.3) {
        const loanAmount = (bankData[user].bank + amountToSteal) * 0.2;

        bankData[user].loan += loanAmount;
        await usersData.set(event.senderID, {
          money: userMoney - loanAmount,
          bankData: bankData[user],
        });
        return message.reply(
          `✧ Oops you got caught, ${userName}! Your bank heist was unsuccessful. You couldn't steal anything this time. However, 10% of the total heist amount has been added to your bank loan, ${loanAmount} has been deducted from your balance and bank balance`
        );
      }

      const topUsers = getTopUsers(bankData, 5);
      const totalMoneyToDeduct = Math.floor(
        Math.random() * (0.1 * getTotalMoney(topUsers))
      );
      const deductedUsers = deductMoneyFromTopUsers(
        topUsers,
        totalMoneyToDeduct
      );
      const winAmount = Math.floor(
        Math.random() * (0.1 * getTotalMoney(topUsers))
      );

      bankData[user].bank += amountToSteal;
      bankData[user].lastHeistTime = Date.now();

      let deductedUsersMessage = "Money deducted from the top 1-5 users:\n";
      for (const { userID, deduction } of deductedUsers) {
        const deductedUserName = await getUserInfo(api, userID);
        deductedUsersMessage += `${deductedUserName}: ${deduction}💵\n`;
      }
      await usersData.set(event.senderID, {
        money: userMoney + winAmount,
        bankData: bankData[user],
      });

      return message.reply(
        `✧ Congratulations, ${userName}! You successfully completed a bank heist and stole ${amountToSteal}💵. You also won ${winAmount}💵.\n\n${deductedUsersMessage}`
      );
    } else {
      return message.reply(
        `✧ Welcome, ${userName}! You are about to start a bank heist. Here's what you need to know:\n\n✧ If you win, you can steal a random amount between 1000 and 5000💵 from the bank, and you have a 35% chance of winning.\n\n✧ If you lose, 10% of the total heist amount will be added to your bank loan, regardless of the bank loan limit. There is a chance that you will lost all your cash and got negative cash! Proceed with caution. To confirm the heist, use the command "bank heist confirm".`
      );
    }
  } else if (command === "check") {
    const userIDToCheck = String(args[1]);

    if (!userIDToCheck) {
      return message.reply(
        `✧ Hello ${userName}! Please provide a valid user ID to check their bank balance.`
      );
    }

    if (bankData[userIDToCheck]) {
      const userBankBalance = bankData[userIDToCheck].bank || 0;
      const userDataToCheck = await usersData.getItem(userIDToCheck);
      const userNameToCheck = userDataToCheck.name;
      return message.reply(
        `✧ User: ${userNameToCheck}\n✧ Bank Balance: ${userBankBalance}💵`
      );
    } else {
      return message.reply(
        `✧ User with UID ${userIDToCheck} does not have a bank account.`
      );
    }
  } else if (command === "balance") {
    const balance =
      bankData[user].bank !== undefined && !isNaN(bankData[user].bank)
        ? bankData[user].bank
        : 0;

    return message.reply(
      `✧ Greetings ${userName}!, Your bank account balance is ${balance}💵\n\n⦿ To earn interest. Type bank interest.\n\n⦿ To loan, Type bank loan <amount>`
    );
  } else if (command === "bet") {
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply(
        `✧ Please enter a valid bet amount. You need to deposit a bank balance first to use your balance as the bet.`
      );
    }
    const bankBal = bankData[user].bank || 0;

    if (bankBal < betAmount) {
      return message.reply(
        `✧ You don't have enough bank balance for this bet. Try to withdraw your bank balance.`
      );
    }

    const slotResults = [];
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * fruitIcons.length);
      slotResults.push(fruitIcons[randomIndex]);
    }

    let winnings = 0;
    if (
      slotResults[0] === slotResults[1] &&
      slotResults[1] === slotResults[2]
    ) {
      winnings = betAmount * 3;
    } else if (
      slotResults[0] === slotResults[1] ||
      slotResults[1] === slotResults[2] ||
      slotResults[0] === slotResults[2]
    ) {
      winnings = betAmount * 2;
    }

    if (winnings > 0) {
      bankData[user].bank = bankBal + winnings;
      await usersData.set(event.senderID, {
        bankData: bankData[user],
      });
    } else {
      bankData[user].bank = bankBal - betAmount;
      await usersData.set(event.senderID, {
        bankData: bankData[user],
      });
    }

    const slotResultText = slotResults.join(" ");
    const outcomeMessage =
      winnings > 0
        ? `Congratulations! You won ${winnings}💵.`
        : `You lost ${betAmount}💵.`;
    const responseMessage = ` ${slotResultText}\n\n✧ ${outcomeMessage}`;

    return message.reply(responseMessage);
  } else if (command === "interest") {
    const interestRate = 0.0001;

    const lastInterestClaimed =
      bankData[user].lastInterestClaimed || Date.now();

    const currentTime = Date.now();

    const timeDiffInSeconds = (currentTime - lastInterestClaimed) / 1000;

    const interestEarned =
      bankData[user].bank * (interestRate / 365) * timeDiffInSeconds;

    bankData[user].lastInterestClaimed = currentTime;

    bankData[user].bank += interestEarned;
    await usersData.set(event.senderID, {
      bankData: bankData[user],
    });

    return message.reply(
      `✧ Congratulations ${userName}! You earned ${interestEarned.toFixed(
        2
      )}💵 of interest. It is successfully added into your bank balance.`
    );
  } else if (command === "transfer") {
    return message.reply(`🧪 This command is under maintenance.`);
    const balance = bankData[user].bank || 0;
    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `✧ Hello ${userName}! Please enter the amount and the recipient ID of the user.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance\n⦿ UID`
      );
    }
    if (balance < amount) {
      return message.reply(
        `✧ Sorry ${userName}, The amount you want to transfer is greater than your bank balance.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance`
      );
    }
    if (!recipientUID || recipientUID === "undefined") {
      return message.reply(
        `✧ Hello ${userName}, Please enter the correct recipient ID.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance\n⦿ UID`
      );
    }
    if (!bankData[recipientUID]) {
      bankData[recipientUID] = { bank: 0, lastInterestClaimed: Date.now() };
    }
    bankData[user].bank -= amount;
    bankData[recipientUID].bank += amount;
    await usersData.set(event.senderID, {
      bankData: bankData[user],
    });
    await usersData.set(String(recipientUID), {
      bankData: bankData[recipientUID],
    });
    return message.reply(
      `✧ Greetings ${userName}! The amount you wished has been successfully transfered!\n\n✧ Amount: ${amount}💵\n✧ Recipient ID: ${recipientUID}\n\n✧ Liane Bank ✅`
    );
  } else if (command === "loan") {
    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `✧ Hello ${userName}! Please enter the amount you wished to borrow.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance`
      );
    }
    if (bankData[user].loan > 0) {
      return message.reply(
        `✧ Sorry ${userName} but you already had existing loan.\n\nMore Options:\n⦿ Bank Payloan\n⦿ Bank Balance`
      );
    }
    if (amount > 1000000) {
      return message.reply(
        `✧ Sorry ${userName}, The maximum loan amount is 1000000.\n\nMore Options:\n⦿ Bank Payloan\n⦿ Bank Balance`
      );
    }
    bankData[user].loan = amount;
    bankData[user].loanDueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // due date after 1 week
    bankData[user].bank += amount;
    await usersData.set(event.senderID, {
      money: userMoney + amount,
      bankData: bankData[user],
    });
    return message.reply(
      `✧ Hello ${userName}, You have successfully borrowed ${amount}💵, The loan amount will be deducted from your bank account balance after 1 week .\n\nMore Options:\n⦿ Bank Payloan\n⦿ Bank Balance`
    );
  } else if (command === "payloan") {
    const loan = bankData[user].loan || 0;
    const loanDueDate = bankData[user].loanDueDate || 0;

    if (loan <= 0 || loanDueDate <= 0) {
      return message.reply(
        `✧ Sorry ${userName}, You do not have existing loan.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance`
      );
    }
    const daysLate = Math.ceil(
      (Date.now() - loanDueDate) / (24 * 60 * 60 * 1000)
    );
    const interestRate = 0.002; // 0.01% per day
    const interest = loan * interestRate * daysLate;
    const totalAmountDue = loan + interest;

    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `✧ Welcome back ${userName}! Please enter the amount you wished to pay. The total amount due is ${totalAmountDue}💵.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance`
      );
    }
    if (amount > userMoney) {
      return message.reply(
        `✧ Sorry ${userName}, You do not have enough money to pay the existing loan.\n\nMore Options:\n⦿ Bank Balance\n⦿ Balance`
      );
    }
    if (amount < totalAmountDue) {
      return message.reply(
        `✧ Sorry ${userName}, The amount you entered is less then the total amount due which is ${totalAmountDue}💵.\n\nMore Options:\n⦿ Bank Balance\n⦿ Bank Payloan`
      );
    }
    bankData[user].loan = 0;
    bankData[user].loanDueDate = 0;
    bankData[user].bank -= loan;
    await usersData.set(event.senderID, {
      money: userMoney - amount,
      bankData: bankData[user],
    });
    return message.reply(
      `✧ Congatulations ${userName}, You have paid your loan of ${loan}💵 plus interest of ${interest.toFixed(
        2
      )} $. The total amount paid is ${totalAmountDue}💵.\n\nMore Options:\n⦿ Bank Balance\n⦿ Bank Loan`
    );
  } else {
    return message.reply(
      `${lianeBank}\n✧ Hello ${userName}! Please use one of our services✧\n\n⦿ Bank Balance\n⦿ Bank Deposit\n⦿ Bank Withdraw\n⦿ Bank Interest\n⦿ Bank Transfer\n⦿ Bank Loan\n⦿ Bank Richest\n⦿ Bank Heist (new)\n⦿ Bank Bet (new)\n⦿ Bank Dice (new)\n⦿ Bank Check (new)`
    );
  }
}
