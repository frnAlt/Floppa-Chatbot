"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unispectra_1 = require("@cassidy/unispectra");
exports.default = easyCMD({
    name: "defaults",
    description: "Changes your default command.",
    category: "System",
    extra: {
        style: { title: Cassidy.logo, contentFont: "fancy" },
    },
    icon: "✅",
    async run({ print, multiCommands, args, ctx }) {
        const commandName = args[0];
        if (!commandName) {
            return print("🔎 Please specify an alias or command name as **first argument.**");
        }
        const foundCommands = multiCommands.get(commandName);
        return (0, unispectra_1.handleDefaultCommand)(ctx, foundCommands, commandName);
    },
});
