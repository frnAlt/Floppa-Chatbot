"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entry = exports.style = exports.meta = void 0;
const spectralCMDHome_1 = require("../modules/spectralCMDHome");
const unispectra_1 = require("@cassidy/unispectra");
exports.meta = {
    name: "roles",
    description: "Set or view the custom roles for command in your thread.",
    otherNames: ["setrole", "changerole", "sr"],
    version: "1.0.0",
    usage: "{prefix}{name}",
    category: "Moderation",
    author: "frnAlt",
    role: 1,
    noPrefix: false,
    waitingTime: 0,
    requirement: "3.0.0",
    icon: "👑",
    noWeb: true,
};
exports.style = {
    title: "👑 Roles",
    titleFont: "bold",
    contentFont: "fancy",
};
const roleSysKey = "roleSys";
const configs = [
    {
        key: "view",
        description: "View the current custom roles",
        aliases: ["-v", "show"],
        icon: "👀",
        async handler({ output, threadsDB, input, globalDB }) {
            const { roles = [] } = await threadsDB.getItem(input.threadID);
            const { groles = [] } = await globalDB.getItem(roleSysKey);
            const rolesMap = new Map(roles || []);
            const grolesMap = new Map(groles || []);
            const roleEntries = [...rolesMap.entries()].map(([cmd, role]) => `${cmd} => ${InputClass_1.InputRoles[role] ?? role}`);
            const groleEntries = [...grolesMap.entries()].map(([cmd, role]) => `${cmd} => ${InputClass_1.InputRoles[role] ?? role}`);
            const rolesText = roleEntries.length
                ? roleEntries.join("\n")
                : "No custom roles set.";
            const grolesText = groleEntries.length
                ? groleEntries.join("\n")
                : "No custom group roles set.";
            const extraGuide = {
                0: "Anyone can use.",
                1: "Only admins of the thread/gc, moderators, and bot's admin.",
                2: "Only the bot's admin or operator",
                1.5: "Moderators and bot's admins only",
            };
            output.reply(`${unispectra_1.UNISpectra.arrow} ***Custom Command Roles***\n\n` +
                `📦 **Thread Roles**:\n${rolesText}\n\n` +
                `🌏 **Global Roles**:\n${grolesText}\n\n${unispectra_1.UNISpectra.arrow} ***Legend***\n\n${Reflect.ownKeys(InputClass_1.InputRoles)
                    .filter((i) => !isNaN(Number(i)))
                    .map((i) => `**${InputClass_1.InputRoles[i]}** = ${String(i)}${extraGuide[i] ? ` (${extraGuide[i]})` : ""}`)
                    .join("\n")}`);
        },
    },
    {
        key: "set",
        description: "Sets a new custom command role",
        args: ["<commandName> <role number> [-g (for global)]"],
        aliases: ["-s"],
        icon: "✏️",
        validator: new spectralCMDHome_1.CassCheckly([
            {
                index: 0,
                type: "string",
                required: true,
                name: "commandName",
            },
            {
                index: 1,
                type: "number",
                required: true,
                name: "role",
                regex: /^-?\d*\.?\d*$/,
            },
            {
                index: 2,
                type: "string",
                required: false,
                name: "globalFlag",
                regex: /^-g$/,
            },
        ]),
        async handler({ input, output, threadsDB, commands, globalDB }, { spectralArgs }) {
            const commandName = spectralArgs[0];
            const role = parseFloat(spectralArgs[1]);
            const isGlobal = spectralArgs[2] === "-g";
            const targetCommand = Object.values(commands).find((cmd) => cmd.meta.name === commandName);
            if (!targetCommand) {
                return output.reply(`❌ Command **${commandName}** not found.`);
            }
            try {
                const { roles = [] } = await threadsDB.getItem(input.threadID);
                const { groles = [] } = await globalDB.getItem(roleSysKey);
                const rolesMap = new Map(roles);
                const grolesMap = new Map(groles);
                let from = targetCommand.meta.role ??
                    Math.min(...(targetCommand.meta.permissions ?? [])) ??
                    grolesMap.get(targetCommand.meta.name) ??
                    0;
                if (!(role in InputClass_1.InputRoles) || isNaN(role)) {
                    return output.reply("❌ Invalid role, please use the number from the legend (in the roles-view)");
                }
                if (!input.hasRole(from)) {
                    return output.reply("‼️ You have a lower role than your target!");
                }
                if (!input.hasRole(role)) {
                    return output.reply("‼️ Your desired role is higher than your role!");
                }
                if (isGlobal) {
                    if (!input.isAdmin) {
                        return output.reply(`❌ Only bot admins can modify global roles.`);
                    }
                    from = grolesMap.get(targetCommand.meta.name) ?? from;
                    if (!input.hasRole(from)) {
                        return output.reply("‼️ You have a lower role than your target!");
                    }
                    grolesMap.set(targetCommand.meta.name, role);
                    await globalDB.setItem(roleSysKey, {
                        groles: [...grolesMap.entries()],
                    });
                }
                else {
                    from = rolesMap.get(targetCommand.meta.name) ?? from;
                    rolesMap.set(targetCommand.meta.name, role);
                    if (!input.hasRole(from)) {
                        return output.reply("‼️ You have a lower role than your target!");
                    }
                    if (typeof grolesMap.get(targetCommand.meta.name) === "number") {
                        return output.reply("‼️ You cannot bypass a global role!");
                    }
                    await threadsDB.setItem(input.threadID, {
                        roles: [...rolesMap.entries()],
                    });
                }
                output.setUIName("Confirmed!");
                output.replyStyled({
                    body: `${unispectra_1.UNIRedux.arrow} ***Role Updated*** ✅\n\n` +
                        `The ${isGlobal ? "global" : "thread"} role for **${commandName}** has been set from **${InputClass_1.InputRoles[from] ?? from}**. to **${InputClass_1.InputRoles[role] ?? role}**.`,
                }, exports.style);
            }
            catch (error) {
                output.error(error);
            }
        },
    },
    {
        key: "reset",
        description: "Reset a specific role to default.",
        args: ["<commandName> [-g (for global)]"],
        aliases: ["-r"],
        icon: "🔄",
        validator: new spectralCMDHome_1.CassCheckly([
            {
                index: 0,
                type: "string",
                required: true,
                name: "commandName",
            },
            {
                index: 1,
                type: "string",
                required: false,
                name: "globalFlag",
                regex: /^-g$/,
            },
        ]),
        async handler({ input, output, threadsDB, commands, globalDB }, { spectralArgs }) {
            const commandName = spectralArgs[0];
            const isGlobal = spectralArgs[1] === "-g";
            const targetCommand = Object.values(commands).find((cmd) => cmd.meta.name === commandName);
            const { roles = [] } = await threadsDB.getItem(input.threadID);
            const { groles = [] } = await globalDB.getItem(roleSysKey);
            if (!targetCommand) {
                return output.reply(`❌ Command **${commandName}** not found.`);
            }
            const rolesMap = new Map(roles);
            const grolesMap = new Map(groles);
            let from = targetCommand.meta.role ??
                Math.min(...(targetCommand.meta.permissions ?? [])) ??
                grolesMap.get(targetCommand.meta.name) ??
                0;
            let from2 = from;
            try {
                if (!input.hasRole(from)) {
                    return output.reply("‼️ You have a lower role than your target!");
                }
                if (isGlobal) {
                    if (!input.isAdmin) {
                        return output.reply(`❌ Only bot admins can modify global roles.`);
                    }
                    if (!grolesMap.has(commandName)) {
                        return output.reply(`❌ No global role set for **${commandName}**.`);
                    }
                    from = grolesMap.get(targetCommand.meta.name) ?? from;
                    if (!input.hasRole(from)) {
                        return output.reply("‼️ You have a lower role than your target!");
                    }
                    grolesMap.delete(targetCommand.meta.name);
                    await globalDB.setItem(roleSysKey, {
                        groles: [...grolesMap.entries()],
                    });
                }
                else {
                    if (!rolesMap.has(commandName)) {
                        return output.reply(`❌ No thread role set for **${commandName}**.`);
                    }
                    from = rolesMap.get(targetCommand.meta.name) ?? from;
                    if (!input.hasRole(from)) {
                        return output.reply("‼️ You have a lower role than your target!");
                    }
                    rolesMap.delete(targetCommand.meta.name);
                    await threadsDB.setItem(input.threadID, {
                        roles: [...rolesMap.entries()],
                    });
                }
                await output.reply(`${unispectra_1.UNIRedux.arrow} ***Role Reset*** ✅\n\n` +
                    `The ${isGlobal ? "global" : "thread"} role for **${commandName}** has been reset from ${InputClass_1.InputRoles[from] ?? from} to default. (${InputClass_1.InputRoles[from2] ?? from2})`);
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
    errorHandler: (error, ctx) => {
        ctx.output.error(error);
    },
    defaultCategory: "Utility",
}, configs);
const define_1 = require("@cass/define");
const InputClass_1 = require("@cass-modules/InputClass");
exports.entry = (0, define_1.defineEntry)(async (ctx) => {
    return home.runInContext(ctx);
});
