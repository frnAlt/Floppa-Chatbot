"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = exports.style = void 0;
exports.entry = entry;
// @ts-check
const axios_1 = __importDefault(require("axios"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const fb_downloader_scrapper_1 = require("fb-downloader-scrapper");
class style {
    title = {
        text_font: "bold",
        content: "DolphinFBDL 🐬",
        line_bottom: "default",
    };
    content = {
        text_font: "none",
        content: null,
    };
}
exports.style = style;
exports.meta = {
    name: "dolphinfbdl",
    description: "Downloads videos from Facebook using a provided URL and attaches them.",
    version: "1.0.0",
    author: "frnAlt",
    usage: "{prefix}dolphinfbdl <facebook-video-url>",
    category: "Media",
    role: 0,
    noPrefix: false,
    waitingTime: 5,
    otherNames: ["fbdl"],
    requirement: "2.5.0",
    icon: "🎥",
};
async function fetchFacebookVideo(url) {
    try {
        const result = await (0, fb_downloader_scrapper_1.getFbVideoInfo)(url);
        if (!result || typeof result !== "object" || !result.url) {
            throw new Error("Invalid response from fb-downloader-scrapper: No valid download link found.");
        }
        console.log(`Fetched video data for ${url}:`, result);
        return { success: true, data: result };
    }
    catch (error) {
        console.error(`Error fetching video: ${error.message}`, error.stack);
        return { success: false, error: error.message };
    }
}
async function downloadVideo(url, filePath) {
    try {
        const response = await (0, axios_1.default)({
            url,
            method: "GET",
            responseType: "stream",
            timeout: 30000,
        });
        await (0, promises_1.writeFile)(filePath, response.data);
        console.log(`Video downloaded to ${filePath}`);
    }
    catch (error) {
        throw new Error(`Failed to download video: ${error.message}`);
    }
}
async function entry(ctx) {
    if (!ctx || typeof ctx !== "object") {
        console.error("Invalid context object:", ctx);
        throw new Error("Context object is missing or invalid.");
    }
    const { input, api, prefix, args } = ctx;
    if (!api || typeof api.sendMessage !== "function") {
        console.error("API object is invalid:", api);
        throw new Error("API object or sendMessage method is missing.");
    }
    if (!input || !input.threadID) {
        console.error("Input object is invalid:", input);
        throw new Error("Input object or threadID is missing.");
    }
    try {
        const videoUrl = args && args[0];
        if (!videoUrl) {
            return api.sendMessage(`⚠️ Please provide a Facebook video URL!\n` +
                `Example: ${prefix}dolphinfbdl https://www.facebook.com/watch/?v=123456789`, input.threadID);
        }
        if (!videoUrl.startsWith("https://www.facebook.com") &&
            !videoUrl.startsWith("https://fb.watch")) {
            return api.sendMessage(`⚠️ Invalid URL! Please provide a valid Facebook video URL.\n` +
                `Example: ${prefix}dolphinfbdl https://www.facebook.com/watch/?v=123456789`, input.threadID);
        }
        const videoResult = await fetchFacebookVideo(videoUrl);
        if (!videoResult.success) {
            return api.sendMessage(`❌ **DolphinFBDL Failed**\n` +
                `⚠️ Could not fetch video: ${videoResult.error || "Unknown error"}`, input.threadID);
        }
        const { data } = videoResult;
        if (!data || !data.url) {
            return api.sendMessage(`❌ **DolphinFBDL Failed**\n` +
                `⚠️ Video data is invalid or missing URL.`, input.threadID);
        }
        const downloadLink = data.hd || data.sd || data.url;
        const quality = data.hd ? "HD" : "SD";
        const cacheDir = (0, path_1.join)(__dirname, "cache");
        if (!(0, fs_1.existsSync)(cacheDir)) {
            await (0, promises_1.mkdir)(cacheDir, { recursive: true });
            console.log(`Created cache directory at: ${cacheDir}`);
        }
        else {
            console.log(`Cache directory already exists: ${cacheDir}`);
        }
        const tempFilePath = (0, path_1.join)(cacheDir, `fb_video_${Date.now()}.mp4`);
        await downloadVideo(downloadLink, tempFilePath);
        if (!fs.existsSync(tempFilePath)) {
            throw new Error(`Temporary video file not found at ${tempFilePath}`);
        }
        await api.sendMessage({
            body: `🌊 𝗗𝗼𝗹𝗽𝗵𝗶𝗻𝗙𝗕𝗗𝗟\n` +
                `🎥 Video fetched successfully!\n` +
                `✨ Quality: ${quality}\n` +
                `📌 Video attached below!`,
            attachment: fs.createReadStream(tempFilePath),
        }, input.threadID);
        try {
            fs.unlinkSync(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
        }
        catch (cleanupError) {
            console.error(`Failed to clean up temp file: ${cleanupError.message}`);
        }
    }
    catch (error) {
        console.error(`DolphinFBDL entry error: ${error.message}`, error.stack);
        return api.sendMessage(`❌ Unexpected error in DolphinFBDL: ${error.message}\n` +
            `Please report this to the administrator or developer.`, input.threadID);
    }
}
