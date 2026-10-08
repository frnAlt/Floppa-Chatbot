const fs = require("fs-extra");

module.exports = {
	config: {
		name: "reactmirror",
		aliases: ["rmirror", "mirror"],
		version: "1.0",
		author: "Neoaz 🐊",
		countDown: 5,
		role: 2,
		description: {
			en: "Turn the reaction mirror on or off"
		},
		category: "owner",
		guide: {
			en: "   {pn} [on | off]: turn the reaction mirror on or off (leave blank to toggle)"
		}
	},

	onStart: async function ({ message, args }) {
		const config = global.GoatBot.config;
		if (!config.customFeatures) config.customFeatures = {};
		if (!config.customFeatures.reactMirror) config.customFeatures.reactMirror = {};
		const current = config.customFeatures.reactMirror.enable == true;
		const value = args[0] == "on" ? true : args[0] == "off" ? false : !current;
		config.customFeatures.reactMirror.enable = value;
		fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
		message.reply(`Reaction mirror is now ${value ? "on" : "off"}.`);
	}
};
