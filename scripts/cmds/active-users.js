"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unispectra_1 = require("@cassidy/unispectra");
const command = defineCommand({
    meta: {
        name: "activeusers",
        otherNames: ["active", "acv"],
        description: "Lists the top 10 most active users.",
        author: "frnAlt",
        version: "1.0.0",
        noPrefix: false,
        role: 0,
        isGame: true,
        waitingTime: 3,
        requirement: "3.0.0",
        icon: "⚡",
        category: "User",
    },
    style: {
        title: "Active Users ⚡",
        titleFont: "bold",
        contentFont: "none",
    },
    async entry({ output, input, money, Slicer, args }) {
        const allUsers = await money.getAll();
        const sortedUsers = Object.keys(allUsers).sort((a, b) => {
            allUsers[a] ??= {
                money: 0,
                battlePoints: 0,
                exp: 0,
            };
            allUsers[b] ??= {
                money: 0,
                battlePoints: 0,
                exp: 0,
            };
            const { lastModified: lastModifiedA = Date.now() } = allUsers[a];
            const { lastModified: lastModifiedB = Date.now() } = allUsers[b];
            return lastModifiedB - lastModifiedA;
        });
        let i = ((isNaN(parseInt(args[0])) ? 1 : parseInt(args[0])) - 1) * 10;
        const slicer = new Slicer(sortedUsers, 10);
        let result = `Top 10 Active Users:\n${unispectra_1.UNISpectra.standardLine}\n`;
        for (const userID of slicer.getPage(args[0])) {
            i++;
            const data = allUsers[userID];
            const { lastModified = 0 } = data;
            const lastActiveDate = new Date(lastModified).toLocaleDateString();
            result += `${i}. **${data.userMeta?.name ?? data.name}${data.userMeta?.name && data.name ? ` (${data.name})` : ""}**\n🕒 Last Active: **${lastActiveDate}**\n\n`;
        }
        result = result.trim();
        output.reply(result +
            `\n${unispectra_1.UNISpectra.standardLine}\n${input.words[0]} <page> - View a specific page.\n${input.words[0]} ${Slicer.parseNum(args[0]) + 1} - View next page.\n${input.words[0]} ${slicer.pagesLength} - View the last page.`);
    },
});
exports.default = command;
