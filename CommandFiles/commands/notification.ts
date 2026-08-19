import { UNISpectra } from "@cassidy/unispectra";
import { StrictOutputForm } from "output-cassidy";

export const meta: CommandMeta = {
  name: "notification",
  version: "1.2.0",
  otherNames: ["notify", "noti"],
  author: "Christus | Liane",
  description: "Send Notification to all threads.",
  usage: "{prefix}notification [message]",
  category: "Elevated",
  role: 1.5,
  waitingTime: 30,
  fbOnly: true,
  icon: "📡",
};

export const style: CommandStyle = {
  title: "📡 Notification",
  titleFont: "bold",
  contentFont: "fancy",
};

export async function entry({
  api,
  event,
  input,
  output,
  args,
  usersDB,
}: CommandContext) {
  const messageContent = args.join(" ");
  const senderID = event.senderID;

  if (
    !messageContent &&
    input.attachments.length === 0 &&
    !input.messageReply
  ) {
    return output.reply(`❌ **Error**: Please enter a message.`);
  }

  try {
    const userInfo = await usersDB.getUserInfo(input.senderID);
    const realName = userInfo?.name || "Unknown Admin";

    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Abidjan",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Abidjan",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const currentDate = new Intl.DateTimeFormat("fr-FR", dateOptions).format(
      new Date()
    );
    const currentTime = new Intl.DateTimeFormat("fr-FR", timeOptions).format(
      new Date()
    );

    const threadList = await api.getThreadList(400, null, ["INBOX"]);
    const groups = threadList.filter(
      (t) => t.isGroup && t.isSubscribed && t.threadID !== event.threadID
    );

    if (groups.length === 0) return output.reply("🏜️ No available groups.");

    const attachments = [
      ...input.attachments,
      ...(input.messageReply?.attachments || []),
    ].filter((item) =>
      ["photo", "video", "audio", "animated_image"].includes(item.type)
    );

    await output.reply(
      `📡 **Sending...**\n\n` +
        `👤 Admin: ${realName}\n` +
        `🎯 Groups: ${groups.length}\n` +
        `🌍 Time: (${currentTime})\n`
    );

    let success = 0;
    let failed = 0;

    for (const group of groups) {
      try {
        const groupName = group.name || "Unnamed";
        const tagName = `@${realName}`;

        const broadcastBody =
          `╔════════════════╗\n` +
          `   📢 **NOTIFICATION**\n` +
          `╚════════════════╝\n\n` +
          `${messageContent}\n\n` +
          `${UNISpectra.standardLine}` +
          `🔰 **Group**: ${groupName}\n` +
          `👤 **Admin**: ${tagName}\n` +
          `📅 **Date**: ${currentDate}\n` +
          `🕒 **Time**: ${currentTime} (CI)\n`;
        const msgObject: StrictOutputForm = {
          body: broadcastBody,
          mentions: [{ tag: tagName, id: senderID }],
          attachment: attachments.length > 0 ? attachments : undefined,
        };

        await output.send(msgObject, group.threadID.toString());
        success++;

        await utils.delay(800);
      } catch (e) {
        failed++;
      }
    }

    const finalReport =
      `🏁 **Report**\n` +
      `${UNISpectra.standardLine}\n` +
      `✅ Success: ${success}\n` +
      `❌ Failed: ${failed}\n`;

    return output.reply(finalReport);
  } catch (err) {
    console.error(err);
    return output.error(err);
  }
}
