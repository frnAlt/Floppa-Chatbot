"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.giftKinds = exports.style = exports.meta = void 0;
exports.getGachaGift = getGachaGift;
exports.entry = entry;
const BriefcaseAPI_1 = require("@cass-modules/BriefcaseAPI");
const unispectra_1 = require("@cassidy/unispectra");
const ut_shop_1 = require("@cassidy/ut-shop");
exports.meta = {
    name: "gift",
    description: "Claim your special gift pack every 20 minutes.",
    version: "4.0.5",
    author: "frnAlt",
    category: "Rewards",
    permissions: [0],
    waitingTime: 1,
    noPrefix: false,
    requirement: "3.0.0",
    icon: "🎁",
    requiredLevel: 3,
    cmdType: "cplx_g",
    isGame: true,
};
exports.style = {
    title: "Free Gift 🎁",
    titleFont: "bold",
    contentFont: "fancy",
};
const diaCost = 2;
const { parseCurrency: pCy } = global.utils;
const { invLimit } = global.Cassidy;
exports.giftKinds = [];
if (true) {
    const gift = (0, ut_shop_1.generateGiftPack)();
    exports.giftKinds.push(gift);
    gift.name = "Gift Pack #1";
    gift.icon = "🎁🍒";
    gift.key = "fGiftPack";
    gift.flavorText =
        "Either a feast for your pet, a rare irrelevant item, or just some trash.";
    gift.treasureKey = "randomGroupedBiasFirst_foodpack_generic";
    exports.giftKinds.push(gift);
}
if (true) {
    const gift = (0, ut_shop_1.generateGiftPack)();
    exports.giftKinds.push(gift);
    gift.name = "Gift Pack #2";
    gift.icon = "🎁⚔️";
    gift.flavorText =
        "Either a weapon your pet could wield, a rare irrelevant item, or just some trash.";
    gift.key = "wGiftPack";
    gift.treasureKey = "randomGroupedBiasFirst_weaponpack_generic";
    exports.giftKinds.push(gift);
}
if (true) {
    const gift = (0, ut_shop_1.generateGiftPack)();
    exports.giftKinds.push(gift);
    gift.name = "Gift Pack #3";
    gift.flavorText = "Either a trash, a rare irrelevant item, or more trash.";
    gift.icon = "🎁❌";
    gift.key = "uGiftPack";
    gift.treasureKey = "randomGroupedBiasFirst_unlucky_curse_generic";
    exports.giftKinds.push(gift);
}
if (true) {
    const gift = (0, ut_shop_1.generateGiftPack)();
    exports.giftKinds.push(gift);
    gift.name = "Gift Pack #4";
    gift.icon = "🎁🐶";
    gift.flavorText =
        "Either a new companion, a rare irrelevant item, or just some trash.";
    gift.key = "pGiftPack";
    gift.treasureKey =
        "randomGroupedBiasFirst_generic_generic_petsI_petsII_petsIII";
    exports.giftKinds.push(gift);
}
if (true) {
    const gift = (0, ut_shop_1.generateGiftPack)();
    exports.giftKinds.push(gift);
    gift.name = "Gift Pack #5";
    gift.icon = "🎁🎴";
    gift.flavorText = "Either a rare important item, or maybe some trash.";
    gift.key = "nGiftPack";
    gift.treasureKey = "randomGroupedBiasFirst_generic_generic_unlucky";
    exports.giftKinds.push(gift);
}
function getGachaGift() {
    return exports.giftKinds.randomValue();
}
async function handlePaid({ input, output, money, Inventory, generateGift, Collectibles, }) {
    let { inventory: rawInv = [], collectibles: rawCll = [] } = await money.getItem(input.senderID);
    if (String(input.words[0]).toLowerCase() !== "buy") {
        return;
    }
    let amount = parseInt(input.words[1]);
    if (isNaN(amount)) {
        amount = 1;
    }
    if (rawInv.length + amount > invLimit) {
        return output.replyStyled("❌ You're carrying too many items!", exports.style);
    }
    const inventory = new Inventory(rawInv);
    const collectibles = new Collectibles(rawCll);
    if (!collectibles.hasAmount("gems", diaCost * amount)) {
        if (input.isAdmin && input.words[1] === "cheat") {
        }
        else {
            return output.replyStyled(`❌ You don't have ${diaCost * amount}💎 to purchase it.`, exports.style);
        }
    }
    let firstGift = null;
    for (let index = 0; index < amount; index++) {
        const giftItem = generateGift();
        Object.assign(giftItem, {
            key: "fortuneEnv",
            name: "Fortune Envelope",
            icon: "🧧",
            flavorText: "A token of luck and prosperity, sealed with good wishes and ancient blessings, that might grant you something. It's not guaranteed, but you can use it with the inventory command, if you know how.",
            type: "treasure",
            treasureKey: "generic_exclude=>curse",
            cannotSend: true,
            cannotToss: true,
            cannotTrade: true,
            sellPrice: 20000,
        });
        firstGift = giftItem;
        inventory.addOne(giftItem);
        collectibles.raise("gems", -diaCost);
    }
    await money.setItem(input.senderID, {
        inventory: Array.from(inventory),
        collectibles: Array.from(collectibles),
    });
    const boughtGift = `✅ You bought a **${firstGift.icon} ${firstGift.name}** **(x${amount})**! Check your inventory to see it.\n\n💎 **${pCy(collectibles.getAmount("gems"))}** (-${diaCost * amount})`;
    const data = await output.replyStyled(boughtGift, exports.style);
    data.atReply(handlePaid);
}
async function entry({ input, output, money, Inventory, Collectibles, prefix, }) {
    let { inventory: rawInv = [], lastGiftClaim, collectibles: rawCll = [], } = await money.getItem(input.senderID);
    if (rawInv.length >= invLimit) {
        return output.reply("❌ You're carrying too many items!");
    }
    const inventory = new Inventory(rawInv);
    const collectibles = new Collectibles(rawCll);
    const currentTime = Date.now();
    const msWait = 20 * 60 * 1000;
    let canClaim = false;
    if (!lastGiftClaim) {
        canClaim = true;
    }
    else {
        const timeElapsed = currentTime - lastGiftClaim;
        if (timeElapsed >= msWait) {
            canClaim = true;
        }
        else if (input.isAdmin && input.arguments[0] === "cheat") {
            canClaim = true;
        }
        else {
            const timeRemaining = msWait - timeElapsed;
            const hoursRemaining = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
            const minutesRemaining = Math.floor((timeRemaining / (1000 * 60)) % 60);
            const secondsRemaining = Math.floor((timeRemaining / 1000) % 60);
            const alreadyClaimed = `⏳ You've already claimed your free gift pack. Please wait for ${hoursRemaining} hours, ${minutesRemaining} minutes, and ${secondsRemaining} seconds before claiming again.\nReply **buy** and <amount> to purchase a fortune **envelope** for ${diaCost}💎\n\n**💎 ${pCy(collectibles.getAmount("gems"))}**`;
            const info = await output.reply(alreadyClaimed);
            info.atReply(handlePaid);
            return;
        }
    }
    if (canClaim) {
        const gachaGift = getGachaGift();
        gachaGift.cannotSend = true;
        inventory.addOne(gachaGift);
        await money.setItem(input.senderID, {
            inventory: Array.from(inventory),
            lastGiftClaim: currentTime,
        });
        // const claimedGift = `🎁 You've claimed your free gift ${
        //   giftItem.type === "treasure" ? "treasure" : "pack"
        // }! Check your inventory and come back later for more.\n\nTo open, use **${prefix}bc use ${
        //   giftItem.type === "treasure" ? "gift" : "giftPack"
        // }** without fonts.`;
        const claimedGift = `✨ **Your free gift will be:**\n\n${(0, BriefcaseAPI_1.listItem)(gachaGift, 1, {
            bold: true,
        })}\n${unispectra_1.UNISpectra.arrowFromT} ${gachaGift.flavorText}\n\nTo open, use **${prefix}bc use ${gachaGift.key}** without fonts.`;
        const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.5);
        const container = CanvCass.createRect({
            centerX: canv.centerX,
            centerY: canv.centerY,
            width: canv.width,
            height: canv.height / 2,
        });
        await canv.drawBackground();
        canv.drawBox({
            rect: container,
            fill: "rgba(0, 0, 0, 0.5)",
        });
        const margin = 30;
        const emoBox = CanvCass.createRect({
            left: container.left + margin,
            centerY: container.centerY,
            width: container.height - margin * 2,
            height: container.height - margin * 2,
        });
        canv.drawBox({
            rect: emoBox,
            fill: "rgba(0, 0, 0, 0.5)",
        });
        canv.drawText(gachaGift.icon, {
            fontType: "cnormal",
            align: "center",
            size: emoBox.width / 2 - margin,
            x: emoBox.centerX,
            y: emoBox.centerY,
        });
        const fSize = 55;
        canv.drawText(`${gachaGift.name} (${gachaGift.key})`, {
            fontType: "cbold",
            align: "left",
            size: fSize,
            x: emoBox.right + margin,
            y: emoBox.top,
            vAlign: "bottom",
            fill: "rgba(255, 255, 255, 1)",
        });
        const fm = 10;
        canv.drawText(gachaGift.flavorText, {
            fontType: "cbold",
            align: "left",
            size: 40,
            x: emoBox.right + margin,
            y: emoBox.top + fSize + fm,
            breakMaxWidth: canv.right - emoBox.right - margin * 2,
            vAlign: "bottom",
            fill: "rgba(255, 255, 255, 0.7)",
        });
        canv.drawText(`✨ CassieahBoT`, {
            fontType: "cbold",
            align: "left",
            size: 65,
            x: canv.left + margin,
            y: (container.top - canv.top) / 2,
            fill: "rgba(255, 255, 255, 1)",
        });
        canv.drawText(`🎁`, {
            fontType: "cbold",
            size: 150,
            x: canv.right - 150 / 2,
            y: canv.bottom - 250 / 2 + 20,
            align: "center",
            fill: "white",
        });
        canv.drawText(`🎁`, {
            fontType: "cbold",
            size: 250,
            x: canv.right - 250 / 2,
            y: canv.bottom,
            align: "center",
            fill: "white",
        });
        canv.drawText(`🎁`, {
            fontType: "cbold",
            size: 150,
            x: canv.left + 150 / 2,
            y: canv.bottom - 250 / 2 + 20,
            align: "center",
            fill: "white",
        });
        canv.drawText(`🎁`, {
            fontType: "cbold",
            size: 250,
            x: canv.left + 250 / 2,
            y: canv.bottom,
            align: "center",
            fill: "white",
        });
        canv.drawText(`Free Gift`, {
            fontType: "cbold",
            align: "center",
            size: 80,
            x: canv.centerX,
            y: container.bottom + (canv.bottom - container.bottom) / 2,
            fill: "rgba(255, 255, 255, 1)",
        });
        return output.attach(claimedGift, await canv.toStream());
    }
}
