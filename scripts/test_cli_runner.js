/**
 * @author frnAlt / Gtajisan (Farhan Muh Tasim)
 * ! Floppa-Chatbot CLI Self-Test & Diagnostic Runner
 * ! Validates Core Engine, Native FCA, Commands, Fuzzy Suggestion, and Response Workflows
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(category, name, passed, detail = "") {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`\x1b[32m[PASS]\x1b[0m [${category}] ${name}${detail ? ` (${detail})` : ""}`);
  } else {
    results.failed++;
    console.error(`\x1b[31m[FAIL]\x1b[0m [${category}] ${name}${detail ? ` - ${detail}` : ""}`);
  }
  results.tests.push({ category, name, passed, detail });
}

async function runDiagnostics() {
  console.log("\x1b[36m============================================================\x1b[0m");
  console.log("\x1b[36m   Floppa-Chatbot Comprehensive CLI & Response Self-Test    \x1b[0m");
  console.log("\x1b[36m============================================================\x1b[0m\n");

  const cwd = process.cwd();

  // ──────────────── 1. Native FCA Module Verification ────────────────
  console.log("\x1b[33m--- 1. Native FCA Engine Verification ---\x1b[0m");
  try {
    const fca = require(path.join(cwd, "fca"));
    logTest("FCA", "Native FCA package loads successfully", typeof fca === "function" || typeof fca.login === "function");

    const fcaPkg = require(path.join(cwd, "fca/package.json"));
    logTest("FCA", `Package identity intact: ${fcaPkg.name}@${fcaPkg.version}`, fcaPkg.name === "@floppa/fca-native");

    const formatCookie = require(path.join(cwd, "fca/src/utils/formatters/value/formatCookie"));
    logTest("FCA", "formatCookie parser exports available", typeof formatCookie.parseUniversalCookies === "function");

    // Test Netscape / Cookie-Editor parsing
    const testNetscape = `# Netscape HTTP Cookie File\n#HttpOnly_.facebook.com\tTRUE\t/\tTRUE\t1899999999\tc_user\t1000888888\n.facebook.com\tTRUE\t/\tTRUE\t1899999999\txs\t42%3Asome_token\n`;
    const parsedCookies = formatCookie.parseUniversalCookies(testNetscape);
    const hasCUser = Array.isArray(parsedCookies) && parsedCookies.some(c => c.key === "c_user" && c.value === "1000888888");
    logTest("FCA", "Universal Cookie parser supports #HttpOnly_ Netscape cookies", hasCUser);
  } catch (err) {
    logTest("FCA", "Native FCA engine verification failed", false, err.message);
  }

  // ──────────────── 2. Core Files Syntax Verification ────────────────
  console.log("\n\x1b[33m--- 2. Core System Syntax Verification ---\x1b[0m");
  const coreFiles = [
    "index.js",
    "Floppa.js",
    "Goat.js",
    "utils.js",
    "bot/login/login.js",
    "bot/login/checkLiveCookie.js",
    "bot/handler/handlerAction.js",
    "bot/handler/handlerEvents.js",
    "dashboard/app.js",
    "dashboard/routes/api.js",
    "func/commandSuggest.js",
    "func/mdToText.js"
  ];

  for (const file of coreFiles) {
    try {
      execSync(`node --check "${file}"`, { stdio: "pipe" });
      logTest("SYNTAX", `Core syntax clean: ${file}`, true);
    } catch (e) {
      logTest("SYNTAX", `Core syntax error: ${file}`, false, e.message);
    }
  }

  // ──────────────── 3. Commands & Events Loading ────────────────
  console.log("\n\x1b[33m--- 3. Command & Event Script Load Validation ---\x1b[0m");
  const cmdsDir = path.join(cwd, "scripts/cmds");
  const cmdFiles = fs.readdirSync(cmdsDir).filter(f => f.endsWith(".js") && !f.endsWith(".eg.js"));

  let cmdsPassed = 0;
  for (const file of cmdFiles) {
    const filePath = path.join(cmdsDir, file);
    try {
      execSync(`node --check "${filePath}"`, { stdio: "pipe" });
      cmdsPassed++;
    } catch (e) {
      logTest("CMD_SYNTAX", `Command script error: ${file}`, false, e.message);
    }
  }
  logTest("CMD_SYNTAX", `All ${cmdsPassed}/${cmdFiles.length} commands passed syntax check`, cmdsPassed === cmdFiles.length);

  // ──────────────── 4. In-Memory Bot Response Workflow Self-Test ────────────────
  console.log("\n\x1b[33m--- 4. Messenger Bot Command & Response Workflow Self-Test ---\x1b[0m");

  // Setup mock global environment
  require(path.join(cwd, "func/moduleResolver.js"));

  const config = JSON.parse(fs.readFileSync(path.join(cwd, "config.json"), "utf8"));
  const configCommands = JSON.parse(fs.readFileSync(path.join(cwd, "configCommands.json"), "utf8"));

  global.FloppaBot = {
    startTime: Date.now(),
    commands: new Map(),
    eventCommands: new Map(),
    aliases: new Map(),
    onFirstChat: new Set(),
    onChat: [],
    onEvent: [],
    onReply: new Map(),
    onReaction: new Map(),
    config,
    configCommands,
    envCommands: configCommands.envCommands || {},
    envEvents: configCommands.envEvents || {},
    envGlobal: configCommands.envGlobal || {}
  };
  global.GoatBot = global.FloppaBot;

  const utils = require(path.join(cwd, "utils.js"));
  global.utils = utils;

  // Mock database models and controllers
  global.db = {
    allThreadData: [
      {
        threadID: "10001",
        threadName: "Test Group",
        adminIDs: ["9999"],
        members: [{ userID: "9999", inGroup: true }],
        data: { prefix: "!" },
        settings: {},
        banned: { status: false },
        isGroup: true
      }
    ],
    allUserData: [
      {
        userID: "9999",
        name: "Test Developer",
        money: 10000,
        exp: 100,
        banned: { status: false },
        data: {}
      }
    ],
    receivedTheFirstMessage: { "10001": true }
  };

  global.client = {
    dirConfig: path.join(cwd, "config.json"),
    dirConfigCommands: path.join(cwd, "configCommands.json"),
    dirAccount: path.join(cwd, "account.txt"),
    countDown: {},
    cache: {},
    database: {
      creatingThreadData: [],
      creatingUserData: []
    },
    commandBanned: {}
  };

  // Mock threadsData and usersData
  const mockThreadsData = {
    get: async (id) => global.db.allThreadData.find(t => t.threadID == id) || null,
    set: async (id, data) => data,
    create: async (id) => ({ threadID: String(id), threadName: "Created Thread", members: [], adminIDs: [], data: { prefix: "!" }, settings: {}, isGroup: true }),
    refreshInfo: async () => {}
  };

  const mockUsersData = {
    get: async (id) => global.db.allUserData.find(u => u.userID == id) || null,
    set: async (id, data) => data,
    create: async (id) => ({ userID: String(id), name: `User ${id}`, money: 0, exp: 0, data: {} }),
    subtractMoney: async (id, amt) => true
  };

  global.db.threadsData = mockThreadsData;
  global.db.usersData = mockUsersData;

  // Register essential commands for simulation
  const helpCmd = require(path.join(cwd, "scripts/cmds/help.js"));
  const prefixCmd = require(path.join(cwd, "scripts/cmds/prefix.js"));
  const pingCmd = require(path.join(cwd, "scripts/cmds/ping.js"));

  global.FloppaBot.commands.set("help", helpCmd);
  global.FloppaBot.commands.set("prefix", prefixCmd);
  global.FloppaBot.commands.set("ping", pingCmd);

  if (Array.isArray(helpCmd.config?.aliases)) {
    for (const alias of helpCmd.config.aliases) {
      global.FloppaBot.aliases.set(alias, "help");
    }
  }

  logTest("DISPATCHER", "Registered commands: help, prefix, ping", global.FloppaBot.commands.has("ping"));

  // Mock Messenger API & message replies collector
  let lastReply = null;
  const mockApi = {
    sendMessage: async (msg, threadID, callback, replyTo) => {
      lastReply = typeof msg === "string" ? { body: msg } : msg;
      if (typeof callback === "function") callback(null, { messageID: "mid.12345", threadID });
      return { messageID: "mid.12345", threadID };
    },
    setMessageReaction: async (emoji, messageID, callback) => {
      if (typeof callback === "function") callback(null);
    },
    getCurrentUserID: () => "8888"
  };

  const handlerEvents = require(path.join(cwd, "bot/handler/handlerEvents.js"))(
    mockApi,
    null,
    null,
    null,
    null,
    mockUsersData,
    mockThreadsData,
    {},
    { get: async () => ({}), set: async () => {} }
  );

  function createMockMessage(event) {
    return {
      reply: async (content) => {
        lastReply = typeof content === "string" ? { body: content } : content;
        return { messageID: "mid_reply_123", threadID: event.threadID };
      },
      send: async (content) => {
        lastReply = typeof content === "string" ? { body: content } : content;
        return { messageID: "mid_send_123", threadID: event.threadID };
      },
      reaction: async (emoji) => true
    };
  }

  // ──────────────── Test Case A: Fuzzy Suggestion with !gelp ────────────────
  try {
    lastReply = null;
    const gelpEvent = {
      type: "message",
      body: "!gelp",
      messageID: "msg_gelp_01",
      threadID: "10001",
      senderID: "9999",
      isGroup: true
    };
    const handlerChat = await handlerEvents(gelpEvent, createMockMessage(gelpEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const suggestedHelp = lastReply && (
      String(lastReply.body || lastReply).includes("help") ||
      String(lastReply.body || lastReply).includes("!help") ||
      String(lastReply.body || lastReply).toLowerCase().includes("try: !help")
    );
    logTest("WORKFLOW", "Command suggestion resolves '!gelp' -> '!help'", suggestedHelp, `Response: "${(lastReply?.body || lastReply || "").slice(0, 50)}"`);
  } catch (err) {
    logTest("WORKFLOW", "Command suggestion test '!gelp' failed", false, err.message);
  }

  // ──────────────── Test Case B: Command Execution with !help ────────────────
  try {
    lastReply = null;
    const helpEvent = {
      type: "message",
      body: "!help",
      messageID: "msg_help_01",
      threadID: "10001",
      senderID: "9999",
      isGroup: true
    };
    const handlerChat = await handlerEvents(helpEvent, createMockMessage(helpEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const helpSuccess = bodyText && (
      bodyText.includes("help") ||
      bodyText.includes("COMMAND") ||
      bodyText.includes("Page") ||
      bodyText.includes("FLOPPA")
    );
    logTest("WORKFLOW", "Command execution '!help' returns command menu", helpSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Command execution '!help' failed", false, err.message);
  }

  // ──────────────── Test Case C: Command Execution with !prefix ────────────────
  try {
    lastReply = null;
    const prefixEvent = {
      type: "message",
      body: "!prefix",
      messageID: "msg_pref_01",
      threadID: "10001",
      senderID: "9999",
      isGroup: true
    };
    const handlerChat = await handlerEvents(prefixEvent, createMockMessage(prefixEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const prefixSuccess = bodyText && bodyText.includes("prefix");
    logTest("WORKFLOW", "Command execution '!prefix' returns active prefix", prefixSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Command execution '!prefix' failed", false, err.message);
  }

  // ──────────────── Test Case D: Command Execution with !ping ────────────────
  try {
    lastReply = null;
    const pingEvent = {
      type: "message",
      body: "!ping",
      messageID: "msg_ping_01",
      threadID: "10001",
      senderID: "9999",
      isGroup: true
    };
    const handlerChat = await handlerEvents(pingEvent, createMockMessage(pingEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const pingSuccess = bodyText && (
      bodyText.includes("Pong") ||
      bodyText.includes("latency") ||
      bodyText.includes("🏓")
    );
    logTest("WORKFLOW", "Command execution '!ping' returns latency and pong", pingSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Command execution '!ping' failed", false, err.message);
  }

  // ──────────────── Test Case E: Direct Message (DM) Command Execution ────────────────
  try {
    lastReply = null;
    require(path.join(cwd, "func/cooldownManager.js")).clear();
    const dmPingEvent = {
      type: "message",
      body: "!ping",
      messageID: "msg_dm_ping_01",
      threadID: "9999",
      senderID: "9999",
      isGroup: false
    };
    const handlerChat = await handlerEvents(dmPingEvent, createMockMessage(dmPingEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const dmSuccess = bodyText && (
      bodyText.includes("Pong") ||
      bodyText.includes("latency") ||
      bodyText.includes("🏓")
    );
    logTest("WORKFLOW", "Direct Message (DM) command execution '!ping' delivers response", dmSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) command execution failed", false, err.message);
  }

  // ──────────────── Test Case F: Direct Message (DM) Interactive Greeting Helper ────────────────
  try {
    lastReply = null;
    const dmHelloEvent = {
      type: "message",
      body: "hello",
      messageID: "msg_dm_hello_01",
      threadID: "9999",
      senderID: "9999",
      isGroup: false
    };
    const handlerChat = await handlerEvents(dmHelloEvent, createMockMessage(dmHelloEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const dmGreetSuccess = bodyText && (
      bodyText.includes("Direct Messages") ||
      bodyText.includes("DM") ||
      bodyText.includes("Floppa")
    );
    logTest("WORKFLOW", "Direct Message (DM) casual greeting triggers onboarding assistant helper", dmGreetSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) greeting test failed", false, err.message);
  }

  // ──────────────── Test Case G: Direct Message (DM) Prefixless Command Execution ────────────────
  try {
    lastReply = null;
    require(path.join(cwd, "func/cooldownManager.js")).clear();
    const dmNoPrefixPingEvent = {
      type: "message",
      body: "ping",
      messageID: "msg_dm_noprefix_ping_01",
      threadID: "9999",
      senderID: "9999",
      isGroup: false
    };
    const handlerChat = await handlerEvents(dmNoPrefixPingEvent, createMockMessage(dmNoPrefixPingEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const dmNoPrefixSuccess = bodyText && (
      bodyText.includes("Pong") ||
      bodyText.includes("latency") ||
      bodyText.includes("🏓")
    );
    logTest("WORKFLOW", "Direct Message (DM) prefixless command execution 'ping' delivers response", dmNoPrefixSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) prefixless command execution failed", false, err.message);
  }

  // ──────────────── Summary ────────────────
  console.log("\n\x1b[36m============================================================\x1b[0m");
  console.log(`\x1b[36mDiagnostic Results: ${results.passed}/${results.total} Passed (${results.failed} Failed)\x1b[0m`);
  console.log("\x1b[36m============================================================\x1b[0m\n");

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDiagnostics().catch(err => {
  console.error("FATAL DIAGNOSTIC ERROR:", err);
  process.exit(1);
});
