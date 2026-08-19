"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entry = exports.style = exports.meta = void 0;
const spectralCMDHome_1 = require("../modules/spectralCMDHome");
const unispectra_1 = require("@cassidy/unispectra");
exports.meta = {
    name: "setprefix",
    description: "Set or view the command prefix",
    otherNames: ["pfx", "changeprefix", "sprefix", "pref"],
    version: "1.0.0",
    usage: "{prefix}{name} [newPrefix]",
    category: "Moderation",
    author: "frnAlt",
    permissions: [0],
    noPrefix: false,
    waitingTime: 0,
    requirement: "3.0.0",
    icon: "🔧",
    noWeb: true,
};
exports.style = {
    title: "🔧 Prefix",
    titleFont: "bold",
    contentFont: "fancy",
};
const configs = [
    {
        key: "view",
        description: "View the current prefix",
        aliases: ["-v", "show"],
        icon: "👀",
        async handler({ output, prefix, prefixes, threadsDB, input, commandName }, { itemList }) {
            const currentPrefix = prefix;
            const { threadPrefix } = await threadsDB.getItem(input.threadID);
            output.reply(`${unispectra_1.UNIRedux.charm} **Current Prefix**:\n${currentPrefix}\n\n` +
                `${unispectra_1.UNIRedux.arrowFromT} **Extra Prefixes**:\n[ ${prefixes.join(", ")} ]\n\n` +
                (threadPrefix
                    ? `${unispectra_1.UNIRedux.arrowFromT} **Custom Prefix**:\n${threadPrefix}\n\n`
                    : "") +
                `${unispectra_1.UNIRedux.arrow} ***All Options***:\n\n${itemList}\n\n` +
                `Use **${currentPrefix}${commandName}-set [newPrefix]** to set a custom prefix.`);
        },
    },
    {
        key: "set",
        description: "Set a new command prefix",
        args: ["[newPrefix]"],
        aliases: ["-s"],
        icon: "✏️",
        validator: new spectralCMDHome_1.CassCheckly([
            {
                index: 0,
                type: "string",
                required: true,
                name: "newPrefix",
                regex: /^[^\s]{1,5}$/,
            },
        ]),
        async handler({ input, output, prefix, threadsDB }, { spectralArgs }) {
            const newPrefix = spectralArgs[0];
            try {
                output.waitForReaction(`${unispectra_1.UNIRedux.arrow} ***Confirmation Required***\n\nReact with any emoji to confirm the update to the new prefix.`, async (ctx) => {
                    await threadsDB.setItem(input.threadID, {
                        threadPrefix: newPrefix,
                    });
                    ctx.output.setUIName("Confirmed!");
                    ctx.output.replyStyled({
                        body: `${unispectra_1.UNIRedux.arrow} ***Prefix Updated*** ✅\n\n` +
                            `The prefix has been changed from **${prefix}** to **${newPrefix}**.\n\n` +
                            `${unispectra_1.UNISpectra.arrowFromT} Use **${newPrefix}start** to explore the list of available commands!`,
                        messageID: ctx.input.messageID,
                        noRibbonUI: true,
                        noLevelUI: true,
                    }, exports.style);
                });
            }
            catch (error) {
                output.error(error);
            }
        },
    },
    {
        key: "reset",
        description: "Reset prefix to default",
        aliases: ["-r"],
        icon: "🔄",
        async handler({ input, output, threadsDB }) {
            const defaultPrefix = global.Cassidy.config.PREFIX;
            try {
                await threadsDB.remove(input.threadID, ["threadPrefix"]);
                await output.reply(`${unispectra_1.UNIRedux.arrow} ***Prefix Reset*** ✅\n\n` +
                    `${unispectra_1.UNIRedux.arrowFromT} Now using **default**: ${defaultPrefix}`);
            }
            catch (error) {
                output.error(error);
            }
        },
    },
];
const home = new spectralCMDHome_1.SpectralCMDHome({
    argIndex: 0,
    isHypen: true,
    globalCooldown: 3,
    defaultKey: "view",
    errorHandler: (error, ctx) => {
        ctx.output.error(error);
    },
    defaultCategory: "Utility",
}, configs);
const define_1 = require("@cass/define");
exports.entry = (0, define_1.defineEntry)(async (ctx) => {
    return home.runInContext(ctx);
});
