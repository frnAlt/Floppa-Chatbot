// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "uptime",
  description: "Check the bot's uptime status.",
  otherNames: ["upt", "up"],
  version: "2.0.1",
  author: "@lianecagara",
  usage: "{prefix}{name}",
  category: "System",
  permissions: [0],
  noPrefix: "both",
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "🌍",
};

import { OutputResult } from "@cass-plugins/output";
import { UNISpectra } from "@cassidy/unispectra";
import os from "os";

export const style = {
  title: "Uptime 🌍",
  titleFont: "bold",
  contentFont: "fancy",
};

const { formatTimeDiff, formatBits } = global.utils;

/**
 * @param {CommandContext} param0
 */
export async function entry({ output, usersDB, threadsDB, input }) {
  output.reaction("🚀");
  /**
   * @param {number} value
   * @param {string} unit
   */
  function formatTimeUnit(value, unit) {
    return value || unit === "minute"
      ? `${value} ${unit}${value > 1 ? "s" : ""}, `
      : "";
  }

  /**
   * @type {OutputResult | undefined}
   */
  let sent;
  if (!input.isWeb) {
    sent = await output.reply("⏳ Loading...");
  }

  const { uptime } = global.Cassidy;
  const { years, months, days, hours, minutes, seconds } =
    formatTimeDiff(uptime);

  const uptimeString = `${formatTimeUnit(years, "year")}${formatTimeUnit(
    months,
    "month"
  )}${formatTimeUnit(days, "day")}${formatTimeUnit(
    hours,
    "hour"
  )}${formatTimeUnit(minutes, "minute")}and ${seconds} second${
    seconds > 1 ? "s" : ""
  } 🚀`;

  const osInfo = {
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    uptime: os.uptime(),
    hostname: os.hostname(),
    arch: os.arch(),
    totalMemory: formatBits(os.totalmem()),
    freeMemory: formatBits(os.freemem()),
    cpus: os.cpus().length,
    usedMemory: formatBits(os.totalmem() - os.freemem()),
  };

  const usersLength = (await usersDB.getIDs()).length;
  const threadsLength = (await threadsDB.getIDs()).length;
  const mqttPing = Date.now() - (input.timestamp ?? Date.now());

  const resultText = [
    `⏰ **Uptime**: ${uptimeString}`,
    `🕒 **MQTT Ping**: ${mqttPing}ms`,
    `🚦 **Version**: ${global.package.version}`,
    ``,
    `${UNISpectra.arrow} ***CASSIDY*** 📊`,
    ``,
    `👥 **Users**: ${usersLength}`,
    `💬 **Threads**: ${threadsLength}`,
    `🔍 **Reply Listeners**: ${Reflect.ownKeys(Cassidy.replies).length}`,
    `😆 **Reaction Listeners**: ${Reflect.ownKeys(Cassidy.reacts).length}`,
    `🗑️ **Users Cache**: ${Reflect.ownKeys(usersDB.cache).length}`,
    `🗑️ **Threads Cache**: ${Reflect.ownKeys(threadsDB.cache).length}`,
    `🗃️ **Commands**: ${Cassidy.multiCommands.size}`,
    `📥 **Plugins**: ${Reflect.ownKeys(Cassidy.plugins).length}`,
    `🎨 **Style Presets**: ${Cassidy.presets.size}`,
    ``,
    `${UNISpectra.arrow} ***SPECS*** 🖥️`,
    ``,
    `💻 **Type**: ${osInfo.type} (${osInfo.platform})`,
    `📦 **Release**: ${osInfo.release}`,
    `🏠 **Hostname**: ${osInfo.hostname}`,
    `🔧 **Architecture**: ${osInfo.arch}`,
    `💾 **Memory**: ${osInfo.usedMemory}/${osInfo.totalMemory} (Free: ${osInfo.freeMemory})`,
    `⚡ **CPU Cores**: ${osInfo.cpus}`,
  ].join("\n");

  if (sent) {
    sent.editSelf(`${resultText}`);
  } else {
    output.reply(`${resultText}`);
  }
}
