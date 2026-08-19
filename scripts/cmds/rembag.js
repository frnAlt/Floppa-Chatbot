"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifStyle = exports.style = exports.REMOTEBAG_EMPTY_SLOT = exports.REMOTEBAG_MAX_STACK = exports.REMOTEBAG_INITIAL_STACK = exports.REMOTEBAG_MAX_SLOTS = exports.REMOTEBAG_INITIAL_SLOTS = exports.meta = void 0;
exports.listRemoteBagItems = listRemoteBagItems;
exports.listRemoteBagItem = listRemoteBagItem;
exports.entry = entry;
const unispectra_1 = require("@cassidy/unispectra");
const ArielUtils_1 = require("@cass-modules/ArielUtils");
const cassidy_styler_1 = require("cassidy-styler");
const InventoryEnhanced_1 = require("@cass-modules/InventoryEnhanced");
const { fonts } = cassidy_styler_1.FontSystem;
const REMOTEBAG = fonts.serif("REMOTE-BAG");
exports.meta = {
    name: "remotebag",
    version: "1.0.2",
    author: "frnAlt",
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
exports.REMOTEBAG_INITIAL_SLOTS = 8;
exports.REMOTEBAG_MAX_SLOTS = 16;
exports.REMOTEBAG_INITIAL_STACK = 20;
exports.REMOTEBAG_MAX_STACK = 80;
exports.REMOTEBAG_EMPTY_SLOT = "_".repeat(15);
function listRemoteBagItems(bagDataItems, slotLimit, stackLimit) {
    bagDataItems.resanitize();
    const uniqueItems = bagDataItems.toUnique();
    const paddingNeeded = slotLimit - uniqueItems.length;
    const itemLines = uniqueItems.map((i) => listRemoteBagItem(i, bagDataItems.getAmount(i.key), stackLimit));
    const paddingLines = Array(Math.max(paddingNeeded, 0)).fill(exports.REMOTEBAG_EMPTY_SLOT);
    return [...itemLines, ...paddingLines].join("\n");
}
function listRemoteBagItem(item = {}, count, limit) {
    return `${item.icon} ${item.name} (${item.key}) ${typeof count === "number" && count > 1 ? `「 ${count}/${limit} 」` : ""}`;
}
exports.style = {
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
exports.notifStyle = {
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
async function entry({ input, output, money, args, prefix, commandName, }) {
    const userData = await money.getItem(input.senderID);
    let { name, bagData = {
        nickname: null,
        items: null,
        slots: exports.REMOTEBAG_INITIAL_SLOTS,
        stackLimit: exports.REMOTEBAG_INITIAL_STACK,
    }, } = userData;
    let bagDataItems = new InventoryEnhanced_1.Inventory(bagData.items ?? [], bagData.slots * bagData.stackLimit);
    const inventory = new InventoryEnhanced_1.Inventory(userData.inventory ?? [], Cassidy.invLimit);
    if (!name) {
        return output.replyStyled(`Sorry, you must register your name with ${prefix}identity-setname first!`, exports.notifStyle);
    }
    if (!args[0]) {
        args.unshift(input.propertyArray[0]);
    }
    const targetArgs = String(args[0]).toLowerCase();
    async function saveData(info, id = input.senderID) {
        return await money.setItem(id, info);
    }
    const handlers = {
        async register() {
            if (bagData.nickname) {
                return output.replyStyled(`You already have a ${REMOTEBAG} ® account with nickname: ${bagData.nickname}.`, exports.notifStyle);
            }
            const nickname = args[1];
            if (!nickname || nickname.length < 3) {
                return output.replyStyled(`Please provide a valid nickname (at least 3 characters) for your ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            bagData.nickname = nickname;
            bagData.slots = exports.REMOTEBAG_INITIAL_SLOTS;
            bagData.stackLimit = exports.REMOTEBAG_INITIAL_STACK;
            await saveData({
                bagData,
            });
            return output.replyStyled(`${fonts.bold(`Your ${REMOTEBAG} ® account created successfully`)}\n${unispectra_1.UNIRedux.standardLine}\nInitialized with ${bagData.slots} slots and ${bagData.stackLimit} items per slot.`, exports.style);
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
                }
                else {
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
                return output.replyStyled(`The user does not have a ${REMOTEBAG} ® account with the given nickname.`, exports.notifStyle);
            }
            if (!targetData.bagData?.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const bdataItems = new InventoryEnhanced_1.Inventory(targetData.bagData?.items ?? [], targetData.bagData.slots * targetData.bagData.stackLimit);
            const itemStr = listRemoteBagItems(bdataItems, targetData.bagData.slots, targetData.bagData.stackLimit);
            return output.replyStyled(`➥ ${isPeek ? `**Peeking**: ` : ""}${targetData.userMeta?.name ?? targetData.name}\n${unispectra_1.UNIRedux.standardLine}\n🎒: ${targetData.bagData.nickname}\nSlots: ${bdataItems.uniqueSize()}/${targetData.bagData.slots} (Max ${exports.REMOTEBAG_MAX_SLOTS})\nStack Limit: ${targetData.bagData.stackLimit} (Max ${exports.REMOTEBAG_MAX_STACK})\n${unispectra_1.UNIRedux.standardLine}\n${unispectra_1.UNIRedux.arrowBW} Items 🛍️\n\n${itemStr || "No items."}`, exports.style);
        },
        async withdraw() {
            if (!bagData.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const bet = args[1];
            if (!bet) {
                return output.replyStyled(`Please provide an item key and amount to withdraw (ex: apple*5).`, exports.notifStyle);
            }
            const split = bet.split("*");
            const itemKey = split[0];
            const maxAmount = bagDataItems.getAmount(itemKey);
            if (maxAmount === 0) {
                return output.replyStyled(`You do not have an item with "${itemKey}" in your ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            const itemAmount = Math.min(maxAmount, Math.max(1, (0, ArielUtils_1.parseBet)(split[1] || "1", maxAmount) || 1));
            if (inventory.size() + itemAmount > Cassidy.invLimit) {
                return output.replyStyled(`You're carrying too many items!`, exports.notifStyle);
            }
            if (itemAmount === 0) {
                return output.replyStyled(`No items were withdrawn from your ${REMOTEBAG} ® account.`, exports.notifStyle);
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
            const itemStr = listRemoteBagItems(bagDataItems, bagData.slots, bagData.stackLimit);
            return output.replyStyled(`${fonts.bold("Successfully")} withdrew:\n${listRemoteBagItem(itemsToWithdraw[0], itemAmount, bagData.stackLimit)}\nFrom your ${REMOTEBAG} ® account.\n${unispectra_1.UNIRedux.standardLine}\n${unispectra_1.UNIRedux.arrowBW} Items 🛍️\n\n${itemStr || "No items."}`, exports.style);
        },
        async deposit() {
            if (!bagData.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const bet = args[1];
            if (!bet) {
                return output.replyStyled(`Please provide an item key and amount to deposit (ex: apple*5).`, exports.notifStyle);
            }
            const split = bet.split("*");
            const itemKey = split[0];
            if (bagDataItems.uniqueSize() >= bagData.slots &&
                !bagDataItems.has(itemKey)) {
                return output.replyStyled(`The item slots in your ${REMOTEBAG} ® account are full.`, exports.notifStyle);
            }
            const maxAmount = inventory.getAmount(itemKey);
            if (maxAmount === 0) {
                return output.replyStyled(`You do not have an item with "${itemKey}" in your inventory.`, exports.notifStyle);
            }
            const maxDepositPossible = bagData.stackLimit - bagDataItems.getAmount(itemKey);
            if (maxDepositPossible <= 0) {
                return output.replyStyled(`Your ${REMOTEBAG} ® account is full for "${itemKey}". Cannot deposit more.`, exports.notifStyle);
            }
            let itemAmount = Math.min(maxAmount, Math.max(1, (0, ArielUtils_1.parseBet)(split[1] || "1", maxAmount) || 1));
            itemAmount = Math.min(itemAmount, maxDepositPossible);
            if (itemAmount === 0) {
                return output.replyStyled(`No items were deposited into your ${REMOTEBAG} ® account.`, exports.notifStyle);
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
            const itemStr = listRemoteBagItems(bagDataItems, bagData.slots, bagData.stackLimit);
            return output.replyStyled(`${fonts.bold("Successfully")} deposited:\n${listRemoteBagItem(itemsToDeposit[0], itemAmount, bagData.stackLimit)}\nTo your ${REMOTEBAG} ® account.\n${unispectra_1.UNIRedux.standardLine}\n${unispectra_1.UNIRedux.arrowBW} Items 🛍️\n\n${itemStr || "No items."}`, exports.style);
        },
        async transfer() {
            if (!bagData.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const recipientNickname = args[1];
            const bet = args[2];
            if (!recipientNickname || !bet) {
                return output.replyStyled(`Please provide a valid recipient's nickname and item to transfer. Usage: ${prefix}${commandName} transfer <nickname> <item*amount>`, exports.notifStyle);
            }
            const split = bet.split("*");
            const itemKey = split[0];
            const recipient = await money.queryItem({
                "value.bagData.nickname": recipientNickname,
            });
            if (recipient?.bagData?.nickname !== recipientNickname) {
                return output.replyStyled(`The recipient does not have a ${REMOTEBAG} ® account with the given nickname.`, exports.notifStyle);
            }
            if (recipient?.userID === input.senderID) {
                return output.replyStyled(`You cannot transfer any items to your own ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            const recipientItems = new InventoryEnhanced_1.Inventory(recipient.bagData?.items, recipient.bagData.slots * recipient.bagData.stackLimit);
            const senderItems = bagDataItems;
            const rnick = recipient.bagData?.nickname;
            if (recipientItems.uniqueSize() >= recipient.bagData.slots &&
                !recipientItems.has(itemKey)) {
                return output.replyStyled(`The item slots in ${rnick}'s ${REMOTEBAG} ® account are full.`, exports.notifStyle);
            }
            const maxAmount = senderItems.getAmount(itemKey);
            if (maxAmount === 0) {
                return output.replyStyled(`You do not have an item with "${itemKey}" in your ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            const maxTransPossible = recipient.bagData.stackLimit - recipientItems.getAmount(itemKey);
            if (maxTransPossible <= 0) {
                return output.replyStyled(`${rnick}'s ${REMOTEBAG} ® account is full for "${itemKey}". Cannot transfer more.`, exports.notifStyle);
            }
            let itemAmount = Math.min(maxAmount, Math.max(1, (0, ArielUtils_1.parseBet)(split[1] || "1", maxAmount) || 1));
            itemAmount = Math.min(itemAmount, maxTransPossible);
            if (itemAmount === 0) {
                return output.replyStyled(`No items were transferred into ${rnick}'s ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            const itemsToTransfer = senderItems.get(itemKey).slice(0, itemAmount);
            if (itemsToTransfer.length === 0) {
                return output.wentWrong();
            }
            senderItems.deleteRefs(itemsToTransfer);
            recipientItems.add(itemsToTransfer);
            bagData.items = senderItems.raw();
            recipient.bagData.items = recipientItems.raw();
            await saveData({
                bagData,
            }, input.senderID);
            await saveData({
                bagData: recipient.bagData,
            }, recipient.userID);
            const senderStr = listRemoteBagItems(senderItems, bagData.slots, bagData.stackLimit);
            const recipientStr = listRemoteBagItems(recipientItems, recipient.bagData.slots, recipient.bagData.stackLimit);
            return output.replyStyled(`${fonts.bold("Successfully")} transferred:\n${listRemoteBagItem(itemsToTransfer[0], itemAmount, bagData.stackLimit)}\n${unispectra_1.UNIRedux.standardLine}\n${unispectra_1.UNIRedux.arrowBW} Your Items 🛍️\n\n${senderStr || "No items."}\n${unispectra_1.UNIRedux.standardLine}\n${fonts.bold("Receiver")}: ${recipient.bagData.nickname}\n➣ ${recipient.userMeta?.name ?? recipient.name} 🛍️\n\n${recipientStr || "No items."}`, exports.style);
        },
        async rename() {
            if (!bagData.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const newNickname = args[1];
            if (!newNickname || newNickname.length < 3) {
                return output.replyStyled(`Please provide a valid new nickname (at least 3 characters) for your ${REMOTEBAG} ® account.`, exports.notifStyle);
            }
            bagData.nickname = newNickname;
            await saveData({
                bagData,
            });
            return output.replyStyled(`${fonts.bold("Successfully")} renamed your ${REMOTEBAG} ® account to: ${newNickname}.`, exports.style);
        },
        async upgrade() {
            if (!bagData.nickname) {
                return output.replyStyled(`You do not have a ${REMOTEBAG} ® account. Register with ${prefix}${commandName} register <nickname>.`, exports.notifStyle);
            }
            const upgradeType = args[1]?.toLowerCase();
            if (!upgradeType || !["slots", "stack"].includes(upgradeType)) {
                return output.replyStyled(`Please specify upgrade type: ${prefix}${commandName} upgrade <slots|stack>`, exports.notifStyle);
            }
            if (upgradeType === "slots") {
                if (bagData.slots >= exports.REMOTEBAG_MAX_SLOTS) {
                    return output.replyStyled(`Your ${REMOTEBAG} ® account already has the maximum number of slots (${exports.REMOTEBAG_MAX_SLOTS}).`, exports.notifStyle);
                }
                bagData.slots += 1;
                bagDataItems = new InventoryEnhanced_1.Inventory(bagData.items ?? [], bagData.slots * bagData.stackLimit);
                await saveData({ bagData });
                return output.replyStyled(`${fonts.bold("Successfully")} upgraded your ${REMOTEBAG} ® account to ${bagData.slots} slots.`, exports.style);
            }
            else if (upgradeType === "stack") {
                if (bagData.stackLimit >= exports.REMOTEBAG_MAX_STACK) {
                    return output.replyStyled(`Your ${REMOTEBAG} ® account already has the maximum stack limit (${exports.REMOTEBAG_MAX_STACK} per slot).`, exports.notifStyle);
                }
                bagData.stackLimit += 10;
                if (bagData.stackLimit > exports.REMOTEBAG_MAX_STACK) {
                    bagData.stackLimit = exports.REMOTEBAG_MAX_STACK;
                }
                bagDataItems = new InventoryEnhanced_1.Inventory(bagData.items ?? [], bagData.slots * bagData.stackLimit);
                await saveData({ bagData });
                return output.replyStyled(`${fonts.bold("Successfully")} upgraded your ${REMOTEBAG} ® account to a stack limit of ${bagData.stackLimit} per slot.`, exports.style);
            }
        },
    };
    const targetHandler = handlers[Object.keys(handlers).find((i) => i === targetArgs ||
        (["r"].includes(targetArgs) && i === "register") ||
        (["c"].includes(targetArgs) && i === "check") ||
        (["w"].includes(targetArgs) && i === "withdraw") ||
        (["d"].includes(targetArgs) && i === "deposit") ||
        (["t"].includes(targetArgs) && i === "transfer") ||
        (["rn"].includes(targetArgs) && i === "rename") ||
        (["u"].includes(targetArgs) && i === "upgrade"))];
    if (typeof targetHandler === "function") {
        await targetHandler();
    }
    else {
        return output.replyStyled(`${fonts.bold("Usages")}:\n➥ \`${prefix}${commandName} register/r <nickname>\` - Create a ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} check/c <uid | reply | nickname>\` - Check your ${REMOTEBAG} ® items.\n➥ \`${prefix}${commandName} withdraw/w <item*amount>\` - Withdraw items (ex: apple*5) from your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} deposit/d <item*amount>\` - Deposit items (ex: apple*5) to your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} transfer/t <nickname> <item*amount>\` - Transfer items to another user.\n➥ \`${prefix}${commandName} rename/rn <nickname>\` - Rename your ${REMOTEBAG} ® account.\n➥ \`${prefix}${commandName} upgrade/u <slots|stack>\` - Upgrade your ${REMOTEBAG} ® slots or stack limit.`, exports.style);
    }
}
