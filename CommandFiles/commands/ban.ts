import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { limitString, UNIRedux } from "@cassidy/unispectra";

export interface BanEntry {
  userID: string;
  reason: string;
  author: string;
  timestamp: number;
}

export const meta: CommandMeta = {
  name: "ban",
  author: "MrkimstersDev, Liane",
  description:
    "Manages user bans in the thread, with automatic kicks for banned users",
  version: "1.0.0",
  supported: "^1.0.0",
  otherNames: ["block", "restrict"],
  usage: "{prefix}{name} [add|remove|view] [args]",
  category: "Moderation",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🚫",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "🚫 User Ban",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "add",
    description: "Ban a user from the thread",
    args: ["[userID] [reason]"],
    aliases: ["-a", "ban"],
    icon: "➕",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "userID",
      },
      {
        index: 1,
        type: "string",
        required: true,
        name: "reason",
      },
    ]),
    async handler(
      { input, output, threadsDB, usersDB, prefix, commandName },
      { spectralArgs, key }
    ) {
      const userID = spectralArgs[0].trim();
      const reason = input.censor(spectralArgs.slice(1).join(" ").trim());

      if (!userID || !reason) {
        return output.reply(
          `❌ Please provide a user ID and reason. Usage: ${prefix}${commandName} ${key} [userID] [reason]`
        );
      }

      const bans: BanEntry[] =
        (await threadsDB.getCache(input.threadID))?.bans || [];
      if (bans.some((ban) => ban.userID === userID)) {
        return output.reply(`❌ User ${userID} is already banned.`);
      }

      try {
        const userInfo = await usersDB.getUserInfo([userID]);
        const userName = userInfo[userID]?.name || "Unknown User";

        bans.push({
          userID,
          reason,
          author: input.senderID,
          timestamp: Date.now(),
        });

        await threadsDB.setItem(input.threadID, { bans });

        try {
          await output.kick(userID);
          await output.reply(
            `${UNIRedux.arrow} **User Banned** ✅\n\n` +
              `${userName} (${userID}) has been banned and removed from the thread.\n` +
              `**Reason**: ${reason}\n` +
              ``
          );
        } catch (error) {
          await output.reply(
            `${UNIRedux.arrow} **User Banned** ✅\n\n` +
              `${userName} (${userID}) has been banned but could not be removed. I may need admin permissions.\n` +
              `**Reason**: ${reason}\n` +
              ``
          );
        }
      } catch (error) {
        output.error(`Failed to ban user: ${error.message}`);
      }
    },
  },
  {
    key: "remove",
    description: "Unban a user from the thread",
    args: ["[userID]"],
    aliases: ["-r", "unban"],
    icon: "➖",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "userID",
      },
    ]),
    async handler({ input, output, threadsDB, usersDB }, { spectralArgs }) {
      const userID = spectralArgs[0].trim();

      const bans: BanEntry[] =
        (await threadsDB.getCache(input.threadID))?.bans || [];
      const banEntry = bans.find((ban) => ban.userID === userID);

      if (!banEntry) {
        return output.reply(`❌ User ${userID} is not banned.`);
      }

      try {
        const userInfo = await usersDB.getUserInfo([userID]);
        const userName = userInfo[userID]?.name || "Unknown User";

        output.waitForReaction(
          `${UNIRedux.arrow} ***Confirm Unban***\n\n` +
            `React to confirm unbanning ${userName} (${userID}).\n` +
            `Current Ban Reason: ${banEntry.reason}`,
          async (ctx: CassidySpectra.CommandContext) => {
            const updatedBans = bans.filter((ban) => ban.userID !== userID);
            await threadsDB.setItem(input.threadID, { bans: updatedBans });

            ctx.output.setUIName("Unbanned!");
            ctx.output.replyStyled(
              {
                body:
                  `${UNIRedux.arrow} **User Unbanned** ✅\n\n` +
                  `${userName} (${userID}) has been unbanned and can now participate in the thread.\n` +
                  ``,
                messageID: ctx.input.messageID,
                noRibbonUI: true,
                noLevelUI: true,
              },
              style
            );
          }
        );
      } catch (error) {
        output.error(`Failed to process unban: ${error.message}`);
      }
    },
  },
  {
    key: "view",
    description: "View the list of banned users",
    aliases: ["-v", "show", "list"],
    args: [],
    icon: "👀",
    async handler({ output, threadsDB, input, usersDB, api }) {
      const bans: BanEntry[] =
        (await threadsDB.getItem(input.threadID))?.bans || [];

      if (!bans.length) {
        output.reply(
          `${UNIRedux.charm} **Banned Users**\n` +
            `No users are currently banned in this thread!\n` +
            ``
        );
        return;
      }

      const banList = await Promise.all(
        bans.map(async (ban, i) => {
          const cache = await usersDB.getCache(ban.author);
          const userInfo = await api.getUserInfo([ban.userID]);
          const userName = userInfo[ban.userID]?.name || "Unknown User";
          return (
            `${i + 1}. ${userName} (${ban.userID})\n` +
            `   Reason: ${limitString(ban.reason, 30)}\n` +
            `   Banned by: ${cache.name}\n` +
            `   Time: ${new Date(ban.timestamp).toLocaleString()}`
          );
        })
      );

      output.reply(
        `${UNIRedux.charm} **Banned Users**\n\n` +
          `${banList.join("\n\n")}\n\n` +
          ``
      );
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
