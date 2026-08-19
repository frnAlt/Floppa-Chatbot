// @ts-check
import { CassExpress } from "@cass-plugins/cassexpress";
import { ReduxCMDHome } from "@cassidy/redux-home";
import { UNIRedux } from "@cassidy/unispectra";
import { PasteClient } from "pastebin-api";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "identity",
  description:
    "Changes your identity or persona, allowing you to update your display name or alter how you are represented in the system. This command provides you with options to personalize your name, nickname, and other profile aspects.",
  author: "Liane | JenicaDev",
  version: "1.1.3",
  usage: "{prefix}setname <newName>",
  category: "User",

  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  otherNames: ["id", "users"],
  requirement: "3.0.0",
  icon: "💬",
};

/**
 * @type {CommandStyle}
 */
export const style2 = {
  title: "🍃 Change User",
  titleFont: "fancy",
  contentFont: "fancy",
  lineDeco: "altar",
};

const { parseCurrency: pCy } = global.utils;

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Identity Dashboard 💬",
  titleFont: "bold",
  contentFont: "none",
};

const home = new ReduxCMDHome(
  {
    isHypen: true,
  },
  [
    {
      key: "profile",
      description:
        "View your profile details, such as name, bio, exp, and level",
      aliases: ["-p", "show", "view"],
      async handler({ output }) {
        return output.reply(`Coming soon!`);
      },
    },
    {
      key: "refresh",
      description: "Refresh your user data.",
      aliases: ["ref"],
      args: ["[uid]"],
      async handler({ output, usersDB, uid, args }, {}) {
        const id = args[0] || uid;
        const d = await usersDB.getItem(id);
        output.reply(
          `👥 **${d.name}** (Refresh)\n\n` +
            `✅ Their data cache has been **refreshed!**`
        );
      },
    },
    {
      key: "find",
      description: "Search for users by name.",
      aliases: ["-s", "search"],
      async handler({ input, output, money }) {
        const query = input.arguments.join(" ").trim().toLowerCase();
        if (!query) {
          output.reply(`Please provide a query to search for users.`);
          return;
        }

        try {
          const allUsers = await money.getAll();

          let matchedUsers = [];

          for (const userId in allUsers) {
            const userData = allUsers[userId];
            userData.name ??= "Unregistered";
            userData.userID = userId;

            if (
              userData.name.toLowerCase().includes(query) ||
              String(userData.userMeta?.name ?? "")
                .toLowerCase()
                .includes(query) ||
              String(userData.bankData?.nickname ?? "")
                .toLowerCase()
                .includes(query)
            ) {
              matchedUsers.push(userData);
            }
          }

          let response = `🔍 Search results for "${query}":\n\n`;

          if (matchedUsers.length > 0) {
            matchedUsers.forEach((userData, index) => {
              response += `${index < 10 ? `0` + (index + 1) : index + 1}. **${
                userData.name
              }**${
                userData.userMeta ? ` (${userData.userMeta?.name})` : ""
              }\n💌 ${userData.userID}\n`;
              response += `💰 $${userData.money}💵\n\n`;
            });
          } else {
            response += `No users found matching "${query}".`;
          }

          output.reply(response);
        } catch (error) {
          console.error("Error fetching user data:", error);
          output.error(error);
        }
      },
    },
    {
      key: "setname",
      description: "Set or change your display name.",
      args: ["<new name> (No Spaces)"],
      aliases: ["set", "-s"],
      async handler({ input, output, money, args, prefix }) {
        const allData = await money.getAll();
        let userData = allData[input.senderID] ?? { ...money.defaults };
        let { usernameHistory = [], cassExpress = {} } = userData;
        const oldName = userData.name || "Unregistered";
        const newName = args.join(" ");

        if (!newName || newName.length < 3 || newName.length > 40) {
          return output.replyStyled(
            {
              body:
                `👤 **${oldName}** (Change User)\n\n` +
                `${UNIRedux.arrow} ❌ | Name must be 3-20 characters.\n\nExample: ${prefix}changeuser Nicaa`,
              noRibbonUI: true,
            },
            style2
          );
        }

        if (!/^[a-zA-Z0-9 ]+$/.test(newName) && 0) {
          return output.replyStyled(
            {
              body:
                `👤 **${oldName}** (Change User)\n\n` +
                `${UNIRedux.arrow} ❌ | Name can only contain letters and numbers.\n\nExample: ${prefix}changeuser Nicaa`,
              noRibbonUI: true,
            },
            style2
          );
        }

        if (Object.values(allData).some((i) => i.name === newName)) {
          return output.replyStyled(
            {
              body:
                `👤 **${oldName}** (Change User)\n\n` +
                `${UNIRedux.arrow} ❌ | That name’s taken! Try something unique.`,
              noRibbonUI: true,
            },
            style2
          );
        }

        const isPreviousName =
          usernameHistory.includes(newName) && newName !== oldName;

        if (!usernameHistory.includes(newName)) {
          usernameHistory.push(newName);
          while (usernameHistory.length > 30) {
            usernameHistory.shift();
          }
        }

        const userCassExpress = new CassExpress(cassExpress);

        userCassExpress.createMail({
          title: `🍃 Name Changed`,
          author: input.senderID,
          body:
            `Your name has been updated!\n\n` +
            `${UNIRedux.arrow} Old Name: **${oldName}**\n` +
            `${UNIRedux.arrowFromT} New Name: **${newName}**\n` +
            `${
              isPreviousName
                ? `${UNIRedux.arrowFromT} Note: You’ve used this name before!\n`
                : ""
            }` +
            `${UNIRedux.arrowFromT} Changed on: ${new Date().toLocaleString()}`,
          timeStamp: Date.now(),
        });

        await money.set(input.senderID, {
          name: newName,
          usernameHistory,
          cassExpress: userCassExpress.raw(),
        });

        return output.replyStyled(
          {
            body:
              `👤 ***${oldName}*** => **${newName}**\n\n` +
              `${UNIRedux.arrow} ✅ | Your name is now "**${newName}**"!\n` +
              `${
                isPreviousName
                  ? `${UNIRedux.arrowFromT} Back to an old favorite, huh?\n`
                  : ""
              }` +
              `${UNIRedux.arrowFromT} Check your mail for details!`,
            noRibbonUI: true,
          },
          style2
        );
      },
    },

    {
      key: "count",
      description:
        "Lists the total number of users and visualizes user statistics",
      aliases: ["-c"],
      async handler({ output, money }) {
        const allUsers = await money.getAll();
        const userCount = Object.keys(allUsers).length;
        const formattedUserCount = pCy(userCount);

        let maxStats = {};
        let maxUsers = {};

        for (const userID in allUsers) {
          const userData = allUsers[userID];
          for (const [key, value] of Object.entries(userData)) {
            if (typeof value === "number") {
              if (!(key in maxStats) || value > maxStats[key]) {
                maxStats[key] = value;
                maxUsers[key] = userData.name || "Unregistered";
              }
            }
          }
        }

        let statsResult = "User with the highest stats in each category:\n\n";
        for (const [key, value] of Object.entries(maxStats)) {
          const formattedValue = pCy(value);
          statsResult += `✓ **${maxUsers[key]}** has the highest **${key}** with a value of **${formattedValue}**.\n\n`;
        }

        const result = `There are **${formattedUserCount}** users in the **Cassidy Chatbot System.**\n\n${statsResult}`;

        output.reply(result);
      },
    },
    {
      key: "download",
      description: "Uploads your data and sends a Pastebin URL.",
      aliases: ["-bin"],
      args: ["<optional_id>"],
      async handler({ input, output, money, args }) {
        const ID = args.length > 0 ? args[0] : input.detectID || input.senderID;

        const userData = await money.getItem(ID);

        if (!userData.name) {
          return output.reply(`User not found.`);
        }
        const fileContent = JSON.stringify(userData, null, 2);

        try {
          const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");
          const url = await client.createPaste({
            code: fileContent,
            // @ts-ignore
            expireDate: "N",
            format: "json",
            name: `${ID}.json`,
            publicity: 1,
          });
          const raw = url.replaceAll("pastebin.com/", "pastebin.com/raw/");

          return output.reply(
            `✅ | Uploaded to Pastebin!\n\n**Name:** ${userData.name}\n**URL:** ${raw}`
          );
        } catch (error) {
          return output.error(error);
        }
      },
    },
  ]
);

export async function entry(ctx) {
  return home.runInContext(ctx);
}
