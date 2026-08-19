import _ from "lodash";
import { packageInstallerErr } from "../../handlers/loaders/util.js";
import util from "util";

import { TsObject, compileTS } from "@cass-modules/tsobject";

export const meta: CommandMeta = {
  name: "eval",
  author: "Liane",
  description:
    "Evaluate JavaScript code or Evalute Typescript Code using eval-ts, eval-dts",
  usage: "eval [code/reply to bot]",
  version: "2.0.1",
  role: 2,
  botAdmin: true,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "💻",
  waitingTime: 0.01,
  category: "Elevated",
  noLevelUI: true,
  noRibbonUI: true,
};

export async function entry(context: CommandContext) {
  const { args, output, input } = context;
  if (!input.isAdmin) return output.reply("Bruh?");
  const type = input.propertyArray[0];

  if (!args[0] && !input.is("message_reply")) {
    await output.reply(
      "⚠️ Please provide JavaScript code to evaluate.\n\nUse **eval-ts** to JIT evaluate typescript code.\nUse **eval-dts** to inspect possible types of an object."
    );
    return;
  }
  async function out(data: any, inspect: number | boolean = false) {
    const depth = typeof inspect === "boolean" ? 0 : Number(inspect);
    let str = data;
    if (typeof data !== "string") {
      str = JSON.stringify(data, null, 2);
    }
    if (!data) {
      str = String(data);
    }
    if (inspect !== false) {
      str = util.inspect(data, { depth, showHidden: true });
    }
    return output.reply({ body: str, noStyle: true });
  }

  if (type === "dts") {
    try {
      const target = (args[0] || "").split(".");
      const t = `CommandContext${target
        .map((i) => `[${JSON.stringify(i)}]`)
        .join("")}`;
      const typeObject = new TsObject(t);

      const res = `${t}:\n${typeObject.getDescription()}\n${typeObject.toString()}`;
      return output.reply(res);
    } catch (error) {
      return output.error(error);
    }
  }

  try {
    let result: any;
    while (true) {
      try {
        let code =
          input.is("message_reply") && args.length === 0
            ? input.replier.toString()
            : args.join(" ");
        if (type === "ts") {
          code = compileTS(code);
        }
        const func = new Function(
          "lodash",
          "out",
          "util",
          ...Object.keys(context),
          `return (async() => { ${code} })()`
        );
        result = await func(_, out, util, ...Object.values(context));
        break;
      } catch (error: any) {
        if (error.code === "MODULE_NOT_FOUND") {
          await output.quickWaitReact(
            `📦 ${error.message}

Are you use you want to install this package? Please send a reaction to proceed.`,
            {
              authorOnly: true,
              edit: "✅ Installing....",
            }
          );
          await packageInstallerErr(error);
          continue;
        }
        throw error;
      }
    }

    if (result !== undefined) {
      const resultInfo = util.inspect(result, { depth: 0, showHidden: true });
      await output.reply({
        body: `Returned:\n\n${resultInfo}`,
        noStyle: true,
      });
    }
  } catch (error) {
    await output.error(error);
  }
}
