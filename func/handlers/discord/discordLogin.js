import { convertDiscordEvent } from "./convertDiscordEvent.js";
import { DiscordAPI } from "./API.js";

const { createRequire } = require("module");

const { originalRequire = createRequire(__filename) } = global;

export function isValidDiscordCmd(name) {
  const regex = /^[a-z0-9]+$/;
  return regex.test(name);
}

export async function createDiscordListener(funcListen) {
  const { GatewayIntentBits, Client, Events, REST, Routes } = global.discordJS;
  const botToken = global.Cassidy.config.discordBotToken;
  if (!botToken) {
    global.logger(
      "Discord bot token not found. Skipping Discord listener setup.",
      "discord"
    );
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const restartBot = async () => {
    global.logger("Attempting to restart the bot...", "discord");
    await client.destroy();
    createDiscordListener(funcListen);
  };

  const handleEvent = async (event) => {
    if (event.author?.bot) {
      return;
    }
    const api = new DiscordAPI(event, client);

    try {
      const convertedEvent = convertDiscordEvent(event);
      if (event.senderID === `discord:${client.user.id}`) {
        return;
      }
      funcListen(null, convertedEvent, { discordApi: api });
    } catch (error) {
      funcListen(error, null, { discordApi: api });
      global.logger(`Error converting Discord event: ${error}`, "discord");
    }
  };

  client.on(Events.MessageCreate, handleEvent);
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    interaction.reply(
      `Slash commands are currently unsupported in Cassidy, use ${global.Cassidy.config.PREFIX}${interaction.commandName}`
    );
  });

  client.on(Events.ClientReady, async () => {
    const commands = [];
    const originalCommands = global.Cassidy.multiCommands;
    for (const [name, command] of originalCommands) {
      const { meta, entry } = command;
      const newName = String(name).toLowerCase();
      if (!isValidDiscordCmd(newName)) {
        continue;
      }
      commands.push({
        name: newName,
        description: String(meta.description || "No Description"),
      });
    }
    const CLIENT_ID = global.Cassidy.config.discordClientID;
    global.logger(`Discord bot logged in as ${client.user.tag}`, "discord");
    const rest = new REST({ version: "10" }).setToken(botToken);

    try {
      global.logger("Started refreshing application (/) commands.", "discord");

      await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });

      global.logger(
        "Successfully reloaded application (/) commands.",
        "discord"
      );
    } catch (error) {
      console.error(error);
      if (!error.rawError) return;
      for (const index in error.rawError.errors) {
        console.log(commands[index]);
      }
    }
  });

  client.on("messageReactionAdd", (reaction, user) => {
    if (!user.bot) {
      handleEvent(reaction.message);
    }
  });

  client.on("messageReactionRemove", (reaction, user) => {
    if (!user.bot) {
      handleEvent(reaction.message);
    }
  });

  client.on("error", (error) => {
    global.logger(`Discord client error: ${error.message}`, "discord");
    restartBot();
  });

  client.on("shardError", (error) => {
    global.logger(
      `A websocket connection encountered an error: ${error}`,
      "discord"
    );
    restartBot();
  });

  client.on("disconnect", () => {
    global.logger("Bot disconnected from Discord.", "discord");
    restartBot();
  });

  client.on("reconnecting", () => {
    global.logger("Bot reconnecting to Discord...", "discord");
  });

  client.on("resume", () => {
    global.logger("Bot resumed connection to Discord.", "discord");
  });

  try {
    global.logger("Logging into Discord...", "discord");
    await client.login(botToken);
    global.logger("Successfully logged in to Discord.", "discord");
  } catch (error) {
    global.logger(
      `Failed to log in to Discord:
${JSON.stringify(error, null, 2)}`,
      "discord"
    );
    restartBot();
  }
}
