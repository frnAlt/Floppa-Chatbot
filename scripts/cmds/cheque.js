// @ts-check

import { parseBet } from "@cass-modules/ArielUtils";
import { ReduxCMDHome } from "@cassidy/redux-home";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "cheque",
  description: "Manage your cheques and cash them for money.",
  author: "@lianecagara",
  version: "1.0.8",
  usage: "{prefix}cheque <action> [amount]",
  category: "Finance",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "💰",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Cheque 💰",
  titleFont: "bold",
  contentFont: "fancy",
};

const { invLimit } = global.Cassidy;

const home = new ReduxCMDHome(
  {
    isHypen: true,
  },
  [
    {
      key: "create",
      aliases: ["-c"],
      args: ["<amount>"],
      description: "Create a cheque of the specified amount.",
      async handler({ input, output, money, args, Inventory }) {
        const userData = await money.getItem(input.senderID);
        let userInventory = new Inventory(userData.inventory);
        userData.shadowPower ??= 0;

        let [...actionArgs] = args;

        let amount = parseBet(actionArgs[0], userData.money);
        let shadowUsed = false;
        if (!userInventory.has("shadowCoin") && userData.shadowPower <= 0) {
          return output.reply(
            "❕ A **Shadow Coin** 🌑 is required to perform this task."
          );
        }
        if (userData.shadowPower <= 0) {
          shadowUsed = true;
          userInventory.deleteOne("shadowCoin");
          userData.shadowPower = 6;
        }

        if (isNaN(amount) || amount <= 0) {
          return output.reply(
            `❌ Invalid amount specified. Please provide a valid amount.`
          );
        }
        if (userData.inventory.length >= invLimit) {
          return output.reply(`❌ You're carrying too many items!`);
        }

        if (userData.money < amount) {
          return output.reply(
            `❌ You do not have enough money to create a cheque of $${amount}.`
          );
        }

        const chequeItem = {
          key: `cheque_${amount}`,
          icon: "💵",
          name: `Cheque of $${amount}`,

          flavorText: `A cheque worth $${amount} created by ${
            userData.name ?? "Unregistered"
          }. Cash it to add the amount to your balance.`,
          chequeAmount: Math.floor(amount * 1),
          sellPrice: Math.floor(amount * 0.75),
          type: "cheque",
        };

        userInventory.addOne(chequeItem);
        userData.money -= amount;
        userData.shadowPower -= 1;

        await money.setItem(input.senderID, {
          inventory: Array.from(userInventory),
          money: userData.money,
          shadowPower: userData.shadowPower,
        });

        return output.reply(
          `✅ Created a cheque worth $${amount}. Your new balance is $${
            userData.money
          }.

${
  shadowUsed
    ? `❕ Your **shadow coin** has been consumed! (only ${userInventory.getAmount(
        "shadowCoin"
      )} left) Leaving you ${userData.shadowPower}/6 remaining shadow power.`
    : `❕ Remaining Shadow Power: ${userData.shadowPower}/6`
}`
        );
      },
    },
    {
      key: "cash",
      args: ["<key | amount>"],
      aliases: ["-ca"],
      description:
        " Cash a cheque using the specified key and add it to your balance.",
      async handler({ input, output, money, args, Inventory }) {
        const userData = await money.getItem(input.senderID);
        let userInventory = new Inventory(userData.inventory);
        userData.shadowPower ??= 0;

        let [...actionArgs] = args;
        let chequeKey = actionArgs[0];
        if (!String(chequeKey).startsWith("cheque_")) {
          chequeKey = `cheque_${chequeKey}`;
        }
        const itemToCash = userInventory.getOne(chequeKey);

        if (
          !itemToCash ||
          !chequeKey.startsWith("cheque_") ||
          itemToCash?.type !== "cheque"
        ) {
          return output.reply(
            `❌ No valid cheque found with the specified key.`
          );
        }

        const chequeAmount = parseBet(Number(itemToCash.chequeAmount), 0);

        if (isNaN(chequeAmount) || chequeAmount <= 0) {
          return output.reply(`❌ The cheque amount is invalid.`);
        }

        userInventory.deleteOne(chequeKey);
        userData.money += chequeAmount;

        await money.set(input.senderID, {
          inventory: Array.from(userInventory),
          money: userData.money,
        });

        return output.reply(
          `✅ Cashed a cheque worth $${chequeAmount}. Your new balance is $${userData.money}.`
        );
      },
    },
  ]
);

export async function entry(ctx) {
  return home.runInContext(ctx);
}
