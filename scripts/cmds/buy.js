// @ts-check
import { UNIRedux, toTitleCase } from "../modules/unisym.js";
import { ShopClass } from "../plugins/shopV2.js";
import { Slicer } from "../plugins/utils-liane.js";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "buy",
  description: "Purchases a command.",
  author: "Jenica & Liane",
  version: "1.1.7",
  usage: "{prefix}buy <command>",
  category: "Shopping",
  role: 0,
  noPrefix: false,
  waitingTime: 0.01,
  icon: "🛒",
  isGame: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🛒 Buy Command",
  titleFont: "fancy",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} context
 * @returns
 */
export async function entry(context) {
  const { input, output, args, money, prefix } = context;
  if (isNaN(Number(args[0]))) {
    const { shopInv = {}, money: userMoney } = await money.getItem(
      input.senderID
    );
    const shop = new ShopClass(shopInv);

    /**
     *
     * @param {string} item
     * @param {number} price
     * @returns
     */
    async function buyReply(item, price) {
      return output.reply(
        `📦 Purchase Complete!\n${UNIRedux.arrow} Item: ${item}\n💰 Cost: $${price}\n✅ Added to shop inventory.`
      );
    }

    if (shopInv[args[0]]) {
      return output.reply(
        `⚠️ Purchase Failed!\n${UNIRedux.arrow} Item: ${args[0]}\n⛔ Status: Already owned.`
      );
    }

    const price = shop.getPrice(args[0]);

    if (price === null) {
      return output.reply(
        `❌ Purchase Failed!\n${UNIRedux.arrow} Item: ${args[0]}\n⛔ Status: Does not exist.`
      );
    }

    if (price <= 0) {
      return output.reply(
        `🎁 Free Item Acquired!\n${UNIRedux.arrow} Item: ${args[0]}\n✅ Added to shop inventory at no cost!`
      );
    }

    if (isNaN(price)) {
      return output.reply("Something went wrong...");
    }
    const canPurchase = shop.canPurchase(args[0], userMoney);
    if (!canPurchase) {
      return output.reply(
        `❌ Insufficient Funds!\n${UNIRedux.arrow} Item: "${args[0]}"\n💰 Cost: $${price}\n⛔ You don't have enough money to complete this purchase.`
      );
    }

    shop.purchase(args[0], userMoney);

    await money.setItem(input.senderID, {
      shopInv: shop.raw(),
      money: userMoney - price,
    });
    return buyReply(`"${args[0]}"`, price);
  } else {
    const { shopInv = {}, money: userMoney } = await money.getItem(
      input.senderID
    );
    const shop = new ShopClass(shopInv);

    const allItems = shop.getItems();
    const page = Slicer.parseNum(args[0]);
    const slicer = new Slicer([...allItems], 5);
    let result = `💡 Use **${prefix} ${context.commandName} <item name | page number>** to make a purchase or navigate between pages.\n${UNIRedux.arrow} Page ${page} of ${slicer.pagesLength}\n${UNIRedux.standardLine}\n`;

    const itemStr = slicer
      .getPage(page)
      .map(({ meta }) => {
        const itemStatus = shopInv[meta.name]
          ? "✅ Owned"
          : userMoney >= meta.shopPrice
          ? "💰 Affordable"
          : "❌ Too Expensive";

        return (
          `🔹 **${toTitleCase(meta.name)}** ${meta.icon || "📦"}\n` +
          `💲 Price: **${Number(meta.shopPrice).toLocaleString()}**$\n` +
          `📌 Status: ***${itemStatus}***\n` +
          `📖 ${meta.description}`
        );
      })
      .join(`\n${UNIRedux.standardLine}\n`);

    result += `${itemStr}`;

    const info = await output.reply(result.trimEnd());
    info.atReply(async ({ output }) => {
      await output.replyStyled("We do not support replies, thank you!", style);
    });
  }
}
