import { abbreviateNumber, UNIRedux, UNISpectra } from "@cassidy/unispectra";
import {
  getMinimumChange,
  isNoChange,
  parseBet,
} from "@cass-modules/ArielUtils";
import { FontSystem } from "cassidy-styler";
import { InventoryItem, UserData } from "@cass-modules/cassidyUser";
import { Inventory } from "@cass-modules/InventoryEnhanced";
const { fonts } = FontSystem;

const ACBANK_LOGO = fonts.serif("AC-BANK");
const ABANK_LOGO = fonts.serif("A-BANK");
const ABANK_LINE = UNISpectra.getLine(18);

export const meta: CommandMeta = {
  name: "abank",
  version: "3.0.15",
  author: "Duke Agustin (Original), Coded by Liane Cagara",
  waitingTime: 1,
  description: `Manage your finances and items with Ariel-Cass's Bank (Personalized Edition) (${ACBANK_LOGO}/${ABANK_LOGO} ®).`,
  category: "Finance",
  noPrefix: false,
  otherNames: ["bank", "arielbank", "b", "ac", "acbank"],
  requirement: "3.0.0",
  icon: "🏦",
  requiredLevel: 5,
  cmdType: "arl_g",
  isGame: true,
};

export interface Award {
  type: string;
  info: string;
  date: number;
}

const { invLimit } = Cassidy;
export const ABANK_ITEM_SLOT = 5;
export const ABANK_ITEM_STACK = 20;
export const ABANK_EMPTY_SLOT = "_".repeat(15);

export function listABANKItems(bankDataItems: Inventory<InventoryItem>) {
  bankDataItems.resanitize();
  const uniqueItems = bankDataItems.toUnique();
  const paddingNeeded = ABANK_ITEM_SLOT - uniqueItems.length;

  const itemLines = uniqueItems.map((i) =>
    listABANKItem(i, bankDataItems.getAmount(i.key))
  );

  const paddingLines = Array(Math.max(paddingNeeded, 0)).fill(ABANK_EMPTY_SLOT);

  return [...itemLines, ...paddingLines].join("\n");
}

export function listABANKItem(
  item: Partial<InventoryItem> = {},
  count: number,
  limit: number = ABANK_ITEM_STACK
) {
  return `${item.icon} ${item.name} (${item.key}) ${
    typeof count === "number" && count > 1 ? `「 ${count}/${limit} 」` : ""
  }`;
}

export const styleH: CommandStyle = {
  title: {
    content: `🏦 ${ABANK_LOGO} ®`,
    text_font: "none",
    line_bottom: "18chars",
  },
  content: {
    text_font: "none",
    line_bottom: "hidden",
  },
  footer: {
    content: "",
  },
};

export const style0: CommandStyle = {};

export const styleC: CommandStyle = {
  title: {
    content: `🏦 ${ACBANK_LOGO} ®`,
    text_font: "none",
    line_bottom: "default",
  },
  titleFont: "none",
  contentFont: "fancy",
  footer: {
    content: "",
  },
  lineDeco: "altar",
};

const NOTIF_AC = `🏦 ${fonts.bold("ARIEL-CASS NOTIF")} 👩🏻‍💼`;
const NOTIF_A = `🏦 ${fonts.bold("ARIEL NOTIF")} 👩🏻‍💼`;

export const notifStyleC: CommandStyle = {
  title: {
    content: `${NOTIF_AC}`,
    text_font: "none",
    line_bottom: "default",
  },
  titleFont: "none",
  contentFont: "fancy",
  footer: {
    content: "",
  },
  lineDeco: "altar",
};
export const notifStyle0: CommandStyle = {
  title: {
    content: `${NOTIF_A}`,
    text_font: "none",
    line_bottom: "18chars",
  },
  content: {
    text_font: "none",
    line_bottom: "hidden",
  },
  footer: {
    content: "",
  },
};

export const limitKey = "bank_reach_limit";
const percentLimit = 1e-154;

const formatTrophy = (data: UserData & { awards?: Award[] }) => {
  return `${
    Array.isArray(data.awards) && data.awards.some((i) => i.type === limitKey)
      ? `🏆 ${fonts.bold(
          `${getTrophy(data).length > 1 ? `x${getTrophy(data).length} ` : ""}`
        )}${fonts.double_struck(data.bankData?.nickname ?? "Not registered")}`
      : `${data.bankData?.nickname ?? "Not Registered"}`
  }`;
};

const getTrophy = (data: UserData & { awards?: Award[] }) =>
  (data.awards ?? []).filter((i) => i.type === limitKey);

const deductTrophy = (data: UserData & { awards?: Award[] }) => {
  const awards = data.awards ?? [];
  const latest = getTrophy(data)
    .sort((a, b) => b?.date - a.date)
    .at(0);
  if (latest) {
    const ind = awards.indexOf(latest);
    if (ind === -1) {
      throw new Error("???");
    }
    awards.splice(ind, 1);

    data.awards = awards;
  } else {
    throw new Error("???");
  }
};

const formatCashORIG = (amount = 0, abbr = true) =>
  `${
    abbr ? `(**${abbreviateNumber(amount)}**) ` : ""
  }${amount.toLocaleString()} 💵`;

const formatCashA = (amount = 0, abbr = true) =>
  `${abbr ? `(**${abbreviateNumber(amount)}**) ` : ""} ${amount} 💵`;

export async function entry({
  input,
  output,
  money,
  args,
  CassExpress,
  prefix,
  commandName,
}: CommandContext) {
  const userData = await money.getItem(input.senderID);

  const cassExpress = new CassExpress(userData.cassExpress ?? {});
  let {
    name,
    money: userMoney,
    bankData = { bank: 0, nickname: null, items: null },
  } = userData;
  let bankDataItems = new Inventory(bankData.items ?? [], 100);
  const targetNotif = bankDataItems.size() > 0 ? notifStyleC : notifStyle0;
  const targetStyle = bankDataItems.size() > 0 ? styleC : style0;
  const targetStyleH = bankDataItems.size() > 0 ? styleC : styleH;
  const ABANK = bankDataItems.size() > 0 ? ACBANK_LOGO : ABANK_LOGO;
  const isAC = bankDataItems.size() > 0;
  const formatCash = isAC ? formatCashORIG : formatCashA;
  const inventory = new Inventory(userData.inventory ?? [], invLimit);
  const line = isAC ? UNIRedux.standardLine : ABANK_LINE;

  bankData.bank = Math.min(bankData.bank, Number.MAX_VALUE);

  if (!name) {
    return output.replyStyled(
      `Sorry, you must register your name with ${prefix}identity-setname first!`,
      targetNotif
    );
  }
  if (bankData.bank >= Number.MAX_VALUE) {
    await saveTrophy(userData, saveData, input.senderID);
  }
  if (!args[0]) {
    args.unshift(input.propertyArray[0]);
  }
  const targetArgs = String(args[0]).toLowerCase();

  async function saveData(info: Partial<UserData>, id = input.senderID) {
    return await money.setItem(id, info);
  }
  const trophys = getTrophy(userData);
  const extraLine = isAC ? "" : `${line}\n`;
  const extraLineBottom = isAC ? "" : `\n${line}`;

  const handlers = {
    async register() {
      if (bankData.nickname) {
        return output.replyStyled(
          `You already have an ${ABANK} ® account with nickname: ${bankData.nickname}.`,
          targetNotif
        );
      }
      const nickname = args[1];
      const all = await money.getAllCache();

      if (
        !nickname ||
        nickname.length < 3 ||
        Object.values(all)
          .map((i) => i.bankData)
          .filter(Boolean)
          .some((i) => i?.nickname === nickname)
      ) {
        return output.replyStyled(
          `Please provide a valid nickname (at least 3 characters) for your ${ABANK} ® account.`,
          targetNotif
        );
      }
      bankData.nickname = nickname;
      bankData.bank = (bankData.bank ?? 0) + 1000;
      cassExpress.bankInLog(1000);
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.replyStyled(
        `${extraLine}${fonts.bold(
          `Your ${ABANK} ® account created successfully`
        )}\n${line}\nFree ${formatCash(1000)} upon register.`,
        targetStyle
      );
    },
    async check() {
      let targetData = userData;
      const id = input.detectID ?? args[1];
      let isPeek = false;
      if (id) {
        if (await money.exists(id)) {
          const da = await money.getItem(id);
          targetData = da;
          isPeek = true;
        } else {
          const target = await money.queryItem({
            "value.bankData.nickname": id,
          });
          if (target) {
            targetData = target;
            isPeek = true;
          }
        }
      }
      if (id && !isPeek) {
        return output.replyStyled(
          `The user does not have a ${ABANK} ® account with the given nickname.`,
          targetNotif
        );
      }
      if (!targetData.bankData?.nickname) {
        return output.replyStyled(
          `You do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          targetNotif
        );
      }
      const bdataItems = new Inventory(targetData.bankData?.items ?? [], 100);

      const itemStr = listABANKItems(bdataItems);

      return output.replyStyled(
        `${
          trophys.length > 0 ? `🏆 ***Bank Awardee*** 🏆\n${line}\n` : ""
        }${extraLine}${UNISpectra.arrowFromT} ${isPeek ? `**Peeking**: ` : ""}${
          targetData.userMeta?.name ?? targetData.name
        }\n${line}\n${trophys.length > 0 ? "👑" : "💳"}: ${formatTrophy(
          targetData
        )}\n${formatCash(targetData.bankData?.bank)}${
          bdataItems.size() > 0 || trophys.length > 0 || !isAC
            ? `\n${line}`
            : ""
        }${
          trophys.length > 0 && !isPeek
            ? `\n${UNIRedux.arrow} You can still withdraw your old bank if you have **zero** bank balance. It will also remove your trophy.`
            : ""
        }${
          bdataItems.size() > 0
            ? `\n${UNIRedux.arrowBW} Items 🛍️\n\n${itemStr || "No items."}`
            : ""
        }`,
        targetStyle
      );
    },
    async withdraw() {
      if (!bankData.nickname) {
        return output.replyStyled(
          `You do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          targetNotif
        );
      }
      const bet = args[1];
      let isRemoveT = bankData.bank === 0 && trophys.length > 0;
      let funds = !isRemoveT ? bankData.bank : Number.MAX_VALUE;

      let amount = parseBet(bet, funds);
      if (isNaN(amount) && args[1]) {
        if (isNaN(amount) && bet) {
          const split = bet.split("*");
          const itemKey = split[0];
          const maxAmount = bankDataItems.getAmount(itemKey);
          if (maxAmount === 0) {
            return output.replyStyled(
              `You do not have an item with "${itemKey}" in your ${ABANK} ® account.`,
              targetNotif
            );
          }
          const itemAmount = Math.min(
            maxAmount,
            Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
          );
          if (inventory.size() + itemAmount > invLimit) {
            return output.replyStyled(
              `You're carrying too many items!`,
              targetNotif
            );
          }
          if (itemAmount === 0) {
            return output.replyStyled(
              `No items were withdrawn from your ${ABANK} ® account.`,
              targetNotif
            );
          }
          const itemsToDeposit = bankDataItems
            .get(itemKey)
            .slice(0, itemAmount);
          if (itemsToDeposit.length === 0) {
            return output.wentWrong();
          }

          bankDataItems.deleteRefs(itemsToDeposit);
          inventory.add(itemsToDeposit);
          bankData.items = bankDataItems.raw();
          await saveData(
            {
              inventory: inventory.raw(),
              bankData,
            },
            input.senderID
          );
          const itemStr = listABANKItems(bankDataItems);

          return output.replyStyled(
            `${extraLine}${fonts.bold(
              "Successfully"
            )} withdrew:\n${listABANKItem(
              itemsToDeposit[0],
              itemAmount
            )}\nFrom your ${ABANK} ® account.\n${line}\n${
              UNIRedux.arrowBW
            } Items 🛍️\n\n${itemStr || "No items."}${extraLineBottom}`,
            targetStyle
          );
        }
      }
      if (amount < funds * percentLimit) {
        return output.replyStyled(
          `You cannot withdraw a value lower than ${formatCash(
            Math.floor(funds * percentLimit)
          )}`,
          targetNotif
        );
      }

      if (isNaN(amount) || amount <= 0 || amount > funds) {
        return output.replyStyled(
          `Please provide a valid amount to withdraw. Your ${ABANK} ® balance is ${formatCash(
            funds
          )}.`,
          targetNotif
        );
      }
      if (isNoChange(amount, userMoney)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(userMoney)
          )} won't affect your balance and isn't allowed.`,
          targetNotif
        );
      }
      if (isNoChange(amount, bankData.bank)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(bankData.bank)
          )} won't affect your bank balance and isn't allowed.`,
          targetNotif
        );
      }

      userMoney += amount;
      if (userMoney >= Number.MAX_VALUE) {
        return output.replyStyled(
          `Your balance might reach the maximum number limit.`,
          targetNotif
        );
      }
      funds -= amount;
      if (isRemoveT) {
        deductTrophy(userData);
      }

      bankData.bank = funds;
      cassExpress.bankOutLog(amount);
      await saveData({
        money: userMoney,
        awards: userData.awards,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.replyStyled(
        `${
          isRemoveT ? `🏆❌ **Trophy Removed**\n${line}\n` : ""
        }${extraLine}${fonts.bold("Successfully")} withdrew:\n${formatCash(
          amount
        )}\nfrom your ${ABANK} ® account.`,
        targetStyle
      );
    },
    async deposit() {
      if (!bankData.nickname) {
        return output.replyStyled(
          `You do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          targetNotif
        );
      }
      if (bankData.bank >= Number.MAX_VALUE) {
        return output.replyStyled(
          `Your ${ABANK} ® account reached the maximum number limit.`,
          targetNotif
        );
      }
      const bet = args[1];
      let amount = parseBet(bet, userMoney);
      if (isNaN(amount) && bet) {
        const split = bet.split("*");
        const itemKey = split[0];
        if (
          bankDataItems.uniqueSize() >= ABANK_ITEM_SLOT &&
          !bankDataItems.has(itemKey)
        ) {
          return output.replyStyled(
            `The item slots in your ${ABANK} ® account are full.`,
            targetNotif
          );
        }
        const maxAmount = inventory.getAmount(itemKey);
        if (maxAmount === 0) {
          return output.replyStyled(
            `You do not have an item with "${itemKey}" in your inventory.`,
            targetNotif
          );
        }
        const maxDepositPossible =
          ABANK_ITEM_STACK - bankDataItems.getAmount(itemKey);

        if (maxDepositPossible <= 0) {
          return output.replyStyled(
            `Your ${ABANK} ® account is full for "${itemKey}". Cannot deposit more.`,
            targetNotif
          );
        }

        let itemAmount = Math.min(
          maxAmount,
          Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
        );

        itemAmount = Math.min(itemAmount, maxDepositPossible);

        if (itemAmount === 0) {
          return output.replyStyled(
            `No items were deposited into your ${ABANK} ® account.`,
            targetNotif
          );
        }
        const itemsToDeposit = inventory.get(itemKey).slice(0, itemAmount);
        if (itemsToDeposit.length === 0) {
          return output.wentWrong();
        }

        inventory.deleteRefs(itemsToDeposit);
        bankDataItems.add(itemsToDeposit);
        bankData.items = bankDataItems.raw();
        await saveData(
          {
            inventory: inventory.raw(),
            bankData,
          },
          input.senderID
        );
        const itemStr = listABANKItems(bankDataItems);

        return output.replyStyled(
          `${extraLine}${fonts.bold(
            "Successfully"
          )} deposited:\n${listABANKItem(
            itemsToDeposit[0],
            itemAmount
          )}\nTo your ${ABANK} ® account.\n${line}\n${
            UNIRedux.arrowBW
          } Items 🛍️\n\n${itemStr || "No items."}${extraLineBottom}`,
          targetStyle
        );
      }
      amount = Math.min(amount, Number.MAX_VALUE - amount);
      if (amount < userMoney * percentLimit) {
        return output.replyStyled(
          `You cannot deposit a value lower than ${formatCash(
            Math.floor(userMoney * percentLimit)
          )}`,
          targetNotif
        );
      }

      if (isNaN(amount) || amount <= 0 || amount > userMoney) {
        return output.replyStyled(
          `Please provide a valid amount to deposit. Your wallet balance is ${formatCash(
            userMoney
          )}.`,
          targetNotif
        );
      }
      if (isNoChange(amount, userMoney)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(userMoney)
          )} won't affect your balance and isn't allowed.`,
          targetNotif
        );
      }
      if (isNoChange(amount, bankData.bank)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(bankData.bank)
          )} won't affect your bank balance and isn't allowed.`,
          targetNotif
        );
      }
      userMoney -= amount;
      bankData.bank += amount;

      cassExpress.bankInLog(amount);
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.replyStyled(
        `${extraLine}${fonts.bold("Successfully")} deposited:\n${formatCash(
          amount
        )}\nto your ${ABANK} ® account.`,
        targetStyle
      );
    },
    async transfer() {
      if (!bankData.nickname) {
        return output.replyStyled(
          `You do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          targetNotif
        );
      }
      const recipientNickname = args[1];
      const bet = args[2];
      if (!recipientNickname) {
        return output.replyStyled(
          `Please provide a valid recipient's nickname and amount to transfer. Usage: ${prefix}${commandName} transfer <nickname> <amount>`,
          targetNotif
        );
      }

      let amount = parseBet(bet, bankData.bank);
      if (isNaN(amount) && bet) {
        const split = bet.split("*");
        const itemKey = split[0];

        const recipient = await money.queryItem({
          "value.bankData.nickname": recipientNickname,
        });
        if (recipient?.bankData?.nickname !== recipientNickname) {
          return output.replyStyled(
            `The recipient does not have a ${ABANK} ® account with the given nickname.`,
            targetNotif
          );
        }
        if (recipient?.userID === input.senderID) {
          return output.replyStyled(
            `You cannot transfer any items to your own ${ABANK} ® account.`,
            targetNotif
          );
        }

        const recipientItems = new Inventory(recipient.bankData?.items, 100);
        const senderItems = bankDataItems;
        const rnick = recipient.bankData?.nickname;

        if (recipientItems.size() <= 0) {
          return output.replyStyled(
            `The recipient does not have an ${ACBANK_LOGO} ® account but it has an ${ABANK_LOGO} ® account.`,
            targetNotif
          );
        }

        if (
          recipientItems.uniqueSize() >= ABANK_ITEM_SLOT &&
          !recipientItems.has(itemKey)
        ) {
          return output.replyStyled(
            `The item slots in ${rnick}'s ${ABANK} ® account are full.`,
            targetNotif
          );
        }
        const maxAmount = senderItems.getAmount(itemKey);
        if (maxAmount === 0) {
          return output.replyStyled(
            `You do not have an item with "${itemKey}" in your ${ABANK} ® account.`,
            targetNotif
          );
        }
        const maxTransPossible =
          ABANK_ITEM_STACK - recipientItems.getAmount(itemKey);

        if (maxTransPossible <= 0) {
          return output.replyStyled(
            `${rnick}'s ${ABANK} ® account is full for "${itemKey}". Cannot transfer more.`,
            targetNotif
          );
        }

        let itemAmount = Math.min(
          maxAmount,
          Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
        );

        itemAmount = Math.min(itemAmount, maxTransPossible);

        if (itemAmount === 0) {
          return output.replyStyled(
            `No items were transferred into ${rnick}'s ${ABANK} ® account.`,
            targetNotif
          );
        }
        const itemsToDeposit = senderItems.get(itemKey).slice(0, itemAmount);
        if (itemsToDeposit.length === 0) {
          return output.wentWrong();
        }

        senderItems.deleteRefs(itemsToDeposit);
        recipientItems.add(itemsToDeposit);
        bankData.items = senderItems.raw();
        recipient.bankData.items = recipientItems.raw();
        await saveData(
          {
            bankData,
          },
          input.senderID
        );
        await saveData(
          {
            bankData: recipient.bankData,
          },
          recipient.userID
        );
        const senderStr = listABANKItems(senderItems);
        const recipientStr = listABANKItems(recipientItems);

        return output.replyStyled(
          `${extraLine}${fonts.bold(
            "Successfully"
          )} transferred:\n${listABANKItem(
            itemsToDeposit[0],
            itemAmount
          )}\n${line}\n${UNIRedux.arrowBW} Your Items 🛍️\n\n${
            senderStr || "No items."
          }\n${line}\n${fonts.bold("Receiver")}: ${formatTrophy(
            recipient
          )}\n➣ ${recipient.userMeta?.name ?? recipient.name} 🛍️\n\n${
            recipientStr || "No items."
          }${extraLineBottom}`,
          targetStyle
        );
      }
      if (amount < bankData.bank * percentLimit) {
        return output.replyStyled(
          `You cannot transfer a value lower than ${formatCash(
            Math.floor(bankData.bank * percentLimit)
          )}`,
          targetNotif
        );
      }

      if (isNaN(amount) || amount <= 0) {
        return output.replyStyled(
          `You cannot transfer an invalid amount.`,
          targetNotif
        );
      }
      if (amount > bankData.bank) {
        return output.replyStyled(
          `You do not have enough value to transfer.`,
          targetNotif
        );
      }

      const recipient = await money.queryItem({
        "value.bankData.nickname": recipientNickname,
      });
      if (recipient?.bankData?.nickname !== recipientNickname) {
        return output.replyStyled(
          `The recipient does not have a ${ABANK} ® account with the given nickname.`,
          targetNotif
        );
      }

      if (recipient?.userID === input.senderID) {
        return output.replyStyled(
          `You cannot transfer any amount to your own ${ABANK} ® account.`,
          targetNotif
        );
      }

      const recipientID = recipient.userID;
      amount = Math.min(amount, Number.MAX_VALUE - amount);
      if (recipient.bankData.bank >= Number.MAX_VALUE) {
        return output.replyStyled(
          `Your ${ABANK} ® account reached the maximum number limit.`,
          targetNotif
        );
      }

      if (isNoChange(amount, bankData.bank)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(bankData.bank)
          )} won't affect your bank balance and isn't allowed.`,
          targetNotif
        );
      }

      if (isNoChange(amount, recipient.bankData.bank)) {
        return output.replyStyled(
          `Any amount below ${formatCash(
            getMinimumChange(recipient.bankData.bank)
          )} won't affect the recipient's bank balance and isn't allowed.`,
          targetNotif
        );
      }
      bankData.bank -= amount;
      recipient.bankData.bank += amount;
      const rcassExpress = new CassExpress(recipient.cassExpress ?? {});

      cassExpress.bankOutLog(amount);
      rcassExpress.bankInLog(amount);

      await saveData(
        {
          money: userMoney,
          bankData,
          cassExpress: cassExpress.raw(),
        },
        input.senderID
      );
      await saveData(
        {
          money: recipient.money,
          bankData: recipient.bankData,
          cassExpress: rcassExpress.raw(),
        },
        recipientID
      );
      return output.replyStyled(
        `${extraLine}${fonts.bold("Successfully")} transferred: ${formatCash(
          amount
        )}\n${line}\n${fonts.bold("Receiver")}: ${formatTrophy(recipient)}\n➣ ${
          recipient.userMeta?.name ?? recipient.name
        }`,
        targetStyle
      );
    },
    async rename() {
      if (!bankData.nickname) {
        return output.replyStyled(
          `You do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          targetNotif
        );
      }
      const all = await money.getAllCache();
      const newNickname = args[1];

      if (
        !newNickname ||
        newNickname.length < 3 ||
        Object.values(all)
          .map((i) => i.bankData)
          .filter(Boolean)
          .some(
            (i) =>
              i?.nickname === newNickname && i.nickname !== bankData.nickname
          )
      ) {
        return output.replyStyled(
          `Please provide a valid new nickname (at least 3 characters) for your ${ABANK} ® account.`,
          targetNotif
        );
      }
      bankData.nickname = newNickname;
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.replyStyled(
        `${extraLine}${fonts.bold(
          "Successfully"
        )} renamed your ${ABANK} ® account to: ${newNickname}.`,
        targetStyle
      );
    },
    async top() {
      let page = isAC ? parseInt(args[1]) : 1;
      let lim = isAC ? 10 : parseInt(args[1]) || 10;
      if (!args[1] || isNaN(page)) {
        page = 1;
      }
      const per = 10;
      const allUsers = await money.getAll();
      let sortedUsers = Object.entries(allUsers)
        .filter(
          ([_, u]) =>
            typeof u.bankData?.bank === "number" && u.bankData?.nickname
        )
        .sort(
          ([, a], [, b]) =>
            b.bankData.bank * 1e-220 +
            Number.MAX_VALUE * 1e-220 * getTrophy(b).length -
            (a.bankData.bank * 1e-220 +
              Number.MAX_VALUE * 1e-220 * getTrophy(a).length)
        )
        .slice((page - 1) * per, page * per);
      if (!isAC && !isNaN(lim)) {
        sortedUsers = sortedUsers.slice(0, lim);
      }
      let title = `${line}\n【 ${fonts.bold("TOP")} ${
        !isAC ? lim : 10
      } ${fonts.bold("BANK BALANCES")} 】\n`;
      let result = ``;
      sortedUsers.forEach(([_, user], index) => {
        result += `━━━━━━ ${
          index + 1 + (page - 1) * per
        } ━━━━━━\n☐ ${fonts.bold("name")}: ${
          user.userMeta?.name ?? user.name
        }\n${UNISpectra.arrowFromT} ${formatTrophy(user)}\n${
          !isAC
            ? formatCash(user.bankData.bank || 0).replaceAll("💵", "")
            : abbreviateNumber(user.bankData.bank, 2, true)
        }\n`;
      });
      return output.replyStyled(result, {
        ...targetStyle,
        ...(isAC
          ? {
              title: {
                content: title,
                line_bottom: "hidden",
                text_font: isAC ? "fancy" : "none",
              },
            }
          : {
              title: {
                content: title,
                line_bottom: "hidden",
                text_font: "none",
              },
            }),
      });
    },
    async trophy() {
      if (!input.isAdmin) {
        return output.replyStyled(
          `You do not have an administrator-typed ${ABANK} ® account.`,
          targetNotif
        );
      }
      const recipientNickname = args[1];
      const allUsers = await money.getAll();
      const recipient = Object.values(allUsers).find(
        (u) => u.bankData?.nickname === recipientNickname
      );
      if (
        !recipient ||
        recipient?.userID === input.senderID ||
        !recipient.bankData?.bank
      ) {
        return output.replyStyled(
          `The recipient does not have a ${ABANK} ® account with the given nickname.`,
          targetNotif
        );
      }
      const recipientID = Object.keys(allUsers).find(
        (id) => allUsers[id].bankData?.nickname === recipientNickname
      );

      if (recipient.bankData.bank < Number.MAX_VALUE * 0.9) {
        return output.replyStyled(
          `The recipient does not deserve a trophy in ${ABANK} ®`,
          targetNotif
        );
      }
      await saveTrophy(recipient, saveData, recipientID);
      return output.replyStyled(`🏆 **Success**!`, targetStyle);
    },
    async stalk() {
      let targetData = userData;
      const id = input.detectID ?? args[1];
      let isPeek = false;
      if (!id) {
        return output.replyStyled(
          `Please provide a user ID, nickname, or reply to a message to stalk a user.`,
          targetNotif
        );
      }
      if (id) {
        if (await money.exists(id)) {
          const da = await money.getItem(id);
          targetData = da;
          isPeek = true;
        } else {
          const target = await money.queryItem({
            "value.bankData.nickname": id,
          });
          if (target) {
            targetData = target;
            isPeek = true;
          }
        }
      }
      if (id && !isPeek) {
        return output.replyStyled(
          `This user does not have an existing ${ABANK} ® account.`,
          targetNotif
        );
      }

      return output.replyStyled(
        `UserID: ${targetData.userID}\nNickname: ${formatTrophy(
          targetData
        )}\nName: ${
          targetData?.userMeta?.name ?? targetData.name
        }\nBalance: ${formatCash(targetData.bankData?.bank)}`,
        {
          ...targetStyle,
          title: {
            content: `🏦 ${fonts.bold("STALKER")} 👀`,
            line_bottom: "default",
          },
        }
      );
    },
  };

  const targetHandler =
    handlers[
      Object.keys(handlers).find(
        (i) =>
          i === targetArgs ||
          (["r"].includes(targetArgs) && i === "register") ||
          (["c"].includes(targetArgs) && i === "check") ||
          (["w"].includes(targetArgs) && i === "withdraw") ||
          (["d"].includes(targetArgs) && i === "deposit") ||
          (["t"].includes(targetArgs) && i === "transfer") ||
          (["rn"].includes(targetArgs) && i === "rename") ||
          (["s"].includes(targetArgs) && i === "stalk")
      )
    ];
  if (typeof targetHandler === "function") {
    await targetHandler();
  } else {
    return output.replyStyled(
      `${fonts.bold("Usages")}:\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} register/r <nickname>\` - Create a ${ABANK} ® account.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} check/c <uid | reply | nickname>\` - Check your ${ABANK} ® balance.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} withdraw/w <amount>\` - Withdraw money or items (ex: apple*5) from your ${ABANK} ® account.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} deposit/d <amount>\` - Deposit money or items (ex: apple*5) to your ${ABANK} ® account.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} transfer/t <nickName> <amount>\` - Transfer money to another user.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} rename/rn\` - Rename your ${ABANK} ® nickname.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} top <page=1>\` - Check the top 10 richest users of ${ABANK} ®.\n${
        UNISpectra.arrowFromT
      } \`${prefix}${commandName} stalk\` - Check someone's ${ABANK} ® balance.`,
      targetStyleH
    );
  }
}
async function saveTrophy(
  recipient: UserData,
  saveData: (info: Partial<UserData>, id?: string) => Promise<void>,
  recipientID: string
) {
  recipient.awards ??= [];

  const awards: Award[] = recipient.awards;

  awards.push({
    type: limitKey,
    info: "Reached the Maximum!",
    date: Date.now(),
  });
  recipient.bankData.bank = 0;

  await saveData({ awards, bankData: recipient.bankData }, recipientID);
}
