"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unispectra_1 = require("@cassidy/unispectra");
const style = {
    title: "⚠️ Catch Pastebin",
    contentFont: "none",
};
exports.default = defineCommand({
    meta: {
        name: "catchpastebin",
        version: "2.0.0",
        author: "frnAlt",
        waitingTime: 5,
        role: 0,
        description: "Use this to catch pastebin",
        category: "Utilities",
        icon: "⚠️",
    },
    style,
    async entry({ output, globalDB, args, input }) {
        if (!input.isAdmin) {
            return output.reply("Only bot admins can enable or disable this command.");
        }
        const data = await globalDB.getItem("catchpastebin");
        const status = data.status;
        const isEna = status;
        let choice = args[0] === "on"
            ? true
            : args[0] === "off"
                ? false
                : isEna
                    ? !isEna
                    : true;
        await globalDB.setItem("catchpastebin", {
            status: choice,
        });
        output.reply(`**Status**: ${choice ? "Enabled Successfully ✅" : "Disabled Successfully ❌"}`);
    },
    async event({ api, output, usersDB, input, threadsDB, globalDB }) {
        if (!input.isFacebook) {
            return;
        }
        const chat = input.body;
        if (chat.includes("pastebin.com/raw/")) {
            const data = await globalDB.getCache("catchpastebin");
            const status = data.status;
            if (!status) {
                return;
            }
            await usersDB.ensureUserInfo(input.senderID);
            const user = await usersDB.getCache(input.senderID);
            let name = user.userMeta?.name ?? user.name ?? "Unknown";
            await threadsDB.ensureThreadInfo(input.threadID, api);
            const { threadInfo: thread } = await threadsDB.getCache(input.threadID);
            const threadName = thread.threadName;
            for (const id of Cassidy.config.ADMINBOT.filter((i) => usersDB.isNumKey(i))) {
                output.sendStyled(`${unispectra_1.UNISpectra.arrow} ***From*** ${name}\n` +
                    `${unispectra_1.UNISpectra.arrow} ***UID*** ${input.senderID}\n` +
                    `${unispectra_1.UNISpectra.arrow} ***Thread*** ${threadName ?? "Unknown"}\n` +
                    `${unispectra_1.UNISpectra.arrow} ***GCID*** ${input.threadID}\n` +
                    `🔖 ***Content***\n${input
                        .censor(input.body)
                        .replaceAll(".", "(.)")}`, style, id);
            }
        }
    },
});
