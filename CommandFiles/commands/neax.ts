import { NeaxScript } from "@cass-modules/NeaxScript";

export const meta: CommandMeta = {
  name: "neax",
  author: "@lianecagara",
  description:
    "Neax is a new scripting language for CassidySpectra, designed to provide a powerful and flexible interface for interacting with the Cassidy Redux chatbot. It deprecates the older CassCLI, offering enhanced command execution, permission management, and integration with virtual file systems.",
  usage:
    "Use Neax to execute scripts in a terminal-like environment. Example usage: `neax help`, `neax promote::%detectID%`, `neax ls / --json`.",
  version: "1.0.0",
  permissions: [0, 1, 2],
  botAdmin: false,
  noPrefix: false,
  requirement: "3.0.0",
  otherNames: ["nsxu", "nsx", "nscript"],
  waitingTime: 0.01,
  icon: ">_",
  category: "System",
  noLevelUI: true,
};

export const style = {
  title: ">_ Neax",
  titleFont: "bold",
  contentFont: "none",
};

/**
 * @param {CommandContext} ctx
 */
export async function entry({ input, output, ctx }: CommandContext) {
  const parser = new NeaxScript.Parser(ctx);

  const script = input.arguments.join(" ") || "help";
  const { result, code } = await parser.runAsync(
    script as NeaxScript.ValidScript
  );

  if (code !== NeaxScript.Codes.Success) {
    await output.reply(`Neax::${NeaxScript.Codes[code]} = ${result}`);
  } else {
    if (result) {
      await output.reply(result);
    }
  }
}
