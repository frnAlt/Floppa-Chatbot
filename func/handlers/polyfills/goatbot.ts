import InputProps from "input-cassidy";
import OutputProps, { OutputForm, OutputResult } from "output-cassidy";

export class ReflectiveMap<K extends string | number | symbol, V> {
  private data: Record<K, V>;
  constructor(obj: Record<K, V>) {
    if (obj === null || obj === undefined) {
      // @ts-ignore
      this.data = {};
    } else if (typeof obj !== "object") {
      throw new TypeError("Constructor argument must be an object");
    } else {
      this.data = obj;
    }
  }

  set(key: K, value: V) {
    this.data[key] = value;
    return this;
  }

  get(key: K) {
    return this.data[key];
  }

  has(key: K) {
    return key in this.data;
  }

  delete(key: K) {
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  clear() {
    for (let key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        delete this.data[key];
      }
    }
  }

  *[Symbol.iterator]() {
    for (let key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        yield [key, this.data[key]];
      }
    }
  }

  entries() {
    return this[Symbol.iterator]();
  }

  *keys() {
    for (let key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        yield key;
      }
    }
  }

  *values() {
    for (let key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        yield this.data[key];
      }
    }
  }

  forEach(callback: (val: V, key: K, thisArg: this) => any, thisArg: any) {
    for (let key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        callback.call(thisArg, this.data[key], key, this);
      }
    }
  }

  get size() {
    return Object.keys(this.data).length;
  }
}

export function convertToGoat(
  command: Record<string, any>
): CassidySpectra.CassidyCommand {
  const {
    config = {},
    onStart,
    onReply = () => {},
    onReaction = () => {},
    onChat,
    langs,
  } = command;
  const {
    name = "",
    aliases = [],
    version = "1.0.0",
    author = "",
    countDown = 5,
    role = 0,
    description,
    shortDescription,
    longDescription,
    category = "Goatbot",
    guide = {},
  } = config;
  const normLang = (i: Record<string, string> | string) => {
    if (typeof i === "string") {
      return i;
    }
    if (typeof i === "object" && i) {
      return String(i.en) ?? String(Object.values(i)[0]);
    }
    return undefined;
  };
  let desc = description || shortDescription || longDescription;
  let desc2 = normLang(desc);

  return {
    meta: {
      name,
      otherNames: aliases,
      description: desc2,
      category,
      version: String(version).split(".").length === 3 ? version : "1.0.0",
      author,
      waitingTime: countDown,
      role,
      usage: normLang(guide),
    },
    langs,
    ...(onChat
      ? {
          async event(ctx) {
            return onChat(await createCTX(ctx));
          },
        }
      : {}),
    async entry(ctx) {
      return onStart(await createCTX(ctx));
    },
    ...(onReply
      ? {
          reply: onReply,
        }
      : {}),
    ...(onReaction
      ? {
          reaction: onReaction,
        }
      : {}),
  };
}

export type GoatCTX = Awaited<ReturnType<typeof createCTX>>;
export type GoatMessage = MessageHandler;

export class MessageHandler {
  private output: OutputProps;
  private input: InputProps;

  constructor(output: OutputProps, input: InputProps) {
    this.output = output;
    this.input = input;
  }

  private async sendMessageError(err: any) {
    return this.output.error(err);
  }

  public send(
    form: OutputForm,
    callback: (err: any, info: OutputResult) => any | Promise<any>
  ) {
    return this.output.send(form, this.input.threadID, (info) =>
      callback(null, info)
    );
  }

  public reply(
    form: OutputForm,
    callback: (err: any, info: OutputResult) => any | Promise<any>
  ) {
    return this.output.reply(form, (info) => callback(null, info));
  }

  public unsend(
    messageID: string,
    callback: (err: any) => void | Promise<void>
  ) {
    return this.output.unsend(messageID).then(callback);
  }

  public async err(err: any) {
    return await this.sendMessageError(err);
  }

  public async error(err: any) {
    return await this.sendMessageError(err);
  }
}

export async function createCTX(ctx: CassidySpectra.CommandContext) {
  return {
    ...ctx,
    api: ctx.api,
    threadModel: ctx.threadsDB.kv,
    userModel: ctx.usersDB.kv,
    dashBoardModel: ctx.globalDB.kv,
    globalModel: ctx.globalDB.kv,
    threadsData: ctx.threadsDB,
    usersData: ctx.usersDB,
    dashBoardData: ctx.threadsDB,
    globalData: ctx.usersDB,
    getText: ctx.getLang,
    args: ctx.args,
    role: ctx.commandRole,
    commandName: ctx.commandName,
    getLang: ctx.getLang,
    message: new MessageHandler(ctx.output, ctx.input),
  };
}

export const GoatBot = {
  startTime: Date.now() - process.uptime() * 1000,
  get commands() {
    return new ReflectiveMap(global.Cassidy.commands);
  },
  get onReply() {
    return new ReflectiveMap(global.Cassidy.replies);
  },
  get config() {
    return global.Cassidy.config;
  },
};

global.GoatBot = GoatBot;

export const db = {
  // all data
  allThreadData: [],
  allUserData: [],
  allDashBoardData: [],
  allGlobalData: [],

  // model
  threadModel: null,
  userModel: null,
  dashboardModel: null,
  globalModel: null,

  // handle data
  threadsData: null,
  usersData: null,
  dashBoardData: null,
  globalData: null,

  receivedTheFirstMessage: {},
};

global.db = db;

export const client = {
  countDown: {},
  cache: {},
  database: {
    creatingThreadData: [],
    creatingUserData: [],
    creatingDashBoardData: [],
    creatingGlobalData: [],
  },
};

global.client = client;
