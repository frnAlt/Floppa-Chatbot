// @ts-check

import { defineHome } from "@cass/define";
import { limitString, UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "busy",
  description:
    "Turning do not disturb mode which notifies a user whenever they tag you.",
  author: "@lianecagara",
  version: "1.0.0",
  usage: "{prefix}busy",
  category: "Thread",
  role: 0,
  botAdmin: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "⛔",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "🔕 Busy",
  titleFont: "bold",
  contentFont: "fancy",
};

export const entry = defineHome(
  {
    isHypen: true,
  },
  [
    {
      key: "set",
      description: "Sets/enables a busy message.",
      args: ["...<reasons>"],
      icon: "✅",
      aliases: ["-s"],
      async handler(
        { input, output, money, prefix, commandName },
        { spectralArgs, key }
      ) {
        const reason = limitString(spectralArgs.join(" "), 100);
        if (!reason.length) {
          return output.reply(
            `❌ Please enter a **reason** as arguments, maximum of 100 characters.\n\n${UNISpectra.arrow} ***Example***\n${prefix}${commandName}-${key} DO NOT MENTION ME I HATE YOU.`
          );
        }
        await money.setItem(input.sid, {
          busyReason: reason,
        });
        return output.reply(
          `${UNISpectra.arrow} ***Busy Reason Applied!***\n\n${UNISpectra.arrowFromT} "${reason}"`
        );
      },
    },
    {
      key: "check",
      description: "Checks your existing busy message.",
      args: ["...<reasons>"],
      icon: "❔",
      aliases: ["-ch"],
      async handler({ input, output, money, prefix, commandName }, { key }) {
        const reason = (await money.queryItem(input.sid, "busyReason"))
          ?.busyReason;
        return output.reply(
          `${UNISpectra.arrow} ***Busy Reason***\n\n${UNISpectra.arrowFromT} ${
            reason ||
            `No busy reason configured. Use ${prefix}${commandName}-${key} to add a reason.`
          }`
        );
      },
    },
    {
      key: "remove",
      description: "Permanently resets/disables a busy message.",
      args: ["...<reasons>"],
      icon: "❌",
      aliases: ["-r"],
      async handler({ input, output }) {
        await output.reply(
          `${UNISpectra.arrow} ***Confirmation Required**\n\nThis action will **erase** your existing busy reason. Reply with **yes** to proceed.`
        );
        return output.reply(
          async ({ output, money, input: repInput, detectID }) => {
            if (repInput.senderID !== input.senderID) {
              return;
            }
            const reason = (await money.queryItem(repInput.sid, "busyReason"))
              ?.busyReason;

            await money.setItem(repInput.sid, {
              busyReason: null,
            });

            input.delReply(String(detectID));
            return output.reply(
              `${UNISpectra.arrow} ***Busy Reason Removed!***\n\n${UNISpectra.arrowFromT} "${reason}"`
            );
          }
        );
      },
    },
  ]
);

export async function event({
  input,
  output,
  money,
  hasPrefix,
}: CommandContext) {
  if (input.isWeb || hasPrefix) {
    return;
  }
  const { mentions } = input;

  if (!mentions || Object.keys(mentions).length == 0) return;
  const arrayMentions = Object.keys(mentions);
  let res = [];

  for (const userID of arrayMentions) {
    const { busyReason: reason, name } = await money.getCache(userID);
    if (reason) {
      res.push(`🗨️ 👤 **${name}**: "${reason}"`);
    }
  }

  if (res.length > 0) {
    return output.replyStyled(
      `${UNISpectra.arrow} ***Busy Notification***\n\n${res.join("\n\n")}`,
      style
    );
  }
}
