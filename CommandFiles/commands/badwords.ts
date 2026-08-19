import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { UNIRedux } from "@cassidy/unispectra";

export interface BadWord {
  word: string;
  author: string;
}

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
  name: "badwords",
  author: "MrkimstersDev, Liane",
  description:
    "Manages a bad words filter for the thread, issuing warnings for violations",
  version: "1.0.0",
  supported: "^1.0.0",
  otherNames: ["bw", "filterwords"],
  usage: "{prefix}{name} [add|remove|view|on|off] [args]",
  category: "Moderation",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🛡️",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "🛡️ Bad Words Filter",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "add",
    description: "Add words to the bad words list",
    args: ["[word1, word2, ...]"],
    aliases: ["-a", "include"],
    icon: "➕",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "words",
      },
    ]),
    async handler(
      { input, output, threadsDB, prefix, commandName },
      { spectralArgs, key }
    ) {
      const words = spectralArgs
        .join(" ")
        .trim()
        .split(",")
        .map((word) => input.censor(word.trim().toLowerCase()))
        .filter((word) => word);

      if (!words.length) {
        return output.reply(
          `❌ Please provide words to add. Usage: ${prefix}${commandName} ${key} [word1, word2, ...]\n` +
            `Separate words with commas.`
        );
      }

      const existingConfig: { words: string[]; author: string } | null =
        (await threadsDB.queryItem(input.threadID, "badWordsConfig"))
          ?.badWordsConfig || null;

      const newWords = existingConfig
        ? words.filter((word) => !existingConfig.words.includes(word))
        : words;

      if (!newWords.length) {
        return output.reply(
          `❌ All provided words are already in the bad words list.`
        );
      }

      const updatedConfig = {
        words: existingConfig
          ? [...existingConfig.words, ...newWords]
          : newWords,
        author: input.senderID,
      };

      try {
        await threadsDB.setItem(input.threadID, {
          badWordsConfig: updatedConfig,
          settings: { filterBadWords: true },
        });
        output.reply(
          `${UNIRedux.arrow} ***Bad Words Added*** ✅\n\n` +
            `**Words Added**: ${newWords.join(", ")}\n` +
            `These words will now be filtered in the thread.`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "remove",
    description: "Remove words from the bad words list",
    args: ["[word1, word2, ...]"],
    aliases: ["-r", "delete"],
    icon: "➖",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "words",
      },
    ]),
    async handler(
      { input, output, threadsDB, prefix, commandName },
      { spectralArgs, key }
    ) {
      const words = spectralArgs
        .join(" ")
        .trim()
        .split(",")
        .map((word) => input.censor(word.trim().toLowerCase()))
        .filter((word) => word);

      if (!words.length) {
        return output.reply(
          `❌ Please provide words to remove. Usage: ${prefix}${commandName} ${key} [word1, word2, ...]\n` +
            `Separate words with commas.`
        );
      }

      const existingConfig: { words: string[]; author: string } | null =
        (await threadsDB.getItem(input.threadID))?.badWordsConfig || null;

      if (!existingConfig || !existingConfig.words.length) {
        output.reply("No bad words set to remove!");
        return;
      }

      const wordsToRemove = words.filter((word) =>
        existingConfig.words.includes(word)
      );

      if (!wordsToRemove.length) {
        return output.reply(
          `❌ None of the provided words are in the bad words list.`
        );
      }

      const updatedWords = existingConfig.words.filter(
        (word) => !wordsToRemove.includes(word)
      );

      output.waitForReaction(
        `${UNIRedux.arrow} ***Confirm Removal***\n\n` +
          `React to confirm removing the following words:\n` +
          `Words: ${wordsToRemove.join(", ")}`,
        async (ctx: CassidySpectra.CommandContext) => {
          await threadsDB.setItem(input.threadID, {
            badWordsConfig: {
              ...existingConfig,
              words: updatedWords,
            },
          });

          ctx.output.setUIName("Removed!");
          ctx.output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **Bad Words Removed** ✅\n\n` +
                `**Words Removed**: ${wordsToRemove.join(", ")}\n` +
                `These words are no longer filtered.`,
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
    key: "view",
    description: "View the current bad words list and status",
    aliases: ["-v", "show", "info"],
    args: [],
    icon: "👀",
    async handler({
      output,
      threadsDB,
      input,
      usersDB,
    }: CassidySpectra.CommandContext) {
      const threadData = await threadsDB.getItem(input.threadID);
      const badWordsConfig: { words: string[]; author: string } | null =
        threadData?.badWordsConfig || null;
      const isEnabled: boolean =
        threadData?.settings?.filterBadWords !== undefined
          ? threadData.settings.filterBadWords
          : true;

      if (!badWordsConfig || !badWordsConfig.words.length) {
        output.reply(
          `${UNIRedux.charm} **Bad Words Filter**\n` +
            `No bad words set for this thread!\n` +
            `Status: ${isEnabled ? "Enabled" : "Disabled"}`
        );
        return;
      }

      const cache = await usersDB.getCache(badWordsConfig.author);
      output.reply(
        `${UNIRedux.charm} **Bad Words Filter**\n` +
          `**Words**: ${badWordsConfig.words.join(", ")}\n` +
          `**Set by**: ${cache.name}\n` +
          `**Status**: ${isEnabled ? "Enabled" : "Disabled"}`
      );
    },
  },
  {
    key: "on",
    description: "Turn on the bad words filter",
    args: [],
    icon: "✅",
    async handler({ input, output, threadsDB }: CassidySpectra.CommandContext) {
      const threadData = await threadsDB.getItem(input.threadID);
      const { settings: existing } = await threadsDB.getCache(input.tid);
      const isEnabled: boolean =
        threadData?.settings?.filterBadWords !== undefined
          ? threadData.settings.filterBadWords
          : true;

      if (isEnabled) {
        output.reply(
          `${UNIRedux.arrow} **Bad Words Filter Already On** ✅\n\nThe bad words filter is already enabled.`
        );
        return;
      }

      await threadsDB.setItem(input.threadID, {
        settings: { ...existing, filterBadWords: true },
      });
      output.reply(
        `${UNIRedux.arrow} **Bad Words Filter Turned On** ✅\n\nMessages will now be checked for bad words.`
      );
    },
  },
  {
    key: "off",
    description: "Turn off the bad words filter",
    args: [],
    icon: "❌",
    async handler({ input, output, threadsDB }: CassidySpectra.CommandContext) {
      const { settings: existing } = await threadsDB.getCache(input.tid);
      await threadsDB.setItem(input.threadID, {
        settings: { ...existing, filterBadWords: false },
      });
      output.reply(
        `${UNIRedux.arrow} **Bad Words Filter Turned Off** ❌\n\nMessages will no longer be checked for bad words.`
      );
    },
  },
];

function hideWord(str: string): string {
  return str.length === 2
    ? str[0] + "*"
    : str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
}

export async function event(ctx: CassidySpectra.CommandContext) {
  const { input, output, threadsDB, usersDB } = ctx;

  if (!input.body) {
    return;
  }

  const threadData = await threadsDB.getCache(input.threadID);
  const isEnabled: boolean =
    threadData?.settings?.filterBadWords !== undefined
      ? threadData.settings.filterBadWords
      : true;
  const badWordsConfig: { words: string[]; author: string } | null =
    threadData?.badWordsConfig || null;

  if (!isEnabled || !badWordsConfig || !badWordsConfig.words.length) {
    return;
  }

  const isCommand = !!ctx.command;
  if (isCommand) {
    return;
  }

  const message = input.toLowerCase();
  let detectedWord: string | null = null;

  for (const word of badWordsConfig.words) {
    if (message.match(new RegExp(`\\b${word}\\b`, "gi"))) {
      detectedWord = word;
      break;
    }
  }

  if (!detectedWord) {
    return;
  }

  try {
    const userInfo = await usersDB.getUserInfo([input.senderID]);
    const userName = userInfo[input.senderID]?.name || "Trailblazer";

    let warnConfig: ThreadWarnConfig | null = threadData?.warnConfig || {
      warnings: [],
      author: input.senderID,
    };
    let userWarn = warnConfig.warnings.find((w) => w.userID === input.senderID);
    if (!userWarn) {
      userWarn = { userID: input.senderID, count: 0, reasons: [] };
      warnConfig.warnings.push(userWarn);
    }

    userWarn.count += 1;
    userWarn.reasons.push(`Used prohibited word: ${detectedWord}`);

    await threadsDB.setItem(input.threadID, {
      warnConfig: { ...warnConfig, author: input.senderID },
    });

    if (userWarn.count < 3) {
      await output.send({
        body:
          `${UNIRedux.arrow} **Warning Issued** ⚠️\n\n` +
          `${userName}, your message contains a prohibited word: ${hideWord(
            detectedWord
          )}.\n` +
          `**Warning Count**: ${userWarn.count}/3\n` +
          `Please keep the conversation respectful!\n` +
          ``,
      });
    } else {
      await output.send({
        body:
          `${UNIRedux.arrow} **Final Warning** ⚠️\n\n` +
          `${userName}, your message contains a prohibited word: ${hideWord(
            detectedWord
          )}.\n` +
          `You have reached 3 warnings and will be removed from the thread.\n` +
          ``,
      });

      try {
        await output.kick(input.senderID);
        await output.send(
          `🌌 **User Removed** 🚪\n\n` +
            `${userName} has been removed from the thread due to reaching 3 warnings.\n` +
            `**Reasons**: ${userWarn.reasons.join(", ")}\n` +
            `🚂 **Astral Express Network**`
        );
        warnConfig.warnings = warnConfig.warnings.filter(
          (w) => w.userID !== input.senderID
        );
        await threadsDB.setItem(input.threadID, { warnConfig });
      } catch (error) {
        await output.send({
          body:
            `${UNIRedux.arrow} **Error** ❌\n\n` +
            `Failed to remove ${userName} from the thread. I may need admin permissions.\n` +
            ``,
        });
      }
    }
  } catch (error) {
    console.error("Error in badwords event:", error);
    output.error(error);
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
    defaultCategory: "Moderation",
  },
  configs
);

import { defineEntry } from "@cass/define";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
