// @ts-check
import { CLIParser } from "@cass-modules/cliparser";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "casscli",
  author: "@lianecagara",
  description:
    "CassCLI is a command-line interface subsystem for interacting with the Cassidy Redux chatbot. It allows users to input and execute commands in a terminal-like environment, enabling a powerful and streamlined experience for managing bot functions and settings.",
  usage:
    "Use CassCLI to interact with the bot using simple text-based commands. Example usage: `casscli > help`, `casscli > status`, `casscli > list commands`.",
  version: "1.0.0",
  role: 0,
  botAdmin: false,
  noPrefix: false,
  requirement: "3.0.0",
  otherNames: ["ccli", "cbox", "cassbox"],
  waitingTime: 0.01,
  icon: ">_",
  category: "System",
  noLevelUI: true,
};

import util from "util";
import { VirtualFiles } from "../plugins/neax-ui.js";
import path from "path";
import axios from "axios";
const { TextEncoder } = util;

export const style = {
  title: ">_ CassCLI",
  titleFont: "bold",
  contentFont: "none",
};

/**
 * @param {CommandContext} ctx
 */
export async function entry({ input, output, money }) {
  const parser = new CLIParser();
  const userData = await money.getItem(input.senderID);
  const vf = new VirtualFiles(userData.virtualFiles ?? []);

  async function onlyAdmin() {
    if (!input.isAdmin) {
      await output.reply("error: no permission.");
      return true;
    }
    return false;
  }

  parser.registerCommand({
    command: "moneyset",
    usage: "moneyset <uid | 'self'> <money>",
    description: "Modifies user balance.",
    async handler() {
      if (await onlyAdmin()) return;
    },
  });

  parser.registerCommand({
    command: "stateget",
    usage: "stateget <uid | 'self'> <key | 'all'>",
    description:
      "Retrieve information about the specified user's state from the database. You can query either your own state or the state of another user using their UID. The query returns the value associated with the given key.",
    async handler({ args }) {
      if (!input.isAdmin) {
        return `error not admin`;
      }
      if (args.length < 3) {
        return `error: missing arguments. Usage: ${this.usage}`;
      }

      const uid = args[1] === "self" ? input.senderID : args[1];

      if (!uid || typeof uid !== "string" || uid.trim() === "") {
        return `error: invalid UID. Please provide a valid UID or 'self'.`;
      }

      const data = uid === input.senderID ? userData : await money.getItem(uid);

      if (!data) {
        return `error: no data found for user with UID: ${uid}.`;
      }

      const key = args[2] === "all" || !args[1] ? "all" : args[2];

      const keys = args.slice(2);

      let target = data;
      if (key !== "all") {
        for (const {} of keys) {
          target = target[key];
        }
      }

      return `${util.inspect(target, { showHidden: false, depth: 1 })}`;
    },
  });

  parser.registerCommand({
    command: "curl",
    usage: "curl <url> [options]",
    description:
      "Fetch content from a URL with complex options like headers, methods, body, etc.",
    async handler({ args }) {
      const url = args[1];
      if (!url) {
        return "Error: URL is required.";
      }

      let options = {
        method: "GET",
        headers: {},
        timeout: 10000,
        params: {},
      };

      let i = 2;
      while (i < args.length) {
        const arg = args[i];

        if (arg === "-X" || arg === "--request") {
          const method = args[++i]?.toUpperCase();
          if (method) options.method = method;
        } else if (arg === "-H" || arg === "--header") {
          const header = args[++i];
          if (header && header.includes(":")) {
            const [key, value] = header.split(":");
            options.headers[key.trim()] = value.trim();
          }
        } else if (arg === "-d" || arg === "--data") {
          const data = args[++i];
          if (data) options.data = data;
        } else if (arg === "--max-time") {
          const timeout = parseInt(args[++i], 10);
          if (!isNaN(timeout)) options.timeout = timeout * 1000;
        } else if (arg === "-L" || arg === "--location") {
          options.maxRedirects = 5;
        } else if (arg === "-u" || arg === "--user") {
          const userCreds = args[++i];
          if (userCreds) {
            const [username, password] = userCreds.split(":");
            options.auth = {
              username: username.trim(),
              password: password.trim(),
            };
          }
        } else if (arg === "--data-urlencode") {
          const param = args[++i];
          if (param) {
            const [key, value] = param.split("=");
            options.params[key.trim()] = value.trim();
          }
        }

        i++;
      }

      try {
        const response = await axios(url, options);

        if (response.status >= 200 && response.status < 300) {
          return `Response from ${url}:\n${JSON.stringify(
            response.data,
            null,
            2
          ).substring(0, 1000)}...`;
        } else {
          return `Error: Failed to fetch ${url}. Status: ${response.status}`;
        }
      } catch (error) {
        if (error.response) {
          return `Error: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
          return "Error: No response received.";
        } else {
          return `Error: ${error.message}`;
        }
      }
    },
  });

  const os = require("os");

  parser.registerCommand({
    command: "top",
    usage: "top [options]",
    description:
      "Displays real-time information about system resources and memory usage, simulating CPU usage based on memory usage.",
    async handler({ args }) {
      const options = {
        sortBy: "cpu",
        interval: 3,
      };

      let i = 1;
      while (i < args.length) {
        const arg = args[i];

        if (arg === "-s" || arg === "--sort") {
          const sortOption = args[++i];
          if (sortOption && (sortOption === "cpu" || sortOption === "memory")) {
            options.sortBy = sortOption;
          }
        } else if (arg === "-i" || arg === "--interval") {
          const interval = parseInt(args[++i], 10);
          if (!isNaN(interval) && interval > 0) options.interval = interval;
        }

        i++;
      }

      try {
        const systemStats = {
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
          loadAverage: os.loadavg(),
          uptime: os.uptime(),
          cpuCount: os.cpus().length,
        };

        const memoryUsedPercentage =
          ((systemStats.totalMemory - systemStats.freeMemory) /
            systemStats.totalMemory) *
          100;

        const simulatedCpuUsage = Math.min(
          100,
          Math.max(0, memoryUsedPercentage)
        );

        return `Top System Stats (sorted by ${
          options.sortBy
        }):\nFree Memory: ${(systemStats.freeMemory / 1024 / 1024).toFixed(
          2
        )} MB\nTotal Memory: ${(systemStats.totalMemory / 1024 / 1024).toFixed(
          2
        )} MB\nLoad Average: ${systemStats.loadAverage.join(", ")}\nUptime: ${
          systemStats.uptime
        } seconds\nCPU Count: ${
          systemStats.cpuCount
        }\nSimulated CPU Usage (based on memory usage): ${simulatedCpuUsage.toFixed(
          2
        )}%`;
      } catch (error) {
        return `Error: Unable to retrieve system stats. ${error.message}`;
      }
    },
  });

  parser.registerCommand({
    command: "uname",
    usage: "uname [options]",
    description:
      "Displays system information such as OS name, version, and architecture.",
    async handler({ args }) {
      const options = {
        all: false,
        kernelName: false,
        nodeVersion: false,
      };

      let i = 1;
      while (i < args.length) {
        const arg = args[i];

        if (arg === "-a" || arg === "--all") {
          options.all = true;
        } else if (arg === "-s" || arg === "--kernel-name") {
          options.kernelName = true;
        } else if (arg === "-v" || arg === "--node-version") {
          options.nodeVersion = true;
        }

        i++;
      }

      try {
        let result = "";

        if (options.all) {
          result = `OS: ${os.type()} ${os.release()} (${os.arch()})\nNode.js Version: ${
            process.version
          }\nUptime: ${os.uptime()} seconds`;
        } else {
          if (options.kernelName) {
            result += `Kernel: ${os.type()}\n`;
          }
          if (options.nodeVersion) {
            result += `Node.js Version: ${process.version}\n`;
          }
        }

        return (
          result ||
          "Error: Invalid option. Use '-a' for all info, '-s' for kernel name, or '-v' for node version."
        );
      } catch (error) {
        return `Error: Unable to retrieve system information. ${error.message}`;
      }
    },
  });

  parser.registerCommand({
    command: "ls",
    usage: "ls [options] <optional path>",
    description:
      "Lists the contents of a directory with complex options. If no path is specified, it lists the contents of the root directory.",
    async handler({ args }) {
      let directoryPath =
        args[args.length - 1] === "ls" ? "/" : args[args.length - 1];
      let options = {
        longFormat: false,
        showHidden: false,
        humanReadable: false,
        recursive: false,
        sortBy: "name",
      };

      for (let i = 1; i < args.length - 1; i++) {
        const arg = args[i];

        switch (arg) {
          case "-l":
            options.longFormat = true;
            break;
          case "-a":
            options.showHidden = true;
            break;
          case "-h":
            options.humanReadable = true;
            break;
          case "-R":
            options.recursive = true;
            break;
          case "--sort":
            const sortOption = args[++i];
            if (sortOption && ["name", "size", "time"].includes(sortOption)) {
              options.sortBy = sortOption;
            }
            break;
        }
      }

      try {
        let items = await vf.readdir(directoryPath);
        if (!options.showHidden) {
          items = items.filter((item) => !item.startsWith("."));
        }

        if (options.sortBy === "size") {
          items.sort(
            (a, b) =>
              vf.stat(path.join(directoryPath, a)).size -
              vf.stat(path.join(directoryPath, b)).size
          );
        } else {
          items.sort();
        }

        if (options.longFormat) {
          const fileDetails = items.map((item) => {
            const stats = vf.stat(path.join(directoryPath, item));
            let fileSize = stats.size;
            if (options.humanReadable) {
              // @ts-ignore
              fileSize = humanReadableSize(fileSize);
            }
            // @ts-ignore
            return `${stats.mode.toString(8)} ${stats.nlink} ${stats.uid} ${
              // @ts-ignore
              stats.gid
            } ${fileSize} ${
              // @ts-ignore
              stats.mtime.toLocaleString()
            } ${item}`;
          });

          return fileDetails.join("\n");
        } else {
          return items.join("  ");
        }
      } catch (error) {
        return `Error: Unable to list directory contents. ${error.message}`;
      }
    },
  });

  function humanReadableSize(size) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  parser.registerCommand({
    command: "cat",
    usage: "cat <path>",
    description: "Displays the content of a file at the specified path.",
    async handler({ args }) {
      const path = args[1];
      const data = vf.readFile(path);
      return data;
    },
  });

  const MAX_FILE_SIZE = 100 * 1024;
  parser.registerCommand({
    command: "write",
    usage: "write <path> <content>",
    description:
      "Writes content to a virtual file at the specified path, with a 100KB size limit.",
    async handler({ args }) {
      const path = args[1];
      const content = args.slice(2).join(" ");

      if (new TextEncoder().encode(content).length > MAX_FILE_SIZE) {
        return "Error: File content exceeds the 100KB size limit.";
      }

      await vf.writeFile(path, content);
      await money.set(input.senderID, {
        virtualFiles: vf.raw(),
      });
      return `File ${path} has been updated with new content.`;
    },
  });

  parser.registerCommand({
    command: "rm",
    usage: "rm <options> <path>...",
    description:
      "Removes virtual files or directories with complex options (e.g., -r, -f, -i).",
    async handler({ args }) {
      let options = {
        recursive: false,
        force: false,
        interactive: false,
      };
      let paths = [];
      let i = 1;

      while (i < args.length) {
        const arg = args[i];

        if (arg === "-r" || arg === "--recursive") {
          options.recursive = true;
        } else if (arg === "-f" || arg === "--force") {
          options.force = true;
        } else if (arg === "-i" || arg === "--interactive") {
          options.interactive = true;
        } else {
          paths.push(arg);
        }
        i++;
      }

      if (paths.length === 0) {
        return "Error: At least one path is required.";
      }

      let results = [];

      for (const path of paths) {
        if (!vf.exists(path)) {
          if (!options.force) {
            results.push(`Error: File ${path} does not exist.`);
          } else {
            results.push(`Warning: File ${path} does not exist, skipping.`);
          }
          continue;
        }

        if (vf.isDirectory(path) && options.recursive) {
          try {
            const files = vf.readdir(path);
            files.forEach((file) => {
              const filePath = `${path}/${file}`;
              if (vf.isDirectory(filePath)) {
                vf.rmdir(filePath);
              } else {
                vf.unlink(filePath);
              }
            });
            vf.rmdir(path);
            results.push(
              `Directory ${path} and its contents have been successfully removed.`
            );
          } catch (error) {
            results.push(
              `Error: Failed to remove directory ${path}. ${error.message}`
            );
          }
        } else if (vf.isDirectory(path) && !options.recursive) {
          results.push(
            `Error: Directory ${path} is not empty, use -r for recursive removal.`
          );
        } else {
          try {
            vf.unlink(path);
            results.push(`File ${path} has been successfully removed.`);
          } catch (error) {
            results.push(
              `Error: Failed to remove file ${path}. ${error.message}`
            );
          }
        }
      }

      return results.join("\n");
    },
  });

  parser.registerCommand({
    command: "echo",
    usage: "echo <message> or echo <message> >> <file-path>",
    description: "Echoes a message or redirects content to a file using >>.",
    async handler({ args }) {
      const redirectIndex = args.indexOf(">>");

      if (redirectIndex === -1) {
        if (args.length < 2) {
          return "Error: No message provided. Usage: echo <message>";
        }
        const message = args.slice(1).join(" ");
        return message;
      }

      const content = args.slice(0, redirectIndex).join(" ");
      const filePath = args[redirectIndex + 1];

      if (!filePath) {
        return "Error: Missing file path after >>.";
      }

      if (!content) {
        return "Error: Missing content before >>.";
      }

      if (!vf.exists(filePath)) {
        return `Error: File ${filePath} does not exist.`;
      }

      const existingContent = vf.readFile(filePath);
      const newContent = existingContent + "\n" + content;

      vf.writeFile(filePath, newContent);

      await money.set(input.senderID, {
        virtualFiles: vf.raw(),
      });

      return `Content has been successfully added to ${filePath}.`;
    },
  });

  parser.registerCommand({
    command: "mv",
    usage: "mv <old-path> <new-path>",
    description: "Renames a virtual file from <old-path> to <new-path>.",
    async handler({ args }) {
      if (args.length < 3) {
        return "Error: Missing arguments. Usage: mv <old-path> <new-path>";
      }

      const oldPath = args[1];
      const newPath = args[2];

      if (!vf.exists(oldPath)) {
        return `Error: File ${oldPath} does not exist.`;
      }

      if (vf.exists(newPath)) {
        return `Error: File ${newPath} already exists.`;
      }

      const content = vf.readFile(oldPath);

      vf.writeFile(newPath, String(content));

      vf.unlink(oldPath);

      await money.set(input.senderID, {
        virtualFiles: vf.raw(),
      });

      return `File has been renamed from ${oldPath} to ${newPath}.`;
    },
  });

  parser.registerCommand({
    command: "help",
    usage: "help <optional command>",
    description:
      "Displays help information for a specific command or all commands.",
    async handler({ args }) {
      return `**Welcome to CassidyCLI v${
        meta.version
      }**\n\n***Available Commands:***\n\n${parser.showHelp(args[1] || null)}`;
    },
  });
  parser.registerCommand({
    command: "date",
    usage: "date",
    description: "Displays the current system date and time.",
    async handler() {
      const currentDate = new Date().toLocaleString();
      return `Current system date and time: ${currentDate}`;
    },
  });
  parser.registerCommand({
    command: "head",
    usage: "head <path> [number-of-lines]",
    description: "Displays the first few lines of a file. Default is 10 lines.",
    async handler({ args }) {
      const path = args[1];
      const numLines = parseInt(args[2]) || 10;
      if (!vf.exists(path)) {
        return `Error: File ${path} does not exist.`;
      }
      const content = String(vf.readFile(path))
        .split("\n")
        .slice(0, numLines)
        .join("\n");
      return content;
    },
  });

  parser.registerCommand({
    command: "tail",
    usage: "tail <path> [number-of-lines]",
    description: "Displays the last few lines of a file. Default is 10 lines.",
    async handler({ args }) {
      const path = args[1];
      const numLines = parseInt(args[2]) || 10;
      if (!vf.exists(path)) {
        return `Error: File ${path} does not exist.`;
      }
      const content = String(vf.readFile(path))
        .split("\n")
        .slice(-numLines)
        .join("\n");
      return content;
    },
  });
  parser.registerCommand({
    command: "pwd",
    usage: "pwd",
    description: "Displays the current working directory.",
    async handler() {
      return "Current working directory: /";
    },
  });

  parser.registerCommand({
    command: "touch",
    usage: "touch <path>",
    description: "Creates an empty virtual file at the specified path.",
    async handler({ args }) {
      const path = args[1];
      if (vf.exists(path)) {
        return `Error: File ${path} already exists.`;
      }
      await vf.writeFile(path, "");
      await money.set(input.senderID, { virtualFiles: vf.raw() });
      return `File ${path} created successfully.`;
    },
  });

  parser.registerCommand({
    command: "cp",
    usage: "cp <source-path> <destination-path>",
    description: "Copies a file from source to destination.",
    async handler({ args }) {
      if (args.length < 3) {
        return "Error: Missing arguments. Usage: cp <source-path> <destination-path>";
      }

      const sourcePath = args[1];
      const destinationPath = args[2];

      if (!vf.exists(sourcePath)) {
        return `Error: Source file ${sourcePath} does not exist.`;
      }

      const content = vf.readFile(sourcePath);
      if (vf.exists(destinationPath)) {
        return `Error: Destination file ${destinationPath} already exists.`;
      }

      vf.writeFile(destinationPath, String(content));
      await money.set(input.senderID, { virtualFiles: vf.raw() });
      return `File copied from ${sourcePath} to ${destinationPath}.`;
    },
  });

  parser.registerCommand({
    command: "find",
    usage: "find <pattern>",
    description: "Finds files matching the given pattern.",
    async handler({ args }) {
      const pattern = args[1];
      const files = vf.readdir("/").filter((file) => file.includes(pattern));
      return files.length > 0
        ? `Files matching "${pattern}": ${files.join(" ")}`
        : `No files found matching "${pattern}".`;
    },
  });

  parser.registerCommand({
    command: "mkdir",
    usage: "mkdir <directory-path>",
    description: "Creates a new directory at the specified path.",
    async handler({ args }) {
      const path = args[1];
      if (vf.exists(path)) {
        return `Error: Directory ${path} already exists.`;
      }
      vf.mkdir(path);
      await money.set(input.senderID, { virtualFiles: vf.raw() });
      return `Directory ${path} created successfully.`;
    },
  });

  parser.registerCommand({
    command: "rmdir",
    usage: "rmdir <directory-path>",
    description: "Removes an empty directory at the specified path.",
    async handler({ args }) {
      const path = args[1];
      if (!vf.exists(path)) {
        return `Error: Directory ${path} does not exist.`;
      }
      if (vf.readdir(path).length > 0) {
        return `Error: Directory ${path} is not empty.`;
      }
      vf.rmdir(path);
      await money.set(input.senderID, { virtualFiles: vf.raw() });
      return `Directory ${path} removed successfully.`;
    },
  });

  const pt = await parser.parse(input.arguments.join(" ") || "help");
  if (pt) {
    output.reply(pt);
  }
}
