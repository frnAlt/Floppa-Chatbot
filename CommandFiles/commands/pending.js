// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "pending",
  version: "1.0.0",
  otherNames: ["pend"],
  author: "MrkimstersDev | Liane Cagara",
  description: "Approve or cancel pending threads for the bot.",
  usage: "{prefix}pending",
  category: "Elevated",
  permissions: [2],
  waitingTime: 5,
  noPrefix: false,
  fbOnly: true,
  icon: "💬",
};

export const style = {
  title: "💬 Pending",
  titleFont: "bold",
  contentFont: "fancy",
};

const langs = {
  en: {
    invaildNumber: "%1 is **not** a valid number",
    cancelSuccess: "Refused **%1 thread(s)**!",
    approveSuccess: "Approved successfully **%1 thread(s)**!",
    cantGetPendingList: "Can't get the pending list!",
    returnListPending:
      "The whole number of threads to approve is: **%1 thread(s)**\n\n%2",
    returnListClean: "There is **no thread** in the pending list",
  },
};

/**
 * Polyfill so that GoatBot getLang will work.
 * Cassidy has no getLang pero soon magkakaron na.
 * @param {string} key
 * @param {any[]} args
 */
function getLang(key, ...args) {
  let text = langs.en[key] || `❌ Language Key Missing for "${key}"`;
  args.forEach((arg, i) => {
    text = text.replace(`%${i + 1}`, arg);
  });
  return text;
}

/**
 * Entry point for the pending command.
 * @param {CommandContext} param0
 */
export async function entry({ api, event, input, output }) {
  let msg = "",
    index = 1;

  try {
    const spam = (await api.getThreadList(100, null, ["OTHER"])) || [];
    const pending = (await api.getThreadList(100, null, ["PENDING"])) || [];
    const list = [...spam, ...pending].filter(
      (group) => group.isSubscribed && group.isGroup
    );

    for (const single of list) {
      msg += `${index++}/ ${single.name} (${single.threadID})\n`;
    }

    if (list.length !== 0) {
      const replyMessage = getLang(
        "returnListPending",
        String(list.length),
        msg
      );
      const sentMsg = await output.reply(replyMessage);
      input.setReply(sentMsg.messageID, {
        // @ts-ignore
        callback: onReply,
        data: {
          author: event.senderID,
          pending: list,
        },
      });
    } else {
      await output.reply(getLang("returnListClean"));
    }
  } catch (e) {
    await output.reply(getLang("cantGetPendingList"));
  }
}

/**
 * Handles reply to the pending list message.
 * Manually invoked ng input.setReply as callback
 * @param {CommandContext & { repObj: { data: any } }} ctx
 */
export async function onReply({ api, event, output, repObj: { data } }) {
  const { body, senderID } = event;
  const approvalMessage = "Your thread has been approved!";

  if (!data || String(senderID) !== String(data.author)) return;

  let count = 0;
  const pendingList = data.pending;

  if (
    isNaN(body) &&
    (body.toLowerCase().startsWith("c") ||
      body.toLowerCase().startsWith("cancel"))
  ) {
    const sliceIndex = body.toLowerCase().startsWith("cancel") ? 6 : 1;
    const indices = body.slice(sliceIndex).trim().split(/\s+/);
    for (const singleIndex of indices) {
      const num = parseInt(singleIndex, 10);
      if (isNaN(num) || num <= 0 || num > pendingList.length) {
        return output.reply(getLang("invalidNumber", singleIndex));
      }
      await api.removeUserFromGroup(
        api.getCurrentUserID(),
        pendingList[num - 1].threadID
      );
      count++;
    }

    return output.reply(getLang("cancelSuccess", count));
  } else {
    const indices = body.split(/\s+/);
    for (const singleIndex of indices) {
      const num = parseInt(singleIndex, 10);
      if (isNaN(num) || num <= 0 || num > pendingList.length) {
        return output.reply(getLang("invalidNumber", singleIndex));
      }
      await output.send(approvalMessage, pendingList[num - 1].threadID);
      count++;
    }
    return output.reply(getLang("approveSuccess", count));
  }
}
