import { SpectralCMDHome, CassCheckly } from "@cassidy/spectral-home";
import { UNIRedux } from "@cassidy/unispectra";
import { FontSystem } from "cassidy-styler";

interface Zone {
  key: string;
  name: string;
  description: string;
  cooldown: number;
}

const zones: Zone[] = [
  {
    key: "shadow_valley",
    name: "Shadow Valley",
    description: "A misty valley with hidden relics.",
    cooldown: 3600000,
  },
  {
    key: "flame_peaks",
    name: "Flame Peaks",
    description: "Volcanic peaks with rare ores.",
    cooldown: 7200000,
  },
  {
    key: "mist_isles",
    name: "Mist Isles",
    description: "Foggy islands with ancient ruins.",
    cooldown: 14400000,
  },
  {
    key: "frost_caverns",
    name: "Frost Caverns",
    description: "Icy caves with frozen treasures.",
    cooldown: 5400000,
  },
  {
    key: "sand_dunes",
    name: "Sand Dunes",
    description: "Endless dunes hiding a lost caravan.",
    cooldown: 9000000,
  },
  {
    key: "sky_temples",
    name: "Sky Temples",
    description: "Floating temples with mystical artifacts.",
    cooldown: 10800000,
  },
  {
    key: "dark_forest",
    name: "Dark Forest",
    description: "A haunted forest with cursed relics.",
    cooldown: 7200000,
  },
  {
    key: "crystal_lake",
    name: "Crystal Lake",
    description: "A shimmering lake with magical crystals.",
    cooldown: 3600000,
  },
  {
    key: "thunder_cliffs",
    name: "Thunder Cliffs",
    description: "Stormy cliffs with electrified gems.",
    cooldown: 12600000,
  },
  {
    key: "abyss_ruins",
    name: "Abyss Ruins",
    description: "Sunken ruins with forgotten secrets.",
    cooldown: 16200000,
  },
  {
    key: "ownirv2_company",
    name: "ownirsv2 Company",
    description: "Explore the world of aggni members of ownirsV2 Company ",
    cooldown: 16200000,
  },
];

interface Outcome {
  type: string;
  description: string;
  rewards: {
    coins: number;
    itemKey?: string;
    quantity?: number;
  };
}

const outcomes: Outcome[] = [
  {
    type: "loot",
    description: "Discovered a hidden cache!",
    rewards: { coins: 150, itemKey: "crystal_shard", quantity: 2 },
  },
  {
    type: "enemy",
    description: "Fought off a bandit ambush!",
    rewards: { coins: 100 },
  },
  {
    type: "obstacle",
    description: "Navigated a treacherous path!",
    rewards: { coins: 50 },
  },
  {
    type: "treasure",
    description: "Unearthed an ancient chest!",
    rewards: { coins: 200, itemKey: "golden_amulet", quantity: 1 },
  },
  {
    type: "beast",
    description: "Defeated a wild beast guarding treasure!",
    rewards: { coins: 120, itemKey: "beast_fang", quantity: 3 },
  },
  {
    type: "trap",
    description: "Escaped a deadly trap with minor loot!",
    rewards: { coins: 80, itemKey: "rusty_key", quantity: 1 },
  },
  {
    type: "mystic",
    description: "Encountered a mystic spirit and gained wisdom!",
    rewards: { coins: 100, itemKey: "spirit_essence", quantity: 2 },
  },
  {
    type: "riddle",
    description: "Solved a riddle to unlock a secret stash!",
    rewards: { coins: 180, itemKey: "silver_coin", quantity: 5 },
  },
];

export const meta: CommandMeta = {
  name: "adventure",
  description: "Manage your adventure, explore zones, and collect rewards.",
  author: "Aljur Pogoy",
  version: "1.0.0",
  usage: "{prefix}adventure <action> [args]",
  category: "Idle Investment Games",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["adv"],
  requirement: "3.0.0",
  icon: "🌍",
  cmdType: "cplx_g",
  isGame: true,
};

interface AdventureInventoryItem {
  key: string;
  quantity: number;
}

interface AdventureInventory extends Record<string, AdventureInventoryItem> {}

/**
 * This shi does the job automatically
 */
export const style: CommandStyle = {
  title: {
    content: `🌍 Adventure`,
    line_bottom: "default",
    text_font: "double_struck",
  },
  content: {
    text_font: "fancy",
    line_bottom_inside_altar: "default",
    content: null,
  },
  footer: {
    content: "Made with 🤍 by **Aljur Pogoy**",
    text_font: "fancy",
  },
};

export async function entry(ctx: CommandContext) {
  const { input, output, usersDB, args, prefix } = ctx;
  const [, ...actionArgs] = args;

  const home = new SpectralCMDHome(
    {
      argIndex: 0,
      isHypen: false,
      async home({ output, input, usersDB }, { itemList }) {
        const cache = await usersDB.getCache(input.senderID);
        return output.reply(
          `🌍 | Hello **${
            cache?.name || "Unregistered"
          }**! Welcome to ${FontSystem.applyFonts(
            "Adventure",
            "double_struck"
          )}!\n` +
            `Please choose one of our **quests**:\n\n` +
            `${UNIRedux.arrow} ${FontSystem.applyFonts(
              "All Options",
              "fancy_italic"
            )}\n` +
            `${itemList.replace(/^/gm, `${UNIRedux.arrowFromT} `)}\n\n` +
            `📜 | **Status**: ${
              cache?.adventure?.name
                ? `Registered as ${cache.adventure.name}`
                : "Not yet registered"
            }\n` +
            `💰 | **Coins**: ${cache?.money ?? 0}\n`
        );
      },
    },
    [
      {
        key: "list",
        description: "Displays all adventure zones.",
        aliases: ["-l"],
        async handler() {
          const userData: UserData = await usersDB.getCache(input.senderID);
          if (!userData.adventure) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (Adventure)\n\nJas register first sir!`
            );
          }
          let content = [
            `👤 **${userData.name || "Unregistered"}** (Adventure)`,
            `${UNIRedux.standardLine}`,
            `${UNIRedux.arrow} ${FontSystem.applyFonts(
              "Adventure Zones",
              style.content.text_font
            )}`,
          ];
          zones.forEach((z) => {
            const lastAdventured =
              userData.adventure.cooldowns?.[z.key]?.lastAdventured || 0;
            const timeLeft = lastAdventured + z.cooldown - Date.now();
            content.push(
              `🌍 『 ${z.name} 』`,
              `**Key:** ${z.key}`,
              `**Description:** ${z.description}`,
              `**Cooldown:** ${z.cooldown / 3600000} hours`,
              `**Status:** ${
                timeLeft > 0
                  ? `On cooldown (${Math.ceil(timeLeft / 60000)} min)`
                  : "Ready"
              }`
            );
          });
          content.push(`Use ${prefix}adventure <zone_key> to explore`);
          return output.reply(`\n${content.join("\n")}`);
        },
      },
      {
        key: "userlist",
        description: "Lists all registered adventurers.",
        aliases: ["-u"],
        async handler() {
          const allUsers = await usersDB.getAllCache();
          let content = [
            `👤 **${
              (await usersDB.getCache(input.senderID))?.name || "Unregistered"
            }** (Adventure)`,
            `${UNIRedux.standardLine}`,
            `${UNIRedux.arrow} ${FontSystem.applyFonts(
              "Adventurer List",
              style.content.text_font
            )}`,
          ];
          for (const [userId, userData] of Object.entries(allUsers)) {
            if (userData.adventure?.name) {
              const inventory: AdventureInventory =
                userData.adventure.inventory || {};
              const items =
                Object.entries(inventory)
                  .map(
                    ([key, { quantity }]) =>
                      `${key.replace("_", " ")}: ${quantity}`
                  )
                  .join(", ") || "None";
              content.push(
                `🌍 『 ${userData.adventure.name} 』`,
                `**User ID:** ${userId}`,
                `**Inventory:** ${items}`,
                `**Coins:** ${userData.money || 0}`,
                `${UNIRedux.standardLine}`
              );
            }
          }
          if (!content.some((line) => line.includes("『"))) {
            content.push(`No adventurers registered yet!`);
          }
          content.push(`${UNIRedux.standardLine}`, ``);
          return output.reply(`\n${content.join("\n")}`);
        },
      },
      {
        key: "register",
        description: "Register as an adventurer.",
        aliases: ["-r"],
        args: ["<name>"],
        validator: new CassCheckly([
          { index: 0, type: "string", required: true, name: "name" },
        ]),
        async handler() {
          const name = actionArgs.join("_");
          let userData: UserData = await usersDB.getCache(input.senderID);
          userData.adventure ??= {};

          if (userData.adventure?.name) {
            return output.reply(
              `👤 **${userData.name || "Unregistered"}** (Adventure)\n${
                UNIRedux.standardLine
              }\n` +
                `❌ You're already registered as ${userData.adventure.name}!`
            );
          }

          try {
            const existing = await usersDB.queryItem({
              "value.adventure.name": name,
            });
            if (existing?.adventure) {
              return output.reply(
                `👤 **${userData.name || "Unregistered"}** (Adventure)\n${
                  UNIRedux.standardLine
                }\n` + `❌ Name ${name} is already taken! Choose another.`
              );
            }
          } catch (error) {
            console.warn(
              `[Adventure] Failed to check name uniqueness for ${name}: ${error.message}`
            );
          }

          userData.adventure.name = name;
          try {
            await usersDB.setItem(input.senderID, {
              adventure: userData.adventure,
            });
          } catch (error) {
            console.warn(
              `[Adventure] DB update failed for user ${input.senderID}: ${error.message}`
            );
          }

          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Adventure)\n${
              UNIRedux.standardLine
            }\n` +
              `✅ Registered as ${name}!\n` +
              `Start exploring with ${prefix}adventure <zone_key>\n` +
              `Check inventory with ${prefix}adventure inventory`
          );
        },
      },
      {
        key: "explore",
        description: "Explore a zone to gain rewards.",
        aliases: ["-e"],
        args: ["<zone_key>"],
        validator: new CassCheckly([
          { index: 0, type: "string", required: true, name: "zone_key" },
        ]),
        async handler() {
          const zoneKey = actionArgs[0]?.toLowerCase();
          const zone = zones.find((z) => z.key === zoneKey);

          if (!zone) {
            return output.reply(
              `👤 **${
                (await usersDB.getCache(input.senderID))?.name || "Unregistered"
              }** (Adventure)\n${UNIRedux.standardLine}\n` +
                `❌ Invalid zone key! Use "${prefix}adventure list" to see zones.`
            );
          }

          let userData: UserData = await usersDB.getCache(input.senderID);

          if (!userData.adventure?.name) {
            return output.reply(
              `👤 **${userData.name || "Unregistered"}** (Adventure)\n${
                UNIRedux.standardLine
              }\n` +
                `❌ You're not registered! Use "${prefix}adventure register <name>".`
            );
          }

          const lastAdventured =
            userData.adventure.cooldowns?.[zoneKey]?.lastAdventured || 0;
          if (Date.now() < lastAdventured + zone.cooldown) {
            const timeLeft =
              (lastAdventured + zone.cooldown - Date.now()) / 60000;
            return output.reply(
              `👤 **${userData.name || "Unregistered"}** (Adventure)\n${
                UNIRedux.standardLine
              }\n` +
                `❌ **${
                  userData.adventure.name
                }** is on cooldown! Try again in ${Math.ceil(
                  timeLeft
                )} minutes.`
            );
          }

          const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
          userData.adventure.cooldowns ??= {};
          userData.adventure.cooldowns[zoneKey] = {
            lastAdventured: Date.now(),
          };
          userData.adventure.inventory ??= [];
          userData.money = (userData.money || 0) + (outcome.rewards.coins || 0);

          if (outcome.rewards.itemKey) {
            if (!userData.adventure.inventory[outcome.rewards.itemKey]) {
              userData.adventure.inventory[outcome.rewards.itemKey] = {
                quantity: 0,
              };
            }
            userData.adventure.inventory[outcome.rewards.itemKey].quantity +=
              outcome.rewards.quantity || 0;
          }

          try {
            await usersDB.setItem(input.senderID, {
              adventure: userData.adventure,
              money: userData.money,
            });
          } catch (error) {
            console.warn(
              `[Adventure] DB update failed for user ${input.senderID}: ${error.message}`
            );
          }

          let content = [
            `👤 **${userData.name || "Unregistered"}** (Adventure)`,
            `${UNIRedux.standardLine}`,
            `${UNIRedux.arrow} ${FontSystem.applyFonts(
              `Adventured in ${zone.name}!`,
              style.content.text_font
            )}`,
            `Event: ${outcome.description}`,
          ];
          if (outcome.rewards.coins)
            content.push(`Earned ${outcome.rewards.coins} coins`);
          if (outcome.rewards.itemKey)
            content.push(
              `Found ${
                outcome.rewards.quantity
              } ${outcome.rewards.itemKey.replace("_", " ")}`
            );
          content.push(
            `Use "${prefix}adventure inventory" to check inventory`,
            `Use "${prefix}adventure trade" to trade items`,
            `${UNIRedux.standardLine}`,
            ``
          );

          return output.reply(`${content.join("\n")}`);
        },
      },
      {
        key: "inventory",
        description: "Check your adventure inventory.",
        aliases: ["-i"],
        async handler() {
          const userData = await usersDB.getCache(input.senderID);
          return output.reply(
            `👤 **${userData?.name || "Unregistered"}** (Adventure)\n${
              UNIRedux.standardLine
            }\n` +
              `❌ Inventory checking is not yet implemented.\n` +
              `Please contact the developer for updates.`
          );
        },
      },
      {
        key: "trade",
        description: "Trade items with other adventurers.",
        aliases: ["-t"],
        async handler() {
          const userData = await usersDB.getCache(input.senderID);
          return output.reply(
            `👤 **${userData?.name || "Unregistered"}** (Adventure)\n${
              UNIRedux.standardLine
            }\n` +
              `❌ Trading is not yet implemented.\n` +
              `Please contact the developer for updates.`
          );
        },
      },
    ]
  );

  return home.runInContext(ctx);
}
