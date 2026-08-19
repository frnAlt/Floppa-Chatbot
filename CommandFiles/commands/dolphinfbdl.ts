// @ts-check
import axios from "axios";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import * as fs from "fs";
import { join } from "path";
import { getFbVideoInfo } from "fb-downloader-scrapper";

export class style {
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

export const meta: CommandMeta = {
  name: "dolphinfbdl",
  description:
    "Downloads videos from Facebook using a provided URL and attaches them.",
  version: "1.0.0",
  author: "MrkimstersDev | 0xVoid",
  usage: "{prefix}dolphinfbdl <facebook-video-url>",
  category: "Media",
  role: 0,
  noPrefix: false,
  waitingTime: 5,
  otherNames: ["fbdl"],
  requirement: "2.5.0",
  icon: "🎥",
};

async function fetchFacebookVideo(
  url: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await getFbVideoInfo(url);
    if (!result || typeof result !== "object" || !result.url) {
      throw new Error(
        "Invalid response from fb-downloader-scrapper: No valid download link found."
      );
    }
    console.log(`Fetched video data for ${url}:`, result);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`Error fetching video: ${error.message}`, error.stack);
    return { success: false, error: error.message };
  }
}

async function downloadVideo(url: string, filePath: string): Promise<void> {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      timeout: 30000,
    });
    await writeFile(filePath, response.data);
    console.log(`Video downloaded to ${filePath}`);
  } catch (error: any) {
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

export async function entry(ctx: CommandContext): Promise<void> {
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
      return api.sendMessage(
        `⚠️ Please provide a Facebook video URL!\n` +
          `Example: ${prefix}dolphinfbdl https://www.facebook.com/watch/?v=123456789`,
        input.threadID
      );
    }

    if (
      !videoUrl.startsWith("https://www.facebook.com") &&
      !videoUrl.startsWith("https://fb.watch")
    ) {
      return api.sendMessage(
        `⚠️ Invalid URL! Please provide a valid Facebook video URL.\n` +
          `Example: ${prefix}dolphinfbdl https://www.facebook.com/watch/?v=123456789`,
        input.threadID
      );
    }

    const videoResult = await fetchFacebookVideo(videoUrl);
    if (!videoResult.success) {
      return api.sendMessage(
        `❌ **DolphinFBDL Failed**\n` +
          `⚠️ Could not fetch video: ${videoResult.error || "Unknown error"}`,
        input.threadID
      );
    }

    const { data } = videoResult;
    if (!data || !data.url) {
      return api.sendMessage(
        `❌ **DolphinFBDL Failed**\n` +
          `⚠️ Video data is invalid or missing URL.`,
        input.threadID
      );
    }

    const downloadLink = data.hd || data.sd || data.url;
    const quality = data.hd ? "HD" : "SD";

    const cacheDir = join(__dirname, "cache");
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true });
      console.log(`Created cache directory at: ${cacheDir}`);
    } else {
      console.log(`Cache directory already exists: ${cacheDir}`);
    }

    const tempFilePath = join(cacheDir, `fb_video_${Date.now()}.mp4`);
    await downloadVideo(downloadLink, tempFilePath);

    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Temporary video file not found at ${tempFilePath}`);
    }

    await api.sendMessage(
      {
        body:
          `🌊 𝗗𝗼𝗹𝗽𝗵𝗶𝗻𝗙𝗕𝗗𝗟\n` +
          `🎥 Video fetched successfully!\n` +
          `✨ Quality: ${quality}\n` +
          `📌 Video attached below!`,
        attachment: fs.createReadStream(tempFilePath),
      },
      input.threadID
    );

    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Cleaned up temporary file: ${tempFilePath}`);
    } catch (cleanupError: any) {
      console.error(`Failed to clean up temp file: ${cleanupError.message}`);
    }
  } catch (error: any) {
    console.error(`DolphinFBDL entry error: ${error.message}`, error.stack);
    return api.sendMessage(
      `❌ Unexpected error in DolphinFBDL: ${error.message}\n` +
        `Please report this to the administrator or developer.`,
      input.threadID
    );
  }
}
