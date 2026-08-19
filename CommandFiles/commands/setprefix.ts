import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { UNIRedux, UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "setprefix",
  description: "Set or view the command prefix",
  otherNames: ["pfx", "changeprefix", "sprefix", "pref"],
  version: "1.0.0",
  usage: "{prefix}{name} [newPrefix]",
  category: "Moderation",
  author: "@lianecagara",
  permissions: [0],
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🔧",
  noWeb: true,
};

export const style = {
  title: "🔧 Prefix",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "view",
    description: "View the current prefix",
    aliases: ["-v", "show"],
    icon: "👀",
    async handler(
      { output, prefix, prefixes, threadsDB, input, commandName },
      { itemList }
    ) {
      const currentPrefix = prefix;
      const { threadPrefix } = await threadsDB.getItem(input.threadID);

      output.reply(
        `${UNIRedux.charm} **Current Prefix**:\n${currentPrefix}\n\n` +
          `${UNIRedux.arrowFromT} **Extra Prefixes**:\n[ ${prefixes.join(
            ", "
          )} ]\n\n` +
          (threadPrefix
            ? `${UNIRedux.arrowFromT} **Custom Prefix**:\n${threadPrefix}\n\n`
            : "") +
          `${UNIRedux.arrow} ***All Options***:\n\n${itemList}\n\n` +
          `Use **${currentPrefix}${commandName}-set [newPrefix]** to set a custom prefix.`
      );
    },
  },
  {
    key: "set",
    description: "Set a new command prefix",
    args: ["[newPrefix]"],
    aliases: ["-s"],
    icon: "✏️",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        required: true,
        name: "newPrefix",
        regex: /^[^\s]{1,5}$/,
      },
    ]),
    async handler({ input, output, prefix, threadsDB }, { spectralArgs }) {
      const newPrefix = spectralArgs[0];

      try {
        output.waitForReaction(
          `${UNIRedux.arrow} ***Confirmation Required***\n\nReact with any emoji to confirm the update to the new prefix.`,
          async (ctx) => {
            await threadsDB.setItem(input.threadID, {
              threadPrefix: newPrefix,
            });

            ctx.output.setUIName("Confirmed!");
            ctx.output.replyStyled(
              {
                body:
                  `${UNIRedux.arrow} ***Prefix Updated*** ✅\n\n` +
                  `The prefix has been changed from **${prefix}** to **${newPrefix}**.\n\n` +
                  `${UNISpectra.arrowFromT} Use **${newPrefix}start** to explore the list of available commands!`,
                messageID: ctx.input.messageID,
                noRibbonUI: true,
                noLevelUI: true,
              },
              style
            );
          }
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "reset",
    description: "Reset prefix to default",
    aliases: ["-r"],
    icon: "🔄",
    async handler({ input, output, threadsDB }) {
      const defaultPrefix = global.Cassidy.config.PREFIX;

      try {
        await threadsDB.remove(input.threadID, ["threadPrefix"]);
        await output.reply(
          `${UNIRedux.arrow} ***Prefix Reset*** ✅\n\n` +
            `${UNIRedux.arrowFromT} Now using **default**: ${defaultPrefix}`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: true,
    globalCooldown: 3,
    defaultKey: "view",
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
