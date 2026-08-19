// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "fbcover",
  description: "Create a Facebook Cover Photo.",
  author: "Deku",
  version: "1.0.0",
  usage: "{prefix}fbcover <name> | <number> | <address> | <email> | <color>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  botAdmin: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "📷",
  deku: true,
  noWeb: true,
};

export const style = {
  title: "📷 FB Cover",
  titleFont: "bold",
  contentFont: "fancy",
};

import { DekuAlt } from "@cass-modules/deku-api";

/**
 * @param {CassidySpectra.CommandContext} ctx
 */
export async function entry({
  event,
  input,
  output,
  args,
  money,
  threadsDB,
  prefix,
}) {
  const opts = input.splitArgs("|");
  const [name, number, address, email, color] = opts;

  if (opts.length < 5) {
    return output.reply(
      `❌ ***Incorrect Syntax***\n\n**Guide:** ${meta.usage}`.replaceAll(
        "{prefix}",
        prefix
      )
    );
  }

  const i = await output.reply("⏳ ***Generating***\n\nPlease wait...");

  const [nameA, ...nameB] = name.split(" ");
  const nameBStr = nameB.join(" ");

  const params = {
    name: nameA,
    subname: nameBStr,
    sdt: number,
    address,
    email: email,
    uid: event.originalEvent?.senderID ?? input.sid,
    color,
  };

  const { data: image } = await DekuAlt.get("/canvas/fbcover", {
    params,
    responseType: "stream",
  });

  await output.reply({
    body: `✅ ***Cover Generated***\n\n${Object.entries(params)
      .map((i) => `**${i[0].toTitleCase()}**: ${i[1]}`)
      .join("\n")}`,
    attachment: image,
  });

  await output.unsend(i.messageID);
}
