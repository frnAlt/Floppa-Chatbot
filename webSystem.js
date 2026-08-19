// @ts-check
import { creatorX } from "./handlers/page/webhook.js";
import { Datum } from "@cass-modules/Datum";

import { Readable } from "stream";
import { MultiMap } from "@cass-modules/Multimap";

/**
 * @type {MultiMap<string, WebSocket>}
 */
const wssUsers = new MultiMap();

const http = require("http");
const WebSocket = require("ws");
export class Listener {
  /**
   *
   * @param {{ app: import("express").Express; api: CommandContext["api"] }} param0
   */
  constructor({ api, app }) {
    this.api = api;
    this.app = app;

    this.callback = (...args) => {
      return args;
    };
    let setupFB = () => {
      let alive = true;
      if (typeof api?.listenMqtt === "function") {
        global.logger("Listener Setup Invoked", "FB");

        /**
         * @type {import("@xaviabot/fca-unofficial").IFCAU_API["listenMqtt"]}
         */
        const listenFunc = api.listenMqtt;
        const e = listenFunc?.((err, event) => {
          if (!alive) {
            return;
          }
          // @ts-ignore
          if (event) event.isFacebook = true;
          this.#callListener(err, event);
        });
        this.mqttF = e;
        try {
          let { mqttRestart } = global.Cassidy.config;
          if (!mqttRestart) {
            let d = {
              enabled: false,
              interval: 3600000,
              note: "",
            };
            mqttRestart ??= d;
            mqttRestart = Object.assign({}, d, mqttRestart);
          }
          if (mqttRestart.enabled) {
            setInterval(() => {
              global.logger("Stops listening...", "MQTT");
              e?.stopListening?.();
              alive = false;
              setupFB();
            }, mqttRestart.interval);
          }
        } catch (error) {
          console.error("Cant setup mqtt restart.");
        }
      }
    };
    setupFB();
    app.post("/listenMsg", (req, res) => {
      try {
        const event = req.body;
        this.#callListener(undefined, event);
        res.json(event);
      } catch (err) {
        res.send({
          error: err.message,
        });
      }
    });

    const httpServer = http.createServer(app);

    const wss = new WebSocket.Server({
      server: httpServer,
      path: "/ws",
    });
    global.logger("Server created.", "Websocket");
    this.httpServer = httpServer;
    this.wss = wss;
    app.get("/ws-url", (req, res) => {
      res.json({
        url: `wss://${req.headers.host}/ws`,
      });
    });
  }
  async startListen(
    callback = (...args) => {
      return args;
    }
  ) {
    this.callback = callback;
    try {
      handleWebSocket(this.wss, this.callback);
      // await createDiscordListener(this.callback);
      // await tphHandler(this.callback);
      const { handleEvents, handleGetEvents, pageApi } = creatorX(
        this.callback
      );
      this.app.post("/webhook", handleEvents);
      this.app.get("/webhook", handleGetEvents);
      this.pageApi = pageApi;
    } catch (error) {
      console.log(error);
    }
  }
  async #callListener(err, data, willEvent) {
    try {
      this.callback(err, willEvent ? new Event(data) : data);
    } catch (error) {
      console.log(error);
    }
  }
  _call = this.#callListener;
}
import axios from "axios";
export const pref = "w@";
export async function postEvent(event) {
  try {
    const response = await axios.post("http://localhost:8000/listenMsg", event);
    return response.data;
  } catch (err) {
    throw err;
  }
}

export const formatIP = Datum.encodeGameID;

export function formatIP_OOPS(ip) {
  try {
    ip = ip?.replaceAll("custom_", "");
    if (ip.startsWith(pref)) {
      return ip;
    }
    const formattedIP = ip
      .split("")
      .map((char) => {
        const ascii = char.charCodeAt(0);
        return `${ascii % 10}${ascii % 5 === 0 ? ":" : "-"}`;
      })
      .join("");

    return `${pref}${formattedIP}`;
  } catch (error) {
    console.error("Error in formatting IP:", error);
    return ip;
  }
}

export function formatIPLegacy(ip) {
  try {
    const encodedIP = Buffer.from(ip)
      .toString("base64")
      .replace(/[+/=]/g, (match) => ({ "+": "0", "/": "1", "=": "" }[match]));
    return `${pref}${encodedIP}`;
  } catch (error) {
    return ip;
  }
}
export function generateWssMessageID() {
  const ID =
    "wss-mid_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  return ID;
}

export function formatWssEvent(event) {
  let { WEB_PASSWORD } = global.Cassidy.config;
  if (process.env.WEB_PASSWORD) {
    WEB_PASSWORD = process.env.WEB_PASSWORD;
  }
  return {
    ...event,
    isFacebook: false,
    body: String(event.body || ""),
    senderID: event.senderID
      ? formatIP(`${event.senderID}`)
      : event.password === WEB_PASSWORD
      ? "wss:admin"
      : "wss:main",
    threadID: "wss:main",
    type: event.type,
    timestamp: event.timestamp || Date.now().toString(),
    attachments: [],
    messageID: event.messageID || generateWssMessageID(),
    isWss: true,
    isGroup: true,
    messageReply: event.messageReply
      ? {
          ...(event.messageReply || null),
          senderID: event.messageReply?.senderID
            ? formatIP(`${event.messageReply.senderID}`)
            : event.password === WEB_PASSWORD
            ? "wss:admin"
            : "wss:main",
        }
      : null,
    ...(event.type === "message_reaction"
      ? {
          userID: event.userID
            ? formatIP(`${event.userID}`)
            : event.password === WEB_PASSWORD
            ? "wss:admin"
            : "wss:main",

          senderID: event.senderID ? formatIP(`${event.senderID}`) : "wss:bot",
        }
      : {}),
    originalEvent: event,
  };
}
export class Event {
  constructor({ ...info } = {}) {
    let defaults = {
      body: "",
      senderID: "0",
      threadID: "0",
      messageID: "0",
      type: "message",
      timestamp: Date.now().toString(),
      isGroup: false,
      participantIDs: [],
      attachments: [],
      mentions: {},
      isWeb: true,
    };
    this.body = defaults.body;
    this.senderID = defaults.senderID;
    this.threadID = defaults.threadID;
    this.messageID = defaults.messageID;
    this.type = defaults.type;
    this.timestamp = defaults.timestamp;
    this.isGroup = defaults.isGroup;
    this.isWeb = defaults.isWeb;
    this.participantIDs = defaults.participantIDs;
    this.attachments = defaults.attachments;
    this.mentions = defaults.mentions;
    /**
     * @type {any}
     */
    this.messageReply = null;
    Object.assign(this, defaults, info);
    if (this.userID && this.isWeb) {
      this.userID = formatIP(this.senderID);
    }
    this.senderID = formatIP(this.senderID);
    this.threadID = formatIP(this.threadID);
    if (this.messageReply) {
      this.messageReply.senderID = formatIP(this.messageReply.senderID);
    }
    if (Array.isArray(this.participantIDs)) {
      this.participantIDs = this.participantIDs.map((id) => formatIP(id));
    }

    this.isFacebook = false;

    if (Object.keys(this.mentions ?? {}).length > 0) {
      this.mentions = Object.fromEntries(
        Object.entries(this.mentions).map((i) => [formatIP(i[0]), i[1]])
      );
    }
  }
}
import fs from "fs";
import fetchMeta from "./CommandFiles/modules/fetchMeta.js";
export function genericPage(...replacer) {
  return pageParse("public/generic.html", ...replacer);
}
export function pageParse(filepath, ...replacer) {
  let content = fs.readFileSync(filepath, "utf-8");

  replacer.forEach((replacerItem) => {
    if (typeof replacerItem !== "object" || replacerItem === null) {
      return;
    }

    for (const key in replacerItem) {
      const data = replacerItem[key];
      const regex = new RegExp(`\\{\\{ ${key} \\}\\}`, "g");

      if (data?.startsWith("fs:")) {
        try {
          content = content.replace(regex, () =>
            fs.readFileSync(data.slice(3), "utf-8")
          );
        } catch (error) {
          content = content.replace(regex, "Error loading file");
        }
      } else {
        content = content.replace(regex, data);
      }
    }
  });

  replacer.forEach((value, index) => {
    if (typeof value !== "string") {
      return;
    }
    const placeholder = new RegExp(`\\$${index + 1}(?![0-9])`, "g");
    content = content.replace(placeholder, value);
  });

  return content;
}
export async function aiPage(prompt) {
  const whatToDo = `Create a full effort, very satisfying, decent, and a very long HTML page with complete css, use the json below as guide, make sure to make it dark theme and add gradient texts, send it as HTML without comments.
  
  ${prompt}`;
  try {
    const {
      data: { message },
    } = await axios.get(
      "https://lianeapi.onrender.com/ask/gpt?query=" +
        encodeURIComponent(whatToDo)
    );
    fs.writeFileSync(`public/aiResults/ai${Date.now()}.html`, message);
    return message;
  } catch (error) {
    return prompt;
  }
}

export async function takeScreenshot(id, url, facebook) {
  try {
    if (facebook) {
      id = formatIP("custom_" + id);
    }
    const encodedId = encodeURIComponent(id);
    const response = await axios.get("https://api.screenshotone.com/take", {
      params: {
        access_key: "nbBijYDFzYIzSw",
        url: `https://${url}/underpic.html?id=${encodedId}`,
        full_page: false,
        viewport_width: 500,
        viewport_height: 250,
        device_scale_factor: 1,
        format: "png",
        image_quality: 100,
        omit_background: true,
        block_ads: true,
        block_cookie_banners: true,
        block_banners_by_heuristics: false,
        block_trackers: true,
        delay: 1,
        timeout: 60,
        wait_until: "domcontentloaded",
        time_zone: "Asia/Shanghai",
      },
      responseType: "arraybuffer",
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export const streamToBase64 = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    stream.on("error", reject);
  });
};

export const base64ToStream = (base64Str) => {
  const buffer = Buffer.from(base64Str, "base64");
  return Readable.from(buffer);
};

export class WssAPI {
  constructor(socket) {
    this._socket = socket;
    this._queue = [];
  }
  async sendMessage(message, _, ...args) {
    let body;
    if (typeof message === "string") {
      body = {
        body: message,
      };
    } else if (typeof message === "object") {
      body = {
        ...message,
        body: String(message.body || ""),
      };
    }
    let messageReply = null;
    let argg =
      typeof args[0] === "string"
        ? args[0]
        : typeof args[1] === "string"
        ? args[1]
        : null;
    if (typeof argg === "string") {
      messageReply = {
        messageID: argg,
        senderID: "wss:main",
      };
    }
    let resAt = null;
    if (!Array.isArray(message.attachment) && message.attachment) {
      message.attachment = [message.attachment];
    }
    try {
      if (Array.isArray(message.attachment)) {
        resAt = await Promise.all(
          [...message.attachment]
            .filter((i) => i !== null && i !== undefined)
            .map(async (item) => {
              if (item && typeof item.on === "function") {
                return await streamToBase64(item);
              }
              if (typeof item === "string") {
                if (/^[A-Za-z0-9+/=]+$/.test(item) && item.length % 4 === 0) {
                  try {
                    Buffer.from(item, "base64").toString("base64");
                    return item;
                  } catch (e) {}
                }
                return Buffer.from(item).toString("base64");
              }
              return null;
            })
            .filter(Boolean)
        );
      }
    } catch (error) {
      console.error(error);
    }
    let attachmentType;
    try {
      const { fileTypeFromBuffer } = await global.fileTypePromise;
      attachmentType = await Promise.all(
        (resAt ?? []).map(async (i) => {
          const buffer = Buffer.from(i, "base64");
          // @ts-ignore
          const type = await fileTypeFromBuffer(buffer);
          return type?.mime;
        })
      );
    } catch (error) {
      console.error(error);
    }
    const self = this;
    return new Promise((resolve) => {
      self._queue.push({
        resolve(data) {
          const callback =
            typeof args[0] === "function"
              ? args[0]
              : typeof args[1] === "function"
              ? args[1]
              : () => {};
          callback(null, data);
          resolve(data);
        },
      });
      handleMessage(
        self._socket,
        {
          body: body.body,
          botSend: true,
          messageReply,
          ...(resAt
            ? {
                attachment: resAt,
                attachmentType,
              }
            : {}),
          timestamp: Date.now().toString(),
        },
        null,
        self
      );
    });
  }
  async editMessage(str, messageID, callback) {
    console.log(`Editing ${messageID} with: ${str}`);
    handleEditMessage(this._socket, { body: str, messageID });
    if (callback) {
      callback(true, true);
    }
  }
  getCurrentUserID() {
    return "wss:bot";
  }
}

/**
 *
 * @param {string} userID
 * @param {WebSocket & { panelID: string; _xPassword: string }} socket
 */
export async function recordUser(userID = "wss:user", socket) {
  if (typeof userID !== "string" || !userID) {
    return console.error(`malformed: ${userID}`);
  }

  wssUsers.addOne(userID, socket);
  socket.panelID = userID;

  console.log(`New USER: ${userID}`);
  const meta = await fetchMeta(userID);
  if (!global.handleStat) socket.close();
  const data = await global.handleStat.getCache(formatIP(userID));

  sendAllWS({
    body: `✅ ${
      data.name ?? meta.name ?? "Unregistered person"
    } joined the chat.`,
    botSend: true,
  });
}

/**
 * Deletes a user from wssUsers, ensuring proper cleanup.
 *
 * @param {WebSocket & { panelID: string }} socket
 */
export async function deleteUser(socket) {
  const userID = socket.panelID;
  if (typeof userID !== "string" || !userID) {
    return console.error(`Malformed userID: ${userID}`);
  }

  if (wssUsers.has(userID)) {
    if (socket && typeof socket.close === "function") {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
        console.log(`Closed WebSocket for user: ${userID}`);
      } else {
        console.log(`WebSocket already closed for user: ${userID}`);
      }
    }
    if (!global.handleStat) return;
    const data = await global.handleStat.getCache(formatIP(userID));
    const meta = await fetchMeta(userID);

    wssUsers.deleteRefVal(socket);
    sendAllWS({
      body: `❌ ${
        data.name ?? meta.name ?? "Unregistered person"
      } left the chat.`,
      botSend: true,
    });
    console.log(`Deleted USER: ${userID}`);
  } else {
    console.log(`User not found: ${userID}`);
  }
}

export function sendAllWS(data) {
  let { body, messageReply, botSend, ...etc } = data;
  for (const [userID, socket] of wssUsers) {
    socket.send(
      JSON.stringify({
        ...etc,
        type: messageReply ? "message_reply" : "message",
        body: String(body),
        isYou: data.senderID === userID,
        botSend: !!botSend,
      })
    );
  }
}
export function doAllWS(data) {
  for (const [, socket] of wssUsers) {
    socket.send(data);
  }
}

/**
 *
 * @param {WebSocket.Server} ws
 */
export function handleWebSocket(ws, funcListen) {
  ws.on(
    "connection",
    (
      /**
       * @type {WebSocket & { panelID: string; _xPassword: string }}
       */ socket
    ) => {
      const api = new WssAPI(socket);
      globalThis.wssAPI = api;

      socket.on("message", (i) => {
        const data = JSON.parse(i.toString());
        if (socket._xPassword) {
          data.password = socket._xPassword;
        }
        function listenCall({ ...props } = {}) {
          const payload = { ...formatWssEvent({ ...data, ...props }) };
          funcListen(null, payload, { wssApi: api });
        }
        if (data.botSend) {
          return;
        }
        if (socket.panelID) {
          data.senderID ??= socket.panelID;
        }

        switch (data.type) {
          case "login":
            let { WEB_PASSWORD } = global.Cassidy.config;
            if (process.env.WEB_PASSWORD) {
              WEB_PASSWORD = process.env.WEB_PASSWORD;
            }
            if (data.password !== WEB_PASSWORD) {
              socket.send(
                JSON.stringify({
                  type: "login_failure",
                })
              );
            } else {
              socket._xPassword = data.password;
            }
            recordUser(data.panelID, socket);
            break;
          case "message":
            handleMessage(socket, data, listenCall, api);
            break;
          case "message_reply":
            handleMessage(socket, data, listenCall, api);
            break;
          case "message_reaction":
            handleReaction(socket, data, listenCall);
        }
      });
      socket.on("close", () => {
        deleteUser(socket);
      });
    }
  );
}

/**
 *
 * @param {WebSocket} _socket
 */
export function handleReaction(
  _socket,
  { messageID, reaction, userID },
  listenCall
) {
  const payload = formatWssEvent({
    type: "message_reaction",
    messageID,
    reaction,
    userID,
  });
  listenCall(payload);
}

/**
 *
 * @param {WebSocket} socket
 */
export function handleEditMessage(socket, { body, messageID }) {
  if (socket) {
    doAllWS(
      JSON.stringify({
        type: "message_edit",
        body: String(body),
        messageID,
      })
    );
  }
}

/**
 *
 * @param {WebSocket} socket
 */
export function handleMessage(socket, data, listenCall, api) {
  let { botSend } = data;
  const messageID = generateWssMessageID();
  listenCall ??= function () {};
  if (socket) {
    // console.log(`Sending data with messageID: ${messageID}`);

    sendAllWS({ ...data, messageID });
  }
  if (botSend && api._queue.length > 0) {
    const { resolve } = api._queue.shift();
    if (resolve) {
      resolve(formatWssEvent({ ...data, messageID }));
      // console.log(`Resolved data with messageID: ${messageID}`);
    }
    return;
  }

  listenCall();
}
