import { CanvCass } from "@cass-modules/CassieahExtras";

export const meta: CommandMeta = {
  name: "snews",
  description: "Generate a satire news image via CanvCass",
  author: "Liane Cagara",
  version: "1.0.5",
  usage: "{prefix}{name} <headline> | [url]",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["satirenews"],
  icon: "📰",
  noLevelUI: true,
  noWeb: true,
};

export const style: CommandStyle = {
  title: "📰 Satire News",
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
      `❌ Please enter a headline and an optional photo.
**Example**: ${prefix}${commandName} Scientists Discover Cats Rule the World | https://example.com/example-image\n\n(You can also reply with a photo to use it as background.)`
    );
  }

  if (!usersDB.isNumKey(uid) && !input.isAdmin) {
    return output.reply("❌ Only Facebook users can use this command.");
  }

  const pfpURL = await usersDB.getAvatarURL(uid);

  let [argsText, bg] = input.splitArgs("|");
  if (bg && !input.isAdmin) {
    return output.reply(`❌ Only bot admin can specify URL.`);
  }
  bg ||= input.replier?.attachmentUrls[0];
  bg ||= pfpURL;

  if (!bg) {
    return output.reply(`❌ We cannot find a proper background image`);
  }

  if (!isValidURL(bg)) {
    return output.reply(`❌ The provided background image URL is invalid`);
  }

  let isBgDifferent = bg !== pfpURL;

  const i = await output.reply("⏳ ***Generating***\n\nPlease wait...");

  await usersDB.ensureUserInfo(uid);
  const info = await usersDB.getUserInfo(uid);

  if (info?.name === "Unknown User") {
    delete info.name;
  }

  const name = info?.name ?? userName;

  const headline = `${name} claims that ${argsText}`;
  let times = 0;

  while (true) {
    times++;
    try {
      const canv = new CanvCass(720, 720);
      await canv.drawBackground();
      const margin = 55;

      await utils.delay(500);
      const pfp = await CanvCass.loadImage(bg);
      await canv.drawImage(pfp, canv.left, canv.top, {
        width: canv.width,
        maximizeFit: true,
      });

      const bottomHalf = CanvCass.createRect({
        bottom: canv.bottom,
        left: 0,
        width: canv.width,
        height: canv.height / 1.1,
      });
      const gradient = canv.createDim(bottomHalf, { color: "rgba(0,0,0,1)" });
      canv.drawBox({ rect: bottomHalf, fill: gradient });

      const headlineRect = CanvCass.createRect({
        top: canv.bottom - 200,
        left: margin,
        width: canv.width - margin * 2,
        height: 100,
      });
      const headlineResult = canv.drawText(headline, {
        align: "left",
        vAlign: "top",
        baseline: "middle",
        fontType: "cbold",
        size: 38,
        fill: "white",
        x: headlineRect.left,
        breakTo: "top",
        y: headlineRect.bottom,
        breakMaxWidth: headlineRect.width,
        yMargin: 4,
      });

      // canv.drawBox({
      //   rect: headlineResult.rect,
      //   fill: "rgba(255, 0, 0, 0.2)",
      // });

      if (isBgDifferent || 1) {
        const cw = (canv.width - margin * 2) / 3;

        const circleBox = CanvCass.createRect({
          left: canv.left + margin,
          bottom: headlineResult.rect.top - headlineResult.lineHeight / 2,
          width: cw,
          height: cw,
        });

        const ccc: [number, number] = [circleBox.centerX, circleBox.centerY];
        const r = cw / 2;

        const circlePath = CanvCass.createCirclePath(ccc, r);
        await utils.delay(500);

        await canv.drawImage(pfpURL, circleBox.left, circleBox.top, {
          width: cw,
          height: cw,
          clipTo: circlePath,
        });

        canv.drawCircle(ccc, r, { stroke: CanvCass.colorA, strokeWidth: 5 });
      }

      const lineH = 4;
      const lineTop = headlineRect.bottom + 20;
      const lineLeft = margin;
      const lineW = canv.width - margin * 2;

      const lineRectA = CanvCass.createRect({
        top: lineTop,
        left: lineLeft,
        width: lineW / 2,
        height: lineH,
      });
      const lineRectB = CanvCass.createRect({
        top: lineTop,
        left: lineLeft + lineW / 2,
        width: lineW / 2,
        height: lineH,
      });
      canv.drawBox({ rect: lineRectA, fill: CanvCass.colorA });
      canv.drawBox({ rect: lineRectB, fill: CanvCass.colorB });
      const mm = canv.width / 4;

      const logoRect = CanvCass.createRect({
        width: canv.width - mm * 2,
        height: 20,
        left: canv.left + mm,
        top: lineRectA.bottom + 10,
      });
      canv.drawText("CassNews", {
        align: "left",
        vAlign: "top",
        fontType: "cbold",
        size: logoRect.height,
        x: logoRect.left,
        y: logoRect.bottom,
        fill: "cyan",
      });
      canv.drawText("News and Nonsense", {
        align: "left",
        vAlign: "bottom",
        fontType: "cnormal",
        size: 10,
        x: logoRect.left,
        y: logoRect.bottom + 2,
        fill: "white",
      });

      canv.drawText("Note: This is purely a work of satire", {
        align: "right",
        vAlign: "top",
        baseline: "middle",
        fontType: "cnormal",
        size: 15,
        fill: "rgba(255,255,255,0.6)",
        x: logoRect.right,
        y: logoRect.bottom,
      });

      await output.reply({
        body: `📰 Satire news from ***${name}***:`,
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

function isValidURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
