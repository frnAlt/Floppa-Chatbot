// @ts-check
/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
  DO NOT MODIFY.
*/

global.loadSymbols ??= new Map();

export const SymLock = new Map();

import { cassWatchJob } from "./casswatch.js";
import fs from "fs/promises";
let isPresetLoaded = false;
export async function loadAllPresets() {
  isPresetLoaded = true;
  const fs = require("fs").promises;
  const files = (await fs.readdir("CommandFiles/stylePresets")).filter((i) =>
    i.endsWith(".json")
  );
  global.logger(`Loading presets`);
  for (const file of files) {
    try {
      const data = await fs.readFile(
        `CommandFiles/stylePresets/${file}`,
        "utf8"
      );
      const json = JSON.parse(data);
      global.Cassidy.presets.set(file, json);
    } catch (error) {
      global.logger(`Cannot load preset: ${file}, ${error}`, "preset");
    }
  }
  let r = {};
  for (const value of global.Cassidy.presets) {
    try {
      Object.assign(r, value);
    } catch (error) {}
  }
  return r;
}

/**
 * @type {CassidySpectra.CommandMeta}
 */
const defaultMeta = {
  name: "",
  description: "No Description",
  otherNames: [],
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "Unconfigured",
  role: 0,
  noPrefix: false,
  waitingTime: 5,
  ext_plugins: {},
};

import {
  checkCompatibility,
  getNeanMartPlugin,
  packageInstallerErr,
  isValidVersion,
  deprecationWarning,
} from "./util.js";
import { extractCommandRole } from "../../CommandFiles/modules/unisym.js";

/**
 *
 * @param {string | CassidySpectra.CassidyCommand} fileName
 * @param {globalThis["Cassidy"]["commands"]} commands
 * @param {boolean} isObj
 * @param {boolean} force
 * @param {boolean} transpileOnly
 * @returns {Promise<Error | null | CassidySpectra.CassidyCommand>}
 */
export async function loadCommand(
  fileName,
  commands,
  isObj = false,
  force = false,
  transpileOnly = false
) {
  const startTime = performance.now();
  const { requireProc: importModule } = global;
  try {
    if (!isPresetLoaded || force) {
      loadAllPresets();
    }
    /**
     * @type {CassidySpectra.CassidyCommand}
     */
    let command;
    try {
      if (isObj && typeof fileName !== "string") {
        command = fileName;
        fileName = command.meta?.name || "";
      } else {
        if (force) {
          Cassidy.clearModuleCache(
            "CommandFiles",
            "commands",
            String(fileName)
          );
        }
        command = importModule(`CommandFiles/commands/${fileName}`);
      }
    } catch (error) {
      const foo = await packageInstallerErr(error);
      if (foo) {
        console.log(foo);
        return loadCommand(fileName, commands, isObj, true);
      }
      try {
        if (isObj) {
          throw error;
        } else {
          throw error;
        }
      } catch (error) {
        throw error;
      }
    }
    if (command.default) {
      command = command.default;
    }
    const { pack } = command;
    if (pack) {
      for (const cmd in command.pack) {
        const commandPack = command.pack[cmd];
        loadCommand(commandPack, commands, true);
      }
      return;
    }
    if (command.config) {
      command.meta = command.config;
      delete command.config;
    }
    if (command.langData) {
      command.langs = command.langData;
      delete command.langData;
    }

    command.meta = { ...defaultMeta, ...(command.meta ?? {}) };
    if (command.meta.cooldown) {
      command.meta.waitingTime = command.meta.cooldown;
    }
    if (command.meta.aliases) {
      command.meta.otherNames = command.meta.aliases;
    }
    if (command.meta.credits) {
      command.meta.author = command.meta.credits;
    }
    if (command.onCall) {
      command.entry = command.onCall;
    }
    if (command.meta.hasPermssion && command.meta.role === undefined) {
      command.meta.role = command.meta.hasPermssion;
    }
    if (command.meta.usePrefix === false) {
      command.meta.noPrefix = "both";
    }
    if (command.meta.usePrefix === true) {
      command.meta.noPrefix = false;
    }
    if (
      typeof command.run === "function" &&
      typeof command.entry !== "function"
    ) {
      command.entry = command.run;
    }
    if (
      typeof command.handleEvent === "function" &&
      typeof command.event !== "function"
    ) {
      command.event = command.handleEvent;
    }
    if (
      typeof command.handleReply === "function" &&
      typeof command.reply !== "function"
    ) {
      command.reply = command.handleReply;
    }
    fileName = String(fileName);
    const { meta, entry, duringLoad, noPrefix, reply } = command;
    const verRegex = /,?\s*version:\s*"([^"]*)"\s*,/;
    const fileCOntent = await fs.readFile(
      `CommandFiles/commands/${fileName}`,
      "utf-8"
    );
    const version = fileCOntent.match(verRegex)?.[1] ?? command.meta?.version;
    if (!version || !isValidVersion(version)) {
      throw new Error(`Invalid version found in ${fileName}, got: ${version}`);
    }
    if (typeof entry !== "function" && typeof entry !== "object") {
      throw new Error(
        `'{root}.entry' function should be a function or an object, recieved ${String(
          entry
        ).toString()}`
      );
    }
    if (noPrefix && typeof noPrefix !== "function") {
      throw new Error(
        `'{root}.noPrefix' should be undefined, null, or function, recieved ${String(
          noPrefix
        ).toString()}`
      );
    }
    if (reply && typeof reply !== "function") {
      throw new Error(
        `'{root}.reply' should be undefined, null, or function, recieved ${String(
          reply
        ).toString()}`
      );
    }
    if (!meta || !meta.name) {
      throw new Error(`'{root}.meta' is invalid!`);
    }
    const { plugins: allPlugins = {} } = global.Cassidy;

    if (
      !checkCompatibility(meta.requirement || "^1.0.0", global.package.version)
    ) {
      throw new Error(
        `Command ${fileName} requires a newer version of Cassidy. Your current Cassidy is ${global.package.version}, please update to ${meta.requirement}`
      );
    }
    deprecationWarning(meta.requirement);
    if (typeof meta.ext_plugins === "object" && meta.ext_plugins) {
      for (const plugin in meta.ext_plugins) {
        if (!allPlugins[plugin]) {
          try {
            await getNeanMartPlugin(plugin);
            return await loadCommand(fileName, commands, isObj, force);
          } catch (error) {}

          throw new Error(
            `Command '${fileName}' requires plugin '${plugin}' (${meta.ext_plugins[plugin]}), but it is not installed!`
          );
        }
        if (
          !checkCompatibility(
            meta.ext_plugins[plugin],
            allPlugins[plugin]?.meta?.supported
          )
        ) {
          throw new Error(
            `Command '${fileName}' requires plugin '${plugin}' to be updated, but your current version is ${allPlugins[plugin]?.meta?.supported}, please update to ${meta.ext_plugins[plugin]}`
          );
        }
      }
    }
    if (transpileOnly) {
      return command;
    }
    if (typeof duringLoad == "function") {
      (async () => {
        try {
          await duringLoad();
        } catch (err) {
          console.error(err);
        }
      })();
    }
    if (typeof meta.name !== "string") {
      throw new Error(
        `'{root}.meta.name' should be a string, recieved ${typeof meta.name}`
      );
    }
    if (meta.name.includes(" ")) {
      throw new Error(
        `'{root}.meta.name' shouldn't have spaces, recieved '${meta.name}'`
      );
    }
    if (!Array.isArray(meta.otherNames)) {
      meta.otherNames = [meta.otherNames];
    }
    meta.name = normalizeCommandName(meta.name);
    if (commands[meta.name] && !force) {
      throw new Error(
        `Command '${meta.name}' already exists: '${
          commands[meta.name]?.meta.name
        }', '${(commands[meta.name]?.otherNames ?? []).join("")}`
      );
    }
    if (typeof command.load === "function") {
      try {
        await command.load();
      } catch (error) {
        console.log(error);
      }
    }
    command.filePath = `CommandFiles/commands/${fileName}`;
    command.fileName = fileName;
    const role = await extractCommandRole(command, false, null);
    command.meta.role = role;
    delete command.meta.permissions;
    delete command.meta.botAdmin;
    delete command.meta.allowModerators;
    if (
      meta.category &&
      Cassidy.config.disabledCategories.includes(meta.category)
    ) {
      // throw new Error(`Category "${meta.category}" is disabled.`);
      global.logger(
        `Skipped command ${meta.name}@${version} (Category "${meta.category}" is disabled.)`,
        fileName
      );
      return;
    }
    if (meta.isGame && Cassidy.config.DISABLE_GAMES === true) {
      global.logger(
        `Skipped command ${meta.name}@${version} (Games disabled.)`,
        fileName
      );
      return;
    }

    await cassWatchJob({ commandData: command, fileName, version });

    if (force) {
      const cmds = Object.entries(commands).filter(
        (i) => i[1].fileName === fileName
      );
      const cmds2 = Cassidy.multiCommands
        .entries()
        .filter((i) => i[1].fileName === fileName);
      Cassidy.multiCommands.deleteRefs(cmds2);
      for (const [key, cmd] of [...cmds]) {
        global.logger(
          `Deleted ${cmd.meta.name} (${key}) at ${cmd.filePath}`,
          "Force Load"
        );
        delete commands[key];
      }
    }
    if (
      command.style &&
      !command.style.footer &&
      global.Cassidy.config.showAuthorOnStyle
    ) {
      command.style.footer = {
        content: `Credits: **${meta.author ?? "No Author"}**`,
        text_font: "fancy",
        line_bottom: "hidden",
      };
    }

    assignCommand(meta.name, command, commands);
    if (Array.isArray(meta.otherNames)) {
      meta.otherNames = meta.otherNames
        .filter(Boolean)
        .map((i) => normalizeCommandName(i));

      meta.otherNames.forEach((name) => {
        // if (commands[name] && !force) {
        //   throw new Error(
        //     `Command '${name}' already exists: '${
        //       commands[name]?.meta.name
        //     }', '${(commands[name]?.otherNames ?? []).join("")}'`
        //   );
        // }
        const found = Cassidy.multiCommands.findOne(
          (_, value) => value?.meta?.name === name
        );
        if (found) {
          throw new Error(
            `Cannot use alias '${name}' of '${meta.name}' (${fileName}) because of existing command: ${found[1].meta.name} (${found[1].fileName})`
          );
        }
        assignCommand(name, command, commands);
      });
    }

    const ms = performance.now() - startTime;
    global.logger(
      `Loaded command ${meta.name}@${version} ${
        Array.isArray(meta.otherNames)
          ? `and aliases ${meta.otherNames.join(", ")}!`
          : "!"
      }\n(PING: ${ms.toFixed(2)}ms)`,
      fileName
    );
  } catch (error) {
    global.logger(
      `Failed to load command '${fileName}'! Error: ${error.message}`,
      String(fileName)
    );
    console.log(error);
    return error;
  }
}

/**
 *
 * @param {string} name
 */
export function normalizeCommandName(name) {
  name = String(name).toLowerCase();
  name = name.replaceAll(" ", "");
  name = name.replaceAll("-", "_");
  return name;
}

/**
 *
 * @param {string} name
 * @param {CassidySpectra.CassidyCommand} command
 * @param {globalThis["Cassidy"]["commands"]} commands
 */
export function assignCommand(name, command, commands) {
  const ID = Cassidy.multiCommands.size + 1;
  Cassidy.multiCommands.addOne(name, {
    ...command,
    meta: {
      ...defaultMeta,
      ...command.meta,
    },
    ID,
  });
  // global.logger(`MultiCommand: Loaded as ${name}.`, "Multi");
  if (name in commands) {
    // throw new Error(`"${name}" already exists in commands.`);
    return;
  }
  const ssyx = Symbol(name);
  SymLock["set"](name, ssyx);
  const { entry } = command;

  commands[name] = {
    ...command,
    meta: { ...defaultMeta, ...command.meta },
    entry(ctx) {
      return ctx?.output.wentWrong();
    },
    ID: NaN,
  };
  commands[name].entry.hooklet = (aad) => {
    var xf = []["constructor"]["constructor"](
      "cc",
      "dd",
      "return cc" + "+="[1] + "+="[1] + "+="[1] + "dd"
    )(aad, ssyx);
    console.log("AAD:", aad);
    while (![xf].map(() => 0).concat([1])[+!xf]) {
      throw SymLock;
    }
    return entry;
  };
  // global.logger(`Commands: Loaded as ${name}.`, "Command");
}
