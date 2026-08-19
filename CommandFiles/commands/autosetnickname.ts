import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { limitString, UNIRedux } from "@cassidy/unispectra";

interface AutoNickname {
  nickname: string;
  author: string;
}

function checkShortCut(
  nickname: string,
  uid: string,
  userName: string
): string {
  if (/{userName}/gi.test(nickname)) {
    nickname = nickname.replace(/{userName}/gi, userName);
  }
  if (/{userID}/gi.test(nickname)) {
    nickname = nickname.replace(/{userID}/gi, uid);
  }
  return nickname;
}

export const meta: CommandMeta = {
  name: "autosetnickname",
  description: "Manage automatic nickname setting for new users in the thread",
  otherNames: ["asn", "autonick"],
  version: "1.0.1",
  usage: "{prefix}{name} [view|set|delete|reset|on|off] [args]",
  category: "Thread",
  author: "MrkimstersDev",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🏷️",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "🏷️ Auto Nickname",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "view",
    description: "View the current auto-nickname setting and status",
    aliases: ["-v", "show", "info"],
    args: [],
    icon: "👀",
    async handler({ output, threadsDB, input }) {
      const threadData = await threadsDB.getItem(input.threadID);
      const autoNickname: AutoNickname | null =
        threadData?.autoNickname || null;
      const isEnabled: boolean =
        threadData?.settings?.enableAutoSetName || false;

      if (!autoNickname) {
        output.reply(
          `${UNIRedux.charm} **Auto Nickname**\n` +
            `No auto-nickname set for this thread!\n` +
            `Status: ${isEnabled ? "Enabled" : "Disabled"}`
        );
        return;
      }

      output.reply(
        `${UNIRedux.charm} **Auto Nickname**\n` +
          `**Nickname**: ${limitString(autoNickname.nickname, 20)}\n` +
          `**Set by**: ${autoNickname.author}\n` +
          `**Status**: ${isEnabled ? "Enabled" : "Disabled"}`
      );
    },
  },
  {
    key: "set",
    description:
      "Set an auto-nickname for new users (supports {userName}, {userID})",
    args: ["[nickname]"],
    aliases: ["-s", "add", "config"],
    icon: "✏️",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "nickname",
      },
    ]),
    async handler(
      { input, output, threadsDB, prefix, commandName },
      { spectralArgs, key }
    ) {
      const nickname = input.censor(spectralArgs.join(" ").trim());

      if (!nickname) {
        return output.reply(
          `❌ Please provide a nickname. Usage: ${prefix}${commandName} ${key} [nickname]`
        );
      }

      const existingNickname: AutoNickname | null =
        (await threadsDB.queryItem(input.threadID, "autoNickname"))
          ?.autoNickname || null;

      if (existingNickname) {
        await output.quickWaitReact(
          `${UNIRedux.arrow} ***Confirm Override***\n\n` +
            `React to confirm overwriting the existing auto-nickname:\n` +
            `Nickname: "${existingNickname.nickname}" (set by ${existingNickname.author})`,
          {
            authorOnly: true,
            edit: "✅",
          }
        );
      }

      const newNickname: AutoNickname = {
        nickname,
        author: input.senderID,
      };

      try {
        await threadsDB.setItem(input.threadID, { autoNickname: newNickname });
        output.reply(
          `${UNIRedux.arrow} ***Auto Nickname Set*** ✅\n\n` +
            `**Nickname**: "${nickname}"\n` +
            `New users will now be assigned this nickname (if enabled).`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "delete",
    description: "Delete the auto-nickname setting",
    args: [],
    aliases: ["-d", "remove"],
    icon: "🗑️",
    async handler({ input, output, threadsDB }) {
      const autoNickname: AutoNickname | null =
        (await threadsDB.getItem(input.threadID))?.autoNickname || null;

      if (!autoNickname) {
        output.reply("No auto-nickname set to delete!");
        return;
      }

      output.waitForReaction(
        `${UNIRedux.arrow} ***Confirm Deletion***\n\n` +
          `React to confirm deleting the auto-nickname:\n` +
          `Nickname: "${autoNickname.nickname}" (set by ${autoNickname.author})`,
        async (ctx) => {
          await threadsDB.setItem(input.threadID, { autoNickname: null });

          ctx.output.setUIName("Deleted!");
          ctx.output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **Auto Nickname Deleted** ✅\n\n` +
                `Removed: "${autoNickname.nickname}"`,
              messageID: ctx.input.messageID,
              noRibbonUI: true,
              noLevelUI: true,
            },
            style
          );
        }
      );
    },
  },
  {
    key: "reset",
    description: "Reset the auto-nickname setting",
    aliases: ["-r", "clear"],
    icon: "🔄",
    async handler({ input, output, threadsDB }) {
      const autoNickname: AutoNickname | null =
        (await threadsDB.getItem(input.threadID))?.autoNickname || null;

      if (!autoNickname) {
        output.reply("No auto-nickname set to reset!");
        return;
      }

      output.waitForReaction(
        `${UNIRedux.arrow} ***Confirm Reset***\n\n` +
          `React to confirm resetting the auto-nickname.`,
        async (ctx) => {
          await threadsDB.setItem(input.threadID, { autoNickname: null });

          ctx.output.setUIName("Reset!");
          ctx.output.replyStyled(
            {
              body: `${UNIRedux.arrow} **Auto Nickname Cleared** ✅`,
              messageID: ctx.input.messageID,
              noRibbonUI: true,
              noLevelUI: true,
            },
            style
          );
        }
      );
    },
  },
  {
    key: "on",
    description: "Turn on the auto-nickname feature",
    args: [],
    icon: "✅",
    async handler({ input, output, threadsDB }) {
      const { settings: existing } = await threadsDB.getCache(input.tid);
      await threadsDB.setItem(input.threadID, {
        settings: { ...existing, enableAutoSetName: true },
      });
      output.reply(
        `${UNIRedux.arrow} **Auto Nickname Turned On** ✅\n\nNew users will now receive the set nickname.`
      );
    },
  },
  {
    key: "off",
    description: "Turn off the auto-nickname feature",
    args: [],
    icon: "❌",
    async handler({ input, output, threadsDB }) {
      const { settings: existing } = await threadsDB.getCache(input.tid);
      await threadsDB.setItem(input.threadID, {
        settings: { ...existing, enableAutoSetName: false },
      });
      output.reply(
        `${UNIRedux.arrow} **Auto Nickname Turned Off** ❌\n\nNew users will no longer receive the set nickname.`
      );
    },
  },
];

export async function event(ctx: CassidySpectra.CommandContext) {
  const { input, api, threadsDB, output } = ctx;

  if (input.type === "event" && input.logMessageType === "log:subscribe") {
    const { threadID, logMessageData } = input;
    const dataAddedParticipants = logMessageData?.addedParticipants || [];

    if (!dataAddedParticipants.length) return;

    const threadData = await threadsDB.getItem(threadID);
    const isEnabled: boolean = threadData?.settings?.enableAutoSetName || false;
    const autoNickname: AutoNickname | null = threadData?.autoNickname || null;

    if (!isEnabled || !autoNickname) return;

    for (const user of dataAddedParticipants) {
      const { userFbId: uid, fullName: userName } = user;
      try {
        const formattedNickname = checkShortCut(
          autoNickname.nickname,
          uid,
          userName
        );
        await api.changeNickname(formattedNickname, threadID, uid);
        console.log(
          `Set nickname "${formattedNickname}" for user ${uid} in thread ${threadID}`
        );
      } catch (error) {
        console.error(`Failed to set nickname for user ${uid}:`, error);
        output.reply(
          `${UNIRedux.arrow} **Error**: An error occurred while setting nickname for ${userName}. Try turning off invite link features in the group and try again later.`
        );
      }
    }
  }
}

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: true,
    globalCooldown: 3,
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
    defaultCategory: "Utility",
  },
  configs
);

import { defineEntry } from "@cass/define";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
