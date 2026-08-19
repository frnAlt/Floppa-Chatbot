const Bot = require("./chatbot");
const { extractFormBody } = require("fca-liane-utils");
export class TPHApi {
  constructor(event, bot) {
    this.event = event;
    this.bot = bot;
  }
  async sendMessage(form, _, callback) {
    const { body } = extractFormBody(form);
    await this.bot.sendMessage(body);
    if (callback) {
      callback(null, {
        body,
        timestamp: Date.now(),
        threadID: _,
        messageID: `tph:0`,
      });
    }
  }
  getUserInfo(ids) {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    let result = {};
    for (const id of ids) {
      result[id] = {
        name: String(id).replaceAll("tph:", ""),
        gender: 1,
        isFriend: false,
        isBirthday: false,
        vanity: "",
      };
    }
    return result;
  }
}

export async function tphHandler(funcListen) {
  global.logger("Handling TPH Bot...", "TPH");
  const bot = new Bot();
  bot.init("Cassidy 𝗕𝗢𝗧");
  bot.listen((event) => {
    const newEvent = convertEvent(event);
    funcListen(null, newEvent, { tphApi: new TPHApi(newEvent, bot) });
  });
}

function convertEvent(event) {
  return {
    body: event.body,
    senderID: `tph:${event.sender}`,
    threadID: `tph:${event.sender}`,
    type: "message",
    timestamp: Date.now(),
    attachments: [],
    messageID: `tph:0`,
    isTph: true,
    isGroup: true,
    messageReply: null,
  };
}
