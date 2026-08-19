import { UNIRedux } from "@cassidy/unispectra";
import { parseBet } from "@cass-modules/ArielUtils";
import { FontSystem } from "cassidy-styler";
import { InventoryItem, UserData } from "@cass-modules/cassidyUser";
import { Inventory } from "@cass-modules/InventoryEnhanced";
const { fonts } = FontSystem;

const REMOTEBAG = fonts.serif("REMOTE-BAG");

export const meta: CommandMeta = {
  name: "remotebag",
  version: "1.0.2",
  author: "Adapted from Duke's Ariel's Bank by Liane Cagara",
  waitingTime: 1,
  description: `Manage your items with Remote Bag (${REMOTEBAG} ®). Store, retrieve, and transfer items with upgradable slots.`,
  category: "Inventory",
  noPrefix: false,
  otherNames: ["rbag", "rembag", "bag"],
  requirement: "3.0.0",
  icon: "🎒",
  requiredLevel: 5,
  cmdType: "arl_g",
  isGame: true,
};

export const REMOTEBAG_INITIAL_SLOTS = 8;
export const REMOTEBAG_MAX_SLOTS = 16;
export const REMOTEBAG_INITIAL_STACK = 20;
export const REMOTEBAG_MAX_STACK = 80;
export const REMOTEBAG_EMPTY_SLOT = "_".repeat(15);

export function listRemoteBagItems(
  bagDataItems: Inventory<InventoryItem>,
  slotLimit: number,
  stackLimit: number
) {
  bagDataItems.resanitize();
  const uniqueItems = bagDataItems.toUnique();
  const paddingNeeded = slotLimit - uniqueItems.length;

  const itemLines = uniqueItems.map((i) =>
    listRemoteBagItem(i, bagDataItems.getAmount(i.key), stackLimit)
  );

  const paddingLines = Array(Math.max(paddingNeeded, 0)).fill(
    REMOTEBAG_EMPTY_SLOT
  );

  return [...itemLines, ...paddingLines].join("\n");
}

export function listRemoteBagItem(
  item: Partial<InventoryItem> = {},
  count: number,
  limit: number
) {
  return `${item.icon} ${item.name} (${item.key}) ${
    typeof count === "number" && count > 1 ? `「 ${count}/${limit} 」` : ""
  }`;
}

export const style: CommandStyle = {
  title: {
    content: `🎒 ${REMOTEBAG} ®`,
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

export const notifStyle: CommandStyle = {
  title: {
    content: `🎒 ${fonts.bold("BAG NOTIF")} 👩‍💼`,
    text_font: "none",
    line_bottom: "default",
  },
  titleFont: "none",
  contentFont: "none",
  footer: {
    content: "",
  },
  lineDeco: "altar",
};

export async function entry({
  input,
  output,
  money,
  args,
  prefix,
  commandName,
}: CommandContext) {
  const userData = await money.getItem(input.senderID);
  let {
    name,
    bagData = {
      nickname: null,
      items: null,
      slots: REMOTEBAG_INITIAL_SLOTS,
      stackLimit: REMOTEBAG_INITIAL_STACK,
    },
  } = userData;
  let bagDataItems = new Inventory(
    bagData.items ?? [],
    bagData.slots * bagData.stackLimit
  );
  const inventory = new Inventory(userData.inventory ?? [], Cassidy.invLimit);

  if (!name) {
    return output.replyStyled(
      `Sorry, you must register your name with ${prefix}identity-setname first!`,
      notifStyle
    );
  }

  if (!args[0]) {
    args.unshift(input.propertyArray[0]);
  }
  const targetArgs = String(args[0]).toLowerCase();

  async function saveData(info: Partial<UserData>, id = input.senderID) {
    return await money.setItem(id, info);
  }

  const handlers = {
    async register() {
      if (bagData.nickname) {
        return output.replyStyled(
          `You already have a ${REMOTEBAG} ® account with nickname: ${bagData.nickname}.`,
          notifStyle
        );
      }
      const nickname = args[1];
      if (!nickname || nickname.length < 3) {
        return output.replyStyled(
          `Please provide a valid nickname (at least 3 characters) for your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      bagData.nickname = nickname;
      bagData.slots = REMOTEBAG_INITIAL_SLOTS;
      bagData.stackLimit = REMOTEBAG_INITIAL_STACK;
      await saveData({
        bagData,
      });
      return output.replyStyled(
        `${fonts.bold(`Your ${REMOTEBAG} ® account created successfully`)}\n${
          UNIRedux.standardLine
        }\nInitialized with ${bagData.slots} slots and ${
          bagData.stackLimit
        } items per slot.`,
        style
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
            "value.bagData.nickname": id,
          });
          if (target) {
            targetData = target;
            isPeek = true;
          }
        }
      }
      if (id && !isPeek) {
        return output.replyStyled(
          `The user does not have a ${REMOTEBAG} ® account with the given nickname.`,
          notifStyle
        );
      }
      if (!targetData.bagData?.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const bdataItems = new Inventory(
        targetData.bagData?.items ?? [],
        targetData.bagData.slots * targetData.bagData.stackLimit
      );

      const itemStr = listRemoteBagItems(
        bdataItems,
        targetData.bagData.slots,
        targetData.bagData.stackLimit
      );

      return output.replyStyled(
        `➥ ${isPeek ? `**Peeking**: ` : ""}${
          targetData.userMeta?.name ?? targetData.name
        }\n${UNIRedux.standardLine}\n🎒: ${
          targetData.bagData.nickname
        }\nSlots: ${bdataItems.uniqueSize()}/${
          targetData.bagData.slots
        } (Max ${REMOTEBAG_MAX_SLOTS})\nStack Limit: ${
          targetData.bagData.stackLimit
        } (Max ${REMOTEBAG_MAX_STACK})\n${UNIRedux.standardLine}\n${
          UNIRedux.arrowBW
        } Items 🛍️\n\n${itemStr || "No items."}`,
        style
      );
    },
    async withdraw() {
      if (!bagData.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const bet = args[1];
      if (!bet) {
        return output.replyStyled(
          `Please provide an item key and amount to withdraw (ex: apple*5).`,
          notifStyle
        );
      }
      const split = bet.split("*");
      const itemKey = split[0];
      const maxAmount = bagDataItems.getAmount(itemKey);
      if (maxAmount === 0) {
        return output.replyStyled(
          `You do not have an item with "${itemKey}" in your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      const itemAmount = Math.min(
        maxAmount,
        Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
      );
      if (inventory.size() + itemAmount > Cassidy.invLimit) {
        return output.replyStyled(
          `You're carrying too many items!`,
          notifStyle
        );
      }
      if (itemAmount === 0) {
        return output.replyStyled(
          `No items were withdrawn from your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      const itemsToWithdraw = bagDataItems.get(itemKey).slice(0, itemAmount);
      if (itemsToWithdraw.length === 0) {
        return output.wentWrong();
      }

      bagDataItems.deleteRefs(itemsToWithdraw);
      inventory.add(itemsToWithdraw);
      bagData.items = bagDataItems.raw();
      await saveData({
        inventory: inventory.raw(),
        bagData,
      });
      const itemStr = listRemoteBagItems(
        bagDataItems,
        bagData.slots,
        bagData.stackLimit
      );

      return output.replyStyled(
        `${fonts.bold("Successfully")} withdrew:\n${listRemoteBagItem(
          itemsToWithdraw[0],
          itemAmount,
          bagData.stackLimit
        )}\nFrom your ${REMOTEBAG} ® account.\n${UNIRedux.standardLine}\n${
          UNIRedux.arrowBW
        } Items 🛍️\n\n${itemStr || "No items."}`,
        style
      );
    },
    async deposit() {
      if (!bagData.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const bet = args[1];
      if (!bet) {
        return output.replyStyled(
          `Please provide an item key and amount to deposit (ex: apple*5).`,
          notifStyle
        );
      }
      const split = bet.split("*");
      const itemKey = split[0];
      if (
        bagDataItems.uniqueSize() >= bagData.slots &&
        !bagDataItems.has(itemKey)
      ) {
        return output.replyStyled(
          `The item slots in your ${REMOTEBAG} ® account are full.`,
          notifStyle
        );
      }
      const maxAmount = inventory.getAmount(itemKey);
      if (maxAmount === 0) {
        return output.replyStyled(
          `You do not have an item with "${itemKey}" in your inventory.`,
          notifStyle
        );
      }
      const maxDepositPossible =
        bagData.stackLimit - bagDataItems.getAmount(itemKey);

      if (maxDepositPossible <= 0) {
        return output.replyStyled(
          `Your ${REMOTEBAG} ® account is full for "${itemKey}". Cannot deposit more.`,
          notifStyle
        );
      }

      let itemAmount = Math.min(
        maxAmount,
        Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
      );

      itemAmount = Math.min(itemAmount, maxDepositPossible);

      if (itemAmount === 0) {
        return output.replyStyled(
          `No items were deposited into your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      const itemsToDeposit = inventory.get(itemKey).slice(0, itemAmount);
      if (itemsToDeposit.length === 0) {
        return output.wentWrong();
      }

      inventory.deleteRefs(itemsToDeposit);
      bagDataItems.add(itemsToDeposit);
      bagData.items = bagDataItems.raw();
      await saveData({
        inventory: inventory.raw(),
        bagData,
      });
      const itemStr = listRemoteBagItems(
        bagDataItems,
        bagData.slots,
        bagData.stackLimit
      );

      return output.replyStyled(
        `${fonts.bold("Successfully")} deposited:\n${listRemoteBagItem(
          itemsToDeposit[0],
          itemAmount,
          bagData.stackLimit
        )}\nTo your ${REMOTEBAG} ® account.\n${UNIRedux.standardLine}\n${
          UNIRedux.arrowBW
        } Items 🛍️\n\n${itemStr || "No items."}`,
        style
      );
    },
    async transfer() {
      if (!bagData.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const recipientNickname = args[1];
      const bet = args[2];
      if (!recipientNickname || !bet) {
        return output.replyStyled(
          `Please provide a valid recipient's nickname and item to transfer. Usage: ${prefix}${commandName} transfer <nickname> <item*amount>`,
          notifStyle
        );
      }

      const split = bet.split("*");
      const itemKey = split[0];
      const recipient = await money.queryItem({
        "value.bagData.nickname": recipientNickname,
      });
      if (recipient?.bagData?.nickname !== recipientNickname) {
        return output.replyStyled(
          `The recipient does not have a ${REMOTEBAG} ® account with the given nickname.`,
          notifStyle
        );
      }

      if (recipient?.userID === input.senderID) {
        return output.replyStyled(
          `You cannot transfer any items to your own ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }

      const recipientItems = new Inventory(
        recipient.bagData?.items,
        recipient.bagData.slots * recipient.bagData.stackLimit
      );
      const senderItems = bagDataItems;
      const rnick = recipient.bagData?.nickname;

      if (
        recipientItems.uniqueSize() >= recipient.bagData.slots &&
        !recipientItems.has(itemKey)
      ) {
        return output.replyStyled(
          `The item slots in ${rnick}'s ${REMOTEBAG} ® account are full.`,
          notifStyle
        );
      }
      const maxAmount = senderItems.getAmount(itemKey);
      if (maxAmount === 0) {
        return output.replyStyled(
          `You do not have an item with "${itemKey}" in your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      const maxTransPossible =
        recipient.bagData.stackLimit - recipientItems.getAmount(itemKey);

      if (maxTransPossible <= 0) {
        return output.replyStyled(
          `${rnick}'s ${REMOTEBAG} ® account is full for "${itemKey}". Cannot transfer more.`,
          notifStyle
        );
      }

      let itemAmount = Math.min(
        maxAmount,
        Math.max(1, parseBet(split[1] || "1", maxAmount) || 1)
      );

      itemAmount = Math.min(itemAmount, maxTransPossible);

      if (itemAmount === 0) {
        return output.replyStyled(
          `No items were transferred into ${rnick}'s ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      const itemsToTransfer = senderItems.get(itemKey).slice(0, itemAmount);
      if (itemsToTransfer.length === 0) {
        return output.wentWrong();
      }

      senderItems.deleteRefs(itemsToTransfer);
      recipientItems.add(itemsToTransfer);
      bagData.items = senderItems.raw();
      recipient.bagData.items = recipientItems.raw();
      await saveData(
        {
          bagData,
        },
        input.senderID
      );
      await saveData(
        {
          bagData: recipient.bagData,
        },
        recipient.userID
      );
      const senderStr = listRemoteBagItems(
        senderItems,
        bagData.slots,
        bagData.stackLimit
      );
      const recipientStr = listRemoteBagItems(
        recipientItems,
        recipient.bagData.slots,
        recipient.bagData.stackLimit
      );

      return output.replyStyled(
        `${fonts.bold("Successfully")} transferred:\n${listRemoteBagItem(
          itemsToTransfer[0],
          itemAmount,
          bagData.stackLimit
        )}\n${UNIRedux.standardLine}\n${UNIRedux.arrowBW} Your Items 🛍️\n\n${
          senderStr || "No items."
        }\n${UNIRedux.standardLine}\n${fonts.bold("Receiver")}: ${
          recipient.bagData.nickname
        }\n➣ ${recipient.userMeta?.name ?? recipient.name} 🛍️\n\n${
          recipientStr || "No items."
        }`,
        style
      );
    },
    async rename() {
      if (!bagData.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const newNickname = args[1];
      if (!newNickname || newNickname.length < 3) {
        return output.replyStyled(
          `Please provide a valid new nickname (at least 3 characters) for your ${REMOTEBAG} ® account.`,
          notifStyle
        );
      }
      bagData.nickname = newNickname;
      await saveData({
        bagData,
      });
      return output.replyStyled(
        `${fonts.bold(
          "Successfully"
        )} renamed your ${REMOTEBAG} ® account to: ${newNickname}.`,
        style
      );
    },
    async upgrade() {
      if (!bagData.nickname) {
        return output.replyStyled(
          `You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`,
          notifStyle
        );
      }
      const upgradeType = args[1]?.toLowerCase();
      if (!upgradeType || !["slots", "stack"].includes(upgradeType)) {
        return output.replyStyled(
          `Please specify upgrade type: ${prefix}${commandName} upgrade <slots|stack>`,
          notifStyle
        );
      }
      if (upgradeType === "slots") {
        if (bagData.slots >= REMOTEBAG_MAX_SLOTS) {
          return output.replyStyled(
            `Your ${REMOTEBAG} ® account already has the maximum number of slots (${REMOTEBAG_MAX_SLOTS}).`,
            notifStyle
          );
        }
        bagData.slots += 1;
        bagDataItems = new Inventory(
          bagData.items ?? [],
          bagData.slots * bagData.stackLimit
        );
        await saveData({ bagData });
        return output.replyStyled(
          `${fonts.bold(
            "Successfully"
          )} upgraded your ${REMOTEBAG} ® account to ${bagData.slots} slots.`,
          style
        );
      } else if (upgradeType === "stack") {
        if (bagData.stackLimit >= REMOTEBAG_MAX_STACK) {
          return output.replyStyled(
            `Your ${REMOTEBAG} ® account already has the maximum stack limit (${REMOTEBAG_MAX_STACK} per slot).`,
            notifStyle
          );
        }
        bagData.stackLimit += 10;
        if (bagData.stackLimit > REMOTEBAG_MAX_STACK) {
          bagData.stackLimit = REMOTEBAG_MAX_STACK;
        }
        bagDataItems = new Inventory(
          bagData.items ?? [],
          bagData.slots * bagData.stackLimit
        );
        await saveData({ bagData });
        return output.replyStyled(
          `${fonts.bold(
            "Successfully"
          )} upgraded your ${REMOTEBAG} ® account to a stack limit of ${
            bagData.stackLimit
          } per slot.`,
          style
        );
      }
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
          (["u"].includes(targetArgs) && i === "upgrade")
      )
    ];
  if (typeof targetHandler === "function") {
    await targetHandler();
  } else {
    return output.replyStyled(
      `${fonts.bold(
        "Usages"
      )}:\n➥ \`${prefix}${commandName} register/r <nickname>\` - Create a ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} check/c <uid | reply | nickname>\` - Check your ${REMOTEBAG} ® items.\n➥ \`${prefix}${commandName} withdraw/w <item*amount>\` - Withdraw items (ex: apple*5) from your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} deposit/d <item*amount>\` - Deposit items (ex: apple*5) to your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} transfer/t <nickname> <item*amount>\` - Transfer items to another user.\n➥ \`${prefix}${commandName} rename/rn <nickname>\` - Rename your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} upgrade/u <slots|stack>\` - Upgrade your ${REMOTEBAG} ® slots or stack limit.`,
      style
    );
  }
}
