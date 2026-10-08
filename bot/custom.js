const { log } = global.utils;

module.exports = async function ({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getText }) {
	// This is where you can add your custom code to the bot.
	// The bot will run this code every time it starts up (after logging in and loading data from the database).

	// ————————————— TRACK BOT'S OWN MESSAGES ————————————— //
	// Used by the config-driven admin reaction features
	// (config.json -> customFeatures.unsendOnReaction) to know whether a reacted
	// message was sent by the bot.
	const MAX_TRACKED_MESSAGES = 3000;
	const botSentMessages = global.GoatBot?.botSentMessages || new Set();
	if (global.GoatBot) global.GoatBot.botSentMessages = botSentMessages;
	if (global.FloppaBot) global.FloppaBot.botSentMessages = botSentMessages;
	if (typeof api.sendMessage === "function" && !api.__botSentMessagesWrapped) {
		const originalSendMessage = api.sendMessage.bind(api);
		api.sendMessage = function (...args) {
			const result = originalSendMessage(...args);
			if (result && typeof result.then === "function") {
				result.then((res) => {
					if (res && res.messageID) {
						botSentMessages.add(res.messageID);
						if (botSentMessages.size > MAX_TRACKED_MESSAGES)
							botSentMessages.delete(botSentMessages.values().next().value);
					}
				}).catch(() => {});
			}
			return result;
		};
		api.__botSentMessagesWrapped = true;
	}

	setInterval(async () => {
		api.refreshFb_dtsg()
			.then(() => {
				log.succes("refreshFb_dtsg", getText("custom", "refreshedFb_dtsg"));
			})
			.catch((err) => {
				log.error("refreshFb_dtsg", getText("custom", "refreshedFb_dtsgError"), err);
			});
	}, 1000 * 60 * 60 * 48); // 48h
};