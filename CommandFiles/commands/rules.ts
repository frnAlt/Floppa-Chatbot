import { SpectralCMDHome, Config } from "../modules/spectralCMDHome";
import { UNIRedux, UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "rules",
  description: "Manage server rules",
  otherNames: ["rule", "rulz", "law"],
  version: "1.0.0",
  usage: "{prefix}{name} [add|remove|list] [...args]",
  category: "Moderation",
  author: "@lianecagara",
  role: 1,
  noPrefix: false,
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "📜",
};

export const style = {
  title: "📜 Rules",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "add",
    description: "Add a new rule (max 100 chars)",
    args: ["<...rule sentence>"],
    aliases: ["-a"],
    icon: "➕",
    async handler({ input, output, threadsDB }, { spectralArgs }) {
      const ruleText = spectralArgs.join(" ").trim();

      if (!ruleText) {
        return output.reply("Please provide a rule to add!");
      }

      if (ruleText.length > 100) {
        return output.reply("Rule must be 100 characters or less!");
      }

      try {
        const { rules = [] } = await threadsDB.getItem(input.threadID);

        if (rules.length >= 10) {
          return output.reply("Maximum of 10 rules reached!");
        }

        const updatedRules = [...rules, ruleText];
        await threadsDB.set(input.threadID, { rules: updatedRules });

        output.reply(
          `${UNIRedux.arrow} ***Rule Added*** ✅\n\n` +
            `${UNISpectra.nextArrow} ${ruleText}\n` +
            `Rule #${updatedRules.length} of 10`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "remove",
    description: "Remove a rule by number",
    args: ["<number>"],
    aliases: ["-r"],
    icon: "➖",
    async handler({ input, output, threadsDB }, { spectralArgs }) {
      const ruleNum = parseInt(spectralArgs[0]);

      if (isNaN(ruleNum)) {
        return output.reply("Please provide a valid rule number!");
      }

      try {
        const { rules = [] } = await threadsDB.getItem(input.threadID);

        if (!rules.length) {
          return output.reply("No rules to remove!");
        }

        if (ruleNum < 1 || ruleNum > rules.length) {
          return output.reply(
            `Please select a rule between 1 and ${rules.length}!`
          );
        }

        const updatedRules = rules.filter((_, i) => i !== ruleNum - 1);
        await threadsDB.set(input.threadID, { rules: updatedRules });

        output.reply(
          `${UNIRedux.arrow} ***Rule Removed*** ✅\n\n` +
            `Rule #${ruleNum} has been deleted`
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "list",
    description: "List all rules",
    aliases: ["-l", "show"],
    icon: "📋",
    async handler({ input, output, threadsDB }) {
      try {
        const { rules = [] } = await threadsDB.getItem(input.threadID);

        if (!rules.length) {
          return output.reply("No rules set yet!");
        }

        const ruleList = rules
          .map(
            (rule: string, i: number) =>
              `${UNISpectra.nextArrow} ${i + 1}. ${rule}`
          )
          .join("\n");

        output.reply(
          `${UNIRedux.charm} 📋 **Server Rules** (${rules.length}/10):\n\n` +
            `${ruleList}`
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
    defaultKey: "help",
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
