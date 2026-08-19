import { OutputSent } from "@cass-modules/OutputClass";

export const meta: CommandMeta = {
  name: "catfact",
  author: "@lianecagara",
  description: "Get a random cat fact",
  usage: "{prefix}catfact",
  category: "Fun",
  version: "2.0.0",
  role: 0,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🐱",
};

const { delay } = global.utils;

export const Style: Cassieah.StyleFC = ({ children }) => {
  let len = 13;
  return (
    <>
      <title linelength={len} font="bold_italic">
        <charm /> Cat Fact 🐱
      </title>
      <content font="fancy">
        <arrow /> {children}
      </content>
      <line length={len}></line>
    </>
  );
};

export async function entry({ output, input }: CommandContext) {
  try {
    let i: OutputSent;
    if (!input.isWeb) {
      i = await output.reply(`MEOW!`);
    }
    const { fact } = await output.req("https://catfact.ninja/fact");

    await delay(1000);

    if (i) {
      output.edit(fact, i.messageID);

      await delay(5000);

      output.edit(
        `${fact}

Do you love cassidy bot? ^^`,
        i.messageID,
      );
    } else {
      output.reply(fact);
    }

    output.reaction("😺");
  } catch (error) {
    console.error("Error fetching cat fact:", error);
    output.reply(
      "Sorry, I couldn't fetch a cat fact at the moment. Please try again later.",
    );
  }
}
