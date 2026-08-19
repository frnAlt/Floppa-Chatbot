import { CanvCass } from "@cass-modules/CassieahExtras";
import { loadImage } from "@napi-rs/canvas";

export const meta: CommandMeta = {
  name: "quote",
  description: "Generate a quote image VIA CanvCass",
  author: "Liane Cagara",
  version: "2.0.1",
  usage: "{prefix}{name} <text>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["q"],
  icon: "📝",
  noLevelUI: true,
  noWeb: true,
};

export const style: CommandStyle = {
  title: "📝 Quote",
  contentFont: "fancy",
  titleFont: "bold",
};

export async function entry({
  cancelCooldown,
  output,
  args,
  prefix,
  commandName,
  uid,
  usersDB,
  userName,
}: CommandContext) {
  if (args.length === 0) {
    cancelCooldown();
    return output.reply(
      `❌ Please enter a quote.
**Example**: ${prefix}${commandName} Life is short, smile while you still have teeth.`
    );
  }

  if (!usersDB.isNumKey(uid)) {
    return output.reply("❌ Only facebook users can use this command.");
  }

  const quoteText = `“${args.join(" ")}”`;

  let url = await usersDB.getAvatarURL(uid);
  if (!url) {
    return output.reply(`❌ We cannot find your profile picture.`);
  }

  const i = await output.reply("⏳ ***Generating***\n\nPlease wait...");

  const info = await usersDB.getUserInfo(uid);

  try {
    const canv = new CanvCass(720, 720);

    const pfp = await loadImage(url);

    await canv.drawImage(pfp, canv.left, canv.top, {
      width: canv.width,
      height: canv.height,
    });

    const bottomHalfRect = CanvCass.createRect({
      top: canv.height / 2,
      left: 0,
      width: canv.width,
      height: canv.height / 2,
    });

    const gradient = canv.createDim(bottomHalfRect);

    canv.drawBox({
      rect: bottomHalfRect,
      fill: gradient,
    });

    canv.drawText(quoteText, {
      align: "center",
      vAlign: "top",
      baseline: "middle",
      fontType: "cbold",
      size: 50,
      fill: "rgba(255, 255, 255, 0.97)",
      x: canv.centerX,
      breakTo: "top",
      y: canv.bottom - 100,
      breakMaxWidth: canv.width - 60 * 2,
    });

    const name = info?.name ?? userName;

    canv.drawText(`- ${name}`, {
      align: "center",
      vAlign: "bottom",
      baseline: "middle",
      fontType: "cbold",
      size: 35,
      fill: "rgba(255, 255, 255, 0.5)",
      x: canv.centerX,
      breakTo: "top",
      y: canv.bottom - 90,
      breakMaxWidth: canv.width - 60 * 2,
    });
    await output.reply({
      body: `📝 Quote from ***${name}***:`,
      attachment: await canv.toStream(),
    });

    await output.unsend(i.messageID);
  } catch (error) {
    return output.error(error);
  }
}
