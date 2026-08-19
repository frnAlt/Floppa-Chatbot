// @ts-nocheck
// THIS CODE IS NOT CHECKED!
import { CassPuppet } from "../modules/CassPuppet";
import { UNIRedux } from "../modules/unisym.js";
import { Slicer } from "../plugins/utils-liane.js";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "intellnica",
  description: "CassidyNica's Intelligence Capabilities.",
  author: "Liane Cagara || JenicaDev",
  version: "1.2.2",
  usage: "{prefix}intellnica <action> [arguments]",
  category: "Utilities",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["intell", "nicaint"],
  requirement: "3.0.0",
  icon: "✨",
  shopPrice: 1_000_000,
  cmdType: "cplx_g",
  isGame: true,
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  return parts.length > 1
    ? parts.slice(0, -1).join(", ") + " and " + parts.slice(-1)
    : parts[0] || "0 seconds";
}

export const style = {
  title: "IntellNica™ ✨",
  titleFont: "bold_italic",
  contentFont: "none",
  lineDeco: "altar",
};

const keys = [
  "beekeep",
  "brew",
  "chop",
  "cook",
  "dig",
  "farm",
  "garden",
  "harvest",
  "littlejohn",
  "minecraft",
  "plantita",
  "resto",
  "spaceex",
  "trawl",
  "treasure",
  "superwarp",
  "explorer",
  "fashionista",
];

/**
 *
 * @param {import("../types/gamesimu.js").Item} item
 */
function getEarnPerMinute(item) {
  if (!item || item.delay <= 0) return [0, 0];

  const attemptsPerMinute = 60 / item.delay;
  const minEarnings = item.priceA * item.chance * attemptsPerMinute;
  const maxEarnings = item.priceB * item.chance * attemptsPerMinute;

  return [minEarnings, maxEarnings];
}

/**
 * Bypassing the goddamn system para lamang malaman yong game simulator na data.
 * @param {CommandContext} ctx
 *
 */
const dangerousContext = (ctx) => {
  const money = {
    get() {
      throw new Error("Nica Intelligence");
    },
  };
  const dummy = new Proxy(
    {},
    {
      get() {
        return () => {};
      },
      set() {
        return true;
      },
    }
  );
  const dctx = {
    money,
    input: {
      ...ctx.input,
      arguments: [],
      body: "",
    },
    commandName: "intellnica",
    args: [],
    output: dummy,
    GameSimulator: ctx.GameSimulator,
  };
  class GameSimulator2 extends ctx.GameSimulator {
    /**
     *
     * @param  {...any} args
     */
    constructor(...args) {
      // @ts-ignore
      super(...args);
    }

    // @ts-ignore
    simulateAction(ctx = dctx) {
      // @ts-ignore
      return super.simulateAction(ctx);
    }
  }
  // @ts-ignore
  dctx.GameSimulator = GameSimulator2;
  return dctx;
};

/**
 *
 * @param {import("../types/gamesimu.js").Item} itemData
 * @param {string[]} actionTune
 * @returns {Array<(import("../types/gamesimu.js").Item) & { score: number }>}
 */
function getBestItems(itemData, actionTune = []) {
  if (!Array.isArray(itemData) || itemData.length === 0) return null;

  return itemData
    .map((item) => {
      const tuneBonus = actionTune.includes(item.name) ? 1.1 : 1;
      const profit = (item.priceB - item.priceA) * item.chance * tuneBonus;
      const score = profit / item.delay;

      return { ...item, score, ref: item };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get the top 3 items that benefit the most from tuning.
 *
 * @param {import("../types/gamesimu.js").Item[]} itemData - Array of game items.
 * @returns {import("../types/gamesimu.js").Item[]} - Top 3 item names sorted by tuning effectiveness.
 */
function getBestTune(itemData) {
  if (!Array.isArray(itemData) || itemData.length === 0) return [];

  return itemData
    .map((item) => {
      const baseProfit = (item.priceB - item.priceA) * item.chance;
      const tunedProfit = baseProfit * 1.1;
      const baseScore = baseProfit / item.delay;
      const tunedScore = tunedProfit / item.delay;
      const scoreImprovement = tunedScore - baseScore;

      return { ...item, scoreImprovement, ref: item };
    })
    .filter((item) => item.scoreImprovement > 0)
    .sort((a, b) => b.scoreImprovement - a.scoreImprovement)
    .slice(0, 3);
}

/**
 * Get the best game simulators sorted by their overall efficiency.
 *
 * @param {Record<string, GameSimulatorConstructor>} simulators - All game simulators.
 * @param {Record<string, { actionStamp: number; actionMax: number; totalItems: Record<string, number>; actionTune: string[] }>} states - User states for each game.
 * @returns {Array<{ key: string; avgScore: number; totalScore: number; maxScore: number; icon: string; verb: string; simulator: GameSimulatorConstructor }>}
 */
function getBestGames(simulators, states) {
  if (!simulators || !states) return [];

  return Object.entries(simulators)
    .map(([key, simulator]) => {
      const state = states[key];
      if (!state || !simulator.itemData) return null;

      const bestItems = getBestItems(simulator.itemData, state.actionTune);
      if (!bestItems || bestItems.length === 0) return null;

      const scores = bestItems.map((item) => item.score);
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const avgScore = totalScore / scores.length;
      const maxScore = Math.max(...scores);

      return {
        key,
        simulator,
        avgScore,
        totalScore,
        maxScore,
        icon: simulator.checkIcon || "🎮",
        verb: simulator.verb || key,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.avgScore - a.avgScore);
}

/**
 * @type {CommandEntry}
 */
export async function entry(ctx) {
  const timeA = Date.now();
  const {
    input,
    output,
    GameSimulator,
    args,
    money,
    commands,
    prefix,
    commandName,
  } = ctx;
  let exist = [];
  let errs = {};
  const targets = Object.values(commands).filter((data) => {
    if (exist.includes(data.meta.name)) {
      return;
    }
    exist.push(data.meta.name);
    return keys.includes(data.meta.name);
  });
  const dctx = dangerousContext(ctx);
  for (const target of targets) {
    try {
      const puppet = new CassPuppet({
        context: ctx,
        fullyBuffer: true,
        outputChannel: "pipe",
        sandboxMoney: true,
      });
      const execution = puppet.executeCommand({
        commandName: target.meta.name,
        args: [],
        extraContext: dctx,
      });
    } catch (error) {
      errs[target.meta.name] = error;
    }
  }
  let simulatorData = {
    ...GameSimulator.instances,
  };
  const userData = await money.get(input.senderID);

  /**
   * @type {Record<string, { actionStamp: number; actionMax: number; totalItems: Record<string, number>; actionTune: string[] }>}
   */
  const simulatorStates = Object.fromEntries(
    Object.entries(simulatorData).map(([key, val]) => {
      const {
        [key + "Stamp"]: actionStamp,
        [key + "MaxZ"]: actionMax = val.storage,
        [key + "Total"]: totalItems = {},
        [key + "Tune"]: actionTune = [],
      } = userData;

      return [key, { actionStamp, actionMax, totalItems, actionTune }];
    })
  );
  const renewPrice = 100;

  /**
   * @type {Record<string, { name: string; icon: string; desc: string; callback: CommandEntry; norenew?: boolean }>}
   */
  const opts = [
    {
      name: "subscribe",
      icon: "💶",
      norenew: true,
      desc: `Renews Subscription for **💶${renewPrice.toLocaleString()}**`,
      async callback() {
        const { battlePoints = 0 } = userData;
        if (battlePoints < renewPrice) {
          return output.reply(
            `❌ Not enough, you only had **💶${battlePoints.toLocaleString()}**, we need is **💶${renewPrice.toLocaleString()}**`
          );
        }
        const { intellRenew } = userData;
        const renewal = 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - intellRenew;
        if (intellRenew && elapsed < renewal) {
          return output.reply(`You have already renewed.`);
        }
        await money.set(input.senderID, {
          intellRenew: Date.now(),
          battlePoints: battlePoints - renewPrice,
        });
        return output.reply(
          `${UNIRedux.arrow} Done! You may now use the commands.`
        );
      },
    },
    {
      name: "best_tune",
      icon: "🚀",
      desc: "Finds the top 3 best-tuned items. Can specify a key.",
      async callback() {
        const key = args[1];
        if (!key) {
          return output.reply(
            `Type ${prefix}${commandName} best_tune <key> to check a specific game.`
          );
        }

        let selectedSimulators = key
          ? simulatorData[key]
            ? [simulatorData[key]]
            : []
          : [];

        const allItems = selectedSimulators
          .flatMap((sim) => sim.itemData)
          .filter(Boolean);

        if (!allItems.length) {
          return output.reply(
            key
              ? `⚠️ No items found for **${key}**.`
              : "⚠️ No items available for tuning analysis."
          );
        }

        const bestTunes = getBestTune(allItems);
        const info = await output.reply(
          `${
            bestTunes.length
              ? `🚀 **Top 3 Tuned Items${key ? ` in ${key}` : ""}:**\n${
                  UNIRedux.arrow
                } ${bestTunes
                  .map(
                    (i) =>
                      `${i.icon} **${i.name}**\nFrom: **${
                        selectedSimulators.find((j) =>
                          j.itemData.includes(i.ref)
                        )?.key ?? "Can't find."
                      }**\nEarns Per Minute: between 💵**${getEarnPerMinute(
                        i
                      )[0].toLocaleString()}** and 💵**${getEarnPerMinute(
                        i
                      )[1].toLocaleString()}**\nRarity: ${
                        100 - i.chance * 100
                      }%\nProcessing Time: ${
                        i.delay
                      } minutes.\nPrice Range:\nBetween ${i.priceA} and ${
                        i.priceB
                      }.`
                  )
                  .join(`\n\n${UNIRedux.arrowFromT} `)}`
              : `⚠️ No significant tuning benefits found${
                  key ? ` in ${key}` : ""
                }.`
          }\n\n${
            UNIRedux.arrowBW
          } Type ${prefix}${commandName} best_tune <key> to check a specific game.\nReply with **tune** to apply the tuning.`
        );
        input.setReply(info.messageID, {
          /**
           *
           * @param {CommandContext} ctx2
           */
          async callback(ctx2) {
            if (ctx2.input.senderID !== input.senderID) {
              return;
            }
            if (ctx2.input.body.toLowerCase() !== "tune") {
              return;
            }
            const from = selectedSimulators.find((j) =>
              j.itemData.includes(bestTunes[0].ref)
            );
            const state = simulatorStates[from.key];
            if (!from || !state) {
              return output.wentWrong();
            }
            const names = bestTunes.map((i) => i.name);
            if (names.length < 3) {
              return output.wentWrong();
            }
            await ctx2.money.set(input.senderID, {
              [from.key + "Tune"]: [...names],
              [from.key + "Stamp"]: state.actionStamp ?? Date.now(),
            });
            return ctx2.output.replyStyled(
              `✅ **Applied best tunes!**\n${UNIRedux.arrow} ${bestTunes
                .map(
                  (i) =>
                    `${i.icon} **${i.name}**\nFrom: **${
                      selectedSimulators.find((j) => j.itemData.includes(i.ref))
                        ?.key ?? "Can't find."
                    }**\nEarns Per Minute: between 💵**${getEarnPerMinute(
                      i
                    )[0].toLocaleString()}** and 💵**${getEarnPerMinute(
                      i
                    )[1].toLocaleString()}**\nRarity: ${
                      100 - i.chance * 100
                    }%\nProcessing Time: ${
                      i.delay
                    } minutes.\nPrice Range:\nBetween ${i.priceA} and ${
                      i.priceB
                    }.`
                )
                .join(`\n\n${UNIRedux.arrowFromT} `)}`,
              style
            );
          },
        });
      },
    },
    {
      name: "best_items",
      icon: "🏆",
      desc: "Finds the best items.",
      callback() {
        const key = args[1] || "all";
        const page = Slicer.parseNum(args[2]);

        let selectedSimulators =
          key !== "all"
            ? simulatorData[key]
              ? [simulatorData[key]]
              : []
            : Object.values(simulatorData);
        let selectedTunes =
          key !== "all"
            ? simulatorStates[key]
              ? [simulatorStates[key]]
              : []
            : Object.values(simulatorStates);

        const allItems = selectedSimulators
          .flatMap((sim) => sim.itemData)
          .filter(Boolean);
        const allTunes = selectedTunes.flatMap((i) => i.actionTune);

        if (!allItems.length) {
          return output.reply(
            key
              ? `⚠️ No items found for **${key}**.`
              : "⚠️ No items available for analysis."
          );
        }

        const bestItemsX = getBestItems(allItems, allTunes);
        const slicer = new Slicer(bestItemsX, 3);
        const bestItems = slicer.getPage(page);
        output.reply(
          `${
            bestItems.length
              ? `🚀 **Best Items${key ? ` in ${key}` : ""}:**\n${
                  UNIRedux.arrow
                } Page ${page} of ${slicer.pagesLength}\n\n${
                  UNIRedux.arrow
                } ${bestItems
                  .map(
                    (i) =>
                      `${i.icon} **${i.name}**\nFrom: **${
                        selectedSimulators.find((j) =>
                          j.itemData.includes(i.ref)
                        )?.key ?? "Can't find."
                      }**\nEarns Per Minute: between 💵**${getEarnPerMinute(
                        i
                      )[0].toLocaleString()}** and 💵**${getEarnPerMinute(
                        i
                      )[1].toLocaleString()}**\nScore: ${i.score}\nRarity: ${
                        100 - i.chance * 100
                      }%\nProcessing Time: ${
                        i.delay
                      } minutes.\nPrice Range:\nBetween ${i.priceA} and ${
                        i.priceB
                      }.`
                  )
                  .join(`\n\n${UNIRedux.arrowFromT} `)}`
              : `⚠️ No best items found${key ? ` in ${key}` : ""}.`
          }\n\n${
            UNIRedux.arrowBW
          } Type ${prefix}${commandName} best_items <key|all> to check a specific game.\n${
            UNIRedux.arrowBW
          } Type ${prefix}${commandName} best_items <key|all> <page> to check the next page.`
        );
      },
    },
    {
      name: "list",
      icon: "📜",
      desc: "Lists available game keys for inspection.",
      callback() {
        const entries = Object.entries(simulatorData);

        output.reply(
          entries.length
            ? `📜 **Available Game Keys:**\n${UNIRedux.arrow} ${entries
                .map(
                  ([key, value]) =>
                    `${value.checkIcon} ${value.actionEmoji} **${key}**`
                )
                .join(`\n${UNIRedux.arrowFromT} `)}`
            : "⚠️ No game keys available."
        );
      },
    },

    {
      name: "best_game",
      icon: "🎮",
      desc: "Finds the most efficient game simulators.",
      callback() {
        const { GameSimulator, output, money, input } = ctx;
        const userData = money.get(input.senderID);

        const bestGames = getBestGames(simulatorData, simulatorStates).slice(
          0,
          10
        );
        output.reply(
          bestGames.length
            ? `🎮 **Top 10 Game Simulators:**\n${bestGames
                .map(
                  (game) =>
                    `${UNIRedux.charm} ${game.simulator.checkIcon} ${
                      game.simulator.actionEmoji
                    } **${game.key}** (Avg Score: ${game.avgScore.toFixed(2)})`
                )
                .join("\n")}`
            : "⚠️ No high-performing games found."
        );
      },
    },
    {
      name: "list_tuned",
      icon: "🎮",
      desc: "List tuned commands.",
      callback() {
        const str = Object.values(simulatorData)
          .sort(
            (a, b) =>
              Date.now() -
              (simulatorStates[b.key]?.actionTune ?? 0) -
              (Date.now() - (simulatorStates[a.key]?.actionTune ?? 0))
          )
          .map((i) => {
            const states = simulatorStates[i.key];
            return `${UNIRedux.arrowBW} ${states.actionStamp ? "✅" : "❌"} ${
              i.actionEmoji
            } **${i.key}**:\nTime Since Tuning: **${
              states.actionStamp
                ? formatDuration(Date.now() - states.actionStamp)
                : "Not tuned yet."
            }**`;
          })
          .join(`\n\n`);
        return output.reply(`🚀 **Tuned commands.**\n\n${str}`);
      },
    },
  ];
  const [sub, ...subArgs] = args;

  const handler = opts.find((i) => i.name === sub);
  output.append = `${UNIRedux.standardLine}\nPing: ${
    Date.now() - timeA
  }\nRenew Before: ${
    userData.intellRenew
      ? formatDuration(
          Math.max(
            24 * 60 * 60 * 1000 - (Date.now() - (userData.intellRenew ?? 0)),
            0
          )
        )
      : "??"
  }`;

  if (!handler) {
    const items = opts
      .map((i) => `${prefix}${commandName} ${i.name}\n[${i.icon} ${i.desc}]`)
      .join("\n");
    const res = `${UNIRedux.arrow} Welcome to IntellNica™!\n\n${items}`;

    return output.reply(res);
  }

  if (!handler.callback) {
    return output.reply(
      `🏗️🚧 Sorry, this feature is still a **work in progress.**`
    );
  }

  if (!handler.norenew) {
    const { intellRenew } = userData;
    const renewal = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - intellRenew;
    const c = input.isAdmin && input.propertyArray.includes("cheat");
    if (!intellRenew && !c) {
      return output.reply(
        `🔒 You need to use the subscribe option first. It will only cost you **💶${renewPrice.toLocaleString()}**`
      );
    } else if (elapsed > renewal && !c) {
      return output.reply(
        `⚠️ **Subscription Expired!**\nPlease use the subscribe option again to renew your subscription. It will only cost you **💶${renewPrice.toLocaleString()}**.\n\nSince: ${formatDuration(
          elapsed
        )}`
      );
    }
  }

  return handler.callback();
}
