// NOTE: CassidySpectra, CommandContext and UserData were global types/namespaces, DO NOT REDECLARE!

import { UNIRedux } from "@cassidy/unispectra";
import { SpectralCMDHome } from "@cassidy/spectral-home";
import { Inventory, Collectibles } from "@cass-modules/InventoryEnhanced";
import { GearsManage } from "../plugins/pet-fight";
import { FontSystem } from "cassidy-styler";
import { OutputResult } from "@cass-plugins/output";

export const meta: CommandMeta = {
  name: "upgrader",
  description: "Upgrade your armor or weapon to higher ranks!",
  version: "1.0.5",
  author: "MrkimstersDev (Original), Liane Cagara",
  category: "Inventory",
  role: 0,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "⚒️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style: CommandStyle = {
  title: "Gear Upgrader ⚒️",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};

export async function entry({
  input,
  output,
  money,
  args,
  prefix,
  ctx,
  globalDB,
}: CommandContext): Promise<OutputResult> {
  const userData = await money.getCache(input.senderID);
  const { inventory, gearsData, collectibles } = getDatas(userData);

  function getDatas(data: UserData) {
    const inventory = new Inventory(data.inventory || []);
    const gearsData = new GearsManage(data.gearsData || []);
    const collectibles = new Collectibles(data.collectibles || []);
    return { inventory, gearsData, collectibles };
  }

  const ranks = [
    {
      name: FontSystem.applyFonts("NOVICE", "double_struck"),
      keySuffix: "NOVICE",
      statMultiplier: 1.1,
      copiesRequired: 2,
      cost: {
        battlePoints: 5000,
        stellarGems: 20,
        intertwinedFate: 10,
        dailyGems: 10,
        money: 50000,
      },
    },
    {
      name: FontSystem.applyFonts("STARLIT", "double_struck"),
      keySuffix: "STARLIT",
      statMultiplier: 1.15,
      copiesRequired: 2,
      cost: {
        battlePoints: 7500,
        stellarGems: 30,
        intertwinedFate: 15,
        dailyGems: 15,
        money: 75000,
      },
    },
    {
      name: FontSystem.applyFonts("LUNAR", "double_struck"),
      keySuffix: "LUNAR",
      statMultiplier: 1.2,
      copiesRequired: 3,
      cost: {
        battlePoints: 10000,
        stellarGems: 40,
        intertwinedFate: 20,
        dailyGems: 20,
        money: 100000,
      },
    },
    {
      name: FontSystem.applyFonts("SOLAR", "double_struck"),
      keySuffix: "SOLAR",
      statMultiplier: 1.25,
      copiesRequired: 3,
      cost: {
        battlePoints: 12500,
        stellarGems: 50,
        intertwinedFate: 25,
        dailyGems: 25,
        money: 125000,
      },
    },
    {
      name: FontSystem.applyFonts("ASTRAL", "double_struck"),
      keySuffix: "ASTRAL",
      statMultiplier: 1.2, // Matches original
      copiesRequired: 4,
      cost: {
        battlePoints: 15000,
        stellarGems: 60,
        intertwinedFate: 40,
        dailyGems: 32,
        money: 150000,
      },
    },
    {
      name: FontSystem.applyFonts("CRYSTAL", "double_struck"),
      keySuffix: "CRYSTAL",
      statMultiplier: 1.5, // Matches original
      copiesRequired: 5,
      cost: {
        battlePoints: 25000,
        stellarGems: 100,
        intertwinedFate: 60,
        dailyGems: 50,
        money: 250000,
      },
    },
    {
      name: FontSystem.applyFonts("NEBULA", "double_struck"),
      keySuffix: "NEBULA",
      statMultiplier: 2.0, // Matches original
      copiesRequired: 6,
      cost: {
        battlePoints: 40000,
        stellarGems: 160,
        intertwinedFate: 100,
        dailyGems: 80,
        money: 400000,
      },
    },
    {
      name: FontSystem.applyFonts("GALAXY", "double_struck"),
      keySuffix: "GALAXY",
      statMultiplier: 2.5, // Matches original
      copiesRequired: 7,
      cost: {
        battlePoints: 60000,
        stellarGems: 240,
        intertwinedFate: 150,
        dailyGems: 120,
        money: 600000,
      },
    },
    {
      name: FontSystem.applyFonts("STARDUST", "double_struck"),
      keySuffix: "STARDUST",
      statMultiplier: 3.0, // Matches original
      copiesRequired: 8,
      cost: {
        battlePoints: 100000,
        stellarGems: 400,
        intertwinedFate: 250,
        dailyGems: 200,
        money: 1000000,
      },
    },
    {
      name: FontSystem.applyFonts("ETERNAL", "double_struck"),
      keySuffix: "ETERNAL",
      statMultiplier: 4.0, // Matches original
      copiesRequired: 9,
      cost: {
        battlePoints: 150000,
        stellarGems: 600,
        intertwinedFate: 400,
        dailyGems: 300,
        money: 1500000,
      },
    },
    {
      name: FontSystem.applyFonts("VOID", "double_struck"),
      keySuffix: "VOID",
      statMultiplier: 4.2,
      copiesRequired: 10,
      cost: {
        battlePoints: 200000,
        stellarGems: 800,
        intertwinedFate: 450,
        dailyGems: 350,
        money: 2000000,
      },
    },
    {
      name: FontSystem.applyFonts("COSMIC", "double_struck"),
      keySuffix: "COSMIC",
      statMultiplier: 4.5,
      copiesRequired: 11,
      cost: {
        battlePoints: 250000,
        stellarGems: 1000,
        intertwinedFate: 500,
        dailyGems: 400,
        money: 2500000,
      },
    },
    {
      name: FontSystem.applyFonts("INFINITE", "double_struck"),
      keySuffix: "INFINITE",
      statMultiplier: 4.8,
      copiesRequired: 12,
      cost: {
        battlePoints: 300000,
        stellarGems: 1200,
        intertwinedFate: 550,
        dailyGems: 450,
        money: 3000000,
      },
    },
    {
      name: FontSystem.applyFonts("DIVINE", "double_struck"),
      keySuffix: "DIVINE",
      statMultiplier: 5.0,
      copiesRequired: 13,
      cost: {
        battlePoints: 350000,
        stellarGems: 1400,
        intertwinedFate: 600,
        dailyGems: 500,
        money: 3500000,
      },
    },
    {
      name: FontSystem.applyFonts("AWAKENED", "double_struck"),
      keySuffix: "AWAKENED",
      statMultiplier: 5.5,
      copiesRequired: 15,
      cost: {
        battlePoints: 400000,
        stellarGems: 1600,
        intertwinedFate: 700,
        dailyGems: 600,
        money: 4000000,
      },
    },
  ];

  const isUpgraderEnabled =
    (await globalDB.getCache("global_settings"))?.upgraderEnabled ?? false;
  if (!isUpgraderEnabled && !input.isAdmin) {
    return output.reply(
      "❌ The upgrader is currently disabled. Please contact an admin."
    );
  }

  const action =
    args[0]?.toLowerCase() === "u" ? "upgrade" : args[0]?.toLowerCase();
  const itemKey = action === "upgrade" ? args[1]?.trim() : null;

  collectibles.register("stellarGems", {
    key: "stellarGems",
    name: "Stellar Gems",
    flavorText: "Shimmering gems from the cosmos.",
    icon: "💎",
    type: "currency",
  });
  collectibles.register("intertwinedFate", {
    key: "intertwinedFate",
    name: "Intertwined Fate",
    flavorText: "The threads that bind destinies together.",
    icon: "🔮",
    type: "currency",
  });
  collectibles.register("gems", {
    key: "gems",
    name: "Daily Gems",
    flavorText: "Gems collected daily.",
    icon: "💎",
    type: "currency",
  });

  const configs = [
    {
      key: "upgrade",
      description: "Upgrades an armor or weapon to the next rank.",
      aliases: ["u", "-u"],
      args: ["<item_key>"],
      category: "UPGRADE",
      async handler() {
        if (!itemKey) {
          return output.reply(
            "❌ Please specify an item key to upgrade (e.g., +upgrader-u hakurousTanto)."
          );
        }

        const item = inventory.getOne(itemKey);
        if (!item || (item.type !== "armor" && item.type !== "weapon")) {
          return output.reply(
            `❌ Item "${itemKey}" is not a valid armor or weapon.`
          );
        }

        const currentRankIndex = ranks.findIndex((rank) =>
          item.name.includes(rank.name)
        );
        const nextRankIndex =
          currentRankIndex === -1 ? 0 : currentRankIndex + 1;

        if (nextRankIndex >= ranks.length) {
          return output.reply(
            `❌ ${item.icon} **${item.name}** is already at the maximum rank!`
          );
        }

        const nextRank = ranks[nextRankIndex];
        const cost = nextRank.cost;
        const copiesRequired = nextRank.copiesRequired;

        const itemCopies = inventory
          .getAll()
          .filter((i) => i.key === itemKey).length;
        if (itemCopies < copiesRequired) {
          const nextName =
            currentRankIndex === -1
              ? `${item.name} ${nextRank.name}`
              : item.name.replace(ranks[currentRankIndex].name, nextRank.name);
          return output.reply(
            `❌ You don't have enough copies of **${item.name}** to upgrade to **${nextName}**. ` +
              `Required: ${copiesRequired} copies (You have: ${itemCopies}).`
          );
        }

        if (
          (userData.battlePoints || 0) < cost.battlePoints ||
          !collectibles.hasAmount("stellarGems", cost.stellarGems) ||
          !collectibles.hasAmount("intertwinedFate", cost.intertwinedFate) ||
          !collectibles.hasAmount("gems", cost.dailyGems) ||
          (userData.money || 0) < cost.money
        ) {
          const nextName =
            currentRankIndex === -1
              ? `${item.name} ${nextRank.name}`
              : item.name.replace(ranks[currentRankIndex].name, nextRank.name);
          return output.reply(
            `❌ You don't have enough resources to upgrade **${item.name}** to **${nextName}**. ` +
              `Required:\n` +
              `${UNIRedux.arrowFromT} ${copiesRequired} copies of **${item.name}**\n` +
              `${UNIRedux.arrowFromT} ⚔️ Battle Points: ${cost.battlePoints}\n` +
              `${UNIRedux.arrowFromT} 💎 Stellar Gems: ${cost.stellarGems}\n` +
              `${UNIRedux.arrowFromT} 🔮 Intertwined Fate: ${cost.intertwinedFate}\n` +
              `${UNIRedux.arrowFromT} 💎 Daily Gems: ${cost.dailyGems}\n` +
              `${UNIRedux.arrowFromT} 💵 Money: $${cost.money.toLocaleString()}`
          );
        }

        userData.battlePoints =
          (userData.battlePoints || 0) - cost.battlePoints;
        collectibles.raise("stellarGems", -cost.stellarGems);
        collectibles.raise("intertwinedFate", -cost.intertwinedFate);
        collectibles.raise("gems", -cost.dailyGems);
        userData.money = (userData.money || 0) - cost.money;

        for (let i = 0; i < copiesRequired; i++) {
          inventory.deleteOne(itemKey);
        }

        let baseName: string,
          baseKey: string,
          itemType: string,
          newName: string;
        if (currentRankIndex === -1) {
          baseName = item.name.split(" ").slice(0, -1).join(" ");
          itemType = item.name.split(" ").pop().toLowerCase();
          baseKey = itemKey;
          newName = `${item.name} ${nextRank.name}`;
        } else {
          baseName = item.name.split(" ").slice(0, -2).join(" ");
          itemType = item.name
            .split(" ")
            [item.name.split(" ").length - 2].toLowerCase();
          baseKey = itemKey.replace(ranks[currentRankIndex].keySuffix, "");
          newName = `${baseName} ${
            itemType.charAt(0).toUpperCase() + itemType.slice(1)
          } ${nextRank.name}`;
        }
        const newKey = `${baseKey}${nextRank.keySuffix}`;

        const currentAtk = Number(item.atk) || 0;
        const currentDef = Number(item.def) || 0;
        const currentMagic = Number(item.magic) || 0;

        const newAtk = Math.floor(currentAtk * nextRank.statMultiplier) || 1;
        const newDef = Math.floor(currentDef * nextRank.statMultiplier) || 1;
        const newMagic =
          Math.floor(currentMagic * nextRank.statMultiplier) || 1;

        const newItem = {
          ...item,
          name: newName,
          key: newKey,
          atk: newAtk,
          def: newDef,
          magic: newMagic,
        };

        inventory.addOne(newItem);

        await money.set(input.senderID, {
          inventory: Array.from(inventory),
          money: userData.money,
          battlePoints: userData.battlePoints,
          collectibles: Array.from(collectibles),
          gearsData: gearsData.toJSON(),
        });

        return output.reply(
          `✅ Successfully upgraded **${baseName} ${
            itemType.charAt(0).toUpperCase() + itemType.slice(1)
          }** to **${newName}**!\n` +
            `New Key: ${newKey}\n` +
            `New Stats:\n` +
            `${UNIRedux.arrowFromT} ATK: ${newItem.atk}\n` +
            `${UNIRedux.arrowFromT} DEF: ${newItem.def}\n` +
            `${UNIRedux.arrowFromT} MAGIC: ${newItem.magic}\n` +
            `Cost:\n` +
            `${UNIRedux.arrowFromT} ${copiesRequired} copies of **${item.name}**\n` +
            `${UNIRedux.arrowFromT} ⚔️ Battle Points: ${cost.battlePoints}\n` +
            `${UNIRedux.arrowFromT} 💎 Stellar Gems: ${cost.stellarGems}\n` +
            `${UNIRedux.arrowFromT} 🔮 Intertwined Fate: ${cost.intertwinedFate}\n` +
            `${UNIRedux.arrowFromT} 💎 Daily Gems: ${cost.dailyGems}\n` +
            `${UNIRedux.arrowFromT} 💵 Money: $${cost.money.toLocaleString()}`
        );
      },
    },
    {
      key: "toggle",
      description: "Toggles the upgrader's availability (Admin only).",
      aliases: ["t", "-t"],
      args: ["<on|off>"],
      category: "ADMIN",
      async handler() {
        if (!input.isAdmin) {
          return output.reply("❌ This command is restricted to admins.");
        }

        const state = args[1]?.toLowerCase();
        if (!state || (state !== "on" && state !== "off")) {
          return output.reply(
            `❌ Please specify 'on' or 'off'. Usage: \`${prefix}upgrader toggle <on|off>\``
          );
        }

        const globalSettings = await globalDB.getCache("global_settings");
        globalSettings.upgraderEnabled = state === "on";
        await globalDB.setItem("global_settings", globalSettings);

        return output.reply(
          `✅ Upgrader is now **${state === "on" ? "ENABLED" : "DISABLED"}**.`
        );
      },
    },
    {
      key: "list",
      description: "Lists all upgradable items and their next rank costs.",
      aliases: ["l", "-l"],
      category: "INFO",
      async handler() {
        const upgradableItems = inventory
          .getAll()
          .filter((item) => item.type === "armor" || item.type === "weapon");

        if (upgradableItems.length === 0) {
          return output.reply(
            "❌ You have no upgradable items (armor or weapon)."
          );
        }

        let response = `⚒️ **Upgradable Items**\n\n`;
        for (const item of upgradableItems) {
          const currentRankIndex = ranks.findIndex((rank) =>
            item.name.includes(rank.name)
          );
          const nextRankIndex =
            currentRankIndex === -1 ? 0 : currentRankIndex + 1;

          if (nextRankIndex >= ranks.length) {
            response += `${item.icon} **${item.name}** (Max Rank)\n`;
            continue;
          }

          const nextRank = ranks[nextRankIndex];
          const cost = nextRank.cost;
          const copiesRequired = nextRank.copiesRequired;
          let baseName, baseKey, nextName, itemType;
          if (currentRankIndex === -1) {
            baseName = item.name.split(" ").slice(0, -1).join(" ");
            itemType = item.name.split(" ").pop().toLowerCase();
            baseKey = item.key;
            nextName = `${item.name} ${nextRank.name}`;
          } else {
            baseName = item.name.split(" ").slice(0, -2).join(" ");
            itemType = item.name
              .split(" ")
              [item.name.split(" ").length - 2].toLowerCase();
            baseKey = item.key.replace(ranks[currentRankIndex].keySuffix, "");
            nextName = `${baseName} ${
              itemType.charAt(0).toUpperCase() + itemType.slice(1)
            } ${nextRank.name}`;
          }
          const nextKey = `${baseKey}${nextRank.keySuffix}`;
          response +=
            `${item.icon} **${item.name}** (Key: ${item.key}) → **${nextName}** (Key: ${nextKey})\n` +
            `Cost:\n` +
            `${UNIRedux.arrowFromT} ${copiesRequired} copies of **${item.name}**\n` +
            `${UNIRedux.arrowFromT} ⚔️ Battle Points: ${cost.battlePoints}\n` +
            `${UNIRedux.arrowFromT} 💎 Stellar Gems: ${cost.stellarGems}\n` +
            `${UNIRedux.arrowFromT} 🔮 Intertwined Fate: ${cost.intertwinedFate}\n` +
            `${UNIRedux.arrowFromT} 💎 Daily Gems: ${cost.dailyGems}\n` +
            `${
              UNIRedux.arrowFromT
            } 💵 Money: $${cost.money.toLocaleString()}\n\n`;
        }

        return output.reply(response.trim());
      },
    },
  ];

  const home = new SpectralCMDHome(
    {
      argIndex: 0,
      isHypen: false,
      async home({ output, input, globalDB, money }, { itemList }) {
        const cache = await money.getCache(input.senderID);
        const upgraderStatus =
          (await globalDB.getCache("global_settings"))?.upgraderEnabled ??
          false;
        return output.reply(
          `⚒️ | Hello **${
            cache.name || "Unregistered"
          }**! Welcome to ${FontSystem.applyFonts(
            "Gear Upgrader",
            "double_struck"
          )}.\n\n` +
            `🔧 | **Status**: ${
              upgraderStatus ? "Enabled" : "Disabled (Admin Access Only)"
            }\n` +
            `Please use one of our **services**:\n\n${itemList}`
        );
      },
    },
    configs
  );

  return home.runInContext(ctx);
}
