import fs from "fs";
import axios from "axios";
import { PasteClient } from "pastebin-api";
const { compareCode } = global.utils;
import path from "path";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";
import { SpectralCMDHome } from "@cassidy/spectral-home";

export const meta: Cassieah.CommandMeta = {
  name: "system",
  author: "@lianecagara",
  version: "4.0.0",
  description: "Manage system files and modules (original ver)",
  usage: "system [options]",
  role: 2,
  otherNames: ["sys"],
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "💽",
  category: "System",
};

interface Errors extends Record<string, Error> {}

export const style: Cassieah.CommandStyle = {
  title: "System 💽",
  titleFont: "bold",
  contentFont: "fancy",
};

export const entry = defineEntry(async ({ output, api, input, ctx }) => {
  let args = input.arguments;

  const system = ``;

  const {
    loadAllCommands: loadAll,
    loadPlugins,
    loadCommand,
    commands,
  } = global.Cassidy;
  const {
    fileStrings,
    fileVersions,
  }: {
    fileStrings: Map<string, string>;
    fileVersions: Map<string, string[]>;
  } = global.CassWatch;
  const commandsPath: string = "CommandFiles/commands";
  async function handleRefreshFiles(
    ffs: string[] = [],
    silent: boolean = false
  ) {
    let i: any;
    const fsp = fs.promises;
    const files = (await fsp.readdir(commandsPath)).filter(
      (i) => i.endsWith(".js") || i.endsWith(".ts")
    );
    const currentFileStrings: Map<string, string> = new Map();
    const errors: Errors = {};
    for (const key of files) {
      try {
        const filePath = path.join(commandsPath, key);
        if (!fs.existsSync(filePath)) {
          continue;
        }
        const fileContent = await fsp.readFile(filePath, "utf-8");
        currentFileStrings.set(key, fileContent);
      } catch (error) {
        console.error(error);
        errors[key] = error;
      }
    }
    let willReloads: string[] = [];
    for (const key of fileStrings.keys()) {
      if (!fs.existsSync(path.join(commandsPath, key))) {
        continue;
      }
      const a = fileStrings.get(key);
      const b = currentFileStrings.get(key);
      if (a !== b || !a) {
        willReloads.push(key);
      }
    }
    const x2 = ffs.length > 0 ? ffs : args;
    for (const key of x2) {
      if (currentFileStrings.has(key) && !willReloads.includes(key)) {
        willReloads.push(key);
      }
    }
    const reloadsSum = (
      await Promise.all(
        willReloads.map(async (x) => {
          const latestVers = fileVersions.get(x);

          let txt =
            `${UNISpectra.charm} ` +
            x +
            `@${latestVers ? latestVers[latestVers.length - 1] : "unknown"}`;
          if (args.includes(x)) {
            txt += ` [requested]`;
          } else {
            txt += ` [changed]`;
          }
          return txt;
        })
      )
    ).join("\n");
    if (false && !input.isWeb) {
      const z: any = await output.quickWaitReact(
        willReloads.length > 0
          ? `✅ We have detected ${willReloads.length} files that will be reloaded.

${reloadsSum}

React with 👍 to continue.`
          : `✅ There's nothing to reload!`,
        {
          authorOnly: true,
          emoji: "👍",
        }
      );
      i = z.self;
    }
    if (!silent) {
      if (willReloads.length <= 0) {
        if (true || input.isWeb) {
          return output.reply(`✅ There's nothing to reload!`);
        }
        return;
      }
      if (i) {
        await output.edit(`🔃 | Reloading edited commands...`, i.messageID);
      }
    }

    for (const key of willReloads) {
      try {
        const rKey = __dirname + "/" + key;
        if (!require.cache[rKey]) {
        } else {
          delete require.cache[rKey];
        }
        const rKey2 = require.resolve(path.resolve(__dirname, key));
        if (!require.cache[rKey2]) {
        } else {
          delete require.cache[rKey2];
        }
        const error = await loadCommand(key, commands, false, true);
        if (error) {
          throw error;
        }
        fileStrings.set(key, currentFileStrings.get(key));
      } catch (error: any) {
        errors[key] = error;
        console.error(error);
      }
    }
    let response = "";
    if (Object.keys(errors).length > 0) {
      const errs = errors;
      let res = `${reloadsSum}\n\n❌ | Failed to reload ${
        errs && typeof errs === "object" ? Object.keys(errs).length : 0
      } modules:\n\n`;
      await new Promise((r) => setTimeout(r, 1000));
      let num = 1;
      for (const x of Object.entries(errs)) {
        const [file, error]: [string, any] = x;
        res += `${num}. ${file}\n--> ${error}\nSTACK: ${error.stack}\n\n`;
        num++;
      }
      response = res;
    } else {
      response = `🟢 | Loaded ${willReloads.length} modules.\n\n${reloadsSum}`;
    }
    if (!silent) {
      if (i) {
        await new Promise((r) => setTimeout(r, 1000));
        await output.edit(response, i.messageID);
      } else {
        await output.reply(response);
      }
    }
  }

  function handleNotAdmin() {
    if (!input.isAdmin) {
      output.reply(`❌ | You need to be an admin to use this risky operation.`);
      return true;
    } else {
      return false;
    }
  }
  async function handleLoad(): Promise<boolean> {
    let i: any;
    if (handleNotAdmin()) {
      return false;
    }
    if (!input.isWeb) {
      const z: any = await output.quickWaitReact(
        `⚠️ | **Warning**:
Do not run this command in a server with lower resources, especially free tier in Render.com.

**Possible Dangers:**
- Your server might reach the memory limit, and will cause Bad Gateway Error (502)
- It will take more than 40 Minutes before the server is fully loaded, after the 502 error caused by reaching the memory limit.
- Obviously, your bot might not respond.

Consider using **system load** instead if you want to reload edited/installed command files (excluding plugins).

By sending a 👍 reaction, you are aware of the potential problems that might occur.`,
        {
          authorOnly: true,
          emoji: "👍",
        }
      );
      i = z.self;
    } else {
      await output.reply(`⚠️ | You cannot reload a system on web.`);
      return false;
    }
    await new Promise((r) => setTimeout(r, 1000));
    if (i) {
      await output.edit(`🔃 | Reloading all commands...`, i.messageID);
    }
    const errs1: Errors | boolean = await loadAll();
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`Commands loaded.`);
    if (i) {
      await output.edit(`🔃 | Reloading all plugins...`, i.messageID);
    }

    const errs2: Errors | boolean = await loadPlugins(
      global.Cassidy.plugins as any,
      true
    );

    console.log(`Plugins loaded`);
    const errs: Errors | boolean = {
      ...(errs1 as Errors),
      ...(errs2 as Errors),
    };
    let res: string = `❌ | Failed to reload ${
      errs && typeof errs === "object" ? Object.keys(errs).length : 0
    } modules and plugins:\n\n`;
    await new Promise<void>((r) => setTimeout(r, 1000));
    let num: number = 1;
    if (errs && Object.keys(errs).length > 0) {
      for (const x of Object.entries(errs)) {
        const [file, error]: [string, any] = x;
        res += `${num}. ${file}\n--> ${error}\nSTACK: ${error.stack}\n\n`;
        num++;
      }
      if (i) {
        await output.edit(res, i.messageID);
      } else {
        await output.reply(res);
      }
      return false;
    }
    await new Promise<void>((r) => setTimeout(r, 1000));
    if (i) {
      await output.edit(`📥 | Saving changes...`, i.messageID);
    }
    const { commands, plugins }: any = global.Cassidy as any;
    const commandsLength: number = [...new Set(Object.keys(commands))].length;
    const pluginsLength: number = [...new Set(Object.keys(plugins))].length;
    const str = `🟢 | Loaded All ${commandsLength} commands and ${pluginsLength} plugins!`;

    await new Promise<void>((r) => setTimeout(r, 1000));
    if (false) {
      await output.edit(str, i.messageID);
    } else {
      await output.reply(str);
    }
    return true;
  }

  async function deleteFile(fileName: string): Promise<boolean> {
    if (fileName === "system.ts") {
      await output.reply(`❌ | You cannot delete this file.`);
      return false;
    }
    const filePath: string = `CommandFiles/commands/${fileName}`;
    let trashPath: string = `CommandFiles/commands/trash/${fileName}`;

    if (!fs.existsSync(filePath)) {
      await output.reply(`❌ | File "${fileName}" does not exist.`);
      return false;
    }
    const backup: string = fs.readFileSync(filePath, "utf-8");

    await output.quickWaitReact(
      `⚠️ Are you sure you want to move "${fileName}" to trash?`,
      {
        edit: `✅ Moving to trash...`,
        authorOnly: true,
      }
    );
    let num = 0;
    while (fs.existsSync(trashPath)) {
      num++;
      trashPath = `CommandFiles/commands/trash/${num}_${fileName}`;
    }
    fs.writeFileSync(trashPath, backup);
    fs.unlinkSync(filePath);
    const commandKeys = Object.keys(commands).filter(
      (key) => commands[key].fileName === fileName
    );
    setTimeout(() => {
      if (commandKeys.length > 0) {
        for (const keys of commandKeys) {
          delete commands[keys];
        }
      }
    }, 5000);
    await output.reply(
      `✅ | File "${fileName}" has been moved to trash, and will be unloaded after 5 seconds..`
    );
    return true;
  }
  async function recoverTrash(
    trashName: string,
    fileName?: string
  ): Promise<boolean> {
    fileName ??= trashName;
    const trashPath: string = `CommandFiles/commands/trash/${trashName}`;
    const newPath: string = `CommandFiles/commands/${fileName ?? trashName}`;
    if (fs.existsSync(newPath)) {
      output.reply(
        `❌ | File "${newPath}" already exists in the command files, you must delete/trash it first.`
      );
      return false;
    }
    if (!fs.existsSync(trashPath)) {
      output.reply(`❌ | File "${trashPath}" does not exist in the trash.`);
      return false;
    }
    await output.quickWaitReact(
      `⚠️ Do you want to recover the trash file "${trashPath}" replacing "${newPath}" in command files?`,
      {
        edit: `✅ | File "${fileName}" has been recovered from trash.`,
        authorOnly: true,
      }
    );

    const backup: string = fs.readFileSync(trashPath, "utf-8");
    fs.writeFileSync(newPath, backup);
    await handleRefreshFiles([fileName], true);
    return true;
  }

  async function sendFile(fileName: string): Promise<boolean> {
    if (handleNotAdmin()) {
      return false;
    }

    const filePath: string = `CommandFiles/commands/${fileName}`;

    if (!fs.existsSync(filePath)) {
      await output.reply(`❌ | File "${fileName}" does not exist.`);
      return false;
    }

    await output.quickWaitReact(`⚠️ Do you want to send "${fileName}"?`, {
      edit: `✅ Sending...`,
      authorOnly: true,
    });
    const fileContent: string =
      `// ${filePath}\n\n` + fs.readFileSync(filePath, "utf-8");

    await api.sendMessage(fileContent, input.threadID);
    return true;
  }

  async function uploadToPastebin(fileName: string): Promise<boolean> {
    if (handleNotAdmin()) {
      return false;
    }

    const filePath: string = `CommandFiles/commands/${fileName}`;

    if (!fs.existsSync(filePath)) {
      await output.reply(`❌ | File "${fileName}" does not exist.`);
      return false;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");

    try {
      const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");
      const url = await client.createPaste({
        code: fileContent,
        expireDate: "N" as any,
        format: "javascript",
        name: fileName,
        publicity: 1,
      });
      await output.reply({
        body: `✅ | Uploaded "${fileName}" to Pastebin: ${url.replaceAll(
          "pastebin.com/",
          "pastebin.com/raw/"
        )}`,
        noStyle: true,
      });
      return true;
    } catch (error) {
      console.error("Failed to upload to Pastebin:", error);
      await output.reply(`❌ | Failed to upload "${fileName}" to Pastebin.`);
      return false;
    }
  }

  const home = new SpectralCMDHome(
    {
      isHypen: false,
    },
    [
      {
        key: "restart",
        aliases: ["rest"],
        icon: "❌",
        async handler() {
          if (input.isFacebook) {
            Cassidy.config.RESTART_CACHE = `${Date.now()}_${input.tid}`;
          }
          await output.reply(`♻️ Restarting...`);
          process.exit(3);
        },
      },
      {
        key: "load",
        aliases: ["l"],
        args: ["<filename1>", "[filename2]", "[...etc]"],
        icon: "🗃️",
        async handler() {
          args.shift();
          await handleRefreshFiles();
        },
      },
      {
        key: "loadall",
        aliases: ["re", "reload"],
        icon: "♻️",
        async handler() {
          if (handleNotAdmin()) {
            return false;
          }

          return await handleLoad();
        },
      },
      {
        key: "install",
        aliases: ["i"],
        icon: "📝",
        args: ["<filename>", "<...codes>"],
        async handler() {
          if (handleNotAdmin()) {
            return false;
          }

          if (!args[1].endsWith(".js") && !args[1].endsWith(".ts")) {
            await output.reply(
              `❌ | Only .js or .ts file extensions were allowed!`
            );
            return false;
          }

          const fileName: string = args[1];
          const filePath: string = `CommandFiles/commands/${fileName}`;
          let code: string = args.slice(2).join(" ");

          if (args[2].startsWith(`https://`) || args[2].startsWith(`http://`)) {
            try {
              const response = await axios.get(args[2]);
              code = response.data;
            } catch (err) {
              await output.reply(
                `❌ | Failed to download the file from the given URL.`
              );
              return false;
            }
          }

          if (fs.existsSync(filePath)) {
            const orig = fs.readFileSync(filePath, "utf-8");
            const { status, diffString } = await compareCode(code, orig);
            await output.quickWaitReact(
              `⚠️ The file ${fileName} already exists, please react with any emoji to proceed.(Your files will be automatically added to trash.)${
                status === "added"
                  ? `\n\n💻 **Cassidy Diff**\n\n${diffString}`
                  : ""
              }`,
              {
                edit: `✅ Proceeding...`,
                authorOnly: true,
              }
            );
            let trashPath = `CommandFiles/commands/trash/replace_${fileName}`;
            let num: number = 0;
            while (fs.existsSync(trashPath)) {
              num++;
              trashPath = `CommandFiles/commands/trash/${num}_replace_${fileName}`;
            }
            fs.writeFileSync(trashPath, orig);
          }

          fs.writeFileSync(filePath, code);

          await handleRefreshFiles([fileName], true);
        },
      },
      {
        key: "trash",
        aliases: ["tr"],
        icon: "🗑️",
        args: ["<filename|'list'|'recover'>", "[trashfile]", "[newfile]"],
        async handler() {
          if (args[1] === "list") {
            const files: string[] = fs.readdirSync(
              "CommandFiles/commands/trash"
            );
            await output.reply(`${system}
${files.length} file${files.length > 1 ? "s" : ""} found.

${files.join("\n")}`);
            return true;
          } else if (args[1] === "recover" && args[2]) {
            return await recoverTrash(args[2], args[3] || null);
          }
          if (!args[1]) {
            await output.reply(
              `❌ | Please specify the filename you want to move to trash.`
            );
            return false;
          }
          return await deleteFile(args[1]);
        },
      },
      {
        key: "file",
        aliases: ["f", "send"],
        icon: "📖",
        args: ["<filename>"],
        async handler() {
          if (handleNotAdmin()) {
            return false;
          }

          if (!args[1]) {
            await output.reply(`❌ | Please specify the filename to send.`);
            return false;
          }
          return await sendFile(args[1]);
        },
      },
      {
        key: "bin",
        aliases: ["b", "paste"],
        icon: "📤",
        args: ["<filename>"],
        async handler() {
          if (handleNotAdmin()) {
            return false;
          }

          if (!args[1]) {
            await output.reply(
              `❌ | Please specify the filename to upload to Pastebin.`
            );
            return false;
          }
          return await uploadToPastebin(args[1]);
        },
      },
      {
        key: "list",
        aliases: ["li", "files"],
        icon: "📃",
        async handler() {
          const files = fs.readdirSync("CommandFiles/commands");
          await output.reply(`${system}
${files.length} file${files.length > 1 ? "s" : ""} found.

${files.join("\n")}`);
        },
      },
    ]
  );

  return home.runInContext(ctx);
});
