const { exec } = require("child_process");
const { removeHomeDir } = global.utils || {};

const MAX_OUTPUT = 3500;

module.exports = {
        config: {
                name: "shell",
                aliases: ["sh", "exec", "run", "bash", "terminal"],
                version: "1.2",
                author: "frnAlt & Neoaz",
                countDown: 5,
                role: 2,
                description: {
                        vi: "Thực thi lệnh shell",
                        en: "Execute shell commands"
                },
                category: "owner",
                guide: {
                        vi: '   {pn} <command>: Thực thi lệnh shell'
                                + '\n   Ví dụ: {pn} ls -la'
                                + '\n   {pn} node -v',
                        en: '   {pn} <command>: Execute shell command'
                                + '\n   Example: {pn} ls -la'
                                + '\n   {pn} node -v'
                }
        },

        langs: {
                vi: {
                        missingCommand: "⚠ | Vui lòng nhập lệnh shell cần thực thi",
                        executing: "⚙ | Đang thực thi lệnh...",
                        output: "✓ | Kết quả:\n\n%1",
                        error: "✗ | Lỗi:\n\n%1",
                        timeout: "⚠ | Lệnh thực thi quá lâu (timeout 30s)"
                },
                en: {
                        missingCommand: "⚠ | Please enter shell command to execute",
                        executing: "⚙ | Executing command...",
                        output: "✓ | Output:\n\n%1",
                        error: "✗ | Error:\n\n%1",
                        timeout: "⚠ | Command execution timeout (30s)"
                }
        },

        onStart: async function ({ message, args, event, getLang, api }) {
                const command = args.join(" ").trim();
                if (!command)
                        return message.reply(getLang("missingCommand"));

                const msg = await message.reply(getLang("executing"));

                const sanitize = (str) => {
                        if (!str) return "";
                        return typeof removeHomeDir === "function" ? removeHomeDir(String(str)) : String(str);
                };

                const sendOrEdit = async (text) => {
                        if (msg && msg.messageID && typeof api?.editMessage === "function") {
                                try {
                                        return await api.editMessage(text, msg.messageID);
                                } catch (_) {}
                        }
                        return message.reply(text);
                };

                try {
                        const result = await new Promise((resolve, reject) => {
                                exec(command, { cwd: process.cwd(), timeout: 30000, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
                                        if (err && !stdout && !stderr) return reject(err);
                                        resolve({ err, stdout: stdout ? String(stdout) : "", stderr: stderr ? String(stderr) : "" });
                                });
                        });

                        let output = (result.stdout + (result.stderr ? "\n" + result.stderr : "")).trim();
                        output = sanitize(output);
                        if (!output && result.err)
                                output = sanitize(result.err.message || result.err);
                        if (!output)
                                output = "Command executed successfully (no output)";

                        if (output.length > MAX_OUTPUT) {
                                output = output.substring(0, MAX_OUTPUT) + "\n... (output truncated)";
                        }

                        return await sendOrEdit(getLang("output", output));
                } catch (error) {
                        let errorMsg = sanitize(error.message || String(error));
                        if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout"))
                                return await sendOrEdit(getLang("timeout"));

                        if (errorMsg.length > MAX_OUTPUT) {
                                errorMsg = errorMsg.substring(0, MAX_OUTPUT) + "\n... (output truncated)";
                        }

                        return await sendOrEdit(getLang("error", errorMsg));
                }
        }
};