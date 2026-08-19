"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entry = exports.langs = exports.style = exports.meta = void 0;
exports.reply = reply;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const define_1 = require("@cass/define");
const unispectra_1 = require("@cassidy/unispectra");
exports.meta = {
    name: "anime",
    description: "Search for anime information",
    author: "frnAlt",
    version: "1.0.1",
    usage: "{prefix}{name} <anime title>",
    category: "Media",
    role: 0,
    noPrefix: false,
    waitingTime: 10,
    requirement: "3.0.0",
    otherNames: ["ani"],
    icon: "🎬",
    noLevelUI: true,
};
exports.style = {
    title: "Astral • Anime Search 🌌",
    titleFont: "bold",
    contentFont: "fancy",
};
exports.langs = {
    en: {
        noQuery: "Please provide an anime title to search for!\nExample: {prefix}anime Sacrificial Princess and King of the Beast",
        noResults: "No anime found with that title!",
        error: "Error fetching anime data: %1",
        invalidSelection: "Please select a valid number between 1 and 20!",
    },
};
async function fetchAnimeData(query) {
    const apiUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`;
    const response = await fetch(apiUrl);
    // @ts-ignore
    return await response.json();
}
function formatAnimeList(results) {
    const timestamp = (0, moment_timezone_1.default)().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
    const list = results
        .map((anime, index) => ` • ${index + 1}. ${anime.title} (${anime.type}, ${anime.episodes || "N/A"} eps)`)
        .join("\n");
    return `${unispectra_1.UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${unispectra_1.UNISpectra.standardLine}
${unispectra_1.UNISpectra.charm} Anime Search Results
${list}
${unispectra_1.UNISpectra.standardLine}
${unispectra_1.UNISpectra.charm} Reply with a number (1-20) to select
${unispectra_1.UNISpectra.charm} CassidyAstral-Midnight 🌃 ${unispectra_1.UNISpectra.charm}
[ Transmission from Astral Command ]`;
}
function formatAnimeDetails(anime) {
    const timestamp = (0, moment_timezone_1.default)().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
    return `${unispectra_1.UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${unispectra_1.UNISpectra.standardLine}
${unispectra_1.UNISpectra.charm} Anime Details
 • 🎬 Title: ${anime.title}
 • 📝 Description: ${anime.synopsis || "No description available"}
 • 📅 Status: ${anime.status}
 • 🎭 Type: ${anime.type}
 • 📺 Episodes: ${anime.episodes || "N/A"}
 • ⏱️ Duration: ${anime.duration || "N/A"}
${unispectra_1.UNISpectra.standardLine}
${unispectra_1.UNISpectra.charm} CassidyAstral-Midnight 🌃 ${unispectra_1.UNISpectra.charm}
[ Transmission from Astral Command ]`;
}
exports.entry = (0, define_1.defineEntry)(async ({ input, output, args, langParser }) => {
    const getLang = langParser.createGetLang(exports.langs);
    try {
        const message = args.join(" ").trim();
        if (!message) {
            return output.reply(getLang("noQuery"));
        }
        const data = await fetchAnimeData(message);
        if (!data || !data.data || data.data.length === 0) {
            return output.reply(getLang("noResults"));
        }
        const results = data.data.slice(0, 20);
        const messageInfo = await output.reply(formatAnimeList(results));
        input.setReply(messageInfo.messageID, {
            key: "anime",
            id: input.senderID,
            results,
        });
    }
    catch (error) {
        output.reply(getLang("error", error.message));
    }
});
async function reply({ input, output, repObj, detectID, langParser, }) {
    const getLang = langParser.createGetLang(exports.langs);
    const { id, results } = repObj;
    if (input.senderID !== id || !results) {
        return;
    }
    const selection = parseInt(input.body);
    if (isNaN(selection) || selection < 1 || selection > 20) {
        return output.reply(getLang("invalidSelection"));
    }
    const selectedAnime = results[selection - 1];
    if (!selectedAnime) {
        return output.reply(getLang("invalidSelection"));
    }
    input.delReply(String(detectID));
    output.reply({
        body: formatAnimeDetails(selectedAnime),
        attachment: await global.utils.getStreamFromURL(selectedAnime.images.jpg.large_image_url),
    });
}
