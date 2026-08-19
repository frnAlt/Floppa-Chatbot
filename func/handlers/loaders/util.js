/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
*/
export function isValidVersion(version) {
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const matches = version.match(versionRegex);
  if (!matches) {
    return false;
  }
  const [, major, minor, patch] = matches;
  return parseInt(major) >= 1 && parseInt(minor) >= 0 && parseInt(patch) >= 0;
}

export function incrementVersion(version) {
  let [major = 1, minor = 0, patch = 0] = version.split(".").map((i) => {
    let result = parseInt(i);
    if (isNaN(result)) {
      result = 0;
    }
    return result;
  });
  if (major === 0) {
    major = 1;
  }

  patch++;

  if (patch === 10) {
    minor++;
    patch = 0;
  }

  if (minor === 10) {
    major++;
    minor = 0;
    patch = 0;
  }

  return `${major}.${minor}.${patch}`;
}

export function deprecationWarning(inputVer = "1.0.0") {
  const ver = global.package.version ?? "1.0.0";
  if (!checkCompatibility(inputVer, ver)) {
    global.logger(
      "DEPRECATED",
      `Warning: Any version below ${ver} is now marked as deprecated and may not work properly.`
    );
  }
}

export function checkCompatibility(reqVer, supVer) {
  const cleanReq = reqVer.replace(/^[\^v]/, "");
  const cleanSup = supVer.replace(/^[\^v]/, "");

  const addTrailingZeros = (version) => {
    const parts = version.split(".");
    while (parts.length < 3) {
      parts.push("0");
    }
    return parts.join(".");
  };

  const reqParts = addTrailingZeros(cleanReq).split(".").map(Number);
  const supParts = addTrailingZeros(cleanSup).split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if (reqParts[i] > supParts[i]) return false;
    else if (reqParts[i] < supParts[i]) return true;
  }
  return true;
}

import fs from "fs";
import axios from "axios";
import { exec } from "child_process";

export function packageInstallerErr(error) {
  const { message, code } = error;
  if (code !== "MODULE_NOT_FOUND") {
    return null;
  }
  const packageRegex = /Cannot find module '(.*?)'/;
  const packageName = message.match(packageRegex)[1];
  if (!packageName) {
    return null;
  }
  if (packageName.startsWith("./") || packageName.startsWith("../")) {
    return null;
  }
  console.log(`Installing package: ${packageName}`);
  return packageInstaller(packageName);
}

export function packageInstaller(name, version) {
  return new Promise((res) => {
    let result = "";
    const child = exec(
      `
npm install ${name}${version ? `@${version}` : ""}
npm install`.trim(),
      (error, stdout, stderr) => {
        if (stdout) {
          result += stdout;
        }
        if (stderr) {
          result += stderr;
        }
        if (error) {
          result += error;
        }
      }
    );
    child.on("exit", () => {
      //console.log(result);
      return res(result || "No result");
    });
  });
}

export async function getNeanMartPlugin(plugin) {
  const url = `https://neanmart-botcmds.onrender.com/rplugins/${encodeURIComponent(
    plugin
  )}`;
  global.logger(`Installing plugin '${plugin}'...`, "NeanMart");
  try {
    const response = await axios.get(url);
    const text = String(response.data);
    let fileName = plugin.replace(/ /g, "_");
    while (fs.existsSync(`CommandFiles/plugins/${fileName}.js`)) {
      fileName += "_";
    }
    fs.writeFileSync(`CommandFiles/plugins/${fileName}.js`, text);
    global.logger(`Installed plugin '${plugin}'!`, "NeanMart");
  } catch (error) {
    global.logger(
      `Failed to install plugin '${plugin}'! Error: ${error.message}`,
      "NeanMart"
    );
    throw error;
  }
}
