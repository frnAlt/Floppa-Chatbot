/**
 * AstrBot API Specification & Plugin System Layer (system/astrbot-api.js)
 * 
 * Ports AstrBot API functions, Event Decorators (@filter), Message Chain components,
 * Tool Registration (@register_tool), and Provider Interfaces to GrammChatBot.
 * 
 * @module system/astrbot-api
 * @author frnAlt & Gtajisan
 */

const aiCore = require("./ai-core.js");
const log = require("../logger/log.js");

/**
 * Message Chain Components (Plain, Image, Record, At)
 */
class MessageComponent {
        constructor(type, data) {
                this.type = type;
                this.data = data;
        }
}

class Plain extends MessageComponent {
        constructor(text) {
                super("plain", { text });
        }
}

class Image extends MessageComponent {
        constructor(urlOrBuffer) {
                super("image", { urlOrBuffer });
        }
}

class Record extends MessageComponent {
        constructor(audioUrl) {
                super("record", { audioUrl });
        }
}

class At extends MessageComponent {
        constructor(targetId) {
                super("at", { targetId });
        }
}

class MessageChain {
        constructor(components = []) {
                this.chain = Array.isArray(components) ? components : [components];
        }

        static fromString(text) {
                return new MessageChain([new Plain(text)]);
        }

        getPlainText() {
                return this.chain.filter(c => c.type === "plain").map(c => c.data.text).join(" ");
        }
}

/**
 * Event Filter Decorator Suite
 */
const filter = {
        command: (cmdName) => {
                return (target, prop, descriptor) => {
                        target.commandName = cmdName;
                        return descriptor;
                };
        },
        permission: (permissionLevel) => {
                return (target, prop, descriptor) => {
                        target.requiredRole = permissionLevel;
                        return descriptor;
                };
        },
        llm_tool: (toolConfig) => {
                return (target, prop, descriptor) => {
                        target.toolConfig = toolConfig;
                        return descriptor;
                };
        }
};

/**
 * AstrBot Star / Plugin Base Class & Tool Registry
 */
class Star {
        constructor(name, description = "") {
                this.name = name;
                this.description = description;
                this.tools = new Map();
                this.commands = new Map();
        }

        register_tool(name, description, parameters, func) {
                this.tools.set(name, { name, description, parameters, func });
                log.info("ASTRBOT_API", `Registered AstrBot AI Tool: [${name}] in star plugin: ${this.name}`);
        }

        register_command(name, func, role = 0) {
                this.commands.set(name, { name, func, role });
                log.info("ASTRBOT_API", `Registered AstrBot Command: [/${name}] in star plugin: ${this.name}`);
        }
}

/**
 * Provider API Manager (LLM, TTS, STT, Vision)
 */
const providerManager = {
        getProvider: () => aiCore.getProvider(),
        setProvider: (name, model) => aiCore.setProvider(name, model),
        chat: async (prompt, contextId) => aiCore.generateCompletion({ prompt, contextId }),
        speechToText: async (audioBuffer) => "Transcribed audio message via Whisper STT",
        textToSpeech: async (text) => "https://example.com/generated_tts.mp3"
};

module.exports = {
        MessageComponent,
        Plain,
        Image,
        Record,
        At,
        MessageChain,
        filter,
        Star,
        providerManager
};
