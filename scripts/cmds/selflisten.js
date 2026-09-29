const fs = require("fs-extra");

module.exports = {
	config: {
		name: "selflisten",
		aliases: ["sl", "selflistenmode"],
		version: "1.0",
		author: "Neoaz 🐊",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off selfListen so the bot also receives messages sent by itself"
		},
		category: "owner",
		guide: {
			en: "   {pn} [on | off]: turn on/off selfListen"
				+ "\n   {pn} status: show the current selfListen value"
				+ "\n   selfListen is read when the bot connects to Facebook, so restart the bot after changing it"
		}
	},

	langs: {
		en: {
			turnedOn: "✅ Turned on selfListen. Restart the bot for it to take effect.",
			turnedOff: "✅ Turned off selfListen. Restart the bot for it to take effect.",
			status: "📌 selfListen is currently %1",
			on: "on",
			off: "off"
		}
	},

	onStart: async function ({ args, message, getLang }) {
		const botObj = global.FloppaBot || global.GoatBot || {};
		const option = args[0] ? args[0].toLowerCase() : "";
		const optionsFca = (botObj.config && botObj.config.optionsFca) || {};
		if (botObj.config && !botObj.config.optionsFca) {
			botObj.config.optionsFca = optionsFca;
		}

		if (!option || option === "status" || option === "check")
			return message.reply(getLang("status", optionsFca.selfListen === true ? getLang("on") : getLang("off")));

		if (option !== "on" && option !== "off")
			return message.SyntaxError();

		const value = option === "on";
		optionsFca.selfListen = value;
		if (botObj.config?.optionsFca) {
			botObj.config.optionsFca.selfListen = value;
		}
		const configPath = global.client?.dirConfig || `${process.cwd()}/config.json`;
		if (botObj.config) {
			fs.writeFileSync(configPath, JSON.stringify(botObj.config, null, 2));
		}
		return message.reply(getLang(value ? "turnedOn" : "turnedOff"));
	}
};
