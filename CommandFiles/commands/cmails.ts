import { formatCash, formatTimeSentence } from "@cass-modules/ArielUtils";
import { Config, SpectralCMDHome } from "@cassidy/spectral-home";
import { UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "cassmails",
  version: "3.0.0",
  author: "@lianecagara",
  waitingTime: 1,
  description: "Advanced and Sophisticated way of managing mail system.",
  category: "Finance",
  noPrefix: false,
  otherNames: ["cexpress", "cmails", "mail", "mails"],
  requirement: "3.0.0",
  icon: "💵",
  requiredLevel: 5,
  cmdType: "cplx_g",
  isGame: true,
};
const charm = UNISpectra.charm;

function formatTime(time: number) {
  return formatTimeSentence(time);
}

export const style: CommandStyle = {
  title: "CassExpress 💌",
  titleFont: "bold",
  contentFont: "none",
  lineDeco: "altar",
};

export async function entry({
  input,
  output,
  money,
  CassExpress,
  prefix,
  ctx,
  Slicer,
}: CommandContext) {
  const userData = await money.getItem(input.senderID);
  const cassExpress = new CassExpress(userData.cassExpress ?? {});
  let {
    name,
    money: userMoney,
    bankData = { bank: 0, lastInterestClaimed: Date.now() },
  } = userData;
  if (!name) {
    return output.reply(
      `💌 | Sorry, we do not accept unregistered users, please use the ${prefix}identity-setname command first!`
    );
  }

  async function saveData(info: Partial<UserData>, id = input.senderID) {
    return await money.setItem(id, info);
  }

  const handlers: Config[] = [
    {
      key: "list",
      aliases: ["l", "mails", "box"],
      description: "View your mail box.",
      args: ["[page_number]"],
      async handler(_, { spectralArgs }) {
        const mails = cassExpress.getMailList().toReversed();
        const slicer = new Slicer(mails);
        const paged = slicer.getPage(spectralArgs[0]);
        return output.reply(
          `📪 **Your Mail Box**:\n\n${
            paged.length === 0
              ? `[ Page Empty ]`
              : paged
                  .map(
                    (i) =>
                      `${mails.findIndex((item) => i === item) + 1}. **${
                        i.title
                      }** ${i.isRead ? "✅" : "❌"}\n${CassExpress.formatDate(
                        i.timeStamp
                      )}\n${formatTime(Date.now() - i.timeStamp)} ago.`
                  )
                  .join("\n\n")
          }\n\nUse ${meta.name} **readmail <index>** to read.\nUse ${
            meta.name
          } **mails <page>** to navigate through pages.\n\n${CassExpress.logo}`
        );
      },
    },
    {
      key: "read",
      aliases: ["view", "open", "r"],
      description: "Read a specific mail.",
      args: ["<mail_number>"],
      async handler(_, { spectralArgs }) {
        const mails = cassExpress.getMailList();
        const num = parseInt(spectralArgs[0]);
        if (isNaN(num) || num < 1 || num > mails.length) {
          return output.reply(
            `💌 | Please enter a **valid** mail number. You currently have **${mails.length}** mails.`
          );
        }
        const mail = cassExpress.stringMailList().toReversed()[num - 1];
        const normalMail = mails.toReversed()[num - 1];
        normalMail.isRead = true;
        await saveData({
          cassExpress: cassExpress.raw(),
        });
        return output.reply(mail);
      },
    },
    {
      key: "balances",
      description: "View some of your balance",
      aliases: ["bal", "finance", "bank", "b"],
      async handler() {
        const formattedMoney = formatCash(bankData.bank);
        return output.reply(
          `📛 Hello **${name}**, here are your balances.\n\n🏦 Bank: ${formattedMoney}\n🎒 Local: ${formatCash(
            userMoney
          )}`
        );
      },
    },
    {
      key: "transactions",
      aliases: ["history", "t"],
      description: "View your bank's transaction history",
      args: ["[page_number]"],
      async handler(_, { spectralArgs }) {
        const page = spectralArgs[0];
        const mapped = cassExpress.stringBankLogs();
        const slicer = new Slicer(mapped.toReversed(), 10);
        const paged = slicer.getPage(page);
        return output.reply(
          `📄 Bank Transactions of **${name}**:\n(latest first)\n\n${
            paged.length === 0 ? "This page is empty." : paged.join("\n")
          }\n\nType **${meta.name} history <page>** to see the next page.`
        );
      },
    },
  ];

  const home = new SpectralCMDHome(
    {
      isHypen: false,
      home(_, { itemList }) {
        return output.reply(
          `${charm} Welcome **${name}** to CassExpress, please use one of our precious services.\n\n${itemList}`
        );
      },
    },
    handlers
  );
  return home.runInContext(ctx);
}
