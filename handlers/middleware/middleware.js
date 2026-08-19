// @ts-check
/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
  DO NOT MODIFY.
*/
import fs from "fs";
import UserStatsManager, { init } from "../../handlers/database/handleStat";
import { SymLock } from "../loaders/loadCommand.js";
import { join } from "path";
import { InputRoles } from "@cass-modules/InputClass";
import { extractCommandRole } from "@cassidy/unispectra";
import { FontSystem } from "cassidy-styler";
const recentCMD = {};
const popularCMD = {};
export let queue = [];

/**
 * @type {UserStatsManager}
 */
let handleStat;
/**
 * @type {UserStatsManager}
 */
let threadsDB;
/**
 * @type {UserStatsManager}
 */
let globalDB;

global.loadSymbols ??= new Map();

// @ts-ignore
const { loadSymbols } = global;

const { CassidyResponseStylerControl } = global.utils.StylerGlobal;

const awaitStack = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return [];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  },
);
function setAwaitStack(id, key) {
  awaitStack[id] = [...awaitStack[id], key];
}
function hasAwaitStack(id, key) {
  return awaitStack[id].includes(key);
}
function delAwaitStack(id, key) {
  awaitStack[id] = awaitStack[id].filter((v) => v !== key);
}

// OG Plugin Sorting
// @ts-ignore
function sortPluginLegacy(allPlugins) {
  queue.length = 0;
  for (const pluginName in allPlugins) {
    const plugin = allPlugins[pluginName];
    const { meta } = plugin;
    meta.order = meta.order || 5;
    if (!queue[meta.order]) {
      queue[meta.order] = [];
    }
    queue[meta.order].push(plugin);
  }
  return queue;
}

// [new] Spectra Plugin Sorting
// @ts-ignore
function sortPluginKindaOld(allPlugins) {
  queue.length = 0;
  const sortedPlugins = [];

  for (const pluginName in allPlugins) {
    const plugin = allPlugins[pluginName];
    plugin.meta.order = plugin.meta.order ?? 5;
    sortedPlugins.push(plugin);
  }

  sortedPlugins.sort((a, b) => a.meta.order - b.meta.order);

  for (const plugin of sortedPlugins) {
    if (
      queue.length === 0 ||
      queue[queue.length - 1][0].meta.order !== plugin.meta.order
    ) {
      queue.push([]);
    }
    queue[queue.length - 1].push(plugin);
  }

  return queue;
}

// [newest] Spectra Plugin Sorting
const { dirname } = require("path");

export function sortPlugin(allPlugins) {
  const savePath = join(process.cwd(), "CommandFiles", "plugin-order.json");
  queue.length = 0;
  const pluginMap = new Map();
  const processed = new Set();
  const visiting = new Set();
  const circularDependencies = new Set();
  const jsonData = {
    orders: [],
  };

  const logDir = dirname(savePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  for (const pluginName in allPlugins) {
    const plugin = allPlugins[pluginName];
    plugin.meta = plugin.meta || {};
    plugin.meta.name = plugin.meta.name || pluginName;
    plugin.meta.order = plugin.meta.order ?? 0;
    plugin.meta.before = plugin.meta.before || [];
    plugin.meta.after = plugin.meta.after || [];
    plugin.meta.orderLast = plugin.meta.orderLast ?? 0;
    pluginMap.set(plugin.meta.name, plugin);
  }

  function calculateOrder(pluginName, depth = 0) {
    const plugin = pluginMap.get(pluginName);
    if (!plugin || processed.has(pluginName)) return true;
    if (visiting.has(pluginName)) {
      circularDependencies.add(pluginName);
      queue.push([plugin]);
      return false;
    }

    visiting.add(pluginName);

    for (const afterName of plugin.meta.after) {
      if (pluginMap.has(afterName) && !processed.has(afterName)) {
        if (!calculateOrder(afterName, depth + 1)) {
          visiting.delete(pluginName);
          return false;
        }
      }
    }

    for (const beforeName of plugin.meta.before) {
      if (pluginMap.has(beforeName) && !processed.has(beforeName)) {
        if (!calculateOrder(beforeName, depth + 1)) {
          visiting.delete(pluginName);
          return false;
        }
      }
    }

    visiting.delete(pluginName);
    processed.add(pluginName);
    queue.push([plugin]);
    return true;
  }

  for (const pluginName of pluginMap.keys()) {
    if (!processed.has(pluginName)) {
      calculateOrder(pluginName);
    }
  }

  queue.sort((groupA, groupB) => {
    const orderA = groupA[0].meta.order + groupA[0].meta.orderLast / 1000;
    const orderB = groupB[0].meta.order + groupB[0].meta.orderLast / 1000;
    return orderA - orderB;
  });

  let currentGroup = [];
  const finalGroups = [];
  const flatPlugins = queue.flat();
  flatPlugins.forEach((plugin, index) => {
    const prevPlugin = index > 0 ? flatPlugins[index - 1] : null;
    const effectiveOrder = plugin.meta.order + plugin.meta.orderLast / 1000;

    if (
      currentGroup.length === 0 ||
      (prevPlugin &&
        Math.floor(prevPlugin.meta.order + prevPlugin.meta.orderLast / 1000) !==
          Math.floor(effectiveOrder))
    ) {
      if (currentGroup.length > 0) {
        finalGroups.push(currentGroup);
      }
      currentGroup = [];
    }
    currentGroup.push(plugin);
  });

  if (currentGroup.length > 0) {
    finalGroups.push(currentGroup);
  }

  queue.flat().forEach((plugin) => {
    jsonData.orders.push({
      name: plugin.meta.name,
      status: circularDependencies.has(plugin.meta.name)
        ? "circular"
        : "processed",
      isCircular: circularDependencies.has(plugin.meta.name),
      computedOrder: plugin.meta.order + plugin.meta.orderLast / 1000,
      originalOrder: plugin.meta.order,
      before: [...plugin.meta.before],
      after: [...plugin.meta.after],
      orderLast: plugin.meta.orderLast,
    });
  });

  try {
    fs.writeFileSync(savePath, JSON.stringify(jsonData, null, 2));
    console.log(`Plugin load order log written to ${savePath}`);
  } catch (err) {
    console.error(`Failed to write log file: ${err}`);
  }

  return finalGroups;
}
export async function middleware({ allPlugins }) {
  handleStat = init({
    collection: process.env.collection ?? "reduxcassstats",
    filepath: "handlers/database/userStat.json",
  });
  threadsDB = init({
    collection: "spectrathreads",
    filepath: "handlers/database/threadsDB.json",
  });
  globalDB = init({
    collection: "spectraglobals",
    filepath: "handlers/database/globalDB.json",
  });
  global.handleStat = handleStat;
  await handleStat.connect();
  await threadsDB.connect();
  await globalDB.connect();
  // console.log({
  //   usersDB: handleStat,
  //   threadsDB,
  //   globalDB,
  // });
  logger("Database Initialized!", "DATABASE");
  sortPlugin(allPlugins);
  global.Cassidy.databases = {
    usersDB: handleStat,
    threadsDB,
    globalDB,
  };
  logger("Loading/saving all cache...", "DATABASE");
  await handleStat.getAllCache();
  await threadsDB.getAllCache();
  await globalDB.getAllCache();
  logger("All cache loaded!", "DATABASE");

  return handleMiddleWare;
}

const deSYMC = function (axx) {
  if (
    !axx[
      ("t" + "e" + "l" + "k" + "o" + "o" + "h")
        [
          // @ts-ignore
          "split" + []
          // @ts-ignore
        ]([] + [] + [] + [] + [] + [] + [] + [])
        ["reverse" + []]()
        [
          // @ts-ignore
          "join" + []
          // @ts-ignore
        ]([] + [] + [] + [] + [] + [])
    ]
  )
    return undefined;
  return []["constructor" + [] + [] + [] + [] + [] + [] + [] + [] + [] + []]
    ["constructor" + [] + [] + [] + [] + [] + [] + [] + [] + [] + []](
      "loaf" + [] + [] + [] + [] + [] + [] + [] + [] + [],
      (")()]'t'+'e'+'l'+'k'+'o'+'o'+'h'[faol>=)(cnysa( nruter" +
        [] +
        [] +
        [] +
        [] +
        [] +
        [] +
        [] +
        [] +
        [] +
        [])
        [
          // @ts-ignore
          "split" + []
          // @ts-ignore
        ]([] + [] + [] + [] + [] + [] + [] + [])
        ["reverse" + []]()
        [
          // @ts-ignore
          "join" + []
          // @ts-ignore
        ]([] + [] + [] + [] + [] + []),
    )(axx)
    .then((xha) =>
      []["constructor" + [] + [] + [] + [] + [] + [] + [] + []]
        ["constructor" + [] + [] + [] + [] + [] + [] + [] + []](
          "return Array" + [] + [] + [] + [] + [],
        )()
        ["from" + [] + [] + [] + [] + []](
          SymLock["values" + [] + [] + [] + [] + []](),
        )
        ["find" + [] + [] + [] + [] + []]((i) => {
          try {
            return (
              typeof xha(i) ===
                "function" + [] + [] + [] + [] + [] + [] + [] + [] ||
              typeof xha(i) === "object" + [] + [] + [] + [] + [] + [] + [] + []
            );
          } catch (error) {
            console.error(error);
          }
        }),
    )
    .catch((i) => console["error"](i));
};

// @ts-ignore
const { censor } = require("fca-liane-utils");

/**
 * Recursively replaces UID strings with links in nested objects and arrays.
 * Uses Object.entries and Object.fromEntries for cleaner object traversal.
 * @param {Map<string, string>} map - The map of links
 * @param {unknown} value - The input value to process.
 * @returns {any} - Transformed value with UID links replaced.
 */
export const replaceLinked = (map, value) => {
  try {
    if (Array.isArray(value)) {
      return value.map((i) => replaceLinked(map, i));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          replaceLinked(map, val),
        ]),
      );
    }

    if (!Cassidy.config.disableUIDLinks && typeof value === "string") {
      if (
        !Cassidy.config.ADMINBOT.includes(value) ||
        !Cassidy.config.ignoreUIDLinksOfAdminBOT
      ) {
        const link = map.get(value);
        if (typeof link === "string") {
          return link;
        }
        return value;
      }
    }
  } catch (error) {
    console.error(error);
  }
  return value;
};

export const UID_LINKS_KEY = "uid-links";

async function handleMiddleWare({
  api,
  event,
  commands,
  prefix,
  pageApi,
  discordApi,
  tphApi,
  wssApi,
}) {
  let pluginCount = 0;

  try {
    if (["typ", "read_receipt", "read", "presence"].includes(event.type)) {
      return;
    }
    if (event.body && global.Cassidy.config.censorInput) {
      event.body = censor(event.body);
    }
    let prefixes = [prefix, ...global.Cassidy.config.EXTRAPREFIX].filter(
      Boolean,
    );
    const threadCache = await threadsDB.getCache(event.threadID);
    const { links = [] } = await globalDB.getCache(UID_LINKS_KEY);
    const linksMap = new Map(links);

    for (const [key, value] of Object.entries(event)) {
      event[key] = replaceLinked(linksMap, value);
    }

    if (typeof threadCache.threadPrefix === "string") {
      prefixes = [threadCache.threadPrefix];
      prefix = prefixes[0];
    }
    if (Array.isArray(event.prefixes)) {
      prefixes = [...event.prefixes];
      prefix = prefixes[0];
    }

    prefixes = prefixes.filter(Boolean);
    prefix = prefixes[0] || "+";

    // @ts-ignore
    const { createSafeProxy } = global.utils;
    const { logo: icon } = global.Cassidy;

    let [pref1 = "", commandName = "", ...etc] = String(event.body ?? "")
      .split(" ")
      .filter((i) => !!i);
    if (prefixes.includes(pref1)) {
      commandName = pref1 + commandName;
      event.body = `${commandName} ${etc.join(" ")}`;
    } else {
      commandName = pref1;
    }

    if (!commandName) {
      commandName = "";
    }

    let hasPrefix;
    let currentPrefix = prefix;
    for (const prefix of prefixes) {
      hasPrefix = commandName.startsWith(prefix);
      if (hasPrefix) {
        currentPrefix = prefix;
        break;
      }
    }
    if (hasPrefix) {
      commandName = commandName.slice(currentPrefix.length);
    }
    let isLink = false;

    /**
     * @type {CassidySpectra.CassidyCommand | null}
     */
    let command =
      commands[commandName] || commands[commandName.toLowerCase()] || null;
    if (command && command.meta && typeof command.meta.linkTo === "string") {
      commandName = command.meta.linkTo;
      isLink = true;
      console.log(`Linking '${command.meta.name}' to ${commandName}`);
    }
    let property = [];
    let startsHypen = String(commandName).startsWith("-");
    [commandName, ...property] = commandName
      .split("-")
      .map((i) => i.trim())
      .filter(Boolean);

    if (startsHypen && !commandName.startsWith("-")) {
      commandName = `-${commandName}`;
    }
    event.propertyArray = property;
    for (const prop of property) {
      property[prop] = `${property[prop] ?? ""}`;
    }
    event.property = {};
    for (let index = 0; index < property.length; index++) {
      const prop = property[index];
      mapProp(event.property, prop, index);
    }
    commandName = `${commandName ?? ""}`;

    function mapProp(obj, prop, index) {
      if (property[index + 1]) {
        if (property[index + 2]) {
          obj[prop] = {};
          mapProp(obj[prop], property[index + 1], index + 1);
        } else {
          obj[prop] = {
            [property[index + 1]]: true,
          };
        }
      } else {
        obj[prop] = true;
      }
    }

    const foundCommands = Cassidy.multiCommands.get(commandName);

    const { defaultCommands = [] } = await handleStat.getCache(event.senderID);
    const defMap = new Map(defaultCommands);
    const defCmdName = defMap.get(commandName);
    const defCommand = Cassidy.multiCommands.findOne(
      (_, v) => v?.meta?.name === defCmdName,
    )?.[1];
    commandName = commandName.trim();

    /**
     * @type {Partial<CommandContext>}
     */
    let runObjects = {
      api: new Proxy(api || {}, {
        get(target, key) {
          if (event.isWss && key in (wssApi ?? {})) {
            return wssApi[key];
          }
          if (event.isTph && key in (tphApi ?? {})) {
            return tphApi[key];
          }
          if (event.isPage && key in (pageApi ?? {})) {
            return pageApi[key];
          }
          if (event.isDiscord && key in (discordApi ?? {})) {
            return discordApi[key];
          }
          if (key in target && !event.isDiscord) {
            return target[key];
          }
          return (...args) => {
            global.logger(
              `Warn: 
api.${
                // @ts-ignore
                key
              }(${args
                .map((i) => `[ ${typeof i} ${i?.constructor?.name || ""} ]`)
                .join(",")}) has no effect!`,
            );
          };
        },
        // @ts-ignore
        set(target, key, value) {
          target[key] = value;
          return;
        },
      }),

      event,
      commands,
      prefix: currentPrefix || prefix,
      prefixes,
      allPlugins: global.Cassidy.plugins,
      queue,
      command,
      origAPI: api,
      commandName,
      hasPrefix,
      invTime: Date.now(),
      icon,
      Cassidy: global.Cassidy,
      safeCalls: 0,
      discordApi,
      pageApi,
      awaitStack,
      setAwaitStack,
      delAwaitStack,
      hasAwaitStack,
      clearCurrStack: () => {
        const { meta } = command || {};
        if (!meta) return;
        delAwaitStack(event.senderID, meta.name);
      },
      popularCMD,
      recentCMD,
      usersDB: handleStat,
      globalDB,
      threadsDB,
      money: handleStat,
      userStat: handleStat,
      commandRole: undefined,
      multiCommands: Cassidy.multiCommands,
      foundCommands,
      supposedCommand: undefined,
      defCommand,
      extra: {},
      FontSystem,
      fonts: FontSystem.fonts,
      async runContextual(ctxual) {
        // @ts-ignore
        await ctxual.runInContext(runObjects);
      },
    };
    if (Cassidy.config.DEBUG) {
      function makeProxy(a, pref = "") {
        return new Proxy(a, {
          get(target, p, arg) {
            if (pref !== "CommandContext") {
              logger(`Accessed: ${pref}.${String(p)}`, "DEBUG CTX");
            }
            const item = Reflect.get(target, p, arg);
            if (
              typeof item === "object" &&
              item &&
              Cassidy.config.DEBUG_PROPS.some((i) =>
                i.startsWith(pref + "." + String(p)),
              )
            ) {
              return makeProxy(item, pref + "." + String(p));
            }
            return item;
          },
        });
      }
      runObjects = makeProxy(runObjects, "CommandContext");
    }
    // @ts-ignore
    runObjects.allObj = runObjects;
    // @ts-ignore
    runObjects.ctx = runObjects;
    let command2 =
      commands[commandName] || commands[commandName.toLowerCase()] || null;
    if (!isLink) {
      command = command2;
    } else if (command && command2 && isLink) {
      command = { ...command2, meta: command.meta };
    } else {
      return runObjects.api.sendMessage(
        `❌ Internal Middleware Issue: Cannot find linkTo ${commandName} => ${JSON.stringify(
          event.propertyArray,
        )}`,
        event.threadID,
      );
    }
    runObjects.command = command;

    if (command) {
      try {
        const entryX = await deSYMC(command.entry);
        if (
          typeof entryX === "symbol" &&
          "hooklet" in command.entry &&
          typeof command.entry.hooklet === "function"
        ) {
          command = { ...command, entry: command.entry.hooklet(entryX) };
          runObjects.command = command;
        }
      } catch (error) {
        console.error(error);
      }

      // @ts-ignore
      runObjects.supposedCommand = runObjects.command;
    }
    if (defCommand) {
      runObjects.command = defCommand;
    }

    if (runObjects.command) {
      const extractedRole = await extractCommandRole(
        // @ts-ignore
        runObjects.command,
        true,
        event.threadID,
      );
      if (extractedRole in InputRoles && typeof extractedRole === "number") {
        runObjects.commandRole = extractedRole;
      }
    }

    const styler = new CassidyResponseStylerControl(
      runObjects.command?.style ?? {},
    );
    styler.fc =
      typeof runObjects.command?.Style === "function"
        ? runObjects.command.Style
        : null;
    runObjects.extra = runObjects.command?.meta?.extra ?? {};
    const stylerDummy = new CassidyResponseStylerControl({});
    styler.activateAllPresets();
    runObjects.styler = styler;
    runObjects.stylerDummy = stylerDummy;

    // LMAO autoCreateDB finally got purpose.
    const { autoCreateDB } = global.Cassidy.config;
    if (
      handleStat.isNumKey(event.originalEvent?.senderID ?? event.senderID) &&
      autoCreateDB
    ) {
      let i = await handleStat.ensureUserInfo(
        event.senderID,
        event.originalEvent?.senderID ?? event.senderID,
      );

      if (i) {
        console.log("[AutoCreateDB]", `Created userMeta for ${event.senderID}`);
      }
    }

    if (
      event.threadID !== event.senderID &&
      handleStat.isNumKey(event.threadID) &&
      autoCreateDB &&
      event.isFacebook
    ) {
      let i = await threadsDB.ensureThreadInfo(event.senderID, api);

      if (i) {
        console.log(
          "[AutoCreateDB]",
          `Created threadInfo for ${event.threadID}`,
        );
      }
    }

    // [new] Spectra Plugin Handling
    let allDataKeys = [];
    // @ts-ignore
    const symbolSkip = Symbol("skip");
    for (const order of queue) {
      if (!order) continue;
      for (const currentPlugin of order) {
        const timeA = Date.now();
        await new Promise(async (resolve) => {
          const next = () => resolve(true);
          runObjects.next = next;

          try {
            const { use, meta } = currentPlugin;
            if (meta.name === "handleCommand") {
              return next();
            }
            global.runner = runObjects;
            let copyDataKeys = Object.keys({ ...runObjects });
            await use(runObjects);
            const timeB = Date.now();
            let dataKeys = Object.keys({ ...runObjects });
            pluginCount++;

            if (timeA !== timeB) {
              console.log(`[${meta.name} - added latency]: ${timeB - timeA}ms`);
            }

            if (
              dataKeys.length !== copyDataKeys.length &&
              global.Cassidy.config.logPluginChange === true
            ) {
              const added = dataKeys.filter(
                (key) => !copyDataKeys.includes(key),
              );
              allDataKeys.push(...added);

              const removed = allDataKeys.filter(
                (key) => !dataKeys.includes(key),
              );

              allDataKeys = allDataKeys.filter((key) => !removed.includes(key));

              console.log(`[${meta.name} changed:]`, { added, removed });
            }
            return;
          } catch (error) {
            // @ts-ignore
            const { failSafe = [], meta } = currentPlugin ?? {};
            for (const key of failSafe) {
              runObjects[key] = new Proxy(() => {}, {
                get(_, key) {
                  return (...args) => {
                    global.logger(
                      // @ts-ignore
                      `Warn: the ${key}(${args
                        .map(
                          (i) =>
                            `[ ${typeof i} ${i?.constructor?.name || ""} ]`,
                        )
                        .join(",")}) has no effect!`,
                    );
                  };
                },
                set() {
                  return true;
                },
              });
            }
            console.log(error);
            return next();
          }
        });
      }
    }
    try {
      // @ts-ignore
      const { use } = allPlugins.handleCommand;
      await use({ ...runObjects, next: undefined });
    } catch (error) {
      console.log(error);
    }
    global.logger(`All ${pluginCount} plugins have been handled!`);
  } catch (error) {
    console.log(error);
  }
}
