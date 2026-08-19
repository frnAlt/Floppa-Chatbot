import { SpectralCMDHome, Config } from "@cass-modules/spectralCMDHome";
import { UNIRedux, UNISpectra } from "@cassidy/unispectra";
import { defineEntry, defineHome } from "@cass/define";

const configs: Config[] = [
  {
    key: "add",
    description: "Add a new admin",
    args: ["<uid>"],
    aliases: ["-a"],
    icon: "➕",
    async handler({ input, output, money, prefix }, { spectralArgs, key }) {
      const { ADMINBOT } = global.Cassidy.config;
      if (!input.isAdmin) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Only admins can add new admins.`,
          },
          style
        );
      }
      const ID = input.detectID || spectralArgs[0];
      if (!ID) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Please specify the user ID (reply/mention or provide ID).`,
          },
          style
        );
      }
      if (ID.startsWith("web:") || ID.startsWith("wss:main") || input.isWeb) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Web users and wss:main cannot be admins.`,
          },
          style
        );
      }

      try {
        const { name } = await money.getItem(ID);
        if (ADMINBOT.includes(ID)) {
          return output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **${key}** ❌\n\n` +
                `${name} (${ID}) is already an admin.`,
            },
            style
          );
        }

        ADMINBOT.push(ID);
        global.Cassidy.config.ADMINBOT = ADMINBOT;

        output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ✅\n\n` +
              `${name} (${ID}) is now an admin.\n` +
              `${UNISpectra.arrowFromT} Use **${prefix}admin list** to view all admins.`,
          },
          style
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "remove",
    description: "Remove an existing admin",
    args: ["<uid>"],
    aliases: ["-r"],
    icon: "➖",
    async handler({ input, output, money, prefix }, { spectralArgs, key }) {
      const { ADMINBOT } = global.Cassidy.config;
      if (!input.isAdmin) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Only admins can remove admins.`,
          },
          style
        );
      }
      const ID = input.detectID || spectralArgs[0];
      if (!ID) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Please specify the user ID (reply/mention or provide ID).`,
          },
          style
        );
      }

      try {
        const { name } = await money.getItem(ID);
        if (!ADMINBOT.includes(ID)) {
          return output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **${key}** ❌\n\n` +
                `${name} (${ID}) is not an admin.`,
            },
            style
          );
        }

        global.Cassidy.config.ADMINBOT = ADMINBOT.filter((item) => item !== ID);

        output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ✅\n\n` +
              `${name} (${ID}) is no longer an admin.\n` +
              `${UNISpectra.arrowFromT} Use **${prefix}admin list** to view all admins.`,
          },
          style
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "addmod",
    description: "Grant moderator privileges",
    args: ["<uid>"],
    aliases: ["-am"],
    icon: "🛡️",
    async handler({ input, output, money, prefix }, { spectralArgs, key }) {
      const { MODERATORBOT, ADMINBOT } = global.Cassidy.config;
      if (!input.isAdmin) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Only admins can add moderators.`,
          },
          style
        );
      }
      const ID = input.detectID || spectralArgs[0];
      if (!ID) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Please specify the user ID (reply/mention or provide ID).`,
          },
          style
        );
      }
      if (ID.startsWith("web:") || ID.startsWith("wss:main") || input.isWeb) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Web users and wss:main cannot be moderators.`,
          },
          style
        );
      }

      try {
        const { name } = await money.getItem(ID);
        if (MODERATORBOT.includes(ID)) {
          return output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **${key}** ❌\n\n` +
                `${name} (${ID}) is already a moderator.`,
            },
            style
          );
        }
        if (ADMINBOT.includes(ID)) {
          return output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **${key}** ❌\n\n` +
                `${name} (${ID}) is an admin.`,
            },
            style
          );
        }

        MODERATORBOT.push(ID);
        global.Cassidy.config.MODERATORBOT = MODERATORBOT;

        output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ✅\n\n` +
              `${name} (${ID}) is now a moderator.\n` +
              `${UNISpectra.arrowFromT} Use **${prefix}admin list** to view all moderators.`,
          },
          style
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "removemod",
    description: "Revoke moderator privileges",
    args: ["<uid>"],
    aliases: ["-rm"],
    icon: "🛡️",
    async handler({ input, output, money, prefix }, { spectralArgs, key }) {
      const { MODERATORBOT } = global.Cassidy.config;
      if (!input.isAdmin) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Only admins can remove moderators.`,
          },
          style
        );
      }
      const ID = input.detectID || spectralArgs[0];
      if (!ID) {
        return output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ❌\n\n` +
              `Please specify the user ID (reply/mention or provide ID).`,
          },
          style
        );
      }

      try {
        const { name } = await money.getItem(ID);
        if (!MODERATORBOT.includes(ID)) {
          return output.replyStyled(
            {
              body:
                `${UNIRedux.arrow} **${key}** ❌\n\n` +
                `${name} (${ID}) is not a moderator.`,
            },
            style
          );
        }

        global.Cassidy.config.MODERATORBOT = MODERATORBOT.filter(
          (item) => item !== ID
        );

        output.replyStyled(
          {
            body:
              `${UNIRedux.arrow} **${key}** ✅\n\n` +
              `${name} (${ID}) is no longer a moderator.\n` +
              `${UNISpectra.arrowFromT} Use **${prefix}admin list** to view all moderators.`,
          },
          style
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
  {
    key: "list",
    description: "Display the list of admins and moderators",
    aliases: ["-l", "show"],
    icon: "📋",
    async handler({ output, money, prefix }, { key }) {
      try {
        const { ADMINBOT = [], MODERATORBOT = [] } = global.Cassidy.config;
        const admins = await money.getItems(...ADMINBOT);
        const mods = await money.getItems(...MODERATORBOT);
        let result = `${UNIRedux.charm} **${key}** 📋 (${
          ADMINBOT.length + MODERATORBOT.length
        } total)\n\n`;

        result += `${UNISpectra.arrow} 👑 ***Admins*** (${ADMINBOT.length}):\n`;
        if (ADMINBOT.length === 0) {
          result += `${UNISpectra.arrowFromT} No admins set.\n`;
        } else {
          result += ` ┌─────────────┐\n`;
          let n = 1;
          for (const [admin, { name }] of Object.entries(admins)) {
            result += ` │ ${n.toString()}. **${name}**\n │ (${admin})\n`;
            n++;
          }
          result += ` └─────────────┘\n`;
        }

        result += `\n${UNISpectra.arrow} 🛡️ ***Moderators*** (${MODERATORBOT.length}):\n`;
        if (MODERATORBOT.length === 0) {
          result += `${UNISpectra.arrowFromT} No moderators set.\n`;
        } else {
          result += ` ┌─────────────┐\n`;
          let n = 1;
          for (const [moderator, { name }] of Object.entries(mods)) {
            result += ` │ ${n.toString()}. **${name}**\n │ (${moderator})\n`;
            n++;
          }
          result += ` └─────────────┘\n`;
        }

        result += `\n${UNISpectra.arrow} Use **${prefix}admin [add|remove|addmod|removemod] <uid>** to manage.`;

        output.replyStyled(
          {
            body: result,
          },
          style
        );
      } catch (error) {
        output.error(error);
      }
    },
  },
];

const home = new SpectralCMDHome(
  {
    isHypen: false,
  },
  configs
);

const command = defineCommand({
  meta: {
    name: "admin",
    description: "Manage admins and moderators",
    otherNames: ["admins", "mod", "moderator"],
    version: "3.0.0",
    usage: "{prefix}{name} [add|remove|addmod|removemod|list] [args]",
    category: "Elevated",
    author: "@lianecagara",
    role: 0,
    noPrefix: false,
    waitingTime: 0,
    requirement: "3.0.0",
    icon: "👑",
  },
  style: {
    title: "👑 Admods",
    titleFont: "bold",
    contentFont: "fancy",
  },
  entry: defineHome(home),
});
const style = command.style;

export default command;
