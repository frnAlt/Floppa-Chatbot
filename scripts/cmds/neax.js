"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.meta = void 0;
exports.entry = entry;
const NeaxScript_1 = require("@cass-modules/NeaxScript");
exports.meta = {
    name: "neax",
    author: "frnAlt",
    description: "Neax is a new scripting language for CassidySpectra, designed to provide a powerful and flexible interface for interacting with the Cassidy Redux chatbot. It deprecates the older CassCLI, offering enhanced command execution, permission management, and integration with virtual file systems.",
    usage: "Use Neax to execute scripts in a terminal-like environment. Example usage: `neax help`, `neax promote::%detectID%`, `neax ls / --json`.",
    version: "1.0.0",
    permissions: [0, 1, 2],
    botAdmin: false,
    noPrefix: false,
    requirement: "3.0.0",
    otherNames: ["nsxu", "nsx", "nscript"],
    waitingTime: 0.01,
    icon: ">_",
    category: "System",
    noLevelUI: true,
};
exports.style = {
    title: ">_ Neax",
    titleFont: "bold",
    contentFont: "none",
};
/**
 * @param {CommandContext} ctx
 */
async function entry({ input, output, ctx }) {
    const parser = new NeaxScript_1.NeaxScript.Parser(ctx);
    const script = input.arguments.join(" ") || "help";
    const { result, code } = await parser.runAsync(script);
    if (code !== NeaxScript_1.NeaxScript.Codes.Success) {
        await output.reply(`Neax::${NeaxScript_1.NeaxScript.Codes[code]} = ${result}`);
    }
    else {
        if (result) {
            await output.reply(result);
        }
    }
}
