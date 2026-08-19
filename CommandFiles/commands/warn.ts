import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { UNIRedux } from "@cassidy/unispectra";

export interface WarnConfig {
  userID: string;
  count: number;
  reasons: string[];
}

export interface ThreadWarnConfig {
  warnings: WarnConfig[];
  author: string;
}

export const meta: CommandMeta = {
  name: "warn",
  description: "Manage user warnings in the thread",
  otherNames: ["wrn"],
  version: "1.0.0",
  usage: "{prefix}{name} [add|view|clear] [user] [reason]",
  category: "Moderation",
  author: "MrkimstersDev, Liane",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "⚠️",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "⚠️ Warning System",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "add",
    description: "Add a warning to a user",
    args: ["[user] [reason]"],
    aliases: ["-a", "issue"],
    icon: "➕",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "user",
      },
      {
        index: 1,
        type: "string",
        required: true,
        name: "reason",
      },
    ]),
    async handler(
      { input, output, threadsDB, prefix, commandName, usersDB },
      { spectralArgs }
    ) {
      const userID = spectralArgs[0] || input.detectID;
      const reason = spectralArgs.slice(1).join(" ").trim();

      if (!userID || !reason) {
        return output.reply(
          `❌ Usage: ${prefix}${commandName} add [user] [reason]\n` +
            `Specify a user (mention or ID) and a reason for the warning.`
        );
      }

      const threadData = await threadsDB.getItem(input.threadID);
      const warnConfig: ThreadWarnConfig | null = threadData?.warnConfig || {
        warnings: [],
        author: input.senderID,
      };

      let userWarn = warnConfig.warnings.find((w) => w.userID === userID);
      if (!userWarn) {
        userWarn = { userID, count: 0, reasons: [] };
        warnConfig.warnings.push(userWarn);
      }

      userWarn.count += 1;
      userWarn.reasons.push(reason);

      const userInfo = await usersDB.getUserInfo([userID]);
      const userName = userInfo[userID]?.name || "Trailblazer";

      try {
        await threadsDB.setItem(input.threadID, {
          warnConfig: { ...warnConfig, author: input.senderID },
        });

        output.reply({
          body:
            `${UNIRedux.arrow} **Warning Issued** ⚠️\n\n` +
            `${userName} has been warned.\n` +
            `**Reason**: ${reason}\n` +
            `**Warning Count**: ${userWarn.count}/3\n` +
            `${
              userWarn.count >= 3
                ? `🚨 **User will be removed due to reaching 3 warnings.**`
                : `Keep the conversation respectful!`
            }`,
          mentions: [{ tag: userName, id: userID }],
        });

        if (userWarn.count >= 3) {
          try {
            await output.kick(userID);
            output.send(
              `🌌 **User Removed** 🚪\n\n` +
                `${userName} has been removed from the thread due to reaching 3 warnings.\n` +
                `**Reasons**: ${userWarn.reasons.join(", ")}\n` +
                ``
            );
            warnConfig.warnings = warnConfig.warnings.filter(
              (w) => w.userID !== userID
            );
            await threadsDB.setItem(input.threadID, { warnConfig });
          } catch (error) {
            output.error(`Failed to remove user: ${error.message}`);
          }
        }
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "view",
    description: "View warnings for a user or all users in the thread",
    args: ["[user]"],
    aliases: ["-v", "show", "info"],
    icon: "👀",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: false,
        name: "user",
      },
    ]),
    async handler(
      { input, output, threadsDB, api, usersDB },
      { spectralArgs }
    ) {
      const userID = spectralArgs[0];
      const threadData = await threadsDB.getItem(input.threadID);
      const warnConfig: ThreadWarnConfig | null =
        threadData?.warnConfig || null;

      if (!warnConfig || !warnConfig.warnings.length) {
        return output.reply(
          `${UNIRedux.charm} **Warning System**\n` +
            `No warnings issued in this thread!`
        );
      }

      if (userID) {
        const userWarn = warnConfig.warnings.find((w) => w.userID === userID);
        if (!userWarn) {
          const userInfo = await usersDB.getUserInfo([userID]);
          const userName = userInfo[userID]?.name || "Trailblazer";
          return output.reply(
            `${UNIRedux.charm} **User Warnings**\n` +
              `${userName} has no warnings in this thread.`
          );
        }

        const userInfo = await usersDB.getUserInfo([userID]);
        const userName = userInfo[userID]?.name || "Trailblazer";
        output.reply({
          body:
            `${UNIRedux.charm} **User Warnings**\n` +
            `**User**: ${userName}\n` +
            `**Warning Count**: ${userWarn.count}/3\n` +
            `**Reasons**: ${userWarn.reasons.join(", ") || "None"}`,
          mentions: [{ tag: userName, id: userID }],
        });
      } else {
        const userIDs = warnConfig.warnings.map((w) => w.userID);
        const userInfos = await usersDB.getUserInfo([...userIDs]);
        const warningsList = warnConfig.warnings
          .map((w) => {
            const userName = userInfos[w.userID]?.name || "Trailblazer";
            return `• ${userName}: ${w.count}/3 warnings (${
              w.reasons.join(", ") || "None"
            })`;
          })
          .join("\n");

        output.reply(
          `${UNIRedux.charm} **Thread Warnings**\n` +
            `**Total Users Warned**: ${warnConfig.warnings.length}\n` +
            `**Warnings**:\n${warningsList}\n` +
            `**Last Modified By**: ${warnConfig.author}`
        );
      }
    },
  },
  {
    key: "clear",
    description: "Clear warnings for a user or all users",
    args: ["[user|all]"],
    aliases: ["-c", "reset"],
    icon: "🔄",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "target",
      },
    ]),
    async handler(
      { input, output, threadsDB, usersDB, prefix },
      { spectralArgs }
    ) {
      const target = spectralArgs[0]?.toLowerCase();
      if (!target) {
        return output.reply(`❌ Usage: ${prefix}warn clear [user|all]`);
      }

      const threadData = await threadsDB.getItem(input.threadID);
      const warnConfig: ThreadWarnConfig | null =
        threadData?.warnConfig || null;

      if (!warnConfig || !warnConfig.warnings.length) {
        return output.reply("No warnings to clear!");
      }

      if (target === "all") {
        output.waitForReaction(
          `${UNIRedux.arrow} ***Confirm Clear All***\n\n` +
            `React to confirm clearing warnings for all users.`,
          async (ctx) => {
            await threadsDB.setItem(input.threadID, {
              warnConfig: { warnings: [], author: input.senderID },
            });
            ctx.output.setUIName("Cleared!");
            ctx.output.replyStyled(
              {
                body:
                  `${UNIRedux.arrow} **All Warnings Cleared** ✅\n\n` +
                  `All user warnings have been reset.`,
                messageID: ctx.input.messageID,
                noRibbonUI: true,
                noLevelUI: true,
              },
              style
            );
          }
        );
      } else {
        const userID = target;
        const userWarn = warnConfig.warnings.find((w) => w.userID === userID);
        if (!userWarn) {
          const userInfo = await usersDB.getUserInfo([userID]);
          const userName = userInfo[userID]?.name || "Trailblazer";
          return output.reply(`${userName} has no warnings to clear.`);
        }

        const userInfo = await usersDB.getUserInfo([userID]);
        const userName = userInfo[userID]?.name || "Trailblazer";
        output.waitForReaction(
          `${UNIRedux.arrow} ***Confirm Clear***\n\n` +
            `React to confirm clearing warnings for ${userName}:\n` +
            `Warnings: ${userWarn.count}/3 (${
              userWarn.reasons.join(", ") || "None"
            })`,
          async (ctx) => {
            warnConfig.warnings = warnConfig.warnings.filter(
              (w) => w.userID !== userID
            );
            await threadsDB.setItem(input.threadID, {
              warnConfig: { ...warnConfig, author: input.senderID },
            });
            ctx.output.setUIName("Cleared!");
            ctx.output.replyStyled(
              {
                body:
                  `${UNIRedux.arrow} **Warnings Cleared** ✅\n\n` +
                  `${userName}'s warnings have been reset.`,
                messageID: ctx.input.messageID,
                noRibbonUI: true,
                noLevelUI: true,
                mentions: [{ tag: userName, id: userID }],
              },
              style
            );
          }
        );
      }
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: true,
    globalCooldown: 3,
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
    defaultCategory: "Moderation",
  },
  configs
);

import { defineEntry } from "@cass/define";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
