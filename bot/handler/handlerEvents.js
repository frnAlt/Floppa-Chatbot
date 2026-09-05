const fs = require("fs-extra");
const SpamTracker = require("../../func/spamTracker.js");
const CooldownManager = require("../../func/cooldownManager.js");
const analyticsBatcher = require("../../func/analyticsBatcher.js");
const InputClass = require("../../func/inputClass.js");
const OutputClass = require("../../func/outputClass.js");
const nullAndUndefined = [undefined, null];

// Initialize optimized spam tracker on module load
const spamTracker = new SpamTracker({
        commandThreshold: 8,
        timeWindow: 10000, // 10 seconds
        banDuration: 24 * 60 * 60 * 1000, // 24 hours
        maxEntries: 1000,
        cleanupInterval: 60000 // 1 minute
});

// CooldownManager is already a singleton instance
const cooldownManager = require("../../func/cooldownManager.js");

function getType(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
}

let _cachedSpamBannedThreads = null;
let _lastSpamBannedCheck = 0;

async function checkSpamBannedThread(threadID, globalData) {
        // Use the new spam tracker first (in-memory, fast)
        if (spamTracker.isBanned(threadID)) {
                return true;
        }

        if (!globalData || typeof globalData.get !== "function") {
                return false;
        }

        const now = Date.now();
        if (!_cachedSpamBannedThreads || now - _lastSpamBannedCheck > 30000) {
                try {
                        _cachedSpamBannedThreads = (await globalData.get("spamBannedThreads", "data", {})) || {};
                        _lastSpamBannedCheck = now;
                } catch (_) {
                        _cachedSpamBannedThreads = {};
                }
        }

        const spamBannedThreads = _cachedSpamBannedThreads;
        if (spamBannedThreads[threadID]) {
                if (spamBannedThreads[threadID].expireTime > now) {
                        // Sync to memory tracker
                        spamTracker.banThread(threadID, spamBannedThreads[threadID].reason, spamBannedThreads[threadID].expireTime - now);
                        return true;
                } else {
                        delete spamBannedThreads[threadID];
                        if (typeof globalData.set === "function") {
                                globalData.set("spamBannedThreads", spamBannedThreads, "data").catch(() => {});
                        }
                }
        }
        return false;
}

async function trackCommandSpam(threadID, threadName, globalData, message) {
        const config = global.GoatBot.config;
        const spamConfig = config.spamProtection || {
                commandThreshold: 8,
                timeWindow: 10,
                banDuration: 24
        };

        // Update tracker config if changed
        spamTracker.options.commandThreshold = spamConfig.commandThreshold;
        spamTracker.options.timeWindow = spamConfig.timeWindow * 1000;
        spamTracker.options.banDuration = spamConfig.banDuration * 60 * 60 * 1000;

        // Use optimized spam tracker
        const result = spamTracker.trackCommand(threadID, message.body?.split(' ')[0] || 'unknown');

        if (result.shouldBan) {
                let spamBannedThreads = {};
                if (globalData && typeof globalData.get === "function") {
                        try {
                                spamBannedThreads = (await globalData.get("spamBannedThreads", "data", {})) || {};
                        } catch (_) {}
                }
                const banDuration = spamConfig.banDuration * 60 * 60 * 1000;
                const now = Date.now();

                spamBannedThreads[threadID] = {
                        bannedAt: now,
                        expireTime: now + banDuration,
                        threadName: threadName || "Unknown",
                        reason: "Command spam flood detected"
                };

                if (globalData && typeof globalData.set === "function") {
                        try {
                                await globalData.set("spamBannedThreads", spamBannedThreads, "data");
                        } catch (_) {}
                }

                const hours = spamConfig.banDuration;
                message.reply(`⛔ | This group has been temporarily banned for ${hours} hours due to command spam.\n\nPlease wait or contact an admin to unban.`);

                global.utils.log.warn("SPAM_BAN", `Thread ${threadID} (${threadName}) banned for command spam`);

                return true;
        }

        return false;
}

function getRole(threadData, senderID) {
        const config = global.GoatBot.config;
        const adminBot = config.adminBot || [];
        const devUsers = config.devUsers || [];
        const premiumUsers = config.premiumUsers || [];
        if (!senderID)
                return 0;
        const adminBox = threadData ? threadData.adminIDs || [] : [];

        // Priority: Developer (4) > Bot Admin (2) > Premium (3) > Group Admin (1) > Normal (0)
        // Admin and Dev always get their role regardless of premium membership
        if (devUsers.includes(senderID.toString()))
                return 4;
        if (adminBot.includes(senderID.toString()))
                return 2;
        if (premiumUsers.includes(senderID.toString())) {
                const userData = global.db.allUserData.find(u => u.userID == senderID);
                if (userData && userData.data && userData.data.premiumExpireTime) {
                        if (userData.data.premiumExpireTime < Date.now()) {
                                global.temp.expiredPremiumUsers = global.temp.expiredPremiumUsers || [];
                                if (!global.temp.expiredPremiumUsers.includes(senderID))
                                        global.temp.expiredPremiumUsers.push(senderID);
                                return adminBox.map(String).includes(senderID.toString()) ? 1 : 0;
                        }
                }
                return 3;
        }
        if (adminBox.map(String).includes(senderID.toString()))
                return 1;
        return 0;
}

// Role permission matrix:
//   Role 0 - Normal user     : can use commands with needRole === 0
//   Role 1 - Group Admin     : can use commands with needRole <= 1
//   Role 2 - Bot Admin       : can use ALL commands (highest rank)
//   Role 3 - Premium         : can use commands with needRole === 0 OR needRole === 3 ONLY
//   Role 4 - Bot Developer   : can use ALL commands (highest rank)
function canUseCommand(userRole, needRole) {
        if (userRole === 4 || userRole === 2)
                return true;
        if (userRole === 3)
                return needRole === 0 || needRole === 3;
        return needRole <= userRole;
}

async function checkMoneyRequirement(userData, requiredMoney) {
        if (!requiredMoney || requiredMoney <= 0)
                return true;
        const userMoney = userData.money || 0;
        return userMoney >= requiredMoney;
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned")
                return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot")
                return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text
                .replace(/\{(?:p|prefix)\}/g, prefix)
                .replace(/\{(?:n|name)\}/g, commandName)
                .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) {
                roleConfig = {
                        onStart: command.config.role
                };
        }
        else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.onStart)
                        command.config.role.onStart = 0;
                roleConfig = command.config.role;
        }
        else {
                roleConfig = {
                        onStart: 0
                };
        }

        if (isGroup)
                roleConfig.onStart = threadData?.data?.setRole?.[commandName] ?? roleConfig.onStart;

        for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
                if (roleConfig[key] == undefined)
                        roleConfig[key] = roleConfig.onStart;
        }

        return roleConfig;
        // {
        //      onChat,
        //      onStart,
        //      onReaction,
        //      onReply
        // }
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
        const config = global.GoatBot.config;
        const adminBot = config.adminBot || [];
        const hideNotiMessage = config.hideNotiMessage || {};

        // check if user banned
        const infoBannedUser = userData?.banned;
        if (infoBannedUser && infoBannedUser.status == true) {
                const { reason, date } = infoBannedUser;
                if (hideNotiMessage.userBanned == false)
                        message.reply(getText("userBanned", reason, date, senderID, lang));
                return true;
        }

        // check if only admin bot
        if (
                config.adminOnly?.enable == true
                && !adminBot.includes(senderID)
                && !(config.adminOnly?.ignoreCommand || []).includes(commandName)
        ) {
                if (hideNotiMessage.adminOnly == false)
                        message.reply(getText("onlyAdminBot", null, null, null, lang));
                return true;
        }

        // ==========    Check Thread    ========== //
        if (isGroup == true && threadData) {
                if (
                        threadData.data?.onlyAdminBox === true
                        && Array.isArray(threadData.adminIDs) && !threadData.adminIDs.includes(senderID)
                        && !(threadData.data?.ignoreCommanToOnlyAdminBox || []).includes(commandName)
                ) {
                        // check if only admin box
                        if (!threadData.data?.hideNotiMessageOnlyAdminBox)
                                message.reply(getText("onlyAdminBox", null, null, null, lang));
                        return true;
                }

                // check if thread banned
                const infoBannedThread = threadData.banned;
                if (infoBannedThread && infoBannedThread.status == true) {
                        const { reason, date } = infoBannedThread;
                        if (hideNotiMessage.threadBanned == false)
                                message.reply(getText("threadBanned", reason, date, threadID, lang));
                        return true;
                }
        }
        return false;
}


function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandType = command.config.countDown ? "command" : "command event";
        const commandName = command.config.name;
        let customLang = {};
        let getText2 = () => { };
        if (fs.existsSync(pathCustomLang))
                customLang = require(pathCustomLang)[commandName]?.text || {};
        if (command.langs || customLang || {}) {
                getText2 = function (key, ...args) {
                        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
                        lang = replaceShortcutInLang(lang, prefix, commandName);
                        for (let i = args.length - 1; i >= 0; i--)
                                lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                        return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
                };
        }
        return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
        return async function (event, message) {

                const { utils, client, GoatBot } = global;
                const { getPrefix, removeHomeDir, log, getTime } = utils;
                const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
                const { autoRefreshThreadInfoFirstTime } = config.database;
                let { hideNotiMessage = {} } = config;
                if (typeof GoatBot.botOff === "undefined")
                        GoatBot.botOff = Boolean(config.botOff);

                const { body, messageID, threadID, isGroup } = event;

                // Check if has threadID
                if (!threadID)
                        return;

                const senderID = event.userID || event.senderID || event.author;

                const botID = String(api?.getCurrentUserID?.() || GoatBot?.botID || global.botID || "");
                const allowSelfListen = Boolean(config.optionsFca?.selfListen || config.selfListen);
                if (botID && String(senderID) === botID) {
                        const isAutomatedBotMsg = Boolean(
                                (event.messageID && global.botSentMessages?.get(String(threadID))?.includes(event.messageID)) ||
                                (event.offlineThreadingId && Array.from(global.botSentMessages?.values() || []).some(list => list.includes(event.offlineThreadingId)))
                        );
                        if (isAutomatedBotMsg) {
                                return;
                        }
                        if (!allowSelfListen) {
                                return;
                        }
                        const currentPrefix = getPrefix(threadID);
                        const validPrefixes = Array.from(new Set([currentPrefix, "/", "~", "!"].filter(Boolean)));
                        const firstWord = typeof body === "string" ? body.trim().split(/ +/)[0]?.toLowerCase() : "";
                        const isSelfCommand = typeof body === "string" && (
                                validPrefixes.some(p => body.trim().startsWith(p)) ||
                                !isGroup ||
                                Boolean(GoatBot.commands.has(firstWord) || GoatBot.aliases.has(firstWord))
                        );
                        if (!isSelfCommand) {
                                return;
                        }
                }

                let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
                let userData = global.db.allUserData.find(u => u.userID == senderID);

                if (!userData && !isNaN(senderID)) {
                        try {
                                userData = await usersData.create(senderID);
                        } catch (err) {
                                userData = { userID: String(senderID), name: `User ${senderID}`, money: 0, exp: 0, data: {} };
                        }
                }

                if (!threadData && !isNaN(threadID)) {
                        try {
                                threadData = await threadsData.create(threadID, null, Boolean(isGroup));
                        } catch (err) {
                                threadData = {
                                        threadID: String(threadID),
                                        threadName: isGroup ? "Group Chat" : "Direct Message",
                                        members: [{ userID: String(senderID), inGroup: true, permissionConfigDashboard: false }],
                                        adminIDs: [],
                                        settings: {},
                                        data: { prefix: config.prefix || "!" },
                                        isGroup: Boolean(isGroup)
                                };
                        }
                        global.db.receivedTheFirstMessage[threadID] = true;
                }
                else {
                        if (
                                autoRefreshThreadInfoFirstTime === true
                                && !global.db.receivedTheFirstMessage[threadID]
                                && Boolean(isGroup)
                        ) {
                                global.db.receivedTheFirstMessage[threadID] = true;
                                threadsData.refreshInfo(threadID).catch(() => {});
                        }
                }

                if (typeof threadData?.settings?.hideNotiMessage == "object")
                        hideNotiMessage = threadData.settings.hideNotiMessage;

                if (!event.mentions || typeof event.mentions !== "object") {
                        event.mentions = {};
                }

                // Automatically populate event.mentions from text if Facebook omitted them
                if (typeof body === "string" && body.includes("@")) {
                        const members = threadData?.members || [];
                        const lowerBody = body.toLowerCase();
                        for (const m of members) {
                                if (!m || !m.name || !m.userID) continue;
                                const lowerName = m.name.toLowerCase();
                                if (lowerBody.includes("@" + lowerName)) {
                                        event.mentions[String(m.userID)] = m.name;
                                } else if (m.nickname && lowerBody.includes("@" + m.nickname.toLowerCase())) {
                                        event.mentions[String(m.userID)] = m.name;
                                } else {
                                        const nameParts = lowerName.split(/\s+/).filter(p => p.length > 2);
                                        if (nameParts.length > 1 && nameParts.every(p => lowerBody.includes(p))) {
                                                event.mentions[String(m.userID)] = m.name;
                                        }
                                }
                        }
                        if (Object.keys(event.mentions).length === 0 && global.db?.allUserData) {
                                for (const u of global.db.allUserData) {
                                        if (!u || !u.name || !u.userID) continue;
                                        const lowerName = u.name.toLowerCase();
                                        if (lowerBody.includes("@" + lowerName)) {
                                                event.mentions[String(u.userID)] = u.name;
                                                break;
                                        }
                                }
                        }
                }

                // Tap-to-reply: If user replied to someone's message and no explicit @mentions were provided,
                // automatically assign the replied user to event.mentions so all commands support tap-to-reply seamlessly!
                if (Object.keys(event.mentions).length === 0 && event.messageReply) {
                        const repliedUID = String(event.messageReply.senderID || event.messageReply.actorFbId || event.messageReply.userID || event.messageReply.author || "");
                        if (repliedUID && repliedUID !== String(api.getCurrentUserID())) {
                                const members = threadData?.members || [];
                                const member = members.find(m => String(m.userID) === repliedUID);
                                const repliedName = member?.name || event.messageReply.senderName || `User ${repliedUID}`;
                                event.mentions[repliedUID] = repliedName;
                                event.targetID = repliedUID;
                        }
                }
                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const input = new InputClass({ api, event, message, role, prefix, args: body ? body.trim().split(/\s+/).slice(1) : [] });
                const output = new OutputClass({ api, event, message });
                const isTwoPersonThread = Boolean(
                        !isGroup ||
                        (threadData?.members && threadData.members.length === 2) ||
                        (threadData?.threadName && threadData.threadName.toLowerCase().startsWith("floppa private"))
                );
                const parameters = {
                        api, usersData, threadsData, message, event,
                        userModel, threadModel, prefix, dashBoardModel,
                        globalModel, dashBoardData, globalData, envCommands,
                        envEvents, envGlobal, role,
                        isGroup: Boolean(isGroup),
                        isDM: !isGroup || isTwoPersonThread,
                        isTwoPersonThread,
                        input, output,
                        usersDB: usersData,
                        threadsDB: threadsData,
                        globalDB: globalData,
                        money: usersData,
                        userStat: usersData,
                        FontSystem: utils.FontSystem,
                        fonts: utils.FontSystem?.fonts,
                        styler: utils,
                        utils,
                        removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
                                        throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
                                for (let i = 0; i < arguments.length; i++)
                                        if (typeof arguments[i] != "string")
                                                throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

                                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                        }
                };
                const langCode = threadData?.data?.lang || config.language || "en";

                function createMessageSyntaxError(commandName) {
                        message.SyntaxError = async function () {
                                return await message.reply(
                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName),
                                        (err, info) => {
                                                if (!err && info?.messageID) {
                                                        setTimeout(() => message.unsend(info.messageID), 8000);
                                                }
                                        }
                                );
                        };
                }

                /*
                        +-----------------------------------------------+
                        |                                                        WHEN CALL COMMAND                                                              |
                        +-----------------------------------------------+
                */
                let isUserCallCommand = false;
                let hasPrefix = false;
                async function onStart() {
                        // —————————————— CHECK USE BOT —————————————— //
                        if (!body) {
                                if (!isGroup && event.attachments && Array.isArray(event.attachments) && event.attachments.some(a => a.isUnrecognized || (a.ID && String(a.ID).startsWith("ee.mid")) || a.description === "Unsupported shared content.")) {
                                        const uObj = (global.db?.allUserData || []).find(u => String(u.userID) === String(senderID));
                                        const uName = uObj?.name || "";
                                        return await message.reply(
                                                `🔒 [Facebook E2EE Notice]\n\n` +
                                                `👋 Hey ${uName || "there"}!\n\n` +
                                                `Your Facebook Messenger app has End-to-End Encryption (E2EE) enabled on this direct chat, which hides message text from third-party bot integrations.\n\n` +
                                                `🔒 I've opened a dedicated private room for us where everything is 100% unencrypted and works seamlessly!\n\n` +
                                                `💡 You can also add Floppa Bot to any group chat or chat directly in any shared group.\n\n` +
                                                `Type ${prefix}help to explore all features!`
                                        );
                                }
                                return;
                        }

                        const noPrefixEnabled = config.noPrefix === true;
                        const userCanSkipPrefix = (role === 2 || role === 4) && noPrefixEnabled;
                        const validPrefixes = Array.from(new Set([prefix, "/", "~", "!"].filter(Boolean)));
                        const matchedPrefix = validPrefixes.find(p => body.startsWith(p));
                        hasPrefix = Boolean(matchedPrefix);
                        let hasNoPrefix = false;

                        if (!hasPrefix) {
                                const firstWord = body.trim().split(/ +/)[0]?.toLowerCase();
                                const potentialCmd = firstWord ? (GoatBot.commands.get(firstWord) || GoatBot.commands.get(GoatBot.aliases.get(firstWord))) : null;
                                const cmdAllowsNoPrefix = Boolean(
                                        potentialCmd?.config?.noPrefix === true ||
                                        potentialCmd?.config?.noPrefix === "both" ||
                                        potentialCmd?.meta?.noPrefix === true ||
                                        potentialCmd?.meta?.noPrefix === "both"
                                );

                                if (potentialCmd && (noPrefixEnabled || userCanSkipPrefix || cmdAllowsNoPrefix || !isGroup || isTwoPersonThread)) {
                                        hasNoPrefix = true;
                                } else if (!isGroup || isTwoPersonThread) {
                                        if (global.GoatBot.botOff && role !== 2 && role !== 4) {
                                                return await message.reply("⚠️ Bot is currently turned OFF by the administrator. Only administrators can use commands.");
                                        }
                                        const cleanText = body.trim().toLowerCase();
                                        if (/^(hi|hello|hey|test|testing|hola|alo|salam|assalamu alaikum|sup|yo|bot)\b/i.test(cleanText)) {
                                                const botName = config.nickNameBot || "Floppa Bot 🐱";
                                                return await message.reply(
                                                        `👋 Hello! I'm ${botName}.\n\n` +
                                                        `You are in Direct Messages (DM)! All features and commands work right here in DM as well as group chats.\n\n` +
                                                        `💡 Quick commands to test:\n` +
                                                        `• ${prefix}help - View full command catalog\n` +
                                                        `• ${prefix}ai <prompt> - Chat with AI\n` +
                                                        `• ${prefix}gemini <prompt> - Google Gemini AI\n` +
                                                        `• ${prefix}ping - Check bot response speed\n` +
                                                        `• ${prefix}sing <song name> - Listen & stream music\n` +
                                                        `• ${prefix}alldl <url> - Download video/audio\n\n` +
                                                        `Type ${prefix}help to explore everything!`
                                                );
                                        }

                                        // Auto conversational AI in DM: If someone chats in DM with a question or comment, answer with AI!
                                        try {
                                                const aiCorePath = require('path').join(process.cwd(), "system/ai-core.js");
                                                const aiCore = require(aiCorePath);
                                                const contextId = `${threadID}_${senderID}`;
                                                const aiResponse = await aiCore.generateCompletion({
                                                        prompt: body.trim(),
                                                        contextId
                                                });
                                                if (aiResponse) {
							return await message.reply(`🤖 [Floppa AI]\n\n${aiResponse}`, (err, info) => {
								if (!err && info?.messageID) {
									if (!global.GoatBot) global.GoatBot = {};
									if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
									global.GoatBot.onReply.set(info.messageID, {
										commandName: "chat",
										author: senderID,
										contextId,
										messageID: info.messageID
									});
								}
							});
						}
					} catch (aiErr) {
						return await message.reply(`👋 I'm Floppa Bot! Type ${prefix}help to see commands, or ${prefix}chat ${body.trim()} to ask me anything!`);
					}
                                        return;
                                } else {
                                        return;
                                }
                        }

                        // Check bot maintenance / off state: only admin (role 2 or 4) can use bot
                        if (global.GoatBot.botOff && role !== 2 && role !== 4) {
                                if (!isGroup) {
                                        return await message.reply("⚠️ Bot is currently turned OFF by the administrator. Only administrators can use commands at this time.");
                                }
                                return;
                        }

                        // —————————— CHECK SPAM BANNED THREAD —————————— //
                        if (isGroup) {
                                const isSpamBanned = await checkSpamBannedThread(threadID, globalData);
                                if (isSpamBanned) {
                                        if (!hideNotiMessage.threadBanned)
                                                message.reply("This group is temporarily banned for command spam.");
                                        return;
                                }
                        }
                        const dateNow = Date.now();
                        const args = hasPrefix
                                ? body.slice(matchedPrefix.length).trim().split(/ +/)
                                : body.trim().split(/ +/);
                        // ————————————  CHECK HAS COMMAND ——————————— //
                        let commandName = args.shift().toLowerCase();
                        let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
                        // ———————— CHECK ALIASES SET BY GROUP ———————— //
                        const aliasesData = threadData?.data?.aliases || {};
                        for (const cmdName in aliasesData) {
                                if (aliasesData[cmdName]?.includes(commandName)) {
                                        command = GoatBot.commands.get(cmdName);
                                        break;
                                }
                        }
                        // ————————————— SET COMMAND NAME ————————————— //
                        if (command) {
                                if (!command.config && command.meta) command.config = command.meta;
                                if (!command.onStart && command.entry) command.onStart = command.entry;
                                commandName = command.config?.name || command.meta?.name || commandName;
                        }
                        // ——————— FUNCTION REMOVE COMMAND NAME ———————— //
                        function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if (arguments.length) {
                                        if (typeof body_ != "string")
                                                throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
                                        if (typeof prefix_ != "string")
                                                throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
                                        if (typeof commandName_ != "string")
                                                throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);

                                        return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                                }
                                else {
                                        const pfx = hasPrefix ? (matchedPrefix || prefix) : "";
                                        const regex = pfx
                                                ? new RegExp(`^${pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+|)${commandName}`, "i")
                                                : new RegExp(`^(\\s+|)?${commandName}`, "i");
                                        return body.replace(regex, "").trim();
                                }
                        }
                        // —————  CHECK BANNED OR ONLY ADMIN BOX  ————— //
                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                return;
                        if (!command) {
                                // In noPrefix mode, only respond if the user explicitly used the prefix.
                                // If the message had no prefix, silently ignore unrecognized words.
                                if (!hasPrefix)
                                        return;
                                if (!hideNotiMessage.commandNotFound) {
                                        if (!commandName) {
                                                return await message.reply(`That's only the prefix. Type ${prefix}help to see commands.`);
                                        }
                                        
                                        // Optimized command suggestion with caching and quick checks
                                        function getCachedCommandNames() {
                                                const cmdCount = GoatBot.commands.size;
                                                const aliasCount = GoatBot.aliases.size;
                                                const cache = GoatBot._cmdNameCache || {};
                                                if (!cache.list || cache.cmdCount !== cmdCount || cache.aliasCount !== aliasCount) {
                                                        const list = [...GoatBot.commands.keys(), ...GoatBot.aliases.keys()];
                                                        GoatBot._cmdNameCache = {
                                                                list,
                                                                lower: list.map(s => s.toLowerCase()),
                                                                cmdCount,
                                                                aliasCount
                                                        };
                                                }
                                                return GoatBot._cmdNameCache;
                                        }

                                        const { list, lower } = getCachedCommandNames();
                                        const input = commandName.toLowerCase();

                                        // 1) prefix startsWith suggestion
                                        let index = lower.findIndex(n => n.startsWith(input));
                                        let bestMatch = index !== -1 ? list[index] : null;

                                        // 2) fallback: constrained edit distance on nearby lengths only
                                        if (!bestMatch) {
                                                function editDistance(a, b) {
                                                        const m = a.length, n = b.length;
                                                        if (Math.abs(m - n) > 2) return 99;
                                                        const dp = Array.from({ length: m + 1 }, (_, i) => i);
                                                        for (let j = 1; j <= n; j++) {
                                                                let prev = j - 1;
                                                                let cur = j;
                                                                for (let i = 1; i <= m; i++) {
                                                                        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                                                                        const tmp = Math.min(
                                                                                dp[i] + 1,        // deletion
                                                                                cur + 1,          // insertion
                                                                                dp[i - 1] + cost  // substitution
                                                                        );
                                                                        dp[i - 1] = prev;
                                                                        prev = tmp;
                                                                        cur = tmp;
                                                                }
                                                                dp[m] = cur;
                                                        }
                                                        return dp[m];
                                                }
                                                let best = { name: null, dist: 3 };
                                                for (let i = 0; i < lower.length; i++) {
                                                        const name = lower[i];
                                                        if (Math.abs(name.length - input.length) > 2) continue;
                                                        const d = editDistance(input, name);
                                                        if (d < best.dist) {
                                                                best = { name: list[i], dist: d };
                                                                if (d === 0) break;
                                                        }
                                                }
                                                if (best.dist <= 2) bestMatch = best.name;
                                        }
                                        
                                        let suggestionMsg = utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFound", commandName, prefix);
                                        if (bestMatch) {
                                                suggestionMsg += ` Try: ${prefix}${bestMatch}`;
                                        }
                                        
                                        return await message.reply(suggestionMsg);
                                }
                                else
                                        return true;
                        }
                        // ————————— CHECK MONEY REQUIREMENT (FIRST) ————————— //
                        const requiredMoney = command.config.requiredMoney;
                        if (requiredMoney && requiredMoney > 0) {
                                const hasEnoughMoney = await checkMoneyRequirement(userData, requiredMoney);
                                if (!hasEnoughMoney) {
                                        const userMoney = userData.money || 0;
                                        return await message.reply(
                                                `You need at least $${requiredMoney} to use this command.\n` +
                                                `Your balance: $${userMoney}\n` +
                                                `Missing: $${requiredMoney - userMoney}`
                                        );
                                }
                        }

                        // ————————————— CHECK PERMISSION ———————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onStart;

                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmd) {
                                        if (needRole == 1)
                                                return await message.reply(!isGroup ? "❌ This command is only available in group chats." : utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdmin", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2", commandName));
                                        else if (needRole == 3)
                                                return await message.reply("This command requires premium access.");
                                        else if (needRole == 4)
                                                return await message.reply("Developers only.");
                                        else
                                                return await message.reply("You don't have permission to use this command.");
                                }
                                else {
                                        return true;
                                }
                        }
                        // ———————————————— OPTIMIZED COOLDOWN ———————————————— //
                        let getCoolDown = command.config.countDown;
                        if ((!getCoolDown && getCoolDown !== 0) || isNaN(getCoolDown))
                                getCoolDown = 1;
                        const cooldownMs = getCoolDown * 1000;
                        
                        const cooldownCheck = cooldownManager.checkCooldown(commandName, senderID, cooldownMs);
                        if (cooldownCheck.onCooldown) {
                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", cooldownCheck.remainingTime.toString()));
                        }
                        
                        // ——————————————— RUN COMMAND ——————————————— //
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        isUserCallCommand = true;

                        // —————————— TRACK SPAM AND AUTO-BAN —————————— //
                        if (isGroup) {
                                const threadName = threadData?.threadName || "Unknown Group";
                                const wasSpamBanned = await trackCommandSpam(threadID, threadName, globalData, message);
                                if (wasSpamBanned) {
                                        return;
                                }
                        }

                        try {
                                // analytics command call - batched for performance
                                analyticsBatcher.record(commandName);

                                createMessageSyntaxError(commandName);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                await command.onStart({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2,
                                        removeCommandNameFromBody
                                });
                                
                                // Set cooldown after successful execution
                                cooldownManager.setCooldown(commandName, senderID);
                                
                                // Deduct money if requiredMoney was set
                                if (requiredMoney && requiredMoney > 0) {
                                        try {
                                                await usersData.subtractMoney(senderID, requiredMoney);
                                        } catch (err) {
                                                log.err("MONEY", `Failed to deduct $${requiredMoney} from ${senderID}`, err);
                                        }
                                }
                                
				log.info("CALL COMMAND", `${commandName} | ${userData?.name || "User"} | ${senderID} | ${threadID} | ${args.join(" ")} (${Date.now() - dateNow}ms)`);
                                if (global.systemMemoryDB) {
                                        global.systemMemoryDB.recordCommand(commandName, event, Date.now() - dateNow);
                                }
                        }
                        catch (err) {
                                if (global.systemMemoryDB) {
                                        global.systemMemoryDB.recordCommand(commandName, event, Date.now() - dateNow, err);
                                }
                                return await message.reply(
                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))),
                                        (e, info) => {
                                                if (!e && info?.messageID) {
                                                        setTimeout(() => message.unsend(info.messageID), 8000);
                                                }
                                        }
                                );
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON CHAT                     |
                 +------------------------------------------------+
                */
                async function onChat() {
                        if (global.GoatBot.botOff && role !== 2 && role !== 4)
                                return;
                        const allOnChat = GoatBot.onChat || [];
                        const args = body ? body.split(/ +/) : [];
                        for (const key of allOnChat) {
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;

                                // —————————————— CHECK PERMISSION —————————————— //
                                const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                                const needRole = roleConfig.onChat;
                                if (!canUseCommand(role, needRole))
                                        continue;

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                if (getType(command.onChat) == "Function") {
                                        const defaultOnChat = command.onChat;
                                        // convert to AsyncFunction
                                        command.onChat = async function () {
                                                return defaultOnChat(...arguments);
                                        };
                                }

                                command.onChat({
                                        ...parameters,
                                        isUserCallCommand,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                return;
                                                        try {
                                                                await handler();
                                                                log.info("onChat", `${commandName} | ${userData?.name || "User"} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                        }
                                                        catch (err) {
                                                                await message.reply(
                                                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))),
                                                                        (e, info) => {
                                                                                if (!e && info?.messageID) {
                                                                                        setTimeout(() => message.unsend(info.messageID), 8000);
                                                                                }
                                                                        }
                                                                );
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onChat", `An error occurred when calling the command onChat ${commandName}`, err);
                                        });
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON ANY EVENT                 |
                 +------------------------------------------------+
                */
                async function onAnyEvent() {
                        const allOnAnyEvent = GoatBot.onAnyEvent || [];
                        let args = [];
                        if (typeof event.body == "string" && event.body.startsWith(prefix))
                                args = event.body.split(/ +/);

                        for (const key of allOnAnyEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onAnyEvent) == "Function") {
                                        const defaultOnAnyEvent = command.onAnyEvent;
                                        // convert to AsyncFunction
                                        command.onAnyEvent = async function () {
                                                return defaultOnAnyEvent(...arguments);
                                        };
                                }

                                command.onAnyEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onAnyEvent", `${commandName} | ${senderID} | ${userData?.name || "User"} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred7", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                  ON FIRST CHAT                 |
                 +------------------------------------------------+
                */
                async function onFirstChat() {
                                        // onFirstChat is now a Set of threadIDs that have been first chatted
                                        // Commands register themselves in GoatBot.onChat with a flag for firstChat
                                        if (GoatBot.onFirstChat.has(threadID))
                                                return;

                                        const args = body ? body.split(/ +/) : [];

                                        for (const commandName of GoatBot.onFirstChat._commandNames || []) {
                                                const command = GoatBot.commands.get(commandName);
                                                if (!command || !command.onFirstChat)
                                                        continue;

                                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                                createMessageSyntaxError(commandName);

                                                if (getType(command.onFirstChat) == "Function") {
                                                        const defaultOnFirstChat = command.onFirstChat;
                                                        // convert to AsyncFunction
                                                        command.onFirstChat = async function () {
                                                                return defaultOnFirstChat(...arguments);
                                                        };
                                                }

                                                command.onFirstChat({
                                                        ...parameters,
                                                        isUserCallCommand,
                                                        args,
                                                        commandName,
                                                        getLang: getText2
                                                })
                                                        .then(async (handler) => {
                                                                if (typeof handler == "function") {
                                                                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                                                                return;
                                                                        try {
                                                                                await handler();
                                                                                log.info("onFirstChat", `${commandName} | ${userData?.name || "User"} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                                                                        }
                                                                        catch (err) {
                                                                                await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                        }
                                                                }
                                                        })
                                                        .catch(err => {
                                                                log.err("onFirstChat", `An error occurred when calling the command onFirstChat ${commandName}`, err);
                                                        });
                                        }

                                        // Mark this thread as having received first chat
                                        GoatBot.onFirstChat.add(threadID);
                }


                /* 
                 +------------------------------------------------+
                 |                    ON REPLY                    |
                 +------------------------------------------------+
                */
                async function onReply() {
                        if (global.GoatBot.botOff && role !== 2 && role !== 4)
                                return;

                        // Never intercept commands or messages starting with any prefix (-gay, !help, /cmd, .cmd)
                        if (isUserCallCommand || hasPrefix || (body && /^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(body.trim())))
                                return;

                        const { onReply } = GoatBot;
                        let Reply = null;
                        let replyTargetMID = null;

                        // onReply ONLY fires when a user explicitly replies to a bot message
                        if (event.messageReply?.messageID) {
                                Reply = onReply.get(event.messageReply.messageID);
                                replyTargetMID = event.messageReply.messageID;
                        }

                        if (!Reply)
                                return;

                        // Ensure only the author of the original prompt (or if author unspecified) can trigger the reply
                        if (Reply.author && String(Reply.author) !== String(senderID))
                                return;

                        Reply.delete = () => onReply.delete(replyTargetMID);
                        const commandName = Reply.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReply", `Can't find command name to execute this reply!`, Reply);
                        }
                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReply", `Command "${commandName}" not found`, Reply);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReply;
                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReply) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReply", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReply", commandName));
                                        else if (needRole == 3)
                                                return await message.reply("This command requires premium access.");
                                        else if (needRole == 4)
                                                return await message.reply("Developers only.");
                                }
                                else {
                                        return true;
                                }
                        }

                        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const args = body ? body.split(/ +/) : [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.onReply({
                                        ...parameters,
                                        Reply,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReply", `${commandName} | ${userData?.name || "User"} | ${senderID} | ${threadID} | ${args.join(" ")}`);
                        }
                        catch (err) {
                                log.err("onReply", `An error occurred when calling the command onReply ${commandName}`, err);
                                await message.reply(
                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred3", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))),
                                        (e, info) => {
                                                if (!e && info?.messageID) {
                                                        setTimeout(() => message.unsend(info.messageID), 8000);
                                                }
                                        }
                                );
                        }
                }


                /*
                 +------------------------------------------------+
                 |                   ON REACTION                  |
                 +------------------------------------------------+
                */
                async function onReaction() {
                        const { onReaction } = GoatBot;
                        const Reaction = onReaction.get(messageID);
                        const reaction = event.reaction;
                        
                        if (!Reaction)
                                return;
                        Reaction.delete = () => onReaction.delete(messageID);
                        const commandName = Reaction.commandName;
                        if (!commandName) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
                                return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
                        }
                        const command = GoatBot.commands.get(commandName);
                        if (!command) {
                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
                                return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
                        }

                        // —————————————— CHECK PERMISSION —————————————— //
                        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
                        const needRole = roleConfig.onReaction;
                        if (!canUseCommand(role, needRole)) {
                                if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
                                        if (needRole == 1)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReaction", commandName));
                                        else if (needRole == 2)
                                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReaction", commandName));
                                        else if (needRole == 3)
                                                return await message.reply("This command requires premium access.");
                                        else if (needRole == 4)
                                                return await message.reply("Developers only.");
                                }
                                else {
                                        return true;
                                }
                        }
                        // —————————————————————————————————————————————— //

                        const time = getTime("DD/MM/YYYY HH:mm:ss");
                        try {
                                if (!command)
                                        throw new Error(`Cannot find command with commandName: ${commandName}`);
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
                                const args = [];
                                createMessageSyntaxError(commandName);
                                if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
                                        return;
                                await command.onReaction({
                                        ...parameters,
                                        Reaction,
                                        args,
                                        commandName,
                                        getLang: getText2
                                });
                                log.info("onReaction", `${commandName} | ${userData?.name || "User"} | ${senderID} | ${threadID} | ${event.reaction}`);
                        }
                        catch (err) {
                                log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
                                await message.reply(
                                        utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))),
                                        (e, info) => {
                                                if (!e && info?.messageID) {
                                                        setTimeout(() => message.unsend(info.messageID), 8000);
                                                }
                                        }
                                );
                        }
                }


                /*
                 +------------------------------------------------+
                 |                 EVENT COMMAND                  |
                 +------------------------------------------------+
                */
                async function handlerEvent() {
                        const { author } = event;
                        const allEventCommand = GoatBot.eventCommands.entries();
                        for (const [key] of allEventCommand) {
                                const getEvent = GoatBot.eventCommands.get(key);
                                if (!getEvent)
                                        continue;
                                const commandName = getEvent.config.name;
                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                try {
                                        const handler = await getEvent.onStart({
                                                ...parameters,
                                                commandName,
                                                getLang: getText2
                                        });
                                        if (typeof handler == "function") {
                                                await handler();
                                                log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${userData?.name || "User"} | ${threadID}`);
                                        }
                                }
                                catch (err) {
                                        log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
                                        await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred5", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                }
                        }
                }


                /*
                 +------------------------------------------------+
                 |                    ON EVENT                    |
                 +------------------------------------------------+
                */
                async function onEvent() {
                        const allOnEvent = GoatBot.onEvent || [];
                        const args = [];
                        const { author } = event;
                        for (const key of allOnEvent) {
                                if (typeof key !== "string")
                                        continue;
                                const command = GoatBot.commands.get(key);
                                if (!command)
                                        continue;
                                const commandName = command.config.name;
                                const time = getTime("DD/MM/YYYY HH:mm:ss");
                                createMessageSyntaxError(commandName);

                                const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

                                if (getType(command.onEvent) == "Function") {
                                        const defaultOnEvent = command.onEvent;
                                        // convert to AsyncFunction
                                        command.onEvent = async function () {
                                                return defaultOnEvent(...arguments);
                                        };
                                }

                                command.onEvent({
                                        ...parameters,
                                        args,
                                        commandName,
                                        getLang: getText2
                                })
                                        .then(async (handler) => {
                                                if (typeof handler == "function") {
                                                        try {
                                                                await handler();
                                                                log.info("onEvent", `${commandName} | ${author} | ${userData?.name || "User"} | ${threadID}`);
                                                        }
                                                        catch (err) {
                                                                message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurred6", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                                        }
                                                }
                                        })
                                        .catch(err => {
                                                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
                                        });
                        }
                }

                /*
                 +------------------------------------------------+
                 |                    PRESENCE                    |
                 +------------------------------------------------+
                */
                async function presence() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                  READ RECEIPT                  |
                 +------------------------------------------------+
                */
                async function read_receipt() {
                        // Your code here
                }

                /*
                 +------------------------------------------------+
                 |                               TYP                            |
                 +------------------------------------------------+
                */
                async function typ() {
                        // Your code here
                }

                return {
                        onAnyEvent,
                        onFirstChat,
                        onChat,
                        onStart,
                        onReaction,
                        onReply,
                        onEvent,
                        handlerEvent,
                        presence,
                        read_receipt,
                        typ
                };
        };
};
