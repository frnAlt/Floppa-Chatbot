const { removeHomeDir, log } = global.utils;

module.exports = {
        config: {
                name: "eval",
                aliases: ["code", "run", "js", "testcode"],
                version: "2.0",
                author: "frnAlt",
                countDown: 2,
                role: 2,
                description: {
                        vi: "Test code hoặc JavaScript nhanh",
                        en: "Execute and test JavaScript code quickly"
                },
                category: "owner",
                guide: {
                        vi: "{pn} <đoạn code cần test>",
                        en: "{pn} <code to test>"
                }
        },

        langs: {
                vi: {
                        error: "✗ Đã có lỗi xảy ra:"
                },
                en: {
                        error: "✗ An error occurred:"
                }
        },

        onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
                let hasOutputted = false;

                function formatOutput(msg) {
                        if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function")
                                return msg.toString();
                        if (msg instanceof Map) {
                                return `Map(${msg.size}) ` + JSON.stringify(mapToObj(msg), null, 2);
                        }
                        if (msg instanceof Set) {
                                return `Set(${msg.size}) ` + JSON.stringify([...msg], null, 2);
                        }
                        if (typeof msg === "object" && msg !== null) {
                                try {
                                        return JSON.stringify(msg, null, 2);
                                } catch (_) {
                                        return String(msg);
                                }
                        }
                        if (typeof msg === "undefined")
                                return "undefined";
                        return String(msg);
                }

                function output(msg) {
                        hasOutputted = true;
                        return message.reply(formatOutput(msg));
                }

                function out(msg) {
                        return output(msg);
                }

                function mapToObj(map) {
                        const obj = {};
                        map.forEach((v, k) => {
                                obj[k] = v;
                        });
                        return obj;
                }

                const rawCode = args.join(" ").trim();
                if (!rawCode) {
                        return message.reply(getLang("error") + " No code provided to execute.");
                }

                try {
                        // Support expression evaluation by wrapping in return if it's a simple statement
                        const wrappedCode = rawCode.includes(";") || rawCode.includes("\n") || rawCode.startsWith("let ") || rawCode.startsWith("const ") || rawCode.startsWith("var ")
                                ? rawCode
                                : `return (${rawCode})`;

                        const asyncFn = new Function(
                                "api", "args", "message", "event", "threadsData", "usersData",
                                "dashBoardData", "globalData", "threadModel", "userModel",
                                "dashBoardModel", "globalModel", "role", "commandName",
                                "output", "out", "global", "require",
                                `return (async () => {\n${wrappedCode}\n})();`
                        );

                        const evalResult = await asyncFn(
                                api, args, message, event, threadsData, usersData,
                                dashBoardData, globalData, threadModel, userModel,
                                dashBoardModel, globalModel, role, commandName,
                                output, out, global, require
                        );

                        if (!hasOutputted && evalResult !== undefined) {
                                await output(evalResult);
                        }
                } catch (err) {
                        log.err("eval command", err);
                        const errMessage = err.stack ? removeHomeDir(err.stack) : removeHomeDir(JSON.stringify(err, null, 2) || String(err));
                        await message.reply(`${getLang("error")}\n${errMessage}`);
                }
        }
};