/**
 * AstrBot Plugin Marketplace & Extension System (system/astrbot-plugins.js)
 * 
 * Ports the AstrBot Plugins Collection architecture to GrammChatBot,
 * allowing dynamic plugin installation, tool registration, and star management.
 * 
 * @module system/astrbot-plugins
 * @author frnAlt & Gtajisan
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Star } = require("./astrbot-api.js");
const log = require("../logger/log.js");

const installedPlugins = new Map();

/**
 * Built-in AstrBot Star Plugins Collection
 */
const defaultStars = [
        {
                name: "astrbot_plugin_websearch",
                author: "AstrBotDevs",
                description: "Web search engine integration for DuckDuckGo and Google.",
                version: "1.2.0"
        },
        {
                name: "astrbot_plugin_draw",
                author: "AstrBotDevs",
                description: "AI image generation plugin supporting Stable Diffusion and DALL-E 3.",
                version: "1.0.5"
        },
        {
                name: "astrbot_plugin_interpreter",
                author: "AstrBotDevs",
                description: "Code Interpreter Sandbox for executing JS & Python snippets safely.",
                version: "2.0.1"
        }
];

// Initialize default stars
defaultStars.forEach(plugin => {
        const starInstance = new Star(plugin.name, plugin.description);
        installedPlugins.set(plugin.name, { meta: plugin, star: starInstance });
});

class AstrBotPluginManager {
        constructor() {
                this.plugins = installedPlugins;
        }

        getInstalledPlugins() {
                return Array.from(this.plugins.values()).map(p => p.meta);
        }

        async fetchMarketplacePlugins() {
                try {
                        const url = "https://raw.githubusercontent.com/AstrBotDevs/AstrBot_Plugins_Collection/main/plugins.json";
                        const { data } = await axios.get(url, { timeout: 5000 });
                        return Array.isArray(data) ? data : defaultStars;
                } catch (err) {
                        log.error("PLUGIN_MARKETPLACE", `Failed fetching online marketplace: ${err.message}`);
                        return defaultStars;
                }
        }

        installPlugin(pluginMeta) {
                if (this.plugins.has(pluginMeta.name)) {
                        return { status: "already_installed", message: `Plugin ${pluginMeta.name} is already installed.` };
                }

                const starInstance = new Star(pluginMeta.name, pluginMeta.description || "");
                this.plugins.set(pluginMeta.name, { meta: pluginMeta, star: starInstance });
                log.info("PLUGIN_MANAGER", `Successfully installed AstrBot plugin: ${pluginMeta.name}`);
                return { status: "success", message: `Installed plugin ${pluginMeta.name}` };
        }

        uninstallPlugin(pluginName) {
                if (this.plugins.has(pluginName)) {
                        this.plugins.delete(pluginName);
                        log.info("PLUGIN_MANAGER", `Uninstalled AstrBot plugin: ${pluginName}`);
                        return { status: "success", message: `Uninstalled ${pluginName}` };
                }
                return { status: "not_found", message: `Plugin ${pluginName} not found.` };
        }
}

const pluginManagerInstance = new AstrBotPluginManager();
module.exports = pluginManagerInstance;
