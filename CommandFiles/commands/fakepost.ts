import { CanvCass } from "@cass-modules/CassieahExtras";
import { randomInt } from "node:crypto";

export const meta: CommandMeta = {
  name: "fpost",
  description: "Generate a fake FB post image via CanvCass",
  author: "Liane Cagara",
  version: "2.0.0",
  usage: "{prefix}{name} <caption>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["fakepost"],
  icon: "📰",
  noLevelUI: true,
  noWeb: true,
};

export const style: CommandStyle = {
  title: "💬 Fake Wall Post",
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
  input,
}: CommandContext) {
  if (!args[0]) {
    cancelCooldown();
    return output.reply(
      `❌ Please enter a caption for a fake post.
**Example**: ${prefix}${commandName} Ang cute mo bwiset.`
    );
  }

  if (!usersDB.isNumKey(uid) && !input.isAdmin) {
    return output.reply("❌ Only Facebook users can use this command.");
  }

  const pfpURL = await usersDB.getAvatarURL(uid);

  const argsText = args.join(" ");

  const i = await output.reply("⏳ ***Generating***\n\nPlease wait...");

  await usersDB.ensureUserInfo(uid);
  const info = await usersDB.getUserInfo(uid);

  if (info?.name === "Unknown User") {
    delete info.name;
  }

  const name = info?.name ?? userName;

  const caption = `${argsText}`;
  let times = 0;

  while (true) {
    times++;
    try {
      const canv = new CanvCass(720, 720);
      canv.drawBox({
        rect: canv,
        fill: "rgba(34, 38, 37, 1)",
      });
      const lw = "rgba(173, 177, 180, 1)";
      const pfps = 70;
      const buttonss = 55;
      const margin = 20;
      const margin2 = 10;
      const ym = 3;
      const header = CanvCass.createRect({
        height: pfps + margin * 2,
        width: canv.width - margin * 2,
        left: canv.left + margin,
        top: canv.top + margin * 2,
      });
      const pfpBox = CanvCass.createRect({
        width: pfps,
        height: pfps,
        left: header.left,
        top: header.top,
      });
      const pfpPath = CanvCass.createCirclePath(
        [pfpBox.centerX, pfpBox.centerY],
        pfpBox.width / 2
      );

      await utils.delay(500);

      const pfp = await CanvCass.loadImage(pfpURL);

      await canv.drawImage(pfp, pfpBox.left, pfpBox.top, {
        width: pfpBox.width,
        height: pfpBox.height,
        clipTo: pfpPath,
      });

      canv.drawFromPath(pfpPath, {
        stroke: "rgba(146, 141, 145, 1)",
        strokeWidth: 2,
      });

      const lw2 = "rgba(97, 101, 100, 1)";

      canv.drawLine(
        [canv.left, header.top - margin],
        [canv.right, header.top - margin],
        {
          stroke: lw2,
          strokeWidth: 2,
        }
      );
      canv.drawLine(
        [canv.left, header.top - margin - 7],
        [canv.right, header.top - margin - 7],
        {
          stroke: lw2,
          strokeWidth: 2,
        }
      );

      canv.drawText(name, {
        vAlign: "top",
        y: pfpBox.centerY - ym,
        x: pfpBox.right + margin2,
        align: "left",
        size: 25,
        fontType: "cbold",
        fill: "white",
      });
      canv.drawText(`${randomInt(1, 12)}h  •  Public`, {
        vAlign: "bottom",
        y: pfpBox.centerY + ym,
        x: pfpBox.right + margin2,
        align: "left",
        size: 20,
        fontType: "cnormal",
        fill: lw,
      });
      canv.drawText(`•••`, {
        vAlign: "top",
        y: pfpBox.centerY - ym,
        x: header.right,
        align: "right",
        size: 20,
        fontType: "cnormal",
        fill: lw,
      });

      const captionTxtsize = 48;
      const reactsize = 25;

      const wallImg = CanvCass.createRect({
        height: canv.width / (16 / 9),
        width: canv.width - margin * 2,
        centerX: canv.centerX,
        top: header.bottom - margin,
      });

      const gradient = canv.tiltedGradient(
        wallImg.width,
        wallImg.height,
        -Math.PI / 4,
        [
          [0, "rgba(255, 0, 71, 1)"],
          [1, "rgba(44, 52, 199, 1)"],
        ]
      );

      canv.drawBox({
        rect: wallImg,
        fill: gradient,
        cornerRadius: 20,
      });
      canv.withClip(CanvCass.rectToPath(wallImg), () => {
        canv.drawText(caption, {
          y: wallImg.centerY + 4,
          x: wallImg.centerX + 4,
          align: "center",
          size: captionTxtsize,
          fontType: "cbold",
          breakTo: "center",
          breakMaxWidth: wallImg.width - margin * 2,
          fill: "rgba(255, 255, 255, 1)",
          yMargin: 5,
        });
      });

      const footer = CanvCass.createRect({
        height: buttonss + margin * 2,
        width: canv.width,
        centerX: canv.centerX,
        top: wallImg.bottom + reactsize + 4,
      });

      canv.drawText(`❤️👍 ${randomInt(3, 576)}K`, {
        size: reactsize,
        fontType: "cnormal",
        align: "left",
        x: footer.left + margin,
        y: footer.top - 4,
        fill: "white",
      });

      const amount = 3;
      const bsp = 15;
      const btw = (canv.width - (amount + 1) * bsp) / amount;
      const contents = [`👍 Like`, `💬 Comment`, `✈️ Share`];
      for (let i = 0; i < amount; i++) {
        const content = contents.at(i);
        const rect = CanvCass.createRect({
          left: canv.left + i * (btw + bsp) + bsp,
          width: btw,
          height: buttonss,
          centerY: footer.centerY,
        });
        canv.drawBox({
          fill: "rgba(55, 59, 58, 1)",
          rect,
          cornerRadius: rect.height / 2,
        });
        canv.drawText(content ?? "??", {
          size: reactsize,
          fontType: "cbold",
          align: "center",
          x: rect.centerX,
          y: rect.centerY,
          fill: lw,
        });
      }

      await output.reply({
        body: `💬 Fake post from ***${name}***:`,
        attachment: await canv.toStream(),
      });

      await output.unsend(i.messageID);
      break;
    } catch (error) {
      if (times >= 4) {
        return output.error(error);
      }
      await utils.delay(1000);
      continue;
    }
  }
}
