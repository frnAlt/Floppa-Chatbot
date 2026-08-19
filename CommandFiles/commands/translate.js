// @ts-check
import { translate } from "@cassidy/unispectra";
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "translate",
  otherNames: ["trans"],
  version: "1.5.0",
  author: "NTKhang | Liane",
  waitingTime: 5,
  permissions: [0],
  description: "Translate text to the desired language",
  category: "Utilities",
  icon: "🌐",
};

export const style = {
  title: "GoatTranslate | 🐐🌐",
  titleFont: "bold",
  contentFont: "none",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ output, event, args, command }) {
  /**
   *
   * @type {{ body: string }}
   */
  const { body = "" } = event;
  let content;
  let langCodeTrans;
  const langOfThread = "en";

  if (event.messageReply) {
    content = event.messageReply.body;
    let lastIndexSeparator = body.lastIndexOf("->");
    if (lastIndexSeparator == -1) lastIndexSeparator = body.lastIndexOf("=>");

    if (
      lastIndexSeparator != -1 &&
      (body.length - lastIndexSeparator == 4 ||
        body.length - lastIndexSeparator == 5)
    )
      langCodeTrans = body.slice(lastIndexSeparator + 2);
    else if ((args[0] || "").match(/\w{2,3}/))
      langCodeTrans = args[0].match(/\w{2,3}/)[0];
    else langCodeTrans = langOfThread;
  } else {
    content = event.body;
    let lastIndexSeparator = content.lastIndexOf("->");
    if (lastIndexSeparator == -1)
      lastIndexSeparator = content.lastIndexOf("=>");

    if (
      lastIndexSeparator != -1 &&
      (content.length - lastIndexSeparator == 4 ||
        content.length - lastIndexSeparator == 5)
    ) {
      langCodeTrans = content.slice(lastIndexSeparator + 2);
      content = content.slice(content.indexOf(args[0]), lastIndexSeparator);
    } else langCodeTrans = langOfThread;
  }

  if (!content) return output.syntaxError(command);

  const { text, lang } = await translate(content.trim(), langCodeTrans.trim());
  return output.reply(
    `${text}\n\n🌐 Translate from ${lang} to ${langCodeTrans}`
  );
}
