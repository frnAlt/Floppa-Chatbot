"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.meta = void 0;
exports.entry = entry;
// @ts-check
const unispectra_1 = require("@cassidy/unispectra");
const shopV2_1 = require("@cass-plugins/shopV2");
const string_similarity_1 = __importDefault(require("string-similarity"));
exports.meta = {
    name: "menu",
    author: "frnAlt",
    description: "Acts as a central hub, like a Start Menu, providing users with an overview of available commands, their functionalities, and access to specific command details. Helps users quickly navigate the bot's features.",
    version: "3.1.1",
    usage: "{prefix}{name} [commandName]",
    category: "System",
    role: 0,
    waitingTime: 0.1,
    requirement: "3.0.0",
    icon: "🧰",
    otherNames: ["start", "help"],
};
exports.style = {
    title: Cassidy.logo,
    titleFont: "none",
    contentFont: "none",
};
const basicCommands = {
    register: "Change your username.",
    items: "List and use **items** from your inventory.",
    gift: "Collect your hourly free gift/rewards.",
    bal: "Check your virtual **money**, collectibles, battlepoints, and ranks.",
    bank: "Store other **items** and **money** in an isolated bank.",
    active: "See **active** users.",
    streak: "Collect your **daily** bonus/streak.",
    vault: "Extra **storage** for your items.",
    bag: "Another extra **storage** for your items.",
    rank: "View your **EXP**.",
    ratings: "View and write a **ratings & review**",
    report: "Report **something** to an admin.",
    trade: "**Buy & Sell** items.",
    uid: "View your UNIQUE User ID.",
    pet: "Buy, feed, and **earn** from your pets!",
    rosashop: "Buy something **pet** related.",
    garden: "Grow a **Garden** here!",
    arena: "AI or PvP Pet Tournament, where you can **earn**!",
    mtls: "Create, buy, convert your **money** to a **mint**, (Not a **stock system** BTW.)",
};
async function entry({ input, output, prefix, commandName, commandName: cmdn, money, multiCommands, InputRoles, }) {
    const commands = multiCommands.toUnique((i) => i.meta?.name);
    const args = input.arguments;
    const { logo: icon } = global.Cassidy;
    const { shopInv, money: userMoney } = await money.queryItem(input.senderID, "shopInv", "money");
    const shop = new shopV2_1.ShopClass(shopInv);
    if (String(args[0]).toLowerCase() === "all" ||
        (!args[0] && !Cassidy.allowGames)) {
        const categorizedCommands = commands.values().reduce((categories, command) => {
            const category = command.meta.category || "Miscellaneous";
            if (!categories[category])
                categories[category] = [];
            categories[category].push(command);
            return categories;
        }, {});
        const dontPrio = ["arl_g", "cplx_g"];
        const getSumPrioIndex = (commands) => {
            if (!commands.length)
                return 0;
            return commands.reduce((sum, cmd) => {
                const idx = dontPrio.indexOf(cmd.meta.cmdType) * 5;
                return sum + (idx === -1 ? 0 : -idx);
            }, 0);
        };
        const sortedCategories = Object.keys(categorizedCommands).sort((a, b) => {
            const aCommands = categorizedCommands[a];
            const bCommands = categorizedCommands[b];
            const aPrio = getSumPrioIndex(aCommands);
            const bPrio = getSumPrioIndex(bCommands);
            if (aPrio !== bPrio) {
                return aPrio - bPrio;
            }
            return a.localeCompare(b);
        });
        let result = ``;
        for (const category of sortedCategories) {
            result += `${unispectra_1.UNISpectra.arrowFromB} 📁 **${category}** (${categorizedCommands[category].length})\n`;
            for (const command of categorizedCommands[category]) {
                const { name, icon, shopPrice = 0 } = command.meta;
                const role = await (0, unispectra_1.extractCommandRole)(command);
                const statusIcon = role === InputRoles.ADMINBOX && !input.hasRole(role)
                    ? "📦"
                    : InputRoles.MODERATORBOT && !input.hasRole(role)
                        ? "🛡️"
                        : role === InputRoles.ADMINBOT && !input.hasRole(role)
                            ? "👑"
                            : shop.isUnlocked(name)
                                ? icon || "📄"
                                : shop.canPurchase(name, userMoney)
                                    ? "🔐"
                                    : "🔒";
                let isAllowed = (!shopPrice || shop.isUnlocked(name)) && input.hasRole(role);
                if (!isAllowed) {
                }
                result += `${statusIcon} ${(0, unispectra_1.toTitleCase)(name)},   `;
            }
            result += `\n${unispectra_1.UNISpectra.standardLineOld}\n`;
        }
        result = result.trim();
        result += `\n${unispectra_1.UNISpectra.arrow} Command details: **${prefix}${commandName} <command>**\n`;
        const resultStr = `🔍 | **Available Commands** 🧰 (${commands.size})\n\n${result}${unispectra_1.UNISpectra.charm} Developed by @**Liane Cagara** 🎀`;
        return output.reply(resultStr);
    }
    else if (String(args[0]).toLowerCase() === "search" ||
        String(args[0]).toLowerCase() === "find") {
        const searchStr = String(args[1] || "");
        if (!searchStr) {
            return output.reply(`🔎 Search a **command** by putting a search keyword as argument.\n\n**EXAMPLE**: ${prefix}${commandName} search shop`);
        }
        const getSortedFinds = (search, candidates) => {
            const results = candidates
                .map((candidate) => {
                const scores = candidate.tokens.map((t) => string_similarity_1.default.compareTwoStrings(search.toLowerCase(), t));
                const scoreSum = scores.reduce((acc, score) => score + acc, 0);
                const mean = scoreSum / scores.length;
                return {
                    candidate,
                    scoreWhole: string_similarity_1.default.compareTwoStrings(search.toLowerCase(), candidate.tokens.join("\n").toLowerCase()),
                    scoreMean: mean,
                    score: scoreSum,
                    data: candidate.data,
                };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
            return results;
        };
        const cmds = commands.values().map((command) => {
            const { meta: { ...meta }, } = command;
            meta.seo ??= [];
            meta.otherNames ??= [];
            meta.description ??= "";
            meta.usage ??= "";
            meta.category ??= "";
            meta.usage = meta.usage.replaceAll("{prefix}", "");
            meta.usage = meta.usage.replaceAll("{name}", "");
            const combined = `${meta.category} ${meta.name} ${meta.otherNames.join(" ")} ${meta.name} ${meta.otherNames.join(" ")} ${meta.name} ${meta.otherNames.join(" ")} ${meta.name} ${meta.otherNames.join(" ")} ${meta.name} ${meta.otherNames.join(" ")} ${meta.name} ${meta.otherNames.join(" ")} ${meta.description} ${meta.usage} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")} ${meta.seo.join(" ")}`;
            const split = combined.split(/\s+/);
            return { ...command, meta, searchStr: combined, split };
        });
        const results = getSortedFinds(searchStr, cmds.map((i) => ({
            tokens: i.split,
            data: i,
        })));
        return output.reply(`🔎 **Search Results** (${results.length})\n${unispectra_1.UNISpectra.standardLine}\n${results.length === 0
            ? `❓ No Results.`
            : results
                .map((i) => ({ ...i.data.meta, i }))
                .map((i) => `${i.icon ?? "📁"} ${prefix}**${i.name}**${i.otherNames.length > 0
                ? `\nAliases: **${i.otherNames.join(", ")}**`
                : ""}\n${unispectra_1.UNISpectra.arrowFromT} ${i.description ?? "No Description"}`)
                .join(`\n${unispectra_1.UNISpectra.standardLine}\n`)}`);
    }
    else if (String(args[0]).toLowerCase() === "basics") {
        const entries = Object.entries(basicCommands);
        const filteredEntries = await Promise.all(entries.map(async (i) => {
            const command = multiCommands.getOne(i[0]);
            if (!command) {
                return null;
            }
            const role = await (0, unispectra_1.extractCommandRole)(command);
            const isAllowed = input.hasRole(role);
            return i;
            return isAllowed ? i : null;
        }));
        const validEntries = filteredEntries.filter(Boolean);
        const basicStr = validEntries
            .map((i) => `${multiCommands.getOne(i[0])?.meta?.icon ?? "📁"} ${prefix}${i[0]} ${unispectra_1.UNISpectra.arrowFromT} ${i[1]}`)
            .join("\n");
        let strs = [
            `${unispectra_1.UNISpectra.arrow} Are you new to the game? Here are the ***BASICS***`,
            ``,
            `⌨️ You need to put prefixes for commands. For example: Type "${prefix}gift" without quotations to use the gift command.`,
            ``,
            `🔎 You may only use command that **exists** in the menu.`,
            ``,
            `‼️ Some commands require **higher role** to be used.`,
            ``,
            `📝 Do not put any fonts when writing a command. The bot does not accept "${prefix}**gift**" because it has fonts in it.`,
            ``,
            `🎒 What is an item key or inventory key? Here it is:`,
            `***EXAMPLE UI***: 🌒 **Shadow Coin** [shadowCoin]`,
            `The "shadowCoin" is the key, if the command asks you to put a key, that's it. For example: "${prefix}pet-feed Liane shadowCoin" - this will feed **Liane** with 🌒 **Shadow Coin**.`,
            ``,
            `✅ **Basic Commands**`,
            basicStr,
            ``,
            `${unispectra_1.UNISpectra.arrowFromT} Try to ***Explore*** more commands!`,
            `${unispectra_1.UNISpectra.arrowFromT} View by page: **${prefix}${commandName} <page>**`,
            `${unispectra_1.UNISpectra.arrowFromT} View all: **${prefix}${commandName} all**`,
            `${unispectra_1.UNISpectra.charm} Developed by @**Liane Cagara** 🎀`,
        ].join("\n");
        if (1) {
            return output.replyStyled(strs, {
                ...exports.style,
                content: {
                    text_font: "none",
                },
            });
        }
        return output.attach(strs, "http://localhost:8000/start.png", {
            ...exports.style,
            content: {
                text_font: "none",
            },
        });
    }
    else if (args.length > 0 && isNaN(parseInt(args[0]))) {
        const commandName = args[0];
        const commandsFound = multiCommands
            .getMap(commandName)
            .toUnique((i) => i.meta.name)
            .values();
        let str = [];
        if (commandsFound.length > 0) {
            for (const command of commandsFound) {
                const { name, description, otherNames = [], usage, category = "None", waitingTime = 5, author = "Unknown", shopPrice = 0, icon: cmdIcon = "📄", version = "N/A", requirement = "N/A", } = command.meta;
                const status = shop.isUnlocked(name)
                    ? "✅ Unlocked"
                    : shop.canPurchase(name, userMoney)
                        ? "💰 Buyable"
                        : "🔒 Locked";
                let role = await (0, unispectra_1.extractCommandRole)(command, true, input.tid);
                if (commandsFound.length !== 1) {
                    str.push(`╭─── ${cmdIcon} **${(0, unispectra_1.toTitleCase)(name)}** ───
│   📜 **Name**:
│   ${unispectra_1.UNISpectra.charm} ${name}
│ 
│   💬 **Description**: 
│   ${unispectra_1.UNISpectra.charm} ${description}
│ 
│   📝 **Aliases**: 
│   ${unispectra_1.UNISpectra.charm} ${otherNames.length ? otherNames.join(", ") : "None"}
│   
│   🔎 See **${prefix}${cmdn} ${name}** for more info.
╰────────────────`);
                }
                else {
                    str.push(`╭─── ${cmdIcon} **${(0, unispectra_1.toTitleCase)(name)}** ───
│   📜 **Name**:
│   ${unispectra_1.UNISpectra.charm} ${name}
│ 
│   💬 **Description**: 
│   ${unispectra_1.UNISpectra.charm} ${description}
│ 
│   📝 **Aliases**: 
│   ${unispectra_1.UNISpectra.charm} ${otherNames.length ? otherNames.join(", ") : "None"}
│ 
│   🛠️ **Usage**:
│   ${unispectra_1.UNISpectra.charm} ${usage
                        .replace(/{prefix}/g, prefix)
                        .replace(/{name}/g, name)}
│ 
│   📁 **Category**:
│   ${unispectra_1.UNISpectra.charm} ${category}
│ 
│   🔐 **Permissions**:
│   ${unispectra_1.UNISpectra.charm} ${typeof role === "number" ? role : "None required"}
│ 
│   ⏳ **Cooldown**:
│   ${unispectra_1.UNISpectra.charm} ${waitingTime} 
│ 
│   ✍️ **Author**: 
│   ${unispectra_1.UNISpectra.charm} ${author}
│ 
│   💸 **Price**:
│   ${unispectra_1.UNISpectra.charm} ${shopPrice ? `$${shopPrice} ${status}` : "⚡ Free"}
│ 
│   🖼️ **Icon**:
│   ${unispectra_1.UNISpectra.charm} ${cmdIcon}
│ 
│   📌 **Version**:
│   ${unispectra_1.UNISpectra.charm} ${version}
│ 
│   🛡️ **Requirement**:
│   ${unispectra_1.UNISpectra.charm} ${requirement}
╰────────────────`);
                }
            }
            return output.replyStyled(str.join("\n\n"), {
                title: Cassidy.logo,
                contentFont: "fancy",
            });
        }
        else {
            output.reply(`${icon}\n\n❌ Oops! **${commandName}** isn't a valid command. Try another!`);
        }
        return;
    }
    else if (!isNaN(parseInt(args[0])) && args[0]) {
        const categorizedCommands = commands.values().reduce((categories, command) => {
            const category = command.meta.category || "Miscellaneous";
            if (!categories[category])
                categories[category] = [];
            categories[category].push(command);
            return categories;
        }, {});
        const dontPrio = ["arl_g", "cplx_g"];
        const getSumPrioIndex = (commands) => {
            if (!commands.length)
                return 0;
            return commands.reduce((sum, cmd) => {
                const idx = dontPrio.indexOf(cmd.meta.cmdType) * 5;
                return sum + (idx === -1 ? 0 : -idx);
            }, 0);
        };
        const sortedCategories = Object.keys(categorizedCommands).sort((a, b) => {
            const aCommands = categorizedCommands[a];
            const bCommands = categorizedCommands[b];
            const aPrio = getSumPrioIndex(aCommands);
            const bPrio = getSumPrioIndex(bCommands);
            if (aPrio !== bPrio) {
                return aPrio - bPrio;
            }
            return a.localeCompare(b);
        });
        const itemsPerPage = 3;
        const totalPages = Math.ceil(sortedCategories.length / itemsPerPage);
        let currentPage = parseInt(args[0]) || 1;
        if (currentPage < 1)
            currentPage = 1;
        if (currentPage > totalPages)
            currentPage = totalPages;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = currentPage * itemsPerPage;
        const pageCategories = sortedCategories.slice(startIndex, endIndex);
        let result = `**Page ${currentPage} of ${totalPages}** 📄\n`;
        let preff = "│ ";
        for (const category of pageCategories) {
            result += `\n╭─────────────❍\n${preff} ${unispectra_1.UNISpectra.arrow} ***${category}*** 📁 (${categorizedCommands[category].length})\n${preff}\n`;
            for (const command of categorizedCommands[category]) {
                const { name, icon, shopPrice = 0 } = command.meta;
                const role = await (0, unispectra_1.extractCommandRole)(command);
                const statusIcon = role === InputRoles.ADMINBOX && !input.hasRole(role)
                    ? "📦"
                    : InputRoles.MODERATORBOT && !input.hasRole(role)
                        ? "🛡️"
                        : role === InputRoles.ADMINBOT && !input.hasRole(role)
                            ? "👑"
                            : shop.isUnlocked(name)
                                ? icon || "📄"
                                : shop.canPurchase(name, userMoney)
                                    ? "🔐"
                                    : "🔒";
                let isAllowed = (!shopPrice || shop.isUnlocked(name)) && input.hasRole(role);
                result += `${preff}  ${statusIcon} ${prefix}${isAllowed ? `**${(0, unispectra_1.toTitleCase)(name)}**` : `${(0, unispectra_1.toTitleCase)(name)}`}${shopPrice
                    ? ` - $${shopPrice} ${shop.isUnlocked(name)
                        ? "✅"
                        : shop.canPurchase(name, userMoney)
                            ? "💰"
                            : "❌"}`
                    : ""}\n`;
            }
            result += `╰─────────────❍\n`;
        }
        result = result.trim();
        result += `\n\n${unispectra_1.UNISpectra.arrow} ***Explore*** more commands!\n`;
        result += `${unispectra_1.UNISpectra.arrow} View another page: **${prefix}${commandName} <page>**\n`;
        result += `${unispectra_1.UNISpectra.arrow} Next page: **${prefix}${commandName} ${currentPage + 1}**\n`;
        result += `${unispectra_1.UNISpectra.arrow} Command details: **${prefix}${commandName} <command>**\n`;
        const resultStr = `🔍 | **Available Commands** 🧰 (${commands.size})\n\n${result}${unispectra_1.UNISpectra.charm} Developed by @**Liane Cagara** 🎀`;
        return output.reply(resultStr);
    }
    else {
        const basicCommandsOld = {
            daily: "Claim your ***FREE*** reward every day!",
            balance: "View your current coins! ( ***SOFT CURRENCY*** )",
            gift: "Enjoy ***ITEM REWARDS*** every 20+ minutes.",
            briefcase: "Learn how to manage your ***ITEMS*** after claiming gifts!",
            bank: "Wanna store your coins somewhere? Try ***BANK**",
            quiz: "Grind ***MORE*** coins by guessing!",
            wordgame: "Grind ***MORE & MORE*** coins by guessing words too!",
            garden: "Grow your ***GARDEN***!",
            buy: "Unlock ***HIDDEN*** commands by purchasing them!",
            rosashop: "Purchase items from shopkeepers and unlock ***NEW POSSIBILITIES***",
            pet: "Buy, Feed, and sell, or even battle using your ***PETS***",
            harvest: "Earn ***LOTS OF COINS*** without doing anything than tune and collect!",
            skyrise: "Wanna manage your own ***EMPIRE*** and ***EARN TOO***?",
            trade: "Sell, collaborate, and ***EARN*** from your items using the price you like!",
            arena: "Turn your pets into a ***GEM*** farm by battling with ai.",
            encounter: "Prepare your ***PETS*** for true danger and earn ***GEMS*** too!",
        };
        const entries = Object.entries(basicCommands);
        const filteredEntries = await Promise.all(entries.map(async (i) => {
            const command = multiCommands.getOne(i[0]);
            if (!command) {
                return null;
            }
            const role = await (0, unispectra_1.extractCommandRole)(command);
            const isAllowedOld = (!command.meta.shopPrice || shop.isUnlocked(command.meta.name)) &&
                input.hasRole(role);
            const isAllowed = input.hasRole(role);
            return i;
            return isAllowed ? i : null;
        }));
        const validEntries = filteredEntries.filter(Boolean);
        const basicStr = validEntries
            .map((i) => `${multiCommands.getOne(i[0])?.meta?.icon ?? "📁"} ${prefix}${i[0]} ${unispectra_1.UNISpectra.arrowFromT} ${i[1]}`)
            .join("\n");
        let strs = [
            `✅ **Basic Commands**`,
            basicStr,
            ``,
            `📚 **More Commands**`,
            `Type **${prefix}${commandName} all**`,
            `Type **${prefix}${commandName} search** <text> to find commands easily.`,
            ``,
            `${unispectra_1.UNISpectra.arrowFromT} View by page: **${prefix}${commandName} <page>**`,
            `${unispectra_1.UNISpectra.arrowFromT} View the basics: **${prefix}${commandName} basics**`,
            `${unispectra_1.UNISpectra.disc} Developed by @**Liane Cagara** 🎀`,
        ].join("\n");
        if (1) {
            return output.replyStyled(strs, {
                ...exports.style,
            });
        }
        return output.attach(strs, "http://localhost:8000/start.png", {
            ...exports.style,
        });
    }
}
