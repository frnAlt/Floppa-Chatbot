import { SpectralCMDHome, CassCheckly, Config } from "@cassidy/spectral-home";
import { abbreviateNumber, UNIRedux } from "@cassidy/unispectra";
import utils from "@cassidy/utils";

export const meta: CommandMeta = {
  name: "balance",
  description: "Check your virtual cash",
  otherNames: ["bal", "money"],
  version: "3.2.11",
  usage: "{prefix}{name}",
  category: "Finance",
  author: "@lianecagara",
  role: 0,
  noPrefix: "both",
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "💰",
  cmdType: "cplx_g",
  noRibbonUI: true,
  isGame: true,
};

export const style: CommandStyle = {
  titleFont: "bold",
  title: "💵 Balance",
  contentFont: "fancy",
};

function isBrokenMoney(amount: number) {
  return (
    isNaN(amount) ||
    !isFinite(amount) ||
    amount < 0 ||
    amount >= Number.MAX_VALUE
  );
}

export function sortUsers(
  users: { [x: string]: UserData },
  top?: number,
  money?: typeof global.handleStat
) {
  const entries: [string, { total: number; data: UserData }][] = Object.entries(
    users
  ).map(([id, data]) => [
    id,
    {
      data,
      total: (money ? money.extractMoney(data).total : 0) || 0,
    },
  ]);

  entries.sort(([, a], [, b]) => b.total - a.total);

  const sliced = top && top > 0 ? entries.slice(0, top) : entries;

  return Object.fromEntries(sliced.map(([id, { data }]) => [id, data]));
}

export function sortUsersNotTotal(
  users: { [x: string]: UserData },
  top?: number
) {
  const entries = Object.entries(users).sort(
    ([, a], [, b]) => (b.money || 0) - (a.money || 0)
  );

  const sliced = top && top > 0 ? entries.slice(0, top) : entries;

  return Object.fromEntries(sliced);
}

export function getBehindAhead(
  id: string,
  users: { [x: string]: UserData },
  money: typeof global.handleStat
) {
  const sorted = sortUsers(users, undefined, money);
  const keys = Object.keys(sorted);
  const index = keys.indexOf(id);
  return index === -1
    ? { behind: [], ahead: [] }
    : { ahead: keys.slice(0, index), behind: keys.slice(index + 1) };
}

export function getTop(
  id: string,
  users: { [x: string]: UserData },
  money: typeof global.handleStat
) {
  return Object.keys(sortUsers(users, undefined, money)).indexOf(id) + 1;
}

const configs: Config[] = [
  {
    key: "rem",
    description: "Your clean balance overview.",
    args: ["[uid]"],
    aliases: ["-r"],
    icon: "💰",
    validator: new CassCheckly([
      { index: 0, type: "string", required: false, name: "userID" },
    ]),
    async handler({ money, input, output }, { spectralArgs }) {
      await money.ensureUserInfo(input.senderID);
      let senderID = input.senderID;
      if (input.replier) senderID = input.replier.senderID;
      if (input.hasMentions) senderID = input.firstMention.senderID;
      if (spectralArgs[0]) senderID = spectralArgs[0];

      let playerMoney: UserData = await money.getCache(senderID);
      if (
        !playerMoney ||
        !playerMoney.name ||
        !(await money.exists(senderID))
      ) {
        if (senderID !== input.senderID) {
          return output.reply(`❌ User ${senderID} does not exist!`);
        }
      }

      return output.reply({
        body: `You have ${formatCash(playerMoney.money, true)}`,
        noLevelUI: true,
        noRibbonUI: true,
      });
    },
  },
  {
    key: "home",
    description: "Your minimal balance overview.",
    args: ["[uid]"],
    aliases: ["-h"],
    icon: "💸",
    validator: new CassCheckly([
      { index: 0, type: "string", required: false, name: "userID" },
    ]),
    async handler(
      { money, input, output, prefix, commandName },
      { spectralArgs }
    ) {
      const canv = CanvCass.premade();

      await money.ensureUserInfo(input.senderID);
      let senderID = input.senderID;
      if (input.replier) senderID = input.replier.senderID;
      if (input.hasMentions) senderID = input.firstMention.senderID;
      if (spectralArgs[0]) senderID = spectralArgs[0];
      let nonex = false;
      let playerMoney: UserData = await money.getCache(senderID);
      if (!(await money.exists(senderID))) {
        if (senderID !== input.senderID) {
          senderID = input.senderID;
          playerMoney = await money.getCache(senderID);
          nonex = true;
        }
      }

      const name =
        input.hasMentions || input.replier || spectralArgs[0]
          ? playerMoney.name
          : `${playerMoney.name} (You)`;
      const name2 =
        input.hasMentions || input.replier || spectralArgs[0]
          ? playerMoney.name
          : `You`;
      output.setUIName(name);

      const allCache = await money.getAllCache();

      const top = getTop(input.sid, allCache, money);
      const outputText = [
        `${
          nonex
            ? "⚠️ That user **doesn't exist**, showing your balance instead.\n\n"
            : ""
        }${name2} ${name === name2 ? "has" : "have"} ${formatCash(
          playerMoney.money,
          "💵",
          false
        )} in the cassidy chatbot system.`,
        ``,
        `🏆 **${name}** Top #${top}`,
        `✓ You can **check** by typing **${prefix}bal topall**.`,
        ``,
        `**Disclaimer**: This is not a real balance, it is all virtual, this cannot be converted into real money.`,
        ``,
        `**Tip:** Type **${prefix}${commandName} all** for full balance info.`,
      ].join("\n");

      await canv.drawBackground();

      const container = CanvCass.createRect({
        centerX: canv.centerX,
        centerY: canv.centerY,
        height: canv.height / 2,
        width: canv.width,
      });

      canv.drawBox({
        rect: container,
        fill: "rgba(0, 0, 0, 0.5)",
      });

      canv.drawText(`${style.title}`, {
        x: container.left + 50,
        y: (container.top - canv.top) / 2,
        align: "left",
        fill: "white",
        fontType: "cbold",
        size: 70,
      });
      canv.drawText(`CassieahBoT`, {
        x: container.right - 50,
        y: (container.top - canv.top) / 2,
        align: "right",
        fill: "rgba(255, 255,255, 0.7)",
        fontType: "cbold",
        size: 50,
      });

      canv.drawText(`👤 ${playerMoney.name}`, {
        fontType: "cbold",
        size: 50,
        x: container.centerX,
        y: container.centerY - 75,
        vAlign: "top",
        align: "center",
        fill: "rgba(255, 255,255, 0.7)",
      });
      canv.drawText(`$${abbreviateNumber(playerMoney.money, 4, true)}`, {
        fontType: "cbold",
        size: 75,
        x: container.centerX,
        y: container.centerY,
        align: "center",
        fill: "white",
      });
      if (playerMoney.money < 1_000_000_000) {
        canv.drawText(`$${playerMoney.money.toLocaleString()}`, {
          fontType: "cbold",
          size: 35,
          x: container.centerX,
          y: container.centerY + 50,
          vAlign: "bottom",
          align: "center",
          fill: "rgba(255, 255,255, 0.7)",
        });
      }
      canv.drawText(`🏆 Top #${top}`, {
        fontType: "cbold",
        size: 100,
        x: container.centerX,
        y: container.bottom,
        align: "center",
        fill: "white",
      });
      canv.drawText(`💵`, {
        fontType: "cbold",
        size: 150,
        x: canv.right - 150 / 2,
        y: canv.bottom - 250 / 2 + 20,
        align: "center",
        fill: "white",
      });
      canv.drawText(`💵`, {
        fontType: "cbold",
        size: 250,
        x: canv.right - 250 / 2,
        y: canv.bottom,
        align: "center",
        fill: "white",
      });
      canv.drawText(`🪙`, {
        fontType: "cbold",
        size: 150,
        x: canv.left + 150 / 2,
        y: canv.bottom - 250 / 2 + 20,
        align: "center",
        fill: "white",
      });
      canv.drawText(`🪙`, {
        fontType: "cbold",
        size: 250,
        x: canv.left + 250 / 2,
        y: canv.bottom,
        align: "center",
        fill: "white",
      });

      return output.reply({
        body: outputText,
        attachment: await canv.toStream(),
      });
    },
  },
  {
    key: "raw",
    description: "Your raw balance overview.",
    args: ["[uid]"],
    aliases: ["-ra"],
    icon: "💸",
    validator: new CassCheckly([
      { index: 0, type: "string", required: false, name: "userID" },
    ]),
    async handler({ money, input, output }, { spectralArgs }) {
      await money.ensureUserInfo(input.senderID);
      let senderID = input.senderID;
      if (input.replier) senderID = input.replier.senderID;
      if (input.hasMentions) senderID = input.firstMention.senderID;
      if (spectralArgs[0]) senderID = spectralArgs[0];

      let playerMoney: UserData = await money.getCache(senderID);
      if (
        !playerMoney ||
        !playerMoney.name ||
        !(await money.exists(senderID))
      ) {
        if (senderID !== input.senderID) {
          return output.reply(`❌ User ${senderID} does not exist!`);
        }
      }

      return output.reply({
        body: `${playerMoney.money}`,
        noStyle: true,
        noLevelUI: true,
        noRibbonUI: true,
      });
    },
  },

  {
    key: "all",
    description: "Your complete balance details.",
    args: ["[uid]"],
    aliases: ["-a"],
    icon: "💸",
    validator: new CassCheckly([
      { index: 0, type: "string", required: false, name: "userID" },
    ]),
    async handler(
      { money, input, output, prefix, Collectibles, commandName },
      { itemList, spectralArgs }
    ) {
      await money.ensureUserInfo(input.senderID);
      let senderID = input.senderID;
      if (input.replier) senderID = input.replier.senderID;
      if (input.hasMentions) senderID = input.firstMention.senderID;
      if (spectralArgs[0]) senderID = spectralArgs[0];

      let warn = "";
      let playerMoney: UserData = await money.getCache(senderID);
      if (
        !playerMoney ||
        !playerMoney.name ||
        !(await money.exists(senderID))
      ) {
        if (senderID !== input.senderID) {
          return output.reply(`❌ User ${senderID} does not exist!`);
        }
      }
      const cll = new Collectibles(playerMoney?.collectibles || []);

      if (isBrokenMoney(playerMoney.money))
        warn = `\n\n⚠️ Corrupted! Use **${prefix}money-fix**`;

      const items = cll
        .getAll()
        .filter(({ amount }) => amount > 0)
        .map(
          ({ metadata, amount }) =>
            `${metadata.icon} ${metadata.name}(s): x${utils.parseCurrency(
              amount
            )}`
        )
        .join("\n");
      const otherMoney = money.extractMoney(playerMoney);
      const name =
        input.hasMentions || input.replier || spectralArgs[0]
          ? playerMoney.name
          : `${playerMoney.name} (You)`;
      output.setUIName(name);

      const outputText = [
        `👤 **${name}**`,
        ``,
        `💰 Coin(s): ${formatCash(playerMoney.money, "💵", true)}`,
        `💷 Point(s): ${formatCash(playerMoney.battlePoints, "💷")}`,
        `🏦 Bank(s): ${formatCash(otherMoney.bank)}`,
        `🎒 Cheque(s): ${formatCash(otherMoney.cheques)}`,
        `🚗 Car(s): ${formatCash(otherMoney.carsAssets)}`,
        `🐈 Pet(s): ${formatCash(otherMoney.petsAssets)}`,
        `🌱 Garden Barn(s): ${formatCash(otherMoney.gardenBarn)}`,
        (items ? `${items}` : "") + warn,
        `${UNIRedux.standardLine}`,
        `${UNIRedux.arrow} ***All Options***`,
        ``,
        itemList,
        `\nType **${prefix}${commandName}-check** to see a complete balance info.`,
      ].join("\n");

      return output.reply(outputText);
    },
  },
  {
    key: "top",
    cooldown: 5,
    description: "See the Top 10 richest",
    aliases: ["-t", "leaders"],
    icon: "🏆",
    async handler({ money, input, output, prefix, commandName }) {
      const users = await money.getAllCache();
      const topUsers = sortUsersNotTotal(users, 10);
      const participantIDs = Array.isArray(input.participantIDs)
        ? input.participantIDs
        : [];

      let result = [`🏆 **Top 10 Balance** 🏆`];
      let index = 1;
      for (const key in topUsers) {
        const user: UserData = topUsers[key];

        result.push(
          [
            `${
              index === 1
                ? `👑 ${UNIRedux.charm} ${FontSystem.applyFonts(
                    String(user.name).toUpperCase(),
                    "double_struck"
                  )} ${UNIRedux.charm}`
                : index < 10
                ? `0${index}. **${user.name}**`
                : `${index}. **${user.name}**`
            }`,
            `💰 Coin(s): **${formatCash(user.money)}**`,

            participantIDs.includes(key) ? `✅ In Group` : "",
          ]
            .join("\n")
            .trim()
        );
        index++;
      }
      output.reply(
        result.filter(Boolean).join(`\n\n`) +
          `\n\n🔎 Use **${prefix}${commandName} topall** to view total ranking.`
      );
    },
  },
  {
    key: "toptotal",
    cooldown: 5,
    description: "See the Top 5 richest",
    aliases: ["-tt", "leaderstotal", "topt", "topall"],
    icon: "🏆",
    async handler({ money, input, output, Collectibles }) {
      const users = await money.getAllCache();
      const topUsers = sortUsers(users, 5, money);
      const participantIDs = Array.isArray(input.participantIDs)
        ? input.participantIDs
        : [];

      let result = [`🏆 **Top 5 Users** 🏆\n`];
      let index = 1,
        lastMoney: number;
      for (const key in topUsers) {
        const user: UserData = topUsers[key];
        const otherMoney = money.extractMoney(user);
        const cll = new Collectibles(user.collectibles || []);
        const items = cll
          .getAll()
          .filter(({ amount }) => amount > 0)
          .map(
            ({ metadata, amount }) =>
              `${metadata.icon} ${metadata.name}(s): x${abbreviateNumber(
                amount
              )}`
          )
          .join("\n");

        result.push(
          `${
            index === 1
              ? `👑 ${UNIRedux.charm} ${FontSystem.applyFonts(
                  String(user.name).toUpperCase(),
                  "double_struck"
                )} ${UNIRedux.charm}`
              : index < 10
              ? `0${index}. **${user.name}**`
              : `${index}. **${user.name}**`
          }`,
          `💰 Total Coins(s): ${formatCash(otherMoney.total, "💵", true)}`,
          `💵 Local(s): ${formatCash(user.money)}`,
          `💷 Point(s): ${formatCash(user.battlePoints, "💷")}`,
          `🏦 Bank(s): ${formatCash(otherMoney.bank)}`,
          `🎒 Cheque(s): ${formatCash(otherMoney.cheques)}`,
          `🚗 Car(s): ${formatCash(otherMoney.carsAssets)}`,
          `🐈 Pet(s): ${formatCash(otherMoney.petsAssets)}`,
          `🌱 Garden Barn(s): ${formatCash(otherMoney.gardenBarn)}`,
          items ? items : "",
          lastMoney
            ? `📉 Gap(s): $${formatCash(
                Math.abs(lastMoney - (user.money || 0))
              )}`
            : "",

          participantIDs.includes(key) ? `✅ In Group` : "",
          `\n`
        );
        index++;
        lastMoney = user.money || 0;
      }
      output.reply(result.filter(Boolean).join("\n"));
    },
  },
  {
    key: "fix",
    description: "Fix broken money",
    aliases: ["-f"],
    icon: "🔧",
    handler: async ({ money, input, output }) => {
      const { money: amount } = await money.getItem(input.senderID);
      if (isBrokenMoney(amount)) {
        await money.setItem(input.senderID, { money: 0 });
        output.reply(
          `✅ Fixed from ${utils.parseCurrency(amount)} to 0$ ${UNIRedux.charm}`
        );
      } else {
        output.reply(
          `❌ **${utils.parseCurrency(amount)}$** is fine ${UNIRedux.charm}`
        );
      }
    },
  },
  {
    key: "reset",
    description: "Reset your money to 0",
    aliases: ["-r"],
    icon: "♻️",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        regex: /^confirm$/,
        required: true,
        name: "confirmation",
      },
    ]),
    async handler({ money, input, output }) {
      await money.set(input.senderID, { money: 0 });
      output.reply(`✅ Reset to 0$ ${UNIRedux.charm}`);
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: false,
    globalCooldown: 5,
    defaultKey: "home",
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
    defaultCategory: "Finance",
  },
  configs
);

import { defineEntry } from "@cass/define";
import { FontSystem } from "cassidy-styler";
import { formatCash } from "@cass-modules/ArielUtils";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
