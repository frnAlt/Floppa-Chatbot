// @ts-check

import { ReduxCMDHome } from "@cassidy/redux-home";
import { stoData } from "../modules/stoData.js";
import { toTitleCase, UNIRedux } from "@cassidy/unispectra";
import { ShopClass } from "../plugins/shopV2.js";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "shop",
  description: "Buy anything!",
  version: "1.1.9",
  author: "@lianecagara",
  usage: "{prefix}shop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: [],
  requirement: "3.0.0",
  icon: "🛒",
  requiredLevel: 3,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Shop 🛒",
  titleFont: "bold",
  contentFont: "fancy",
};
global.stoData = stoData;

/**
 * @type {{ [key: string]: CommandEntry }}
 */
export const entryConfig = {
  async top({ output, money }) {
    const allData = await money.getAll();
    let usersCalc = {};
    let top = {};

    for (const userID in allData) {
      const uData = allData[userID];
      for (const key in stoData) {
        if (!usersCalc[key]) {
          usersCalc[key] = {};
        }
        const dataKey = stoData[key].key;
        if (!uData[dataKey]) {
          continue;
        }
        const storage = uData[dataKey];
        if (!usersCalc[key][userID]) {
          usersCalc[key][userID] = [];
        }
        usersCalc[key][userID].push(storage);
      }
    }

    for (const key in usersCalc) {
      const topUsers = Object.entries(usersCalc[key])
        .map(([userID, storages]) => ({
          userID,
          totalStorage: storages.reduce((acc, curr) => acc + curr, 0),
          topStorages: storages.sort((a, b) => b - a).slice(0, 3),
        }))
        .sort((a, b) => b.totalStorage - a.totalStorage)
        .slice(0, 20);

      top[key] = topUsers;
    }

    const allAccu = {};
    for (const key in top) {
      top[key].forEach((user) => {
        if (!allAccu[user.userID]) {
          allAccu[user.userID] = 0;
        }
        allAccu[user.userID] += user.totalStorage;
      });
    }

    const sortedAccu = Object.entries(allAccu)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    let result = ``;
    for (const [userID, accu] of sortedAccu) {
      const { name } = allData[userID];
      const topStorages = [];
      for (const key in top) {
        const user = top[key].find((u) => u.userID === userID);
        if (user) {
          topStorages.push({
            category: key,
            storages: user.topStorages,
            lv: (allData[userID][stoData[key]?.key + "_upgrades"] ?? 0) + 1,
          });
        }
      }

      result += `👑 **${name ?? "Unregistered"}**\n✦ Total Storage: ${accu}\n`;
      topStorages.forEach(({ category, storages, lv }) => {
        result += `✓ LV${lv} ***${category}*** - ${storages.join(", ")}\n`;
      });
      result += `\n`;
    }
    return output.reply(result);
  },
  async cmd(context) {
    const { input, output, args, money, prefix } = context;
    if (args[0] === "buy") {
      if (!args[1]) {
        return output.reply(
          "❌ Please enter the command name you want to buy."
        );
      }
      const {
        shopInv = {},
        money: userMoney,
        name,
      } = await money.getItem(input.senderID);
      const shop = new ShopClass(shopInv);
      if (!name) {
        return output.reply(
          "❌ Please register first using the identity-setname command."
        );
      }
      async function buyReply(item, price) {
        // await output.quickWaitReact(
        //   `⚠️ Buy "${
        //     args[1]
        //   }" for ${price}$?\n\n**Balance**\nBefore - ${userMoney}$\nAfter - ${
        //     userMoney - price
        //   }$`,
        //   {
        //     authorOnly: true,
        //     edit: "✅ Proceeding...",
        //   }
        // );

        return output.reply(`✅ Successfully purchased ${item} for ${price}$!`);
      }

      if (shopInv[args[1]]) {
        return buyReply("an already-purchased item", 0);
      }
      const price = shop.getPrice(args[1]);
      if (price === null) {
        return buyReply("a non-existent item", 0);
      }
      if (price <= 0) {
        return buyReply("a free item", 0);
      }
      if (isNaN(price)) {
        return output.reply("Something went wrong...");
      }
      const canPurchase = await shop.canPurchase(args[1], userMoney);
      if (!canPurchase) {
        return output.reply(
          `❌ You don't have enough money to buy "${args[1]}" for ${price}$.`
        );
      }

      await shop.purchase(args[1], userMoney);

      await money.set(input.senderID, {
        shopInv: shop.raw(),
        money: userMoney - price,
      });
      return buyReply(`"${args[1]}"`, price);
    } else {
      const { shopInv = {}, money: userMoney } = await money.getItem(
        input.senderID
      );
      const shop = new ShopClass(shopInv);
      const allItems = shop.getItems();
      let result = "";
      let i = 0;
      result += `🔍 Type ${prefix}**shop-cmd buy <item name>** to buy an item.\n\n`;

      for (const { meta } of allItems) {
        i++;
        result += `${i}. ${meta.icon || "📄"} **${toTitleCase(
          meta.name
        )}**\n- **${Number(meta.shopPrice).toLocaleString()}**$ ${
          shopInv[meta.name]
            ? " ✅"
            : userMoney >= meta.shopPrice
            ? " 💰"
            : " ❌"
        }\n${UNIRedux.charm} ${meta.description}\n\n`;
      }

      return output.reply(result.trimEnd());
    }
  },

  async storage({ input, output, args, money, prefix, Inventory }) {
    if (args[0] !== "buy") {
      let text = "";
      const userData = await money.getItem(input.senderID);
      if (!userData.name) {
        return output.reply(
          "❌ Please register first using the identity-setname command."
        );
      }
      const inventory = new Inventory(userData.inventory);
      let hasDiscount = inventory.has("silkRibbon");
      let multiplier = 1;
      if (hasDiscount) {
        multiplier = 0.75;
      }

      for (const name in stoData) {
        const val = stoData[name];
        const originalPrice =
          val.price * 2 ** (userData[`${val.key}_upgrades`] ?? 0);
        const LV = (userData[`${val.key}_upgrades`] ?? 0) + 1;
        const price = Math.floor(originalPrice * multiplier);
        const storage = userData[val.key]
          ? userData[val.key] * 2
          : "Unknown..?";
        text += `**${name}** - ${price}💷 ${
          hasDiscount ? `(${originalPrice}$) \n25% OFF! 🎀` : ""
        }${userData.battlePoints < price ? "❌" : "💰"}\n🗃️ LV${LV} Storage: ${
          isNaN(storage) ? storage : storage / 2
        }\n🗃️ LV${LV + 1} Storage: ${storage}\n\n`;
      }
      return output.reply(
        `${text}
Type ${prefix}**shop.storage buy <item name>** fo buy an upgrade.`
      );
    }
    if (!args[1]) {
      return output.reply(
        `❌ Please enter the command name that you want to upgrade in storage.`
      );
    }
    if (!stoData[args[1]]) {
      return output.reply(`❌ Storage data not found for "${args[1]}"`);
    }
    const data = stoData[args[1]];
    let {
      [data.key]: storage,
      battlePoints: userMoney = 0,
      [`${data.key}_upgrades`]: upgrades = 0,
      inventory,
      name,
    } = await money.getItem(input.senderID);
    inventory = new Inventory(inventory);
    let hasDiscount = inventory.has("silkRibbon");
    let multiplier = 1;
    if (hasDiscount) {
      multiplier = 0.75;
    }
    if (!name) {
      return output.reply(
        "❌ Please register first using the identity-setname command."
      );
    }

    if (isNaN(storage)) {
      return output.reply(
        `❌ You don't have any "${data.key}" in the database.`
      );
    }
    let price = Math.floor(data.price * 2 ** upgrades * multiplier);
    if (userMoney < price) {
      return output.reply(
        `❌ The price of "${args[1]}" **storage** upgrade is ${price}💷 but you only have ${userMoney}💷.`
      );
    }
    await output.quickWaitReact(
      `⚠️ Buy "${
        args[1]
      }" storage upgrade for ${price}💷?\n**Old Storage**: ${storage} 🗃️\n**New Storage**: ${
        storage * 2
      } 🗃️\n\n**Battle Points**\nBefore - ${userMoney}💷\nAfter - ${
        userMoney - price
      }💷`,
      {
        authorOnly: true,
        edit: "✅ Proceeding...",
      }
    );
    await money.set(input.senderID, {
      [`${data.key}_upgrades`]: upgrades + 1,
      battlePoints: userMoney - price,
      [data.key]: storage * 2,
    });
    await output.reply(
      `✅ Successfully purchased "${args[1]}"${
        hasDiscount ? "25% OFF! 🎀" : ""
      } storage upgrade for ${price}💷!\n\n**Old Storage**: ${storage} 🗃️\n**New Storage**: ${
        storage * 2
      } 🗃️\n**New Battle Points**: ${userMoney - price}💷 (-${price})`
    );
  },
  async tiles({ input, output, args, money, prefix }) {
    const userData = await money.getItem(input.senderID);
    /**
     * @type {UserData}
     */
    const { tilesKeys = [], money: userMoney } = userData;
    const targetKey = args[1];

    if (args[0] === "buy") {
      if (!targetKey) {
        return output.reply(
          `❌ Please specify a theme **key** as argument, not a name.`
        );
      }
      const item = tilesThemes.find(
        (i) =>
          i.key === targetKey ||
          String(i.key).toLowerCase() === String(targetKey).toLowerCase()
      );
      if (!item) {
        return output.reply(`❌ Theme not found for **${targetKey}**`);
      }

      if (isNaN(item.price)) {
        return output.wentWrong();
      }
      if (userMoney < item.price) {
        return output.reply(
          `❌ The price of **${
            item.name
          }** is $${item.price.toLocaleString()}💵, and your balance is just $${userMoney.toLocaleString()}💵.`
        );
      }
      if (item.price < 1) {
        return output.wentWrong();
      }
      tilesKeys.push(item.key);
      await money.set(input.senderID, {
        money: userMoney - item.price,
        tilesKeys,
      });

      await output.reply(
        `✅ Successfully purchased!\n\n**${item.name}** (${
          item.key
        })\n${mapThemeIcons(item)}\n\n🎀 Type ${prefix}**shop-tiles apply ${
          item.key
        }** to apply.`
      );
      return;
    }

    if (args[0] === "apply") {
      if (!targetKey) {
        return output.reply(
          `❌ Please specify a theme **key** as argument, not a name.`
        );
      }
      if (!["default", ...tilesKeys].includes(targetKey)) {
        return output.reply(
          `❌ Theme not found. Ensure you have purchased this theme or that the theme key exists.`
        );
      }

      const item = tilesThemes.find(
        (i) =>
          i.key === targetKey ||
          String(i.key).toLowerCase() === String(targetKey).toLowerCase()
      );
      if (!item) {
        return output.reply(`❌ Theme not found for **${targetKey}**`);
      }

      const { tileConfig } = item;
      if (!tileConfig) {
        return output.wentWrong();
      }
      await money.set(input.senderID, {
        tileConfig,
      });
      await output.reply(
        `✅ Successfully applied!\n\n**${item.name}** (${
          item.key
        })\n${mapThemeIcons(
          item
        )}\n\n🎀 Type ${prefix}**shop-tiles apply <key>** to apply other themes.`
      );
      return;
    }

    if (true) {
      let result = ``;
      let i = 0;
      result += `🔍 Type ${prefix}**shop-tiles buy <key>** to buy a theme.\n\n`;
      for (const value of tilesThemes) {
        i++;
        result += `${i}. **${value.name}**\n- **${Number(
          value.price
        ).toLocaleString()}**$ ${
          tilesKeys.includes(value.key)
            ? " ✅"
            : userMoney >= value.price
            ? " 💰"
            : " ❌"
        }\n***Key***: ${value.key}\n***Preview***: ${mapThemeIcons(value)}\n${
          UNIRedux.charm
        } ${value.description}\n\n`;
      }
      return output.reply(result);
    }
  },
};

const home = new ReduxCMDHome({
  entryConfig,
  isHypen: true,
  entryInfo: {
    cmd: {
      key: "command",
      description: "Buy or unlock commands using your balance.",
      args: ["buy <item_name | no argument: lists items>"],
      aliases: ["-c", "cmd"],
    },
    storage: {
      key: "storage",
      description:
        "Upgrade your storage for games like Harvest or Mine using your battle points.",
      args: ["buy <item_name | no argument: lists items>"],
      aliases: ["-s", "sto"],
    },
    top: {
      key: "top",
      description: "View the highest upgraded storage.",
      aliases: ["-t"],
    },
    tiles: {
      key: "tiles",
      description: "Buy or apply a tiles theme.",
      aliases: ["-ti"],
    },
  },
});

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry(ctx) {
  // home.runInContext(ctx);
  return ctx.output.reply(
    `✨ We were moving away!\n\n${ctx.prefix}**buy** - unlock a command.\n${ctx.prefix}**tileshop** - Buy tiles themes!`
  );
}

function mapThemeIcons(theme) {
  return Object.values(theme.tileConfig).join("");
}

const tilesThemes = [
  {
    name: "Default",
    default: true,
    price: 0,
    key: "default",
    description: "The default look and feel.",
    tileConfig: {
      bombIcon: "💣",
      coinIcon: "💰",
      tileIcon: "🟨",
      emptyIcon: "⬜",
    },
  },
  {
    name: "Treasure Hunt",
    key: "treasureHunt",
    price: 30000,
    description:
      "A pirate-inspired theme full of hidden treasures and gold, ideal for adventurers.",
    tileConfig: {
      bombIcon: "☠️",
      coinIcon: "🏴‍☠️",
      tileIcon: "🏝️",
      emptyIcon: "🎁",
    },
  },
  {
    name: "Cyberpunk City",
    key: "cyberpunkCity",
    price: 80000,
    description:
      "A futuristic, neon-lit theme set in a dystopian city with cyberpunk vibes.",
    tileConfig: {
      bombIcon: "🔫",
      coinIcon: "💎",
      tileIcon: "🟩",
      emptyIcon: "💡",
    },
  },
  {
    name: "Mystic Forest",
    key: "mysticForest",
    price: 40000,
    description:
      "A mysterious theme with enchanting forests, hidden magic, and mythical creatures.",
    tileConfig: {
      bombIcon: "🦇",
      coinIcon: "🍄",
      tileIcon: "🌳",
      emptyIcon: "✨",
    },
  },
  {
    name: "Space Odyssey",
    key: "spaceOdyssey",
    price: 120000,
    description:
      "A space-themed adventure set in a galaxy far, far away, with planets and stars scattered around.",
    tileConfig: {
      bombIcon: "🌌",
      coinIcon: "🪐",
      tileIcon: "🌠",
      emptyIcon: "🚀",
    },
  },
  {
    name: "Haunted Mansion",
    key: "hauntedMansion",
    price: 70000,
    description:
      "A spooky theme filled with ghosts, cobwebs, and eerie vibes for those who love a thrill.",
    tileConfig: {
      bombIcon: "👻",
      coinIcon: "🕯️",
      tileIcon: "🏰",
      emptyIcon: "💀",
    },
  },
  {
    name: "Underwater World",
    key: "underwaterWorld",
    price: 60000,
    description:
      "A deep-sea theme full of marine life, shipwrecks, and underwater treasure.",
    tileConfig: {
      bombIcon: "🐙",
      coinIcon: "⚓",
      tileIcon: "🦑",
      emptyIcon: "🐚",
    },
  },
  {
    name: "Wild West",
    key: "wildWest",
    price: 35000,
    description:
      "A western theme with cowboys, desert landscapes, and wild frontier action.",
    tileConfig: {
      bombIcon: "🤠",
      coinIcon: "🏜️",
      tileIcon: "🏜️",
      emptyIcon: "🌵",
    },
  },
  {
    name: "Neon Dream",
    key: "neonDream",
    price: 100000,
    description:
      "A vibrant neon-lit dreamland filled with lights and colors for a futuristic, fantasy feel.",
    tileConfig: {
      bombIcon: "💥",
      coinIcon: "🔮",
      tileIcon: "🟦",
      emptyIcon: "🌟",
    },
  },
  {
    name: "Ancient Ruins",
    key: "ancientRuins",
    price: 45000,
    description:
      "A theme inspired by forgotten civilizations, ancient temples, and mystical artifacts.",
    tileConfig: {
      bombIcon: "⚒️",
      coinIcon: "🗿",
      tileIcon: "🏺",
      emptyIcon: "🔮",
    },
  },
  {
    name: "Steampunk Adventure",
    key: "streampunkAdventure",
    price: 55000,
    description:
      "A theme set in a world where steam power reigns, with gears, clocks, and Victorian-era machinery.",
    tileConfig: {
      bombIcon: "🔩",
      coinIcon: "⚙️",
      tileIcon: "🛠️",
      emptyIcon: "🕰️",
    },
  },
  {
    name: "Arctic Expedition",
    key: "arcticExpedition",
    price: 65000,
    description:
      "A cold, snow-covered theme with polar ice caps, glaciers, and the thrill of exploring the arctic.",
    tileConfig: {
      bombIcon: "❄️",
      coinIcon: "🏔️",
      tileIcon: "🧊",
      emptyIcon: "🌨️",
    },
  },
  {
    name: "Jungle Safari",
    key: "jungleSafari",
    price: 70000,
    description:
      "A theme set in a dense jungle with exotic wildlife and untamed nature awaiting explorers.",
    tileConfig: {
      bombIcon: "🐍",
      coinIcon: "🍃",
      tileIcon: "🌿",
      emptyIcon: "🌳",
    },
  },
  {
    name: "Medieval Kingdom",
    key: "medievalKingdom",
    price: 90000,
    description:
      "A theme inspired by castles, knights, and dragons, perfect for fans of the medieval era.",
    tileConfig: {
      bombIcon: "🛡️",
      coinIcon: "👑",
      tileIcon: "🏰",
      emptyIcon: "⚔️",
    },
  },
  {
    name: "Futuristic Metropolis",
    key: "futuristicMetropolis",
    price: 100000,
    description:
      "A highly advanced city full of towering skyscrapers, flying cars, and advanced technology.",
    tileConfig: {
      bombIcon: "🔮",
      coinIcon: "💳",
      tileIcon: "🏙️",
      emptyIcon: "🛰️",
    },
  },
  {
    name: "Wild Jungle",
    key: "wildJungle",
    price: 55000,
    description:
      "A theme based on untamed wilderness, dense forests, and the beauty of nature's raw power.",
    tileConfig: {
      bombIcon: "🐆",
      coinIcon: "🍌",
      tileIcon: "🌳",
      emptyIcon: "🦁",
    },
  },
];
