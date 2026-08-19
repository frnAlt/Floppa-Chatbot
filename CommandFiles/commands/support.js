// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "supportgc",
  author: "@lianecagara",
  version: "1.0.0",
  description: "Support Group Chat!",
  otherNames: ["support", "gc"],
  usage: "{prefix}{name}",
  category: "Support",
  permissions: [0],
  waitingTime: 5,
  noPrefix: false,
  whiteList: null,
  noWeb: true,
  ext_plugins: {},
  requirement: "3.0.0",
  icon: "💗",
};

export const style = {
  title: "Support GC 💗",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} param0
 */
export async function entry({ output, input, api }) {
  const tid = `7200585553382526`;
  api.addUserToGroup(input.senderID, tid, (err) => {
    if (err) {
      output.reply(
        `❌ Failed to add you to the support group. Possibly you are already in the support group or you cannot be messaged by strangers.`
      );
    } else {
      output.reply(`✅ Successfully added you to the support group!`);
    }
  });
}
