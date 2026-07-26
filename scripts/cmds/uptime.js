const os = require("os");
const { execSync } = require("child_process");

module.exports = {
	config: {
		name: "uptime",
		aliases: ["sys", "status", "sysinfo"],
		version: "1.0",
		author: "Farhan (Baka-Chan-bot)",
		role: 0,
		shortDescription: {
			en: "Displays detailed system information"
		},
		longDescription: {
			en: "Shows CPU, RAM, disk usage, Node version, platform, and system uptime."
		},
		category: "system",
		guide: {
			en: "Use {p}uptime to check system information."
		}
	},

	onStart: async function ({ api, event }) {
		const { threadID, messageID } = event;

		try {
			const uptime = os.uptime();
			const days = Math.floor(uptime / 86400);
			const hours = Math.floor((uptime % 86400) / 3600);
			const minutes = Math.floor((uptime % 3600) / 60);
			const seconds = Math.floor(uptime % 60);
			const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

			const ramUsed = (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024;
			const ramTotal = os.totalmem() / 1024 / 1024 / 1024;

			const cpus = os.cpus();
			const cpuModel = cpus[0]?.model || "CPU";
			const cpuCores = cpus.length;

			const nodeVersion = process.version;
			const platform = os.platform();

			let diskUsage = "Unavailable";
			try {
				const df = execSync("df -h /").toString().split("\n")[1].split(/\s+/);
				diskUsage = `${df[1]} total / ${df[2]} used / ${df[3]} avail`;
			} catch {
				diskUsage = "N/A";
			}

			const msg =
`🐱 FLOPPA-CHATBOT SYSTEM STATUS 🐱
==========================
• System Uptime : ${uptimeStr}
• RAM Usage     : ${ramUsed.toFixed(2)} GB / ${ramTotal.toFixed(2)} GB
• CPU Model     : ${cpuModel} (${cpuCores} cores)
• Node Version  : ${nodeVersion}
• Operating Sys : ${platform}
• Disk Space    : ${diskUsage}
==========================`;

			api.sendMessage(msg, threadID, messageID);

		} catch (err) {
			console.error("Uptime command error:", err);
			api.sendMessage("❌ An error occurred while retrieving system info.", threadID, messageID);
		}
	}
};
