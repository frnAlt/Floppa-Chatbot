import {
  SpectralCMDHome,
  CassCheckly,
  Config,
} from "../modules/spectralCMDHome";
import { limitString, UNIRedux, UNISpectra } from "@cassidy/unispectra";

interface Shortcut {
  detect: string;
  respond: string;
  author: string;
}

export const meta: CommandMeta = {
  name: "shortcut",
  description: "Manage message shortcuts",
  otherNames: ["sc", "shortcuts"],
  version: "1.0.0",
  usage: "{prefix}{name} [view|set|delete|reset] [args]",
  category: "Thread",
  author: "@lianecagara",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🔗",
  noWeb: true,
};

export const style = {
  title: "🔗 Shortcuts",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "view",
    description: "View all shortcuts or a specific one",
    aliases: ["-v", "show"],
    args: ["[number]"],
    icon: "👀",
    async handler(
      { output, threadsDB, input, usersDB, prefix, commandName },
      { spectralArgs }
    ) {
      const shortcuts: Shortcut[] =
        (await threadsDB.queryItem(input.threadID, "shortcuts"))?.shortcuts ||
        [];

      if (spectralArgs[0]) {
        const index = parseInt(spectralArgs[0]) - 1;
        if (index >= 0 && index < shortcuts.length) {
          const sc = shortcuts[index];
          const cache = await usersDB.getCache(sc.author);
          output.reply(
            `${UNIRedux.charm} **Shortcut #${index + 1}**\n` +
              `**Detect**: ${limitString(sc.detect, 20)}\n` +
              `**Author**: ${cache.name}`
          );
        } else {
          output.reply("Invalid shortcut number!");
        }
        return;
      }

      if (!shortcuts.length) {
        output.reply("No shortcuts set!");
        return;
      }

      const shortcutList = (
        await Promise.all(
          shortcuts.map(
            async (sc, i) =>
              `${i + 1}. "${sc.detect}" ${UNISpectra.arrowBW} "${
                sc.respond
              }" (by ${(await usersDB.getCache(sc.author)).name})`
          )
        )
      ).join("\n");

      output.reply(
        `${UNIRedux.charm} **Shortcuts**:\n${shortcutList}\n\n` +
          `Use **${prefix}${commandName}-set [detect=>respond]** to add a shortcut`
      );
    },
  },
  {
    key: "set",
    description: "Set a new shortcut",
    args: ["[detect=>respond]"],
    aliases: ["-s", "add"],
    icon: "✏️",

    async handler(
      { input, output, threadsDB, prefix, commandName },
      { spectralArgs, key }
    ) {
      let [detect, respond] = spectralArgs
        .join(" ")
        .split("=>")
        .map((s) => s.trim());
      respond = limitString(respond, 500);
      detect = input.censor(detect);
      respond = input.censor(respond);

      if (!respond) {
        return output.reply(
          `❌ Wrong syntax, type ${prefix}${commandName}-help ${key}`
        );
      }
      const shortcuts: Shortcut[] =
        (await threadsDB.queryItem(input.threadID, "shortcuts"))?.shortcuts ||
        [];

      const shortcut = shortcuts.find((i) => i.detect === detect);
      if (shortcut) {
        await output.quickWaitReact(
          `${UNIRedux.arrow} ***Confirm Override***\n\n` +
            `React to confirm deleting/overriding an existing shortcut:\n` +
            `Detect: "${shortcut.detect}" ${UNISpectra.arrow} Respond: "${shortcut.respond}"`,
          {
            authorOnly: true,
            edit: "✅",
          }
        );
        shortcuts.splice(shortcuts.indexOf(shortcut), 1);
      }

      shortcuts.push({
        detect,
        respond,
        author: input.senderID,
      });

      try {
        await threadsDB.setItem(input.threadID, { shortcuts });
        output.reply(
          `${UNIRedux.arrow} ***Shortcut Added*** ✅\n\n` +
            `**Detect**: "${detect}"\n` +
            `**Respond**: "${respond}"`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "delete",
    description: "Delete a shortcut",
    args: ["[number]"],
    aliases: ["-d", "remove"],
    icon: "🗑️",
    validator: new CassCheckly([
      {
        index: 0,
        type: "number",
        required: true,
        name: "number",
      },
    ]),
    async handler({ input, output, threadsDB }, { spectralArgs }) {
      const index = parseInt(spectralArgs[0]) - 1;
      const shortcuts: Shortcut[] =
        (await threadsDB.getItem(input.threadID))?.shortcuts || [];

      if (index < 0 || index >= shortcuts.length) {
        output.reply("Invalid shortcut number!");
        return;
      }

      const shortcut = shortcuts[index];
      output.waitForReaction(
        `${UNIRedux.arrow} ***Confirm Deletion***\n\n` +
          `React to confirm deleting shortcut:\n` +
          `Detect: "${shortcut.detect}" ${UNISpectra.arrow} Respond: "${shortcut.respond}"`,
        async (ctx) => {
          shortcuts.splice(index, 1);
          await threadsDB.setItem(input.threadID, { shortcuts });

          ctx.output.setUIName("Deleted!");
          ctx.output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **Shortcut Deleted** ✅\n\n` +
                `Removed: "${shortcut.detect}" → "${shortcut.respond}"`,
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
    description: "Reset all shortcuts",
    aliases: ["-r", "clear"],
    icon: "🔄",
    async handler({ input, output, threadsDB }) {
      output.waitForReaction(
        `${UNIRedux.arrow} ***Confirm Reset***\n\n` +
          `React to confirm deleting ALL shortcuts.`,
        async (ctx) => {
          await threadsDB.setItem(input.threadID, { shortcuts: [] });

          ctx.output.setUIName("Reset!");
          ctx.output.replyStyled(
            {
              body: `${UNIRedux.arrow} **All Shortcuts Cleared** ✅`,
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
];

export async function event(ctx: CassidySpectra.CommandContext) {
  const { input, output, threadsDB } = ctx;
  const shortcuts: Shortcut[] =
    (await threadsDB.getItem(input.threadID))?.shortcuts || [];

  for (const shortcut of shortcuts) {
    if (`${input}` === shortcut.detect) {
      await output.reply(input.censor(shortcut.respond));
      break;
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
