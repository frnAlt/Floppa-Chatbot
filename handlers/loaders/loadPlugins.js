// @ts-check
/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
*/

import fs from "fs";

/**
 *
 * @param {globalThis["Cassidy"]["plugins"]} allPlugins
 * @param {boolean} force
 * @param {(error: Error | null, plugin: string, data: any | null) => any} callback
 * @returns {Promise<Record<string, Error> | false>}
 */
export async function loadPluginsEach(
  allPlugins,
  force = false,
  callback = async () => {},
) {
  /**
   * @type {Record<string, Error>}
   */
  const errs = {};
  const plugins = fs
    .readdirSync("CommandFiles/plugins")
    .filter(
      (file) =>
        (file.endsWith(".js") ||
          file.endsWith(".ts") ||
          file.endsWith(".tsx") ||
          file.endsWith(".jsx")) &&
        !file.endsWith(".d.ts"),
    );

  for (const plugin of plugins) {
    try {
      /*global.logger(`Loading plugin '${plugin}'...`, "Plugin");*/
      const data = await loadPlugin(plugin, allPlugins, force);
      await callback(null, plugin, data);
    } catch (error) {
      errs["plugin:" + plugin] = error;
      await callback(error, plugin, null);
      global.logger(
        `Cannot load '${plugin} because: 
${error.stack}'`,
        "Plugin",
      );
    }
  }
  return Object.keys(errs).length === 0 ? false : errs;
  //console.log(allPlugins);
}

/**
 *
 * @param {globalThis["Cassidy"]["plugins"]} allPlugins
 * @param {boolean} force
 * @param {(error: Error | null, plugin: string, data: any | null) => any} callback
 * @returns {Promise<Record<string, Error> | false>}
 */
export async function loadPlugins(
  allPlugins,
  force = false,
  callback = async () => {},
) {
  /**
   * @type {Record<string, Error>}
   */
  const errs = {};
  const plugins = fs
    .readdirSync("CommandFiles/plugins")
    .filter(
      (file) =>
        file.endsWith(".js") ||
        file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".jsx"),
    );

  // const pluginPromises = plugins.map((plugin) =>
  //   loadPlugin(plugin, allPlugins, force)
  //     .then((data) => {
  //       callback(null, plugin, data);
  //     })
  //     .catch((error) => {
  //       errs["plugin:" + plugin] = error;
  //       callback(error, plugin, null);
  //       global.logger(
  //         `Cannot load '${plugin}' because:\n${error.stack}`,
  //         "Plugin"
  //       );
  //     })
  // );

  // return Promise.allSettled(pluginPromises).then(() => {
  //   return Object.keys(errs).length === 0 ? false : errs;
  // });
  for (const plugin of plugins) {
    try {
      const data = await loadPlugin(plugin, allPlugins, force);
      callback(null, plugin, data);
    } catch (error) {
      errs["plugin:" + plugin] = error;
      callback(error, plugin, null);
      global.logger(
        `Cannot load '${plugin}' because:\n${error.stack}`,
        "Plugin",
      );
    }
  }

  return Object.keys(errs).length === 0 ? false : errs;
}

import { checkCompatibility } from "./util.js";

/**
 *
 * @param {string} name
 * @param {globalThis["Cassidy"]["plugins"]} allPlugins
 * @param {boolean} force
 * @returns
 */
export async function loadPlugin(name, allPlugins, force = false) {
  let plugin;

  try {
    if (force) {
      Cassidy.clearModuleCache("CommandFiles", "plugins", String(name));
    }
    plugin = require(process.cwd() + `/CommandFiles/plugins/${name}`);
  } catch (err) {
    global.logger(err.message);
  }
  const { meta, use } = plugin;
  if (!meta || !meta.name) {
    throw new Error(`Plugin ${name} is missing meta data.`);
  }
  if (meta.type !== "plugin") {
    return;
    throw new Error(
      `Plugin ${name} is not a plugin, configure .meta.type = "plugin"`,
    );
  }
  if (false) {
    throw new Error(
      `Plugin '${name}' does not validly call the 'next' function from the property of the first parameter, which could imply that loading this plugin would pause the execution of the bot forever.`,
    );
  }

  if (!meta.supported) {
    meta.supported = "^1.0.0";
  }
  if (
    !checkCompatibility(meta.requirement || "^1.0.0", global.package.version)
  ) {
    throw new Error(
      `Plugin ${name} requires a newer version of Cassidy. Your current Cassidy is ${global.package.version}, please update to ${meta.requirement}`,
    );
  }
  if (typeof use !== "function") {
    throw new Error(`Plugin ${name} is missing 'use' function!`);
  }
  if (allPlugins?.[meta.name] && !force) {
    throw new Error(`Plugin ${name} is already loaded!`);
  }
  if (typeof plugin.load === "function" && !force) {
    try {
      await plugin.load();
    } catch (error) {
      console.log(error);
    }
  }

  plugin.filePath = `CommandFiles/plugins/${name}`;
  plugin.fileName = name;
  allPlugins[meta.name] = plugin;
  global.logger(`Loaded plugin '${meta.name}!'`, "Plugin");
  global.checkMemoryUsage(true);

  return plugin;
}
