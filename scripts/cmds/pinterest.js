const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const baseApiUrl = async () => {
	const base = await axios.get(
		`https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json`
	);
	return base.data.api;
};

module.exports = {
	config: {
		name: "pinterest",
		aliases: ["pint", "pinsearch"],
		version: "1.0",
		author: "Farhan (Baka-Chan-bot)",
		countDown: 10,
		role: 0,
		shortDescription: "Pinterest Image Search",
		longDescription: "Search and fetch images from Pinterest.",
		category: "media",
		guide: {
			en: "{pn} <query> - <number_of_images>",
		},
	},

	onStart: async function ({ api, event, args }) {
		const queryAndLength = args.join(" ").split("-");
		const q = queryAndLength[0]?.trim();
		const length = queryAndLength[1]?.trim() || "5";

		if (!q) {
			return api.sendMessage(
				"❌ Please provide a query.\nUsage: pinterest <query> - <count>",
				event.threadID,
				event.messageID
			);
		}

		try {
			const w = await api.sendMessage("🔍 Searching Pinterest... Please wait", event.threadID);
			const response = await axios.get(
				`${await baseApiUrl()}/pinterest?search=${encodeURIComponent(q)}&limit=${encodeURIComponent(length)}`
			);
			const data = response.data.data;

			if (!data || data.length === 0) {
				return api.sendMessage(
					"❌ No images found for your query.",
					event.threadID,
					event.messageID
				);
			}

			const attachments = [];
			const cacheDir = path.join(__dirname, "cache");
			await fs.ensureDir(cacheDir);

			const totalImagesCount = Math.min(data.length, parseInt(length) || 5);

			for (let i = 0; i < totalImagesCount; i++) {
				const imgUrl = data[i];
				const imgResponse = await axios.get(imgUrl, {
					responseType: "arraybuffer",
				});
				const imgPath = path.join(cacheDir, `pinterest_${Date.now()}_${i + 1}.jpg`);
				await fs.outputFile(imgPath, imgResponse.data);
				attachments.push(fs.createReadStream(imgPath));
			}

			await api.unsendMessage(w.messageID);
			await api.sendMessage(
				{
					body: `🖼️ Pinterest Search: "${q}"\n📦 Total Images: ${totalImagesCount}`,
					attachment: attachments,
				},
				event.threadID,
				event.messageID
			);
		} catch (error) {
			console.error("Pinterest command error:", error);
			await api.sendMessage(
				`❌ Error: ${error.message || error}`,
				event.threadID,
				event.messageID
			);
		}
	},
};
