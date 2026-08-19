// @ts-check
import { ReduxCMDHome } from "@cassidy/redux-home";
import { abbreviateNumber } from "@cassidy/unispectra";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "donate",
  description: "Donate your virtual money to charity",
  version: "1.1.0",
  usage: "{prefix}{name} <amount>",
  category: "Finance",
  author: "@lianecagara",
  role: 0,
  noPrefix: false,
  waitingTime: 0,
  icon: "🎁",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Donate • Charity 🎁",
  titleFont: "bold",
  contentFont: "redux",
};

function isValidAmount(amount) {
  return !isNaN(amount) && amount > 0 && amount <= Number.MAX_SAFE_INTEGER;
}

/**
 * @type {import("@cassidy/redux-home").Config[]}
 */
const configs = [
  {
    key: "send",
    description: "Donate money to charity",
    args: ["<amount>"],
    aliases: ["-s", "charity"],
    async handler({ money, input, output }) {
      const { arguments: args, senderID } = input;

      if (args.length < 1) {
        return output.reply(`❌ | Please specify the amount to donate..`);
      }

      const amountStr = args[0];
      const amount = parseInt(amountStr);

      if (!isValidAmount(amount)) {
        return output.reply(
          `❌ | Invalid amount specified. Please provide a positive number.`
        );
      }

      const senderMoney = await money.getItem(senderID);
      if (senderMoney.money < amount) {
        return output.reply(
          `❌ | Insufficient funds. You currently have $**${abbreviateNumber(
            senderMoney.money
          )}**💵.`
        );
      }

      const currentDonatedAmount = senderMoney.donatedAmount || 0;
      senderMoney.donatedAmount = currentDonatedAmount + amount;
      await money.set(senderID, {
        money: senderMoney.money - amount,
        donatedAmount: senderMoney.donatedAmount,
      });

      output.reply(
        `✅ | Thank you for donating $**${abbreviateNumber(
          amount
        )}**💵 to charity! Your total donated amount is now $**${abbreviateNumber(
          senderMoney.donatedAmount
        )}**💵.`
      );
    },
  },
];

const home = new ReduxCMDHome(
  {
    isHypen: true,
  },
  configs
);

/**
 * @param {CommandContext} ctx
 */
export async function entry(ctx) {
  return home.runInContext(ctx);
}
