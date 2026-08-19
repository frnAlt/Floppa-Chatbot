// @ts-check
import { SpectralCMDHome } from "@cassidy/spectral-home";
import { UNIRedux } from "../modules/unisym.js";
import { Collectibles } from "@cass-modules/InventoryEnhanced";

export const meta = {
  name: "collectibles",
  description: "Manage your rare and unique collectibles.",
  author: "JenicaDev, Fixed by Liane",
  version: "1.0.8",
  usage: "{prefix}collectibles <action> [args]",
  category: "Inventory",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["collection", "cll"],
  requirement: "2.5.0",
  icon: "🏆",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Collectibles 🏆",
  titleFont: "bold",
  contentFont: "fancy",
};

const { parseCurrency: pCy } = global.utils;

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry(ctx) {
  const { input, output, money, args, prefix, fonts } = ctx;
  let userData = await money.getItem(input.senderID);
  let collectibles = new Collectibles(userData.collectibles ?? []);

  collectibles.removeEmpty();

  async function createList(
    targetUser = userData,
    targetCollectibles = collectibles
  ) {
    const cllList = targetCollectibles.getAll();
    const categoryMap = new Map();
    for (const item of cllList) {
      const category = item.metadata.type ?? "Uncategorized";
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category).push(item);
    }

    let listStr = "";
    const sorted = Array.from(categoryMap).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [category, items] of sorted) {
      listStr += `${UNIRedux.arrow} ${fonts.fancy_italic(
        category.charAt(0).toUpperCase() + category.slice(1)
      )}\n`;
      listStr += items
        .map(
          ({ metadata, amount }) =>
            `${metadata.icon} **${metadata.name}** ${
              amount > 1 ? `(x${pCy(amount)})` : ""
            } [${metadata.key}]`
        )
        .join("\n");
      listStr += "\n\n";
    }

    return (
      `👤 **${targetUser.name || "Unregistered"}** (Collectibles)\n\n` +
      `${listStr.trim() || "No collectibles yet—start hunting!"}`
    );
  }

  const [, ...actionArgs] = args;

  const home = new SpectralCMDHome({ isHypen: false }, [
    {
      key: "list",
      description: "Displays all your collectibles.",
      aliases: ["-l"],
      args: ["<optional uid>"],
      async handler() {
        if (actionArgs[0]) {
          const allUsers = await money.getAll();
          const target = allUsers[actionArgs[0]];
          if (!target) return output.reply(`❌ User not found! Who’s that?`);
          const targetCollectibles = new Collectibles(
            target.collectibles ?? []
          );
          targetCollectibles.removeEmpty();
          return output.reply(
            `✅ Checking ${target.name || "Unregistered"}\n\n${await createList(
              target,
              targetCollectibles
            )}`
          );
        }
        return output.reply(await createList());
      },
    },
    {
      key: "inspect",
      description: "Shows details of a specific collectible.",
      aliases: ["check", "-i"],
      args: ["<collectible_key>"],
      async handler() {
        const key = actionArgs[0];
        if (!key) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ No collectible specified! Try a **key** from your stash.`
          );
        }
        const item = collectibles.get(key);
        if (!item) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ No "**${key}**" in your collection! Check with "${prefix}cll list".`
          );
        }
        return output.reply(
          `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
            `${UNIRedux.arrow} ***${item.metadata.name}***\n\n` +
            `${item.metadata.icon} **${item.metadata.name}** (x${pCy(
              item.amount
            )})\n` +
            `✦ ${item.metadata.flavorText || "A rare gem in your hoard!"}\n\n` +
            `Type: **${item.metadata.type || "Uncategorized"}**\n` +
            `Limit: **${item.metadata.limit ?? "Unlimited"}**`
        );
      },
    },
    {
      key: "transfer",
      description: "Sends a collectible to another user.",
      aliases: ["give", "-t", "send"],
      args: ["<collectible_key>*<amount>", "<uid>"],
      async handler() {
        let [keyAmount = "", recipientID] = actionArgs;
        let [key, amountOrig = "1"] = keyAmount.split("*");
        let amount = parseInt(amountOrig);
        if (isNaN(amount)) amount = 1;

        if (!collectibles.has(key)) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ No "**${key}**" in your stash! See "${prefix}cll list".`
          );
        }
        if (!collectibles.hasAmount(key, amount) || amount < 1) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ Only have **${pCy(
                collectibles.getAmount(key)
              )}** of "**${key}**"! Can’t send **${amount}**.`
          );
        }
        if (!recipientID) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ Missing recipient ID!`
          );
        }

        if (recipientID === input.senderID) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ Can’t send to yourself!`
          );
        }
        const recipientData = await money.getCache(recipientID);
        if (!(await money.exists(recipientID))) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ No one with ID "**${recipientID}**" exists! Who’s this mystery friend?`
          );
        }
        if (!recipientData.name) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ Recipient’s nameless! Can’t send to a ghost.`
          );
        }
        if (!recipientData) {
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
              `❌ No user "**${recipientID}**"! Where’d they go?`
          );
        }
        const rCollectibles = new Collectibles(
          recipientData.collectibles ?? []
        );
        rCollectibles.removeEmpty();

        const senderItem = collectibles.get(key);
        rCollectibles.register(key, senderItem.metadata);

        collectibles.raise(key, -amount);
        rCollectibles.raise(key, amount);

        await money.setItem(input.senderID, {
          collectibles: Array.from(collectibles),
        });
        await money.setItem(recipientData.userID, {
          collectibles: Array.from(rCollectibles),
        });

        return output.reply(
          `👤 **${userData.name || "Unregistered"}** (Collectibles)\n\n` +
            `${UNIRedux.arrow} ***Shared the Wealth***\n\n` +
            `✅ Sent ${senderItem.metadata.icon} **${
              senderItem.metadata.name
            }** (x${pCy(amount)}) to **${
              recipientData.name || "Unregistered"
            }**!\n` +
            `You’ve got **${pCy(collectibles.getAmount(key))}** left.`
        );
      },
    },

    {
      key: "top",
      description: "Check the top collectibles or users with a specific one!",
      aliases: ["-t"],
      args: ["[all | <key>] [page=1]"],
      async handler() {
        const allUsers = await money.getAll();
        const page = parseInt(actionArgs[1] || "1") || 1;
        const perPage = 10;

        if (!actionArgs[0] || actionArgs[0].toLowerCase() === "all") {
          const totals = new Map();
          for (const user of Object.values(allUsers)) {
            const userCollectibles = new Collectibles(user.collectibles ?? []);
            userCollectibles.removeEmpty();
            for (const item of userCollectibles.getAll()) {
              const amount = userCollectibles.getAmount(item.metadata.key);
              if (isNaN(amount)) continue;
              totals.set(
                item.metadata.key,
                (totals.get(item.metadata.key) || 0) + amount
              );
            }
          }

          const sorted = Array.from(totals.entries())
            .map(([key, amount]) => {
              const userCollectibles = new Collectibles(
                Object.values(allUsers)[0].collectibles ?? []
              );
              const item = userCollectibles.get(key) || {
                metadata: { name: key, icon: "💎", key },
              };
              return { ...item.metadata, amount };
            })
            .sort((a, b) => b.amount - a.amount);

          const totalPages = Math.ceil(sorted.length / perPage);
          const paged = sorted.slice((page - 1) * perPage, page * perPage);

          if (!paged.length) {
            return output.reply(
              `👤 **${userData.name}** (Collectibles)\n\nNo collectibles found across the realm!`
            );
          }

          const list = paged
            .map(
              (item) =>
                `${item.icon} **${item.name}** (x${pCy(item.amount)}) [${
                  item.key
                }]`
            )
            .join("\n");

          return output.reply(
            `👤 **${userData.name}** (Collectibles)\n\n` +
              `${UNIRedux.arrow} ***Top Collectibles*** [all] [page=${page}/${totalPages}]\n\n` +
              `${list}\n\n` +
              `${UNIRedux.arrowFromT} Flip pages with '${prefix}cll top all <page>'\n` +
              `${UNIRedux.arrowFromT} Check specific rankings with '${prefix}cll top <key> <page>'`
          );
        } else {
          const key = actionArgs[0];
          const usersWithKey = Object.entries(allUsers)
            .map(([uid, data]) => {
              const userCollectibles = new Collectibles(
                data.collectibles ?? []
              );
              const amount = userCollectibles.getAmount(key);
              if (isNaN(amount) || amount <= 0) return null;
              return {
                uid,
                name: data.name || "Unregistered",
                amount,
                icon: userCollectibles.get(key)?.metadata.icon || "💎",
                metadata: userCollectibles.getMeta(key),
              };
            })
            .filter(Boolean)
            .sort((a, b) => b.amount - a.amount);

          const totalPages = Math.ceil(usersWithKey.length / perPage);
          const paged = usersWithKey.slice(
            (page - 1) * perPage,
            page * perPage
          );

          if (!paged.length) {
            return output.reply(
              `👤 **${userData.name}** (Collectibles)\n\nNo one’s got **${key}** yet!`
            );
          }

          const list = paged
            .map(
              (user, i) =>
                `${UNIRedux.arrow} ${i + 1}. ${user.name} ${user.icon}\n` +
                `${UNIRedux.arrowFromT} **${user.metadata.name}**: ${pCy(
                  user.amount
                )}`
            )
            .join("\n\n");

          return output.reply(
            `👤 **${userData.name}** (Collectibles)\n\n` +
              `${UNIRedux.arrow} ***Top Holders of ${key}*** [page=${page}/${totalPages}]\n\n` +
              `${list}\n\n` +
              `${UNIRedux.arrowFromT} See more with '${prefix}cll top ${key} <page>'`
          );
        }
      },
    },
  ]);

  return home.runInContext(ctx);
}
