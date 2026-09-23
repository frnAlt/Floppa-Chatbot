"use strict";

const path = require("path");
const fs = require("fs");

// Ensure current working directory and sibling bot node_modules are searchable if FCA is loaded locally
try {
    const Module = require("module");
    const candidatePaths = [
        path.join(process.cwd(), "node_modules"),
        path.join(__dirname, "node_modules"),
        path.join(__dirname, "../Floppa-Chatbot/node_modules"),
        path.join(__dirname, "../Baka-Chan-bot-fix/node_modules")
    ];
    let added = false;
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            if (process.env.NODE_PATH) {
                if (!process.env.NODE_PATH.includes(p)) {
                    process.env.NODE_PATH = p + path.delimiter + process.env.NODE_PATH;
                    added = true;
                }
            } else {
                process.env.NODE_PATH = p;
                added = true;
            }
        }
    }
    if (added) {
        Module._initPaths();
    }
} catch (_) {}

// Polyfill legacy uuid/v4 for modern uuid packages
try {
    const Module = require("module");
    const origResolve = Module._resolveFilename;
    Module._resolveFilename = function(req, parent, isMain, opts) {
        if (req === "uuid/v4") {
            try {
                return origResolve.call(this, "uuid", parent, isMain, opts);
            } catch (_) {}
        }
        return origResolve.call(this, req, parent, isMain, opts);
    };
    const origLoad = Module._load;
    if (!Module._uuidV4HookInstalled) {
        Module._uuidV4HookInstalled = true;
        Module._load = function(req, parent, isMain) {
            if (req === "uuid/v4") {
                const uuid = origLoad.call(this, "uuid", parent, isMain);
                return typeof uuid === "function" ? uuid : (uuid.v4 || uuid.default || uuid);
            }
            return origLoad.call(this, req, parent, isMain);
        };
    }
} catch (_) {}

// Initialize Priyansh FCA Global State safely
if (!global.Fca) {
    let utils = null;
    try {
        utils = require("./utils");
    } catch (_) {}
    let npmlog = null;
    try {
        npmlog = require("npmlog");
        if (npmlog) {
            npmlog.level = process.env.DEBUG ? "info" : "silent";
        }
    } catch (_) {
        npmlog = { info: () => {}, warn: () => {}, error: () => {}, level: "silent" };
    }
    let logger = null;
    try {
        logger = require("./logger");
    } catch (_) {
        logger = { Normal: console.log, Warning: console.warn, Error: console.error };
    }

    let languageFile = [];
    try {
        languageFile = require("./Language/index.json");
    } catch (_) {
        languageFile = [];
    }

    const defaultPriyanshConfig = {
        Language: "en",
        PreKey: "",
        AutoUpdate: false,
        MainColor: "#00CCCC",
        MainName: "[ FLOPPA-NATIVE ]",
        Uptime: false,
        Config: "default",
        DevMode: false,
        Login2Fa: false,
        AutoLogin: false,
        BroadCast: false,
        AuthString: "SD4S XQ32 O2JA WXB3 FUX2 OPJ7 Q7JZ 4R6Z",
        EncryptFeature: true,
        ResetDataLogin: false,
        AutoInstallNode: false,
        AntiSendAppState: true,
        AutoRestartMinutes: 0,
        RestartMQTT_Minutes: 0,
        Websocket_Extension: {
            Status: false,
            ResetData: false,
            AppState_Path: "appstate.json"
        },
        HTML: {   
            HTML: false,
            UserName: "Guest",
            MusicLink: ""
        },
        AntiGetInfo: {
            Database_Type: "default",
            AntiGetThreadInfo: true,
            AntiGetUserInfo: true
        },
        Stable_Version: {
            Accept: false,
            Version: ""
        },
        CheckPointBypass: {
            956: {
                Allow: false,
                Difficult: "Easy",
                Notification: "Turn on with AutoLogin!"
            }
        },
        AntiStuckAndMemoryLeak: {
            AutoRestart: {
                Use: false,
                Explain: ""
            },
            LogFile: {
                Use: false,
                Explain: ""
            }
        },
        AntiBan: {
            Enabled: true,
            SpoofIP: true,
            RotateIPOnBlock: true,
            IgnoreIPBan: true,
            RandomizeUserAgent: true,
            MaxRetries: 4,
            BackoffMs: 1500
        }
    };

    let userConfig = Object.assign({}, defaultPriyanshConfig);
    const cfgPath = path.join(process.cwd(), "PriyanshFca.json");
    try {
        if (fs.existsSync(cfgPath)) {
            const loaded = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
            Object.assign(userConfig, loaded);
        }
    } catch (_) {}

    const selectedLang = (languageFile.find(i => i.Language === userConfig.Language) || languageFile[0] || {}).Folder || {};

    let securityModule = null;
    try {
        securityModule = require("./Extra/Src/uuid.js");
    } catch (_) {}

    global.Fca = {
        Author: "Gtajisan (Farhan Muh Tasim)",
        Developer: "frnAlt",
        Email: "sultana01537118@gmail.com",
        Repository: "https://github.com/frnAlt/fca",
        isThread: [],
        isUser: [],
        startTime: Date.now(),
        Setting: new Map(),
        Version: require("./package.json").version || "5.1.0",
        Require: {
            fs: fs,
            Fetch: null,
            log: npmlog,
            utils: utils,
            logger: logger,
            languageFile: languageFile,
            Language: selectedLang,
            Security: securityModule,
            Priyansh: userConfig
        },
        getText: function(...Data) {
            let Main = (Data.splice(0, 1)).toString();
            for (let i = 0; i < Data.length; i++) {
                Main = Main.replace(new RegExp(`%${i + 1}`, "g"), Data[i]);
            }
            return Main;
        },
        Data: {
            ObjPriyansh: defaultPriyanshConfig,
            CountTime: function() {
                return "0 Hours";
            }
        },
        Action: async function(actionName, ctx, type, defaultFuncs) {
            try {
                if (actionName === "Bypass") {
                    if (type === "956" || type === 956) {
                        const bypass956 = require("./Extra/Bypass/956");
                        if (bypass956 && typeof bypass956.Cook_And_Work === "function") {
                            return await bypass956.Cook_And_Work(ctx, defaultFuncs);
                        }
                    }
                } else if (actionName === "AutoLogin") {
                    if (global.FloppaBot && typeof global.FloppaBot.reLoginBot === "function") {
                        return global.FloppaBot.reLoginBot();
                    }
                }
            } catch (err) {
                if (global.Fca?.Require?.logger?.Warning) {
                    global.Fca.Require.logger.Warning(`[FLOPPA-FCA] Action '${actionName}' bypass failed: ${err.message}`);
                }
            }
        }
    };

    try {
        global.Fca.Require.Fetch = require("got");
    } catch (_) {}
}

const loginMain = require("./Main");

const DEFAULT_OPTIONS = {
    selfListen: false,
    selfListenEvent: false,
    listenEvents: true,
    listenTyping: false,
    simulateTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: false,
    autoMarkRead: false,
    autoReconnect: true,
    autoListen: false,
    autoReLogin: false,
    online: true,
    emitReady: false,
    preferMqttSend: true,
    antiBan: {
        enabled: true,
        spoofIP: true,
        rotateIPOnBlock: true,
        ignoreIPBan: true,
        randomizeUserAgent: true,
        maxRetries: 4,
        backoffMs: 1500
    },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.182 Safari/537.36"
};

/**
 * Initiates the login process for a Facebook account.
 * Supports both Callback and Promise styles.
 *
 * @param {object} credentials - User credentials ({ appState } or { email, password }).
 * @param {object|function} [options={}] - Options object or callback.
 * @param {function} [callback] - Callback (err, api).
 * @returns {Promise<object>|void}
 */
function login(credentials, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    const mergedOptions = Object.assign({}, DEFAULT_OPTIONS, options || {});

    let returnPromise = null;
    let resolveFunc = null;
    let rejectFunc = null;

    if (typeof callback !== "function") {
        returnPromise = new Promise(function(resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
        });
        callback = function(err, api) {
            if (err) return rejectFunc(err);
            resolveFunc(api);
        };
    }

    try {
        loginMain(credentials, mergedOptions, function(err, api) {
            if (err) return callback(err);
            return callback(null, api);
        });
    } catch (err) {
        callback(err);
    }

    return returnPromise;
}

/**
 * Promise-based login returning an FcaContext wrapper.
 */
async function loginAsync(credentials, options = {}) {
    return new Promise(function(resolve, reject) {
        login(credentials, options, function(err, api) {
            if (err) return reject(err);
            const userID = api.getCurrentUserID ? String(api.getCurrentUserID()) : (api.ctx && api.ctx.userID) || "";
            resolve({
                api,
                userID,
                cookieString: api.getAppState ? JSON.stringify(api.getAppState()) : "",
                ctx: api.ctx || {}
            });
        });
    });
}

/**
 * Legacy callback-based login wrapper.
 */
function loginLegacy(credentials, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    const p = loginAsync(credentials, options || {});
    if (typeof callback === "function") {
        p.then(ctx => callback(null, ctx)).catch(err => callback(err));
        return;
    }
    return p;
}

module.exports = login;
module.exports.login = login;
module.exports.default = login;
module.exports.loginAsync = loginAsync;
module.exports.loginLegacy = loginLegacy;
module.exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

// Utilities & GoatBot v2 Integration Helpers
try {
    const formatCookie = require("./src/utils/formatters/value/formatCookie");
    module.exports.formatCookie = formatCookie.formatCookie;
    module.exports.normalizeCookieHeaderString = formatCookie.normalizeCookieHeaderString;
    module.exports.setJarFromPairs = formatCookie.setJarFromPairs;
    module.exports.parseUniversalCookies = formatCookie.parseUniversalCookies;
} catch (_) {}

try {
    const antiSuspension = require("./src/utils/antiSuspension");
    module.exports.globalAntiSuspension = antiSuspension.globalAntiSuspension;
} catch (_) {}

// IP Spoofing, Ban Bypass & Anti-Rate-Limit Subsystem
try {
    const ipSpoofing = require("./src/utils/ipSpoofing");
    module.exports.ipSpoofing = ipSpoofing;
    module.exports.globalIpBanProtection = ipSpoofing.globalIpBanProtection;
    module.exports.generateResidentialIP = ipSpoofing.generateResidentialIP;
    module.exports.generateResidentialIPv6 = ipSpoofing.generateResidentialIPv6;
    module.exports.getSpoofedIpHeaders = ipSpoofing.getSpoofedIpHeaders;
    module.exports.isIpBannedOrRateLimited = ipSpoofing.isIpBannedOrRateLimited;
    module.exports.IpBanProtection = ipSpoofing.IpBanProtection;
} catch (_) {}

// Domain Architecture & MessengerBot Facades
try {
    const messengerBot = require("./src/app/MessengerBot");
    module.exports.MessengerBot = messengerBot.MessengerBot;
    module.exports.MessengerContext = messengerBot.MessengerContext;
    module.exports.createMessengerBot = messengerBot.createMessengerBot;

    const clientApp = require("./src/app/createFcaClient");
    module.exports.createFcaClient = clientApp.createFcaClient;
    module.exports.attachClientFacade = clientApp.attachClientFacade;
    module.exports.createMessagesDomain = clientApp.createMessagesDomain;
    module.exports.createThreadsDomain = clientApp.createThreadsDomain;
    module.exports.createUsersDomain = clientApp.createUsersDomain;
    module.exports.createAccountDomain = clientApp.createAccountDomain;
    module.exports.createRealtimeDomain = clientApp.createRealtimeDomain;
    module.exports.createHttpDomain = clientApp.createHttpDomain;
    module.exports.createSchedulerDomain = clientApp.createSchedulerDomain;
    module.exports.DomainsManager = clientApp.DomainsManager;
    module.exports.MessagesDomain = clientApp.MessagesDomain;
    module.exports.ThreadsDomain = clientApp.ThreadsDomain;
    module.exports.UsersDomain = clientApp.UsersDomain;
    module.exports.AccountDomain = clientApp.AccountDomain;
    module.exports.RealtimeDomain = clientApp.RealtimeDomain;
    module.exports.CapabilityResolver = clientApp.CapabilityResolver;
    module.exports.MqttRealtimeManager = clientApp.MqttRealtimeManager;
} catch (_) {}

try {
    const errHandler = require("./src/utils/ErrorHandler");
    module.exports.FCAError = errHandler.FCAError;
    module.exports.RetryHandler = errHandler.RetryHandler;
    module.exports.ErrorTracker = errHandler.ErrorTracker;
} catch (_) {}

// App Configuration
try {
    const appConfig = require("./src/app/config");
    module.exports.defaultConfig = appConfig.defaultConfig;
    module.exports.loadConfig = appConfig.loadConfig;
    module.exports.resolveConfig = appConfig.resolveConfig;
    module.exports.writeConfigTemplate = appConfig.writeConfigTemplate;
} catch (_) {}

// App Broadcast & Thread Sync & Update Check & State
try {
    const appBroadcast = require("./src/app/broadcast");
    module.exports.broadcast = appBroadcast.broadcast;
} catch (_) {}

try {
    const appThreadSync = require("./src/app/threadSync");
    module.exports.attachThreadInfoRealtimeSync = appThreadSync.attachThreadInfoRealtimeSync;
} catch (_) {}

try {
    const appUpdate = require("./src/app/updateCheck");
    module.exports.checkForPackageUpdate = appUpdate.checkForPackageUpdate;
    module.exports.runConfiguredUpdateCheck = appUpdate.runConfiguredUpdateCheck;
} catch (_) {}

try {
    const appState = require("./src/app/state");
    module.exports.createDefaultContext = appState.createDefaultContext;
    module.exports.createFcaState = appState.createFcaState;
    module.exports.createApiFacade = appState.createApiFacade;
    module.exports.createRequestHelper = appState.createRequestHelper;
} catch (_) {}

// Auth Helpers
try {
    const authHelpers = require("./src/utils/auth-helpers");
    module.exports.createAuthCore = authHelpers.createAuthCore;
} catch (_) {}

// Stability & Resilience Utilities
try {
    const { BotHealthMonitor } = require("./src/utils/BotHealthMonitor");
    module.exports.BotHealthMonitor = BotHealthMonitor;
} catch (_) {}

try {
    const { SessionStabilityManager } = require("./src/utils/SessionStabilityManager");
    module.exports.SessionStabilityManager = SessionStabilityManager;
} catch (_) {}

try {
    const { AdaptiveRateLimiter } = require("./src/utils/AdaptiveRateLimiter");
    module.exports.AdaptiveRateLimiter = AdaptiveRateLimiter;
} catch (_) {}

try {
    const { ResilienceManager } = require("./src/utils/ResilienceManager");
    module.exports.ResilienceManager = ResilienceManager;
} catch (_) {}

try {
    const { RequestValidator } = require("./src/utils/RequestValidator");
    module.exports.RequestValidator = RequestValidator;
} catch (_) {}

try {
    const { LifecycleManager } = require("./src/utils/LifecycleManager");
    module.exports.LifecycleManager = LifecycleManager;
} catch (_) {}

try {
    const { SessionRecoveryManager } = require("./src/utils/SessionRecoveryManager");
    module.exports.SessionRecoveryManager = SessionRecoveryManager;
} catch (_) {}

try {
    const { ConnectionPoolManager } = require("./src/utils/ConnectionPoolManager");
    module.exports.ConnectionPoolManager = ConnectionPoolManager;
} catch (_) {}

module.exports.getVersion = function getVersion() {
    return require("./package.json").version;
};

module.exports.author = "Gtajisan (Farhan Muh Tasim)";
module.exports.developer = "frnAlt";
module.exports.email = "sultana01537118@gmail.com";
module.exports.repository = "https://github.com/frnAlt/fca";
