"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.meta = void 0;
exports.entry = entry;
exports.event = event;
const fb_downloader_scrapper_1 = require("fb-downloader-scrapper");
exports.meta = {
    name: "autodl",
    description: "Autodownloader for Facebook videos. Automatically detects and downloads media from Facebook URLs. Upcoming support: Spotify, YouTube, YouTube Music, Twitter, and Instagram.",
    version: "2.0.0",
    author: "frnAlt",
    requirement: "2.5.0",
    icon: "📥",
    category: "Media",
    role: 1,
    noWeb: true,
};
exports.style = {
    title: "📥 Facebook Downloader",
    titleFont: "bold",
    contentFont: "fancy",
};
function formatDuration(durationMs) {
    const units = [
        { unit: "hr", factor: 3600000 },
        { unit: "min", factor: 60000 },
        { unit: "sec", factor: 1000 },
        { unit: "ms", factor: 1 },
    ];
    for (const { unit, factor } of units) {
        if (durationMs >= factor) {
            const value = durationMs / factor;
            return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
        }
    }
    return "0 ms";
}
async function entry({ output, input, threadsDB, args, }) {
    if (!input.isAdmin) {
        return output.reply("You cannot enable/disable this feature.");
    }
    const isEna = (await threadsDB.queryItem(input.threadID, "autodl"))?.autodl;
    let choice = args[0] === "on" ? true : args[0] === "off" ? false : isEna ? !isEna : true;
    await threadsDB.setItem(input.threadID, {
        autodl: choice,
    });
    return output.reply(`✅ ${choice ? "Enabled" : "Disabled"} successfully!`);
}
async function event({ output, input, threadsDB }) {
    try {
        const cache = await threadsDB.getCache(input.threadID);
        if (cache.autodl === false) {
            return;
        }
        const prompt = String(input);
        if (prompt.match(/^https:\/\/(www\.)?(facebook\.com|fb\.watch)/)?.length > 0) {
            output.react("🔎");
            const data = await (0, fb_downloader_scrapper_1.getFbVideoInfo)(prompt);
            let Title = data.title;
            const emojiMatch = Title.match(/&#x([0-9a-fA-F\-]+);?/);
            if (emojiMatch) {
                const hexStr = emojiMatch[1].toUpperCase();
                const codePoints = hexStr.split("-").map((part) => parseInt(part, 16));
                const emoji = String.fromCodePoint(...codePoints);
                Title = Title.replace(emojiMatch[0], emoji);
            }
            if (data.hd || data.sd) {
                output.react("📥");
                await output.replyStyled({
                    body: `**${Title}**\n⏱️ **${formatDuration(data.duration_ms)}**`,
                    attachment: await global.utils.getStreamFromURL(data.hd || data.sd),
                }, exports.style);
                output.reaction("✅");
            }
            else {
                output.reaction("❌");
            }
        }
    }
    catch (err) {
        output.replyStyled(require("util").inspect(err), exports.style);
    }
}
