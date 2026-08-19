// @ts-check
import { ReduxCMDHome } from "@cassidy/redux-home";
import { stoData } from "../modules/stoData.js";
import { toTitleCase, UNIRedux } from "@cassidy/unispectra";
import { ShopClass } from "../plugins/shopV2.js";
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "tileshop",
  description: "Buy shop themes!",
  version: "1.2.0",
  author: "@lianecagara",
  usage: "{prefix}tileshop",
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
  title: "Tiles Shop 🟨⬜",
  titleFont: "bold",
  contentFont: "fancy",
};
global.stoData = stoData;

/**
 * @type {{ [key: string]: CommandEntry }}
 */
const entryConfig = {
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

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry(ctx) {
  // @ts-ignore
  return entryConfig.tiles(ctx);
}

/**
 *
 * @param {any} theme
 * @returns
 */
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
