const path = require("path");

// Ensure Vercel serverless environment flags
process.env.VERCEL = "1";
process.env.NO_SERVER_LISTEN = "1";

// Lightweight globals initialization for serverless execution
if (!global.GoatBot) {
	let config = {};
	let configCommands = {};
	try {
		config = require(path.join(process.cwd(), "config.json"));
	} catch (_) {
		config = {
			nickNameBot: "Floppa-Chatbot",
			prefix: "-",
			botOff: false,
			adminBot: ["100094924471568"],
			database: { type: "sqlite" },
			dashBoard: { port: 5000, expireVerifyCode: 300 }
		};
	}
	try {
		configCommands = require(path.join(process.cwd(), "configCommands.json"));
	} catch (_) {
		configCommands = { envEvents: { welcome: {}, leave: {} } };
	}
	global.GoatBot = {
		config,
		configCommands,
		commands: new Map()
	};
}

if (!global.utils) {
	try {
		global.utils = require(path.join(process.cwd(), "utils.js"));
	} catch (_) {
		global.utils = {
			getText: () => "",
			log: {
				info: console.log,
				warn: console.warn,
				err: console.error,
				error: console.error
			},
			convertTime: (ms) => `${Math.floor(ms / 1000)}s`,
			convertBytes: (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`,
			randomString: (len = 16) => Math.random().toString(36).substring(2, 2 + len)
		};
	}
}

if (!global.client) {
	global.client = {
		database: {
			creatingThreadData: [],
			creatingUserData: [],
			creatingDashBoardData: []
		}
	};
}

if (!global.db) {
	global.db = {
		allThreadData: [],
		allUserData: [],
		globalData: []
	};
}

let appInstance = null;
let initPromise = null;

async function getApp() {
	if (appInstance) return appInstance;
	if (!initPromise) {
		initPromise = (async () => {
			const dashboardInit = require(path.join(process.cwd(), "dashboard/app.js"));
			const app = await dashboardInit();
			appInstance = app;
			return appInstance;
		})();
	}
	return initPromise;
}

module.exports = async (req, res) => {
	try {
		const app = await getApp();
		return app(req, res);
	} catch (err) {
		console.error("Vercel Serverless Error:", err);
		res.status(500).json({
			status: "error",
			message: "Floppa-Chatbot Serverless Dashboard Error",
			details: err.message
		});
	}
};
