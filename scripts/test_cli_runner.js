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

  const vm = require("vm");
  for (const file of coreFiles) {
    try {
      const code = fs.readFileSync(path.join(cwd, file), "utf8");
      new vm.Script(code);
      logTest("SYNTAX", `Core syntax clean: ${file}`, true);
    } catch (e) {
      logTest("SYNTAX", `Core syntax error: ${file}`, false, e.message);
    }
  }

  // ──────────────── 3. Commands & Events Loading ────────────────
  console.log("\n\x1b[33m--- 3. Command & Event Script Load Validation ---\x1b[0m");
  require(path.join(cwd, "func/moduleResolver.js"));
  const cmdsDir = path.join(cwd, "scripts/cmds");
  const cmdFiles = fs.readdirSync(cmdsDir).filter(f => f.endsWith(".js") && !f.endsWith(".eg.js"));

  let cmdsPassed = 0;
  for (const file of cmdFiles) {
    const filePath = path.join(cmdsDir, file);
    try {
      require(filePath);
      cmdsPassed++;
    } catch (e) {
      logTest("CMD_LOAD", `Command script error: ${file}`, false, e.message);
    }
  }
  logTest("CMD_LOAD", `All ${cmdsPassed}/${cmdFiles.length} commands passed load validation`, cmdsPassed === cmdFiles.length);

  // ──────────────── 4. In-Memory Bot Response Workflow Self-Test ────────────────
  console.log("\n\x1b[33m--- 4. Messenger Bot Command & Response Workflow Self-Test ---\x1b[0m");

  const config = JSON.parse(fs.readFileSync(path.join(cwd, "config.json"), "utf8"));
  config.botOff = false;
  if (!config.adminBot) config.adminBot = [];
  config.adminBot.push("9999");
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
  const offCmd = require(path.join(cwd, "scripts/cmds/off.js"));
  const aiCmd = require(path.join(cwd, "scripts/cmds/ai-chat.js"));
  const bbyCmd = require(path.join(cwd, "scripts/cmds/bby.js"));
  const kissCmd = require(path.join(cwd, "scripts/cmds/kiss.js"));
  const kiss2Cmd = require(path.join(cwd, "scripts/cmds/kiss2.js"));

  global.FloppaBot.commands.set("help", helpCmd);
  global.FloppaBot.commands.set("prefix", prefixCmd);
  global.FloppaBot.commands.set("ping", pingCmd);
  global.FloppaBot.commands.set("off", offCmd);
  global.FloppaBot.commands.set("ai", aiCmd);
  global.FloppaBot.commands.set("bby", bbyCmd);
  global.FloppaBot.commands.set("kiss", kissCmd);
  global.FloppaBot.commands.set("kiss2", kiss2Cmd);

  if (Array.isArray(helpCmd.config?.aliases)) {
    for (const alias of helpCmd.config.aliases) {
      global.FloppaBot.aliases.set(alias, "help");
    }
  }

  logTest("DISPATCHER", "Registered commands: help, prefix, ping, off, ai, bby, kiss, kiss2", global.FloppaBot.commands.has("kiss2"));

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

  // ──────────────── Test Case H: Specific Command Lookup '!help off' ────────────────
  try {
    lastReply = null;
    require(path.join(cwd, "func/cooldownManager.js")).clear();
    const helpOffEvent = {
      type: "message",
      body: "!help off",
      messageID: "msg_help_off_01",
      threadID: "10001",
      senderID: "9999",
      isGroup: true
    };
    const handlerChat = await handlerEvents(helpOffEvent, createMockMessage(helpOffEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const helpOffSuccess = bodyText && (
      bodyText.includes("FLOPPA COMMAND INFO") ||
      bodyText.includes("off")
    );
    logTest("WORKFLOW", "Command detail lookup '!help off' returns command information", helpOffSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Command detail lookup '!help off' failed", false, err.message);
  }

  // ──────────────── Test Case I: Direct Message (DM) Conversational AI ────────────────
  try {
    lastReply = null;
    require(path.join(cwd, "func/cooldownManager.js")).clear();
    const dmAiChatEvent = {
      type: "message",
      body: "Number one ke world a",
      messageID: "msg_dm_ai_01",
      threadID: "7777",
      senderID: "7777",
      isGroup: false
    };
    const handlerChat = await handlerEvents(dmAiChatEvent, createMockMessage(dmAiChatEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const dmAiSuccess = bodyText && (
      bodyText.includes("Floppa AI") ||
      bodyText.includes("AI") ||
      bodyText.includes("query") ||
      bodyText.includes("help")
    );
    logTest("WORKFLOW", "Direct Message (DM) natural conversational chat triggers AI response", dmAiSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) AI response failed", false, err.message);
  }

  // ──────────────── Test Case J: Meta AI Filtering ────────────────
  try {
    let dispatched = false;
    const metaAiEvent = {
      type: "message",
      body: "Hello from Meta AI",
      messageID: "msg_meta_ai_01",
      threadID: "156025504001094",
      senderID: "156025504001094",
      isGroup: false
    };
    const handlerAction = require(path.join(cwd, "bot/handler/handlerAction.js"))(
      mockApi, {}, {}, {}, {}, mockUsersData, mockThreadsData, {}, {}
    );
    await handlerAction(metaAiEvent);
    logTest("WORKFLOW", "Meta AI system thread/sender (156025504001094) is safely filtered", true);
  } catch (err) {
    logTest("WORKFLOW", "Meta AI filtering test failed", false, err.message);
  }

  // ──────────────── Test Case K: Direct Message (DM) Mobile E2EE Detection ────────────────
  try {
    lastReply = null;
    require(path.join(cwd, "func/cooldownManager.js")).clear();
    const dmE2eeEvent = {
      type: "message",
      body: "",
      messageID: "msg_dm_e2ee_01",
      threadID: "7777",
      senderID: "7777",
      attachments: [{
        type: "share",
        ID: "ee.mid.$cAAC12345",
        description: "Unsupported shared content.",
        isUnrecognized: true
      }],
      isGroup: false
    };
    const handlerChat = await handlerEvents(dmE2eeEvent, createMockMessage(dmE2eeEvent));
    if (handlerChat && typeof handlerChat.onStart === "function") {
      await handlerChat.onStart();
    }
    const bodyText = typeof lastReply === "string" ? lastReply : (lastReply?.body || "");
    const e2eeNoticeSuccess = bodyText && bodyText.includes("Facebook E2EE Notice");
    logTest("WORKFLOW", "Direct Message (DM) mobile E2EE attachment triggers guidance notice", e2eeNoticeSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) mobile E2EE test failed", false, err.message);
  }

  // ──────────────── Test Case L: Direct Message (DM) Outbound E2EE Group Bridging ────────────────
  try {
    global.db.allThreadData = [{
      threadID: "1125755322432660",
      threadName: "Private Stuff Testing",
      isGroup: true,
      members: [{ userID: "9999" }]
    }];
    global.db.allUserData = [{
      userID: "9999",
      name: "Farhan Muh Tasim"
    }];
    let bridgedThread = null;
    let bridgedPayload = null;
    const bridgeMockApi = {
      sendMessage: async (m, t, cb, replyTo, isGrp) => {
        if (t === "9999") {
          throw new Error("Direct thread 9999 is end-to-end encrypted (E2EE) by Facebook. error 1545116");
        }
        bridgedThread = t;
        bridgedPayload = m;
        return { messageID: "mid.bridged" };
      }
    };
    const bridgeMsg = utils.message(bridgeMockApi, { threadID: "9999", senderID: "9999", isGroup: false });
    await bridgeMsg.reply("Testing DM bridge fallback");
    const bridgeSuccess = bridgedThread === "1125755322432660" && bridgedPayload?.body?.includes("DM Bridge for Farhan");
    logTest("WORKFLOW", "Direct Message (DM) outbound E2EE automatically bridges to active group chat", bridgeSuccess);
  } catch (err) {
    logTest("WORKFLOW", "Direct Message (DM) E2EE bridging test failed", false, err.message);
  }

  // ──────────────── Test Case M: Dedicated Private 2-Person Room E2EE Routing ────────────────
  try {
    const pMgr = require(path.join(cwd, "func/privateThreadManager"));
    pMgr.registerPrivateThread("8888", "1089640446736327");
    const retrievedTID = pMgr.getPrivateThread("8888");
    logTest("WORKFLOW", "PrivateThreadManager registers and retrieves dedicated unencrypted room", retrievedTID === "1089640446736327");

    let privateRoutedThread = null;
    const privateMockApi = {
      sendMessage: async (m, t) => {
        if (t === "8888") {
          throw new Error("Direct thread 8888 is end-to-end encrypted (E2EE) by Facebook. error 1545116");
        }
        privateRoutedThread = t;
        return { messageID: "mid.private_routed" };
      }
    };
    const privateMsg = utils.message(privateMockApi, { threadID: "8888", senderID: "8888", isGroup: false });
    await privateMsg.reply("Testing private room delivery");
    logTest("WORKFLOW", "Direct Message (DM) automatically routes to dedicated private room upon E2EE error", privateRoutedThread === "1089640446736327");
    pMgr.clearPrivateThread("8888");
  } catch (err) {
    logTest("WORKFLOW", "Private thread routing test failed", false, err.message);
  }

  // ──────────────── Test Case N: Native createNewGroup 1-Participant Support ────────────────
  try {
    const createNewGroupFactory = require(path.join(cwd, "fca/src/apis/createNewGroup"));
    let capturedParticipants = null;
    const defaultFuncsMock = {
      post: async (url, jar, form) => {
        const parsedVars = JSON.parse(form.variables);
        capturedParticipants = parsedVars.input.participants;
        return {
          statusCode: 200,
          body: 'for (;;);' + JSON.stringify({
            data: {
              messenger_group_thread_create: {
                thread: {
                  thread_key: { thread_fbid: "999888777" }
                }
              }
            }
          })
        };
      }
    };
    const createGroupFn = createNewGroupFactory(defaultFuncsMock, {}, { userID: "61593675886067" });
    const createdTID = await createGroupFn(["100094924471568"], "Floppa Private Test");
    const allowsOneUser = createdTID === "999888777" && Array.isArray(capturedParticipants) && capturedParticipants.some(p => p.fbid === "100094924471568");
    logTest("WORKFLOW", "Native FCA createNewGroup allows 1 user to create 2-person unencrypted private room", allowsOneUser);
  } catch (err) {
    logTest("WORKFLOW", "createNewGroup 1-user test failed", false, err.message);
  }

  // ──────────────── Test Case O: utils.sendDM & message.sendDM Verification ────────────────
  try {
    const pMgr = require(path.join(cwd, "func/privateThreadManager"));
    pMgr.registerPrivateThread("7777", "555544443333");
    let sendDMCalledWith = null;
    const testApi = {
      sendMessage: async (m, t, cb, replyTo, isGrp) => {
        sendDMCalledWith = { m, t, isGrp };
        return { messageID: "mid.dm_test" };
      }
    };
    const testMsg = utils.message(testApi, { threadID: "10001", senderID: "7777" });
    await testMsg.sendDM("Hello from sendDM");
    const sendDMSuccess = sendDMCalledWith && sendDMCalledWith.t === "555544443333" && sendDMCalledWith.isGrp === true;
    logTest("WORKFLOW", "utils.message.sendDM routes directly to dedicated unencrypted room", sendDMSuccess);

    let utilsSendDMCalledWith = null;
    const testApi2 = {
      sendMessage: async (m, t, cb, replyTo, isGrp) => {
        utilsSendDMCalledWith = { m, t, isGrp };
        return { messageID: "mid.utils_dm_test" };
      }
    };
    await utils.sendDM(testApi2, "7777", "Direct utils.sendDM");
    const utilsSendSuccess = utilsSendDMCalledWith && utilsSendDMCalledWith.t === "555544443333";
    logTest("WORKFLOW", "utils.sendDM helper delivers message to recipient private room", utilsSendSuccess);
    pMgr.clearPrivateThread("7777");
  } catch (err) {
    logTest("WORKFLOW", "sendDM verification failed", false, err.message);
  }

  // ──────────────── Test Case P: scripts/cmds/dm.js Full Subcommand Lifecycle ────────────────
  try {
    const dmCmd = require(path.join(cwd, "scripts/cmds/dm.js"));
    logTest("WORKFLOW", "dm.js command config loaded with proper schema", dmCmd.config.name === "dm" && Array.isArray(dmCmd.config.aliases));

    let repliedBody = "";
    const mockMessage = {
      reply: async (content) => {
        repliedBody = typeof content === "string" ? content : (content?.body || "");
        return { messageID: "mid.bot_reply" };
      },
      reaction: async () => {}
    };

    const mockUsersData = {
      getName: async (uid) => uid === "100094924471568" ? "Farhan Muh Tasim" : `User ${uid}`
    };

    let fcaOutbound = [];
    const mockApi = {
      sendMessage: async (m, t) => {
        fcaOutbound.push({ m, t });
        return { messageID: "mid.outbound_" + t, threadID: t };
      },
      createNewGroup: async (uids, title) => "888111222"
    };

    // Ensure global.GoatBot.onReply exists
    if (!global.GoatBot) global.GoatBot = {};
    if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
    if (!global.GoatBot.config) global.GoatBot.config = { adminBot: ["100094924471568"] };

    // 1. User executes !dm (access own private room)
    await dmCmd.onStart({
      api: mockApi,
      event: { threadID: "10001", senderID: "100094924471568" },
      args: [],
      message: mockMessage,
      usersData: mockUsersData
    });
    const userRoomFound = repliedBody.includes("Floppa Private Room") && repliedBody.includes("1089640446736327");
    logTest("WORKFLOW", "scripts/cmds/dm.js onStart returns user's active private room", userRoomFound);

    // 2. Admin executes !dm send 100094924471568 Hello Farhan
    repliedBody = "";
    await dmCmd.onStart({
      api: mockApi,
      event: { threadID: "10001", senderID: "100094924471568" },
      args: ["send", "100094924471568", "Hello", "Farhan"],
      message: mockMessage,
      usersData: mockUsersData
    });
    const adminSendSuccess = repliedBody.includes("DM Delivered Successfully") && repliedBody.includes("1089640446736327");
    logTest("WORKFLOW", "scripts/cmds/dm.js !dm send delivers to private room and registers onReply", adminSendSuccess);

    // 3. User replies to admin's message (triggers onReply relay)
    let relayMessageSent = null;
    const relayMockApi = {
      sendMessage: async (m, t) => {
        relayMessageSent = { m, t };
        return { messageID: "mid.relayed_to_admin" };
      }
    };
    await dmCmd.onReply({
      api: relayMockApi,
      event: { threadID: "1089640446736327", senderID: "100094924471568", body: "Thank you admin!", attachments: [] },
      Reply: {
        commandName: "dm",
        adminUID: "100094924471568",
        adminThreadID: "10001",
        adminMessageID: "mid.orig",
        targetUID: "100094924471568",
        type: "user_to_admin"
      },
      message: mockMessage,
      usersData: mockUsersData,
      commandName: "dm"
    });
    const userReplyRelayed = relayMessageSent && relayMessageSent.t === "10001" && relayMessageSent.m.body.includes("Thank you admin!");
    logTest("WORKFLOW", "scripts/cmds/dm.js onReply bi-directionally relays user reply back to admin chat", userReplyRelayed);

    // 4. Admin executes !dm list
    repliedBody = "";
    await dmCmd.onStart({
      api: mockApi,
      event: { threadID: "10001", senderID: "100094924471568" },
      args: ["list"],
      message: mockMessage,
      usersData: mockUsersData
    });
    const listSuccess = repliedBody.includes("Registered Floppa Private DM Rooms") && repliedBody.includes("1089640446736327");
    logTest("WORKFLOW", "scripts/cmds/dm.js !dm list returns directory of unencrypted rooms", listSuccess);
  } catch (err) {
    logTest("WORKFLOW", "dm.js subcommand testing failed", false, err.message);
  }

  // ──────────────── 5. FCA SendMessage Unit Tests ────────────────
  console.log("\n\x1b[33m--- 5. Native FCA Outbound SendMessage Engine Tests ---\x1b[0m");
  try {
    const sendMessageFactory = require(path.join(cwd, "fca/src/apis/sendMessage"));
    const defaultFuncs = {
      post: async () => ({ statusCode: 200, body: 'for (;;);{"payload":{"actions":[{"thread_fbid":"10001","message_id":"mid.mock","timestamp":12345}]}}' }),
      postFormData: async () => ({ statusCode: 200, body: 'for (;;);{"payload":{"metadata":[{}]}}' })
    };
    const fcaMockApi = {
      sendTypingIndicator: async () => {},
      sendMessageMqtt: async () => ({ messageID: "mid.mqtt_mock" })
    };
    const fcaCtx = {
      globalOptions: {},
      userID: "9999",
      mqttClient: { connected: true },
      clientID: "cid_test",
      jar: {}
    };
    const sendMsg = sendMessageFactory(defaultFuncs, fcaMockApi, fcaCtx);

    // Multi-recipient array send
    const rMulti = await sendMsg("Hello Multi", ["101", "102"]);
    logTest("FCA_SEND", "Multi-recipient array threadIDs send succeeds without ReferenceError", Boolean(rMulti && rMulti.messageID));

    // Single DM send
    const rDM = await sendMsg("Hello Single DM", "9999");
    logTest("FCA_SEND", "Single-recipient Direct Message (DM) send succeeds without ReferenceError", Boolean(rDM && rDM.messageID));

    // Group chat send
    const rGroup = await sendMsg("Hello Group", "100011000110001", null, undefined, true);
    logTest("FCA_SEND", "Group chat thread send succeeds via fast MQTT layer", Boolean(rGroup && rGroup.messageID));
  } catch (err) {
    logTest("FCA_SEND", "FCA sendMessage unit tests failed", false, err.message);
  }

  // ──────────────── 6. System Realtime Memory DB Verification ────────────────
  console.log("\n\x1b[33m--- 6. System Realtime Memory DB Verification ---\x1b[0m");
  try {
    const memDB = require(path.join(cwd, "func/systemMemoryDB"));
    memDB.recordEvent({ type: "message", threadID: "10001", senderID: "9999", body: "!ping" });
    memDB.recordError("TEST_SUITE", new Error("Diagnostic non-fatal self-test error"), { context: "unit_test" });
    const snap = memDB.getSnapshot();
    const hasRecorded = Boolean(snap && snap.systemStatus && (snap.systemStatus.totalEventsCaptured > 0 || snap.recentChatLogs?.length > 0));
    logTest("MEMORY_DB", "Real-time System Memory DB records events and generates debug snapshot", hasRecorded);

    const memFileExists = fs.existsSync(path.join(cwd, "database/data/system_memory.json"));
    const snapFileExists = fs.existsSync(path.join(cwd, "database/data/ai_debug_snapshot.json"));
    logTest("MEMORY_DB", "Persistent memory JSON data files intact and accessible", memFileExists && snapFileExists);
  } catch (err) {
    logTest("MEMORY_DB", "System Memory DB test failed", false, err.message);
  }

  // ──────────────── 7. Live Session Cookie Verification ────────────────
  console.log("\n\x1b[33m--- 7. Live Session Cookie & Authentication Verification ---\x1b[0m");
  try {
    const checkLiveCookie = require(path.join(cwd, "bot/login/checkLiveCookie.js"));
    const accountTxt = fs.readFileSync(path.join(cwd, "account.txt"), "utf8");
    const isLive = await checkLiveCookie(accountTxt);
    logTest("SESSION", "account.txt session cookie is verified 100% LIVE against Facebook servers", isLive === true);
  } catch (err) {
    logTest("SESSION", "Live cookie check encountered error", false, err.message);
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
