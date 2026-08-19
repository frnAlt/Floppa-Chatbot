"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemTemplate = exports.style = exports.propKey = exports.globalKey = exports.meta = void 0;
exports.renderLikes = renderLikes;
exports.getLikes = getLikes;
exports.validateItemSubmission = validateItemSubmission;
exports.entry = entry;
const ArielUtils_1 = require("@cass-modules/ArielUtils");
const BriefcaseAPI_1 = require("@cass-modules/BriefcaseAPI");
const InventoryEnhanced_1 = require("@cass-modules/InventoryEnhanced");
const utils_liane_1 = require("@cass-plugins/utils-liane");
const unispectra_1 = require("@cassidy/unispectra");
const ut_shop_1 = require("@cassidy/ut-shop");
const h = [
    "name",
    "key",
    "icon",
    "flavorText",
    "shopPrice",
    "uuid",
    "submissionDate",
    "author",
    "index",
    "cannotToss",
    "author",
    "approved",
    "likes",
    "dislikes",
    "authorID",
    "submissionDate",
    "author",
    "rejectMessage",
    "isFeatured",
    "featuredDestination",
];
const perPage = 5;
exports.meta = {
    name: "communityshop",
    description: "Request, approve, buy, sell your and the community's custom items!",
    author: "frnAlt",
    version: "2.2.3",
    category: "Shopping",
    role: 0,
    waitingTime: 1,
    otherNames: ["comshop", "requestitem", "reqitem", "cshop", "csh"],
    requirement: "4.0.0",
    icon: "👥",
    cmdType: "cplx_g",
    isGame: true,
};
exports.globalKey = "COMSHOP";
exports.propKey = "comshop";
exports.style = {
    title: "Community Shop 👥",
    titleFont: "bold",
    contentFont: "none",
};
exports.itemTemplate = [
    {
        guide: `Create your custom pet, keep in mind that the key is the most important here and the sellPrice, the key is for foods like if the key is "uwu" then the food type must be "uwu_food", the sellPrice reflects stats, higher sellPrice means higher hp and stats.`,
        category: "pet",
        data: {
            name: "Donkey",
            icon: "🫏",
            key: "donkey",
            shopPrice: 12999,
            sellPrice: 4500,
            flavorText: "Uncage for a new donkey pet!",
            type: "pet",
        },
    },
    {
        guide: `Generic items have no actual use on their own but some commands might require them or use them. The item interpretation depends on the command file.`,
        category: "generic",
        data: {
            name: "Negative Roll Pass",
            icon: "🎴",
            key: "negaRollPass",
            shopPrice: 6900000000000,
            sellPrice: 0,
            flavorText: "Allows you to have negative bets (jk)",
            type: "generic",
        },
    },
    {
        guide: `Potions are actually useless and just here for the sake of trolling, but you could actually make one.`,
        category: "potion",
        data: {
            name: "Water Breathing Potion",
            icon: "🧪🫧",
            key: "waterPotion",
            sellPrice: 1000000,
            shopPrice: 10000000,
            flavorText: "The potion allows your pet to live underwater forever and leave you.",
            type: "potion",
        },
    },
    {
        guide: `Self explanatory, atk will be the attack stat (not exactly the damage but depends on atk stat) and also def and magic stat.`,
        category: "weapon",
        data: {
            name: "Foamblade",
            icon: "🧽",
            key: "foamBlade",
            sellPrice: 1000000,
            shopPrice: 10000000,
            flavorText: "A soft but decently sharp sword for your pet.",
            type: "weapon",
            atk: 15,
            def: 1,
            magic: 0,
        },
    },
    {
        guide: `An item with money tied on it. the chequeAmount must be the reward money when used.`,
        category: "cheque",
        data: {
            name: "Idk Custom Cheque",
            icon: "✨💰",
            key: "chequeIdk",
            sellPrice: 1000000,
            shopPrice: 10000000,
            flavorText: "A custom cheque maybe",
            type: "cheque",
            chequeAmount: 9000000,
        },
    },
    {
        guide: `Self explanatory, def will be the defense stat (not exactly the damage reduction but depends on def stat) and also atk and magic stat.`,
        category: "armor",
        data: {
            name: "Hexagon Plate",
            icon: "🛡️",
            key: "hexaPlate",
            sellPrice: 1000000,
            shopPrice: 10000000,
            flavorText: "Geometrical Gear for damage reduction.",
            type: "armor",
            atk: 5,
            def: 23,
            magic: 0,
        },
    },
    {
        guide: `Self explanatory, the saturation is actually the milliseconds of how long the pet will be full. Do not change the type, unless you want a pet food like "cat_food" or "dog_food"`,
        category: "anypet_food",
        data: {
            name: "Sweet Berries",
            icon: "🍒",
            key: "sweetBerries",
            sellPrice: 50000,
            shopPrice: 100000,
            flavorText: "Really expensive berries for any pet.",
            saturation: 6 * 60 * 1000,
            type: "anypet_food",
        },
    },
    {
        guide: `Warning, this is actually deprecated, but you can make a "food" item that works to any pet, it does not heal because the heal attribute gets converted to satuation (random range).`,
        category: "food",
        data: {
            name: "Sweet Berries",
            icon: "🍒",
            key: "sweetBerries",
            sellPrice: 50000,
            shopPrice: 100000,
            flavorText: "Really expensive berries with random result",
            heal: 100,
            type: "food",
        },
    },
    {
        category: "zip",
        guide: `This is an item, with zipContents that also contains an item, self explanatory. All zipContents have 100% chance to be redeemed.`,
        data: {
            name: "Example Pack",
            key: "examplePack",
            icon: "❓🎴",
            flavorText: "Open this example pack for something.",
            type: "zip",
            sellPrice: 1000,
            shopPrice: 10000,
            zipContents: [
                {
                    name: "Example reward food 1",
                    key: "exampleReward",
                    icon: "✨",
                    flavorText: "This is the reward maybe",
                    type: "anypet_food",
                    saturation: 5 * 60 * 1000,
                },
                {
                    name: "Example reward food 2",
                    key: "exampleReward2",
                    icon: "✨",
                    flavorText: "This is the reward maybe",
                    type: "anypet_food",
                    saturation: 5 * 60 * 1000,
                },
                {
                    name: "Example reward food 3",
                    key: "exampleReward3",
                    icon: "✨",
                    flavorText: "This is the reward maybe",
                    type: "anypet_food",
                    saturation: 5 * 60 * 1000,
                },
            ],
        },
    },
];
const home = new BriefcaseAPI_1.BriefcaseAPI({
    isHypen: false,
    inventoryKey: "myreqitem",
    inventoryName: "Submission",
    inventoryIcon: "📤",
    inventoryLimit: 500,
    showCollectibles: false,
    showAdminFeat: false,
    itemLister(item, amount) {
        return `${(0, BriefcaseAPI_1.listItem)(item, amount, { bold: true })} - ${(0, ArielUtils_1.formatCash)(item.shopPrice)}\n${unispectra_1.UNISpectra.arrowFromT} ${item.flavorText}\n`;
    },
    ignoreFeature: [
        "top",
        "all",
        "trade",
        "sell",
        "use",
        "transfer",
        "inspect",
    ],
}, [
    {
        key: "template",
        description: "Get an item template by category.",
        aliases: ["temp", "tmp"],
        args: ["<category>"],
        async handler({ output }, extra, bc) {
            const cat = extra.spectralArgs[0];
            const item = exports.itemTemplate.find((i) => `${i.category}`.toLowerCase() === `${cat || ""}`.toLowerCase());
            if (!cat || !item) {
                return output.reply(`📄 Please provide the template category ID as argument, here are the categories:\n\n${exports.itemTemplate
                    .map((i) => `${unispectra_1.UNISpectra.disc} "${i.category}" - ${bc.listItem(i.data)}`)
                    .join("\n")}`);
            }
            return output.reply(`📄 **${cat.toTitleCase()}**\n\n💡 **Guide:**\nThe key is the item ID for typing, name is the item name for listing, icon is the item emoji, flavorText is the item description. Sell price is briefcase sell price (must be lower than half of it's shop price), shop price is the price in the community shop.\n${item.guide}\n\n**Preview:**\n${bc.listItem(item.data)}\n\n**Customize this JSON DATA**:\n\n${JSON.stringify(item.data, null, 2)}`);
        },
    },
    {
        key: "getjson",
        description: "Extract the JSON of an item from your inventory.",
        args: ["<item_key>"],
        async handler({ output }, { spectralArgs }, { userData }) {
            const key = spectralArgs[0];
            const head = `👤 **${userData.name || "Unregistered"}**\n\n`;
            if (!key) {
                return output.reply(head +
                    `Please provide the **item key** of an item from your inventory to get the JSON data.`);
            }
            const local = new InventoryEnhanced_1.Inventory(userData.inventory);
            const item = local.getOne(key);
            if (!item) {
                return output.reply(head + `Item with key "${key}" does **not** exist.`);
            }
            return output.reply(head +
                `📄 Here is the requested **JSON Data**\n\n${JSON.stringify(item, null, 2)}`);
        },
    },
    {
        key: "getjsonsub",
        description: "Extract the JSON of an item from your submissions.",
        args: ["<item_key>"],
        async handler({ output }, { spectralArgs }, { userData, inventory }) {
            const key = spectralArgs[0];
            const head = `👤 **${userData.name || "Unregistered"}**\n\n`;
            if (!key) {
                return output.reply(head +
                    `Please provide the **item key** of an item from your submissions to get the JSON data.`);
            }
            const item = inventory.getOne(key);
            if (!item) {
                return output.reply(head + `Item with key "${key}" does **not** exist.`);
            }
            return output.reply(head +
                `📄 Here is the requested **JSON Data**\n\n${JSON.stringify(item, null, 2)}`);
        },
    },
    {
        key: "submit",
        description: "Submit a JSON of your requested item.",
        args: ["<json data>"],
        aliases: ["s", "sub", "new"],
        async handler({ output, usersDB, input }, { spectralArgs }, { userData, inventory, iKey, listItem, instance }) {
            const head = `👤 **${userData.name || "Unregistered"}**\n\n`;
            if (inventory.size() >= inventory.limit) {
                return output.reply(head + `❌ Your request item inventory is **full**! Toss something.`);
            }
            const json = spectralArgs.join(" ");
            const validation = validateItemSubmission(json);
            const rej = `${unispectra_1.UNISpectra.disc} ❌ Your submission has been automatically rejected.\n\n💬 **Feedback**:`;
            if (validation.success === false) {
                return output.reply(head + `${rej}\n${validation.err}`);
            }
            const item = validation.item;
            delete item.likes;
            delete item.dislikes;
            delete item.featuredDestination;
            delete item.isFeatured;
            delete item.approved;
            delete item.authorID;
            delete item.author;
            delete item.rejectMessage;
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const exists = allSubs.find((i) => i.item.key === item.key);
            if (exists) {
                return output.reply(head +
                    `${rej}\nItem with the key of "${item.key}" already exists in the global submissions, if the item is yours, you might consider tossing it, or using a different item key.\n\n${unispectra_1.UNISpectra.arrow}** By 👤${exists.userData.name ?? "Unknown"}**\n${instance.extraConfig.itemLister(exists.item, 1)}`);
            }
            item.uuid = InventoryEnhanced_1.Inventory.generateUUID();
            item.submissionDate = Date.now();
            inventory.addOne(item);
            await usersDB.setItem(input.senderID, {
                [iKey]: Array.from(inventory),
            });
            return output.reply(head +
                `${unispectra_1.UNISpectra.disc} ✅ Your submission has been successful. Please wait for the **admin approval**.\n\n${listItem(item)} - ${(0, ArielUtils_1.formatCash)(item.shopPrice)}\n${unispectra_1.UNISpectra.charm} ${item.flavorText}\n\n${JSON.stringify(item, null, 2)}\n\n💡 **Tip**: If you want to undo the submission, simply toss the item. You can list all submitted items.`);
        },
    },
    {
        key: "submit_as",
        description: "Submit a JSON of your requested item as UID",
        args: ["<uid", "<json data>"],
        isAdmin: true,
        aliases: ["sa", "suba", "newa"],
        async handler({ output, usersDB, input }, { spectralArgs }, { iKey, listItem, instance }) {
            const id = spectralArgs[0];
            if (!input.isAdmin || !id) {
                return output.reply(`❌`);
            }
            const userData = await usersDB.getCache(id);
            const inventory = new InventoryEnhanced_1.Inventory(userData[iKey]);
            const head = `👤 **${userData.name || "Unregistered"}**\n\n`;
            if (inventory.size() >= inventory.limit) {
                return output.reply(head + `❌ Your request item inventory is **full**! Toss something.`);
            }
            const json = spectralArgs.slice(1).join(" ");
            const validation = validateItemSubmission(json);
            const rej = `${unispectra_1.UNISpectra.disc} ❌ Your submission has been automatically rejected.\n\n💬 **Feedback**:`;
            if (validation.success === false) {
                return output.reply(head + `${rej}\n${validation.err}`);
            }
            const item = validation.item;
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const exists = allSubs.find((i) => i.item.key === item.key);
            if (exists) {
                return output.reply(head +
                    `${rej}\nItem with the key of "${item.key}" already exists in the global submissions, if the item is yours, you might consider tossing it, or using a different item key.\n\n${unispectra_1.UNISpectra.arrow}** By 👤${exists.userData.name ?? "Unknown"}**\n${instance.extraConfig.itemLister(exists.item, 1)}`);
            }
            item.uuid = InventoryEnhanced_1.Inventory.generateUUID();
            item.submissionDate = Date.now();
            inventory.addOne(item);
            await usersDB.setItem(id, {
                [iKey]: Array.from(inventory),
            });
            return output.reply(head +
                `${unispectra_1.UNISpectra.disc} ✅ Your submission has been successful. Please wait for the **admin approval**.\n\n${listItem(item)} - ${(0, ArielUtils_1.formatCash)(item.shopPrice)}\n${unispectra_1.UNISpectra.charm} ${item.flavorText}\n\n${JSON.stringify(item, null, 2)}\n\n💡 **Tip**: If you want to undo the submission, simply toss the item. You can list all submitted items.`);
        },
    },
    {
        key: "recent",
        description: "View recent submissions",
        args: ["[page]"],
        aliases: ["r", "newest"],
        async handler({ output, usersDB }, { spectralArgs }, { iKey }) {
            const page = Number(spectralArgs[0]) || 1;
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat()
                .sort((a, b) => b.item.submissionDate - a.item.submissionDate);
            const pagedSubmissions = new utils_liane_1.Slicer(allSubs, perPage);
            const pageData = pagedSubmissions.getPage(page);
            const mapped = pageData
                .map((submission) => `${(0, BriefcaseAPI_1.listItem)(submission.item, 1, { bold: true })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}\n${Object.entries(submission.item)
                .filter((e) => !h.includes(e[0]))
                .map((e) => `${unispectra_1.UNISpectra.charm} **${e[0].toTitleCase()}**: ${JSON.stringify(e[1])}`)
                .join("\n")}`)
                .join(`\n${unispectra_1.UNISpectra.standardLine}\n`);
            return output.reply(`🕒 **Recent Submissions** (Page **${page}** of **${pagedSubmissions.pagesLength}**)\n${unispectra_1.UNISpectra.standardLine}\n${mapped || "🧹 No submissions."}\n${unispectra_1.UNISpectra.standardLine}\nUse the **view** option to get a detailed look of the submission.`);
        },
    },
    {
        key: "top",
        description: "View top submissions",
        args: ["[page]"],
        aliases: ["t", "liked"],
        async handler({ output, usersDB }, { spectralArgs }, { iKey }) {
            const page = Number(spectralArgs[0]) || 1;
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat()
                .sort((a, b) => getLikes(b.item) - getLikes(a.item));
            const pagedSubmissions = new utils_liane_1.Slicer(allSubs, perPage);
            const pageData = pagedSubmissions.getPage(page);
            const mapped = pageData
                .map((submission) => `${(0, BriefcaseAPI_1.listItem)(submission.item, 1, { bold: true })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}\n${Object.entries(submission.item)
                .filter((e) => !h.includes(e[0]))
                .map((e) => `${unispectra_1.UNISpectra.charm} **${e[0].toTitleCase()}**: ${JSON.stringify(e[1])}`)
                .join("\n")}`)
                .join(`\n${unispectra_1.UNISpectra.standardLine}\n`);
            return output.reply(`📈 **Most Liked Submissions** (Page **${page}** of **${pagedSubmissions.pagesLength}**)\n${unispectra_1.UNISpectra.standardLine}\n${mapped || "🧹 No submissions."}\n${unispectra_1.UNISpectra.standardLine}\nUse the **view** option to get a detailed look of the submission.`);
        },
    },
    {
        key: "featured",
        description: "View featured submissions",
        args: ["[page]"],
        aliases: ["feat", "rated"],
        async handler({ output, usersDB }, { spectralArgs }, { iKey }) {
            const page = Number(spectralArgs[0]) || 1;
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat()
                .filter((i) => i.item.isFeatured || i.item.approved)
                .sort((a, b) => getLikes(b.item) - getLikes(a.item));
            const pagedSubmissions = new utils_liane_1.Slicer(allSubs, perPage);
            const pageData = pagedSubmissions.getPage(page);
            const mapped = pageData
                .map((submission) => `${(0, BriefcaseAPI_1.listItem)(submission.item, 1, { bold: true })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}\n${Object.entries(submission.item)
                .filter((e) => !h.includes(e[0]))
                .map((e) => `${unispectra_1.UNISpectra.charm} **${e[0].toTitleCase()}**: ${JSON.stringify(e[1])}`)
                .join("\n")}`)
                .join(`\n${unispectra_1.UNISpectra.standardLine}\n`);
            return output.reply(`✨ **Featured Submissions** (Page **${page}** of **${pagedSubmissions.pagesLength}**)\n${unispectra_1.UNISpectra.standardLine}\n${mapped || "🧹 No submissions."}\n${unispectra_1.UNISpectra.standardLine}\nUse the **view** option to get a detailed look of the submission.`);
        },
    },
    {
        key: "view",
        description: "View a specific submission by item key.",
        args: ["<key>"],
        aliases: ["v"],
        async handler({ output, usersDB }, { spectralArgs }, { iKey }) {
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            const mapped = `${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}\n${Object.entries(submission.item)
                .filter((e) => !h.includes(e[0]))
                .map((e) => `${unispectra_1.UNISpectra.charm} **${e[0].toTitleCase()}**: ${JSON.stringify(e[1])}`)
                .join("\n")}\n\n${JSON.stringify(submission.item, null, 2)}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "like",
        description: "Like a specific submission by item key.",
        args: ["<key>"],
        async handler({ output, usersDB, input }, { spectralArgs }, { iKey }) {
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.item.dislikes ??= [];
            submission.item.likes ??= [];
            submission.item.likes.remove(input.senderID);
            submission.item.likes.push(input.senderID);
            submission.userData[iKey] ??= [];
            submission.item.dislikes.remove(input.senderID);
            submission.userData[iKey].remove(submission.item);
            submission.userData[iKey].push(submission.item);
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            const mapped = `👍 **Liked Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "dislike",
        description: "Dislike a specific submission by item key.",
        args: ["<key>"],
        async handler({ output, usersDB, input }, { spectralArgs }, { iKey }) {
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.item.dislikes ??= [];
            submission.item.likes ??= [];
            submission.item.dislikes.remove(input.senderID);
            submission.item.dislikes.push(input.senderID);
            submission.userData[iKey] ??= [];
            submission.item.likes.remove(input.senderID);
            submission.userData[iKey].remove(submission.item);
            submission.userData[iKey].push(submission.item);
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            const mapped = `👎 **Disliked Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "approve",
        description: "(Admin Only) Approve and a specific submission by item key.",
        isAdmin: true,
        args: ["<key>"],
        async handler({ output, usersDB, globalDB, input }, { spectralArgs }, { iKey }) {
            if (!input.isAdmin) {
                return output.reply(`❌`);
            }
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.userData[iKey] ??= [];
            submission.item.approved = true;
            submission.item.authorID = submission.uid;
            submission.item.cannotToss = true;
            submission.userData[iKey].remove(submission.item);
            submission.userData[iKey].push(submission.item);
            let approved = (await globalDB.getItem(exports.globalKey))[exports.propKey];
            approved ??= [];
            const exi = approved.findIndex((i) => i.key === submission.item.key);
            if (exi !== -1) {
                approved.splice(exi, 1);
            }
            approved.push({
                ...submission.item,
                cannotToss: false,
            });
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            await globalDB.setItem(exports.globalKey, {
                [exports.propKey]: approved,
            });
            const mapped = `✨ **Approved Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "feature",
        description: "(Admin Only) feature a specific submission by item key.",
        isAdmin: true,
        args: ["<key>", "[in]"],
        async handler({ output, usersDB, globalDB, input }, { spectralArgs }, { iKey }) {
            if (!input.isAdmin) {
                return output.reply(`❌`);
            }
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.userData[iKey] ??= [];
            submission.item.isFeatured = true;
            submission.item.featuredDestination = spectralArgs[1] || "";
            submission.item.authorID = submission.uid;
            submission.item.cannotToss = true;
            submission.userData[iKey].remove(submission.item);
            submission.userData[iKey].push(submission.item);
            let approved = (await globalDB.getItem(exports.globalKey))[exports.propKey];
            approved ??= [];
            const exi = approved.findIndex((i) => i.key === submission.item.key);
            if (exi !== -1) {
                approved.splice(exi, 1);
            }
            approved.push({
                ...submission.item,
                cannotToss: false,
            });
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            await globalDB.setItem(exports.globalKey, {
                [exports.propKey]: approved,
            });
            const mapped = `✨ **Featured Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "unrate",
        description: "(Admin Only) remove approval/feature of a specific submission by item key.",
        isAdmin: true,
        args: ["<key>", "[in]"],
        async handler({ output, usersDB, globalDB, input }, { spectralArgs }, { iKey }) {
            if (!input.isAdmin) {
                return output.reply(`❌`);
            }
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.userData[iKey] ??= [];
            delete submission.item.isFeatured;
            delete submission.item.approved;
            delete submission.item.featuredDestination;
            delete submission.item.authorID;
            submission.item.cannotToss = false;
            submission.userData[iKey].remove(submission.item);
            submission.userData[iKey].push(submission.item);
            let approved = (await globalDB.getItem(exports.globalKey))[exports.propKey];
            approved ??= [];
            const exi = approved.findIndex((i) => i.key === submission.item.key);
            if (exi !== -1) {
                approved.splice(exi, 1);
            }
            approved.push({
                ...submission.item,
                cannotToss: false,
            });
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            await globalDB.setItem(exports.globalKey, {
                [exports.propKey]: approved,
            });
            const mapped = `💀 **Unrated Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "delete",
        description: "(Admin Only) Delete a specific submission by item key.",
        isAdmin: true,
        args: ["<key>"],
        async handler({ output, usersDB, globalDB, input }, { spectralArgs }, { iKey }) {
            if (!input.isAdmin) {
                return output.reply(`❌`);
            }
            const key = spectralArgs[0];
            if (!key) {
                return output.reply(`Please provide the item key for the submission as argument.`);
            }
            const all = await usersDB.getAllCache();
            const allSubs = Object.entries(all)
                .map((i) => {
                const sub = i[1][iKey] ?? [];
                return sub.map((s) => {
                    s.submissionDate ??= 0;
                    return {
                        item: s,
                        uid: i[0],
                        userData: i[1],
                    };
                });
            })
                .flat();
            const submission = allSubs.find((i) => i.item.key === key);
            if (!submission) {
                return output.reply(`No submissions are found with key "${key}"`);
            }
            submission.userData[iKey] ??= [];
            submission.userData[iKey].remove(submission.item);
            let approved = (await globalDB.getItem(exports.globalKey))[exports.propKey];
            approved ??= [];
            const exi = approved.findIndex((i) => i.key === submission.item.key);
            if (exi !== -1) {
                approved.splice(exi, 1);
            }
            await usersDB.setItem(submission.uid, {
                [iKey]: submission.userData[iKey],
            });
            await globalDB.setItem(exports.globalKey, {
                [exports.propKey]: approved,
            });
            const mapped = `✨ **Deleted Successfully**\n\n${(0, BriefcaseAPI_1.listItem)(submission.item, 1, {
                bold: true,
            })} - ${(0, ArielUtils_1.formatCash)(submission.item.shopPrice)}\n${unispectra_1.UNISpectra.arrow} **By 👤 ${submission.userData?.name ?? "Unknown"}**\n${renderLikes(submission.item)}\n${unispectra_1.UNISpectra.charm} **Description:** ${submission.item.flavorText}`;
            return output.reply(`${mapped || "🧹 No submission found."}`);
        },
    },
    {
        key: "open",
        description: "Open the community shop.",
        aliases: ["o"],
        async handler({ globalDB, ctx }, {}, {}) {
            let approved = (await globalDB.getItem(exports.globalKey))[exports.propKey];
            approved ??= [];
            const itemData = approved
                .filter((i) => i.approved)
                .map((i) => {
                return {
                    flavorText: i.flavorText,
                    icon: i.icon,
                    key: i.key,
                    name: i.name,
                    price: i.shopPrice,
                    onPurchase({ moneySet }) {
                        moneySet.inventory.push({
                            ...i,
                            uuid: InventoryEnhanced_1.Inventory.generateUUID(),
                        });
                    },
                };
            });
            const shop = new ut_shop_1.UTShop({
                itemData,
                welcomeTexts: [`✨ Welcome to the **Community Shop**!`],
                style: exports.style,
                key: "comshop",
                buyTexts: ["Everything here was made by the community."],
            });
            return shop.onPlay(ctx);
        },
    },
]);
function renderLikes(item) {
    const result = (item.likes ?? []).length - (item.dislikes ?? []).length;
    return `${item.isFeatured
        ? !item.featuredDestination
            ? `✨ Featured!\n`
            : `✨ Featured in: **${item.featuredDestination}**\n`
        : ``}${item.approved ? `🛒 In Shop!\n` : ``}${result < 0 ? `👎` : `👍`} **${Math.abs(result).toLocaleString()}**`;
}
function getLikes(item) {
    const result = (item.likes ?? []).length - (item.dislikes ?? []).length;
    return result;
}
function validateItemSubmission(itemStr) {
    if (!itemStr) {
        return {
            success: false,
            err: `The JSON Data is missing, make sure to paste your modified json data.`,
        };
    }
    let item;
    if (typeof itemStr === "string") {
        try {
            item = JSON.parse(itemStr);
        }
        catch (error) {
            return {
                success: false,
                err: `JSON Parsing failed: ${error.message}`,
            };
        }
    }
    else {
        item = itemStr;
    }
    const keys = Object.keys(item);
    const required = ["name", "key", "icon", "flavorText", "type", "shopPrice"];
    if (item.type === "armor") {
        required.push("def");
    }
    if (item.type === "weapon") {
        required.push("atk");
    }
    if (item.type === "food") {
        required.push("heal");
    }
    if (item.type?.endsWith("_food")) {
        required.push("saturation");
    }
    if (item.type === "zip") {
        required.push("zipContents");
    }
    if (item.type === "pet") {
        required.push("sellPrice");
    }
    const missing = required.filter((r) => !keys.includes(r));
    if (missing.length > 0) {
        return {
            success: false,
            err: `Missing properties:\n${missing.join(", ")}`,
        };
    }
    item.name = `${item.name}`;
    item.key = `${item.key}`;
    item.flavorText = `${item.flavorText}`;
    item.icon = `${item.icon}`;
    if (!/^[a-zA-Z0-9_]+$/.test(item.key)) {
        return {
            success: false,
            err: `Item key must only contain letters, numbers, and underscore.`,
        };
    }
    item.icon = [...item.icon.matchAll(/\p{Emoji}/gu)]
        .map((i) => i[0])
        .slice(0, 2)
        .join("");
    if (item.icon.length === 0) {
        return {
            success: false,
            err: "Item icon must not be empty, and must be 1-2 emojis",
        };
    }
    if (item.key.length === 0) {
        return {
            success: false,
            err: "Item key must not be empty",
        };
    }
    if (item.name.length === 0) {
        return {
            success: false,
            err: "Item name must not be empty",
        };
    }
    if (item.flavorText.length === 0) {
        return {
            success: false,
            err: "Item flavorText must not be empty",
        };
    }
    if (item.flavorText.length > 100) {
        return {
            success: false,
            err: "Item flavorText must not be longer than 100 characters.",
        };
    }
    if (item.name.length > 30) {
        return {
            success: false,
            err: "Item name must not be longer than 30 characters.",
        };
    }
    if (item.key.length > 20) {
        return {
            success: false,
            err: "Item key must not be longer than 20 characters.",
        };
    }
    item.shopPrice = Number(item.shopPrice) || 0;
    item.sellPrice = Number(item.sellPrice) || 0;
    if (item.shopPrice <= 0) {
        return {
            success: false,
            err: "Shop Price must be higher than zero.",
        };
    }
    if (item.sellPrice < 0) {
        return {
            success: false,
            err: "Sell Price must be higher or equal than zero.",
        };
    }
    if (item.sellPrice > item.shopPrice / 2) {
        return {
            success: false,
            err: "Sell Price must not be higher than half of the shop price.",
        };
    }
    if (item.type === "armor" || item.type === "weapon") {
        item.atk = Number(item.atk) || 0;
        item.def = Number(item.def) || 0;
        item.magic = Number(item.magic) || 0;
        if (item.type === "weapon" && Number(item.atk) <= 0) {
            return {
                success: false,
                err: `For weapons, the atk stat must exist and must not be lower or equal to zero.`,
            };
        }
        if (item.type === "armor" && Number(item.def) <= 0) {
            return {
                success: false,
                err: `For armors, the def stat must exist and must not be lower or equal to zero.`,
            };
        }
    }
    if (item.type === "food") {
        item.heal = Number(item.heal) || 0;
        if (Number(item.heal) <= 0) {
            return {
                success: false,
                err: `Item heal for food must not be lower or equal to zero.`,
            };
        }
    }
    if (item.type?.endsWith("_food")) {
        item.saturation = Number(item.saturation) || 0;
        if (Number(item.saturation) <= 0) {
            return {
                success: false,
                err: `Item saturation for food must not be lower or equal to zero.`,
            };
        }
    }
    if (item.type === "zip") {
        item.zipContents = Array.isArray(item.zipContents) ? item.zipContents : [];
        if (item.zipContents.length === 0) {
            return {
                success: false,
                err: `Zip items must have zipContents as array.`,
            };
        }
        let i = 0;
        for (const zipI of item.zipContents) {
            i++;
            const vali = validateItemSubmission({
                ...zipI,
                shopPrice: 1,
            });
            if (vali.success === false) {
                return {
                    success: false,
                    err: `(Zip Content #${i}): ${vali.err}`,
                };
            }
        }
    }
    if (item.type === "cheque") {
        item.chequeAmount = Number(item.chequeAmount) || 0;
        if (Number(item.chequeAmount) <= 0) {
            return {
                success: false,
                err: `The chequeAmount must be higher than zero.`,
            };
        }
    }
    item.uuid = InventoryEnhanced_1.Inventory.generateUUID();
    return {
        success: true,
        item,
    };
}
async function entry(ctx) {
    home.runInContext(ctx);
}
