"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAK_REWARDS_0 = exports.possibleRewardPacks = exports.possibleRewardItems = exports.style = exports.meta = void 0;
exports.entry = entry;
const ArielUtils_1 = require("@cass-modules/ArielUtils");
const BriefcaseAPI_1 = require("@cass-modules/BriefcaseAPI");
const GardenConfig_1 = require("@cass-modules/GardenConfig");
const InventoryEnhanced_1 = require("@cass-modules/InventoryEnhanced");
const unispectra_1 = require("@cassidy/unispectra");
const ut_shop_1 = require("@cassidy/ut-shop");
const cassidy_styler_1 = require("cassidy-styler");
exports.meta = {
    name: "streak",
    description: "Daily login bonus!",
    version: "2.0.0",
    author: "frnAlt",
    category: "Rewards",
    otherNames: ["bonus", "daily"],
    requirement: "4.1.0",
    icon: "💎",
    isGame: true,
};
exports.style = {
    title: "Daily Streak 💎",
    titleFont: "bold",
    contentFont: "fancy",
    topLine: "double",
    lineDeco: "none",
};
exports.possibleRewardItems = new InventoryEnhanced_1.Inventory([
    (0, ut_shop_1.generateGift)("gift", {
        name: "Basic Pet Bundle ☆",
        icon: "🐾",
        flavorText: "A bundle of pets for sale! Use inv use to open.",
        sellPrice: 3100,
        treasureKey: "randomGrouped_petsI",
        key: "petBundle",
    }),
    {
        name: "Shadow Coin",
        key: "shadowCoin",
        flavorText: "A coin rumored to have been forged in the depths of a forgotten realm, carrying with it the clandestine power to transfer fortunes unseen.",
        icon: "🌒",
        type: "food",
        heal: 120,
        sellPrice: 500,
        healParty: true,
    },
    {
        name: "Lotto Ticket",
        key: "lottoTicket",
        flavorText: "A mysterious ticket purchased from the Meow Shop. Its purpose remains unclear, but it brims with potential.",
        icon: "🔖",
        type: "key",
        sellPrice: 5,
        prob: 0.35,
        group: ["generic", "banking"],
    },
    (0, ut_shop_1.generateGift)("gift"),
    (0, ut_shop_1.generateGift)("pack"),
    {
        name: "Dog",
        key: "dog",
        flavorText: "A loyal pet from the Pet Shop. Always there for you.",
        icon: "🐕",
        type: "pet",
        sellPrice: 250,
        group: ["pets", "petsI"],
        prob: 1,
    },
    {
        name: "Deer",
        key: "deer",
        flavorText: "A gentle pet from the Pet Shop. Moves with grace.",
        icon: "🦌",
        type: "pet",
        sellPrice: 350,
        group: ["pets", "petsI"],
        prob: 1,
    },
    {
        name: "Tiger",
        key: "tiger",
        flavorText: "A majestic pet from the Pet Shop. Commands respect.",
        icon: "🐅",
        type: "pet",
        sellPrice: 750,
        group: ["pets", "petsI"],
        prob: 1,
    },
    {
        name: "Snake",
        key: "snake",
        flavorText: "A mysterious pet from the Pet Shop. Intriguing to watch.",
        icon: "🐍",
        type: "pet",
        sellPrice: 500,
        group: ["pets", "petsI"],
        prob: 1,
    },
    {
        name: "Dragon",
        key: "dragon",
        flavorText: "A legendary pet from the Pet Shop. A symbol of power.",
        icon: "🐉",
        type: "pet",
        sellPrice: 1200,
        group: ["pets", "petsI"],
        prob: 1,
    },
    {
        name: "Cat",
        key: "cat",
        flavorText: "A curious pet from the Rosa Shop. Loves to explore.",
        icon: "🐈",
        type: "pet",
        sellPrice: 200,
    },
    {
        name: "Cosmic Punch 𝔼𝕏 ✦",
        icon: "🥊",
        key: "cosmicPunchEX",
        sellPrice: 500,
        type: "food",
        heal: 250,
        flavorText: "Punchy cosmic treats for your cosmic dragon, normal dragon.. or almost everyone",
        picky: true,
        prob: 0.35,
        group: ["generic", "petfoods", "dragonhelp", "punch"],
    },
    {
        key: "gsBamboo",
        name: "Bamboo Seed",
        flavorText: "Fast-growing and sturdy.",
        icon: "🎍",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 3610,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 10,
            harvests: 1,
            yields: 1,
            baseKG: 5,
        },
    },
    {
        name: "HighRoll Pass",
        key: "highRollPass",
        flavorText: "A pass won by achieving a 7-win streak in slots. This pass allows you to place slot bets over 100000, unlocking bigger wins and higher stakes. Remember, with great risk comes great reward. Surprisingly easy to toss away like a normal item!",
        icon: "🃏",
        sellPrice: 2500000,
        type: "armor",
        def: 15,
        prob: 0.005,
        group: ["generic", "cards", "pass"],
    },
    {
        name: "Cursed Sword",
        key: "cursedSword",
        flavorText: "A sword delicately developed by the witches using the special ore's and special cursed magic, this sword allows you to get 20% atk damage to the enemies.",
        icon: "🗡️",
        type: "weapon",
        def: 4,
        atk: 20,
        sellPrice: 3000,
        prob: 0.1,
        group: ["generic", "gears"],
    },
    {
        name: "Endless Battle",
        icon: "🔱",
        flavorText: "War has never ceased in the Land of Dawn: the Endless War, the unification of the Moniyan Empire, the Conflicts in the North... The artifact has witness every struggle for survival for centuries.",
        key: "endlessBattle",
        group: ["generic", "legends"],
        prob: 0.1,
        type: "weapon",
        atk: 65,
        def: -45,
        sellPrice: 500000,
    },
    {
        name: "Kraken",
        key: "kraken",
        flavorText: "A legendary sea monster with immense power and tentacles.",
        icon: "🐙",
        type: "pet",
        sellPrice: 4500,
        group: ["pets", "petsIII"],
        prob: 1,
    },
    {
        name: "Panda",
        key: "panda",
        flavorText: "A cute creature with a natural talent of balancing the power of the Yin and Yang.",
        icon: "🐼",
        type: "pet",
        sellPrice: 1400,
        group: ["pets", "petsII"],
        prob: 0.5,
        cannotToss: false,
    },
    {
        name: "Bamboo Boquet",
        key: "bambooSticks",
        flavorText: "Freshly grown green bamboos that good for pandas. If you wonder what's inside the belly of the pandas, this is what it is.",
        icon: "🎍",
        type: "panda_food",
        sellPrice: 550,
        saturation: 6000000,
        cannotToss: false,
    },
    {
        key: "gsCoconut",
        name: "Coconut Seed",
        flavorText: "Tropical and rich in value.",
        icon: "🥥",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 361,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 4,
            harvests: 20,
            yields: 12,
            baseKG: 8,
        },
    },
    {
        key: "gsPepper",
        name: "Pepper Seed",
        flavorText: "Spicy crop that adds heat to dishes.",
        icon: "🌶️",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 7_220,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 1.5,
            harvests: 200,
            yields: 12,
            baseKG: 3,
        },
    },
    {
        key: "gsSugarApple",
        name: "Sugar Apple",
        flavorText: "Do we still need flavor texts?",
        icon: "🍏",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 43_320,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 0.3,
            harvests: 800,
            yields: 26,
            baseKG: 6,
        },
    },
    {
        key: "gsEmberLily",
        name: "Ember Lily",
        flavorText: "A blazing bloom that thrives in heat and glows at dusk.",
        icon: "🏵️",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 50_138,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 0.2,
            harvests: 400,
            yields: 24,
            baseKG: 12,
        },
    },
    {
        key: "pFlowerSeed",
        name: "Flower Seed Pack",
        flavorText: "A seed pack contaning many types of flower seeds.",
        icon: "🎴🪻",
        type: "roulette_pack",
        sellPrice: 1,
        treasureKey: "randomGrouped_pFlowers",
    },
    {
        key: "gsLilac",
        name: "Lilac Seed",
        flavorText: "Elegant pink blossoms spiral up a long green stem, flourishing with legendary charm.",
        icon: "💮🌿",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 31_588,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 5.25,
            harvests: 80,
            yields: 6,
        },
    },
    {
        key: "gsRose",
        name: "Rose Seed",
        flavorText: "A thorny yet elegant flower, blooming in deep maroon from angular petals.",
        icon: "🌹",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 4_513,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 5.2,
            harvests: 60,
            yields: 3,
        },
    },
    {
        key: "gsSunflower",
        name: "Sunflower Seed",
        flavorText: "A divine bloom that follows the sun's gaze, radiating unmatched brilliance with every harvest.",
        icon: "🌻🌞",
        type: "gardenSeed",
        sellPrice: 1,
        cropData: {
            baseValue: 144_400,
            growthTime: GardenConfig_1.CROP_CONFIG.GROWTH_BASE * 3.8,
            harvests: 240,
            yields: 10,
            baseKG: 25,
        },
    },
    {
        name: "Mystic Nectar 𝔼𝕏 ✦",
        key: "mysticNectarEX",
        flavorText: "Harvested from sky-blooms during lunar eclipses. Griffins and dragons adore it.",
        icon: "🧃",
        type: "mythical_food",
        sellPrice: 1000,
        saturation: 400 * 60 * 1000,
        prob: 0.5,
        picky: true,
        group: ["generic", "petfoods", "unicornhelp", "griffinhelp", "dragonhelp"],
    },
    {
        name: "Starfeather Jerky 𝔼𝕏 ✦",
        key: "starfeatherJerkyEX",
        flavorText: "Sun-dried meats of meteoric birds, fit for a Griffin's celestial appetite.",
        icon: "🪶",
        type: "griffin_food",
        sellPrice: 650,
        saturation: 280 * 60 * 1000,
        prob: 0.35,
        picky: true,
        group: ["generic", "petfoods", "griffinhelp"],
    },
    {
        name: "Leviathan Lure 𝔼𝕏 ✦",
        key: "leviathanLureEX",
        flavorText: "A titanic seafood platter that whispers to deep-sea beasts. Kraken-approved.",
        icon: "🐙",
        type: "kraken_food",
        sellPrice: 800,
        saturation: 350 * 60 * 1000,
        prob: 0.35,
        picky: true,
        group: ["generic", "petfoods", "krakenhelp"],
    },
]);
exports.possibleRewardPacks = new InventoryEnhanced_1.Inventory([
    {
        key: "beginnerPack",
        name: "Beginner Pack",
        icon: "📦👶",
        type: "zip",
        sellPrice: -1,
        flavorText: "Decent pack for any player that's just starting the game.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("petBundle") },
            { ...exports.possibleRewardItems.getOne("shadowCoin") },
            { ...exports.possibleRewardItems.getOne("shadowCoin") },
            { ...exports.possibleRewardItems.getOne("lottoTicket") },
            { ...exports.possibleRewardItems.getOne("lottoTicket") },
            { ...exports.possibleRewardItems.getOne("giftPack") },
        ],
    },
    {
        key: "lovePack",
        name: "Loved Pack",
        icon: "📦💌",
        type: "zip",
        sellPrice: -1,
        flavorText: "Well crafted pack with some love, a very pleasant gift to anyone.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("cat") },
            { ...exports.possibleRewardItems.getOne("cat") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gsCocounut") },
            { ...exports.possibleRewardItems.getOne("gsCocounut") },
        ],
    },
    {
        key: "bambooPack1",
        name: "Bamboo Pack",
        icon: "📦🎍",
        type: "zip",
        sellPrice: -1,
        flavorText: "A pack that literally has anything related to bamboo.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("panda") },
            { ...exports.possibleRewardItems.getOne("panda") },
            { ...exports.possibleRewardItems.getOne("bambooSticks") },
            { ...exports.possibleRewardItems.getOne("bambooSticks") },
            { ...exports.possibleRewardItems.getOne("gsBamboo") },
            { ...exports.possibleRewardItems.getOne("gsBamboo") },
        ],
    },
    {
        key: "wieldersPack",
        name: "Wielders Pack",
        icon: "📦⚔️",
        type: "zip",
        sellPrice: -1,
        flavorText: "Pack for arena players!",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("cursedSword") },
            { ...exports.possibleRewardItems.getOne("cursedSword") },
            { ...exports.possibleRewardItems.getOne("dragon") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("snake") },
        ],
    },
    {
        key: "wieldersPack2",
        name: `Wielders Pack ${cassidy_styler_1.FontSystem.applyFonts("PLUS", "double_struck")}`,
        icon: "📦⚔️",
        type: "zip",
        sellPrice: -1,
        flavorText: "Pack for arena players! But better!!",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("endlessBattle") },
            { ...exports.possibleRewardItems.getOne("endlessBattle") },
            { ...exports.possibleRewardItems.getOne("kraken") },
            { ...exports.possibleRewardItems.getOne("kraken") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
        ],
    },
    {
        key: "jandelPack1",
        name: `Jandel Pack`,
        icon: "📦🌱",
        type: "zip",
        sellPrice: -1,
        flavorText: "Pack for gardeners, I guess?",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("gsPepper") },
            { ...exports.possibleRewardItems.getOne("gsPepper") },
            { ...exports.possibleRewardItems.getOne("gsCoconut") },
            { ...exports.possibleRewardItems.getOne("gsCoconut") },
            { ...exports.possibleRewardItems.getOne("gsSugarApple") },
            { ...exports.possibleRewardItems.getOne("gsEmberLily") },
        ],
    },
    {
        key: "jandelPack2",
        name: `Jandel Pack II`,
        icon: "📦🐝",
        type: "zip",
        sellPrice: -1,
        flavorText: "Pack for gardeners, and the forgotten bees, lmao.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("pFlowerSeed") },
            { ...exports.possibleRewardItems.getOne("pFlowerSeed") },
            { ...exports.possibleRewardItems.getOne("pFlowerSeed") },
            { ...exports.possibleRewardItems.getOne("gsLilac") },
            { ...exports.possibleRewardItems.getOne("gsRose") },
            { ...exports.possibleRewardItems.getOne("gsSunflower") },
        ],
    },
    {
        key: "mexPack",
        name: `${cassidy_styler_1.FontSystem.applyFonts("EX", "double_struck")} Foods Pack`,
        icon: "📦🧃",
        type: "zip",
        sellPrice: -1,
        flavorText: "A pack with literally free of the paywalled foods for pets.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("cosmicPunchEX") },
            { ...exports.possibleRewardItems.getOne("mysticNectarEX") },
            { ...exports.possibleRewardItems.getOne("starfeatherJerkyEX") },
            { ...exports.possibleRewardItems.getOne("leviathanLureEX") },
        ],
    },
    {
        key: "giftOverloadPack",
        name: `Gift Overload Pack`,
        icon: "📦🎁",
        type: "zip",
        sellPrice: -1,
        flavorText: "A pack with 6 gifts, okay?",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gift") },
            { ...exports.possibleRewardItems.getOne("gift") },
        ],
    },
    {
        key: "gamblerPack",
        name: "Gambler10 Pack",
        icon: "📦🎰",
        type: "zip",
        sellPrice: -1,
        flavorText: "A pack for gamblers! Worth 10 days of streak.",
        zipContents: [
            { ...exports.possibleRewardItems.getOne("highRollPass") },
            { ...exports.possibleRewardItems.getOne("lottoTicket") },
            { ...exports.possibleRewardItems.getOne("lottoTicket") },
            { ...exports.possibleRewardItems.getOne("shadowCoin") },
            { ...exports.possibleRewardItems.getOne("shadowCoin") },
            { ...exports.possibleRewardItems.getOne("shadowCoin") },
        ],
    },
]);
exports.STREAK_REWARDS_0 = [
    {
        cash: 10_000,
        bp: 0,
        clls: [{ key: "gems", amountAdded: 3 }],
        items: [{ ...exports.possibleRewardPacks.getOne("beginnerPack") }],
    },
    {
        cash: 20_000,
        bp: 100,
        clls: [
            { key: "gems", amountAdded: 6 },
            {
                key: "repoints",
                amountAdded: 100,
            },
        ],
        items: [{ ...exports.possibleRewardPacks.getOne("lovePack") }],
    },
    {
        cash: 20_000,
        bp: 100,
        clls: [{ key: "gems", amountAdded: 12 }],
        items: [{ ...exports.possibleRewardPacks.getOne("bambooPack1") }],
    },
    {
        cash: 160_000,
        bp: 2000,
        clls: [{ key: "gems", amountAdded: 24 }],
        items: [{ ...exports.possibleRewardPacks.getOne("wieldersPack") }],
    },
    {
        cash: 320_000,
        bp: 4000,
        clls: [{ key: "gems", amountAdded: 36 }],
        items: [{ ...exports.possibleRewardPacks.getOne("wieldersPack2") }],
    },
    {
        cash: 320_000,
        bp: 200,
        clls: [{ key: "gems", amountAdded: 48 }],
        items: [{ ...exports.possibleRewardPacks.getOne("jandelPack1") }],
    },
    {
        cash: 320_000,
        bp: 200,
        clls: [
            { key: "gems", amountAdded: 48 },
            {
                key: "honey",
                amountAdded: 100,
            },
        ],
        items: [{ ...exports.possibleRewardPacks.getOne("jandelPack2") }],
    },
    {
        cash: 320_000,
        bp: 200,
        clls: [{ key: "gems", amountAdded: 57 }],
        items: [{ ...exports.possibleRewardPacks.getOne("mexPack") }],
    },
    {
        cash: 640_000,
        bp: 200,
        clls: [{ key: "gems", amountAdded: 100 }],
        items: [{ ...exports.possibleRewardPacks.getOne("giftOverloadPack") }],
    },
    {
        cash: 2_000_000,
        bp: 10000,
        clls: [{ key: "gems", amountAdded: 500 }],
        items: [{ ...exports.possibleRewardPacks.getOne("gamblerPack") }],
    },
];
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
async function entry({ input, output, money, ctx, getInflationRate, }) {
    let { lastDailyClaim, dailyStreak = 1, collectibles: rawCll = [], name = "Unregistered", } = await money.getItem(input.senderID);
    const rate = await getInflationRate();
    dailyStreak = Math.max(1, dailyStreak);
    output.setStyle(exports.style);
    const cll = new InventoryEnhanced_1.Collectibles(rawCll);
    lastDailyClaim ??= Date.now() - oneDayInMilliseconds;
    const currentTime = Date.now();
    const elapsed = currentTime - lastDailyClaim;
    const percentSinceClaim = (0, unispectra_1.getCompletePercent)(lastDailyClaim, oneDayInMilliseconds, currentTime);
    let hasReset = false;
    if (percentSinceClaim >= 2) {
        hasReset = true;
        dailyStreak = 1;
        await money.setItem(input.senderID, {
            dailyStreak,
        });
    }
    const canClaim = elapsed >= oneDayInMilliseconds;
    const currentStreak = exports.STREAK_REWARDS_0.at((dailyStreak - 1) % exports.STREAK_REWARDS_0.length);
    const tops = `👤 **${name}**\n`;
    if (!currentStreak) {
        return output.reply(`${tops}\n❌ | ☹️ Something went terribly wrong. Your streak doesn't have a correct reward counterpart.`);
    }
    const repeatsAdd = Math.floor(dailyStreak / exports.STREAK_REWARDS_0.length) * exports.STREAK_REWARDS_0.length;
    const indexCurr = exports.STREAK_REWARDS_0.indexOf(currentStreak);
    const lastPage1 = Math.floor(exports.STREAK_REWARDS_0.length / 2);
    const visibles = indexCurr >= lastPage1
        ? exports.STREAK_REWARDS_0.slice(lastPage1)
        : exports.STREAK_REWARDS_0.slice(0, lastPage1);
    const rewardsList = visibles.map((reward) => {
        const index = exports.STREAK_REWARDS_0.indexOf(reward);
        const isCurrent = reward === currentStreak;
        const day = index + 1 + repeatsAdd;
        return `${isCurrent ? unispectra_1.UNISpectra.arrowFromT + " " : ""}${isCurrent ? `**` : ""}${indexCurr > index ? `✅ ` : ""} Day ${day}${isCurrent ? `**` : ""}:${indexCurr > index ? ` ***CLAIMED***` : ""}\n${Array.from((0, BriefcaseAPI_1.groupItems)(reward.items).values())
            .map((data) => (0, BriefcaseAPI_1.listItem)(data, data.amount, {
            bold: isCurrent,
            showID: false,
        }))
            .join("\n")}${true
            ? `${reward.cash
                ? `\n💵 **x${(0, ArielUtils_1.abbreviateNumber)(Math.round(reward.cash + (reward.cash * rate || 0)))}** Money`
                : ""}${reward.bp
                ? `\n💷 **x${(0, ArielUtils_1.abbreviateNumber)(reward.bp)}** Battle Points`
                : ""}${reward.clls
                ? `\n${reward.clls
                    .map((i) => `${cll.getMeta(i.key)?.icon ?? "❓"} **x${(0, ArielUtils_1.abbreviateNumber)(i.amountAdded)}** ${cll.getMeta(i.key)?.name ?? "???"} `)
                    .join("\n")}`
                : ""}`
            : ""}${isCurrent
            ? canClaim
                ? `\nReply with **"claim"** to collect!`
                : `\n⏳ Claim after: **${(0, ArielUtils_1.formatTimeSentence)(oneDayInMilliseconds - elapsed)}**`
            : ""}`;
    });
    const info = await output.reply(`${tops}\n${unispectra_1.UNISpectra.arrow} ${cassidy_styler_1.FontSystem.applyFonts("STREAKS" + (hasReset ? " (Reset back to 1)" : ""), "bold_italic")}:\n${unispectra_1.UNISpectra.standardLine}\n${rewardsList.join(`\n${unispectra_1.UNISpectra.standardLine}\n`)}\n${unispectra_1.UNISpectra.standardLine}\n${indexCurr >= Math.floor(exports.STREAK_REWARDS_0.length / 2)
        ? ""
        : `(There are rewards after day ${lastPage1}!)\n`}💡 **Tip**: Do not miss a day if you don't want your streak to **RESET**.\n⏳ Resets after: **${(0, ArielUtils_1.formatTimeSentence)(oneDayInMilliseconds * 2 - elapsed) || "0s"}**`);
    const STREAK1 = dailyStreak;
    info.atReply(async (repCtx) => {
        const { output, input, getInflationRate } = repCtx;
        if (input.senderID !== ctx.input.senderID)
            return;
        if (input.words[0]?.toLowerCase() !== "claim") {
            return;
        }
        output.setStyle(exports.style);
        let { money: userMoney, lastDailyClaim, dailyStreak = 1, collectibles: rawCll = [], inventory: rawInv = [], battlePoints, } = await money.getItem(input.senderID);
        if (dailyStreak !== STREAK1)
            return;
        const inventory = new InventoryEnhanced_1.Inventory(rawInv);
        const cll = new InventoryEnhanced_1.Collectibles(rawCll);
        lastDailyClaim ??= Date.now() - oneDayInMilliseconds;
        const rate = await getInflationRate();
        const currentTime = Date.now();
        const percentSinceClaim = (0, unispectra_1.getCompletePercent)(lastDailyClaim, oneDayInMilliseconds, currentTime);
        const elapsed = currentTime - lastDailyClaim;
        if (percentSinceClaim < 1) {
            return output.reply(`${tops}\n⏳ | Please wait for **${(0, ArielUtils_1.formatTimeSentence)(oneDayInMilliseconds - elapsed)}** before claiming your reward.`);
        }
        dailyStreak = Math.max(1, dailyStreak);
        const currentStreak = exports.STREAK_REWARDS_0.at((dailyStreak - 1) % exports.STREAK_REWARDS_0.length);
        const reward = currentStreak;
        const index = exports.STREAK_REWARDS_0.indexOf(reward);
        const day = index + 1 + repeatsAdd;
        const list = `${Array.from((0, BriefcaseAPI_1.groupItems)(reward.items).values())
            .map((data) => (0, BriefcaseAPI_1.listItem)(data, data.amount))
            .join("\n")}${true
            ? `${reward.cash
                ? `\n💵 **x${(0, ArielUtils_1.abbreviateNumber)(Math.round(reward.cash + (reward.cash * rate || 0)))}** Money`
                : ""}${reward.bp
                ? `\n💷 **x${(0, ArielUtils_1.abbreviateNumber)(reward.bp)}** Battle Points`
                : ""}${reward.clls
                ? `\n${reward.clls
                    .map((i) => `${cll.getMeta(i.key)?.icon ?? "❓"} **x${(0, ArielUtils_1.abbreviateNumber)(i.amountAdded)}** ${cll.getMeta(i.key)?.name ?? "???"} (${i.key})`)
                    .join("\n")}`
                : ""}`
            : ""}`;
        lastDailyClaim = Date.now();
        inventory.add([...reward.items]);
        for (const cllAdd of reward.clls) {
            cll.raise(cllAdd.key, cllAdd.amountAdded || 0);
        }
        userMoney += Math.round((reward.cash || 0) + (reward.cash * rate || 0));
        battlePoints += reward.bp || 0;
        dailyStreak++;
        await money.setItem(input.senderID, {
            money: userMoney,
            inventory: inventory.raw(),
            collectibles: Array.from(cll),
            battlePoints,
            lastDailyClaim,
            dailyStreak,
        });
        return output.reply(`${tops}\n${unispectra_1.UNISpectra.arrow} ${cassidy_styler_1.FontSystem.applyFonts("REWARD CLAIMED!", "bold_italic")}\n${unispectra_1.UNISpectra.standardLine}\n${list}\n${unispectra_1.UNISpectra.standardLine}\n✅ **Day #${day}**\n⏳ Claim again after: **${(0, ArielUtils_1.formatTimeSentence)(oneDayInMilliseconds - 1)}**`);
    });
}
