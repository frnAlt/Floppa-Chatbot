const fs = require("fs-extra");

module.exports = {
	config: {
		name: "noprefix",
		aliases: ["np"],
		version: "1.0",
		author: "Neoaz 🐊",
		countDown: 5,
		role: 2,
		description: {
			en: "Turn the no-prefix mode on or off"
		},
		category: "owner",
		guide: {
			en: "   {pn} [on | off]: turn no-prefix mode on or off (leave blank to toggle)"
		}
	},

	onStart: async function ({ message, args }) {
		const config = global.GoatBot.config;
		if (!config.customFeatures) config.customFeatures = {};
		if (!config.customFeatures.noPrefix) config.customFeatures.noPrefix = {};
		const current = config.customFeatures.noPrefix.enable == true;
		const value = args[0] == "on" ? true : args[0] == "off" ? false : !current;
		config.customFeatures.noPrefix.enable = value;
		fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
		message.reply(`No-prefix mode is now ${value ? "on" : "off"}.`);
	}
};
