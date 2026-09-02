const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require("path");
const exec = (cmd, options) => new Promise((resolve, reject) => {
	require("child_process").exec(cmd, options, (err, stdout) => {
		if (err) return reject(err);
		resolve(stdout);
	});
});
const { log, loading, getText, colors, removeHomeDir } = global.utils;
const { GoatBot } = global;
const { configCommands } = GoatBot;
const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
const packageAlready = [];
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let count = 0;

module.exports = async function (api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine) {
	const aliasesData = await globalData.get('setalias', 'data', []);
	if (aliasesData) {
		for (const data of aliasesData) {
			const { aliases, commandName } = data;
			for (const alias of aliases) {
				if (GoatBot.aliases.has(alias))
					throw new Error(`Alias "${alias}" already exists in command "${commandName}"`);
				else
					GoatBot.aliases.set(alias, commandName);
			}
		}
	}

	const folders = ["cmds", "events"];

	for (const folderModules of folders) {
		const makeColor = folderModules == "cmds" ?
			createLine("LOAD COMMANDS") :
			createLine("LOAD COMMANDS EVENT");
		console.log(colors.hex("#f5ab00")(makeColor));

		const text = folderModules == "cmds" ? "command" : "event command";
		const typeEnvCommand = folderModules == "cmds" ? "envCommands" : "envEvents";
		const setMap = folderModules == "cmds" ? "commands" : "eventCommands";

		const fullPathModules = path.normalize(process.cwd() + `/scripts/${folderModules}`);
		const Files = readdirSync(fullPathModules)
			.filter(file =>
				(file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".jsx") || file.endsWith(".cjs") || file.endsWith(".mjs")) &&
				!file.endsWith(".d.ts") &&
				!file.endsWith("eg.js") &&
				(process.env.NODE_ENV == "development" ? true : !file.match(/(dev)\.js$/g)) &&
				!configCommands[folderModules == "cmds" ? "commandUnload" : "commandEventUnload"]?.includes(file)
			);

		const commandError = [];
		let commandLoadSuccess = 0;

		for (const file of Files) {
			const pathCommand = path.normalize(fullPathModules + "/" + file);
			try {
				const contentFile = readFileSync(pathCommand, "utf8");
				let allPackage = contentFile.match(regExpCheckPackage);
				if (allPackage) {
					const builtInModules = new Set(["fs", "path", "crypto", "util", "child_process", "stream", "http", "https", "events", "os", "url", "buffer", "querystring", "zlib", "net", "tls", "dgram", "dns", "readline", "assert", "v8", "vm", "perf_hooks", "worker_threads", "module", "process"]);
					allPackage = allPackage.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
						.filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0 && !p.startsWith("node:") && !p.startsWith("@cass") && !p.startsWith("@defs") && !p.startsWith("@root") && p !== "cassidy-styler" && p !== "output-cassidy" && p !== "input-cassidy" && p !== "uuid/v4" && p !== "uuid/v1");
					for (let packageName of allPackage) {
						if (packageName.startsWith('@'))
							packageName = packageName.split('/').slice(0, 2).join('/');
						else
							packageName = packageName.split('/')[0];

						if (builtInModules.has(packageName) || packageName.startsWith('node:')) continue;

						if (!packageAlready.includes(packageName)) {
							packageAlready.push(packageName);
							if (!existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
								const waiting = setInterval(() => {
									loading.info('PACKAGE', `${spinner[count % spinner.length]} Installing package ${colors.yellow(packageName)} for ${text} ${colors.yellow(file)}`);
									count++;
								}, 80);
								try {
									await exec(`npm install ${packageName} --legacy-peer-deps --save`);
									clearInterval(waiting);
									process.stderr.write('\r\x1b[K');
									console.log(`${colors.green('✔')} installed package ${packageName} successfully`);
								}
								catch (err) {
									clearInterval(waiting);
									process.stderr.write('\r\x1b[K');
									console.log(`${colors.red('✖')} installed package ${packageName} failed`);
								}
							}
						}
					}
				}

				global.temp.contentScripts[folderModules][file] = contentFile;

				let command = require(pathCommand);
				if (command.default) {
					command = command.default;
				}
				command.location = pathCommand;

				// Normalize meta into config if needed
				if (command.meta && !command.config) {
					command.config = {
						name: command.meta.name,
						version: command.meta.version || "1.0.0",
						author: command.meta.author || command.meta.credits || "Floppa Engine",
						cooldowns: command.meta.waitingTime || command.meta.cooldown || 5,
						role: command.meta.role !== undefined ? command.meta.role : (command.meta.hasPermssion || 0),
						description: command.meta.description || "No description provided.",
						category: command.meta.category || "General",
						guide: { en: command.meta.usage || `{p}${command.meta.name}` },
						aliases: command.meta.otherNames || command.meta.aliases || []
					};
				}

				const configCommand = command.config;
				if (!configCommand) throw new Error(`config of ${text} undefined`);
				if (!configCommand.category) configCommand.category = "General";
				if (!configCommand.name) throw new Error(`name of ${text} undefined`);

				const commandName = configCommand.name.toLowerCase();

				// Normalize handlers
				if (!command.onStart && (command.entry || command.run || command.onCall)) {
					const entryHandler = command.entry || command.run || command.onCall;
					command.onStart = async function (ctx) {
						return entryHandler(ctx);
					};
				}

				if (!command.onReply && (command.reply || command.handleReply)) {
					const replyHandler = command.reply || command.handleReply;
					command.onReply = async function (ctx) {
						return replyHandler(ctx);
					};
				}

				if (!command.onReaction && (command.react || command.handleReaction)) {
					const reactHandler = command.react || command.handleReaction;
					command.onReaction = async function (ctx) {
						return reactHandler(ctx);
					};
				}

				if (!command.onEvent && (command.event || command.handleEvent)) {
					const eventHandler = command.event || command.handleEvent;
					command.onEvent = async function (ctx) {
						return eventHandler(ctx);
					};
				}

				if (!command.onStart && folderModules == "cmds") {
					throw new Error(`onStart or entry of command "${commandName}" undefined`);
				}

				if (GoatBot[setMap].has(commandName)) {
					throw new Error(`${text} "${commandName}" already exists with file "${removeHomeDir(GoatBot[setMap].get(commandName).location || "")}"`);
				}

				const { onFirstChat, onChat, onLoad, onEvent, onAnyEvent, noPrefix } = command;
				const { envGlobal, envConfig, aliases } = configCommand;

				// Check aliases
				const validAliases = [];
				if (aliases) {
					const aliasList = Array.isArray(aliases) ? aliases : [aliases];
					for (const alias of aliasList) {
						if (!alias) continue;
						const lowerAlias = String(alias).toLowerCase();
						if (GoatBot.aliases.has(lowerAlias)) {
							// skip duplicate alias warning
							continue;
						}
						validAliases.push(lowerAlias);
						GoatBot.aliases.set(lowerAlias, commandName);
					}
				}

				// Check envGlobal
				if (envGlobal && typeof envGlobal == "object" && !Array.isArray(envGlobal)) {
					for (const i in envGlobal) {
						if (!configCommands.envGlobal[i]) {
							configCommands.envGlobal[i] = envGlobal[i];
						}
					}
				}

				// Check envConfig
				if (envConfig && typeof envConfig == "object" && !Array.isArray(envConfig)) {
					if (!configCommands[typeEnvCommand]) configCommands[typeEnvCommand] = {};
					if (!configCommands[typeEnvCommand][commandName]) configCommands[typeEnvCommand][commandName] = {};
					for (const [key, value] of Object.entries(envConfig)) {
						if (!configCommands[typeEnvCommand][commandName][key]) {
							configCommands[typeEnvCommand][commandName][key] = value;
						}
					}
				}

				// Check onLoad
				if (onLoad && typeof onLoad == "function") {
					try {
						await onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
					} catch (e) {
						log.warn("ONLOAD", `Error in onLoad for ${commandName}:`, e.message);
					}
				}

				if (onChat || noPrefix) GoatBot.onChat.push(commandName);
				if (onFirstChat) {
					if (!GoatBot.onFirstChat._commandNames) GoatBot.onFirstChat._commandNames = [];
					if (!GoatBot.onFirstChat._commandNames.includes(commandName)) GoatBot.onFirstChat._commandNames.push(commandName);
					if (Array.isArray(GoatBot.onFirstChat)) GoatBot.onFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
				}
				if (onEvent) GoatBot.onEvent.push(commandName);
				if (onAnyEvent) GoatBot.onAnyEvent.push(commandName);

				// Register in Map
				GoatBot[setMap].set(commandName, command);
				if (global.FloppaBot && global.FloppaBot.multiCommands) {
					global.FloppaBot.multiCommands.addOne(commandName, command);
					for (const a of validAliases) {
						global.FloppaBot.multiCommands.addOne(a, command);
					}
				}

				commandLoadSuccess++;

				global.GoatBot[folderModules == "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"].push({
					filePath: path.normalize(pathCommand),
					commandName: [commandName, ...validAliases]
				});
			}
			catch (error) {
				commandError.push({
					name: file,
					error
				});
			}
			loading.info('LOADED', `${colors.green(`${commandLoadSuccess}`)}${commandError.length ? `, ${colors.red(`${commandError.length}`)}` : ''}`);
		}
		console.log("\r");
		if (commandError.length > 0) {
			log.err("LOADED", getText('loadScripts', 'loadScriptsError', colors.yellow(text)));
			for (const item of commandError)
				console.log(` ${colors.red('✖ ' + item.name)}: ${item.error.message}\n`, item.error);
		}
	}
};