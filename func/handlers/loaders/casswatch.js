import fs from "fs";
import path from "path";
import { incrementVersion } from "./util.js";

const commandsPath = path.join("CommandFiles", "commands");
const commandVerPath = path.join("casswatch");
global.CassWatch = {
  fileStrings: new Map(),
  fileVersions: new Map(),
};

export async function cassWatchJob({
  commandData,
  fileName,
  version: newVersion,
}) {
  const { fileStrings, fileVersions } = global.CassWatch;
  try {
    const isEnabled = global.Cassidy.config.CASS_WATCH?.enabled === true;
    if (!isEnabled) {
      return;
    }

    const fileBaseName = path.basename(fileName, path.extname(fileName));
    const fileExtension = path.extname(fileName);
    const versionDir = path.join(commandVerPath, fileBaseName);
    const currentFilePath = path.join(commandsPath, fileName);

    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    let oldVersion = "1.0.0";
    let currentFileContent = await fs.promises.readFile(
      currentFilePath,
      "utf-8",
    );
    let oldFileContent = null;

    const backupFiles = fs
      .readdirSync(versionDir)
      .filter((f) => f.endsWith(fileExtension));
    const backupFiles2 = fs
      .readdirSync(versionDir)
      .filter((f) => f.endsWith(fileExtension));

    if (backupFiles.length > 0) {
      const latestBackupFile = backupFiles.sort().pop();
      const latestBackupFilePath = path.join(versionDir, latestBackupFile);
      oldFileContent = await fs.promises.readFile(
        latestBackupFilePath,
        "utf-8",
      );
      oldVersion = path.basename(latestBackupFile, fileExtension);
      fileVersions.set(fileName, backupFiles2.sort());
    }

    if (!oldFileContent) {
      const backupFilePath = path.join(
        versionDir,
        `${newVersion}${fileExtension}`,
      );
      await fs.promises.writeFile(backupFilePath, currentFileContent);
      //global.logger(`No backup found, created initial backup with version ${newVersion}`, "cassWatchJob");
      return;
    }

    if (currentFileContent !== oldFileContent) {
      const updatedVersion = incrementVersion(oldVersion);
      const updatedContent = currentFileContent.replaceAll(
        newVersion,
        updatedVersion,
      );
      fileStrings.set(fileName, updatedContent);
      const backupFilePath = path.join(
        versionDir,
        `${updatedVersion}${fileExtension}`,
      );

      await fs.promises.writeFile(currentFilePath, updatedContent);
      await fs.promises.writeFile(backupFilePath, updatedContent);
      global.logger(
        `File content changed. Incremented version to ${updatedVersion} and updated backup.`,
        "cassWatchJob",
      );
    } else {
      fileStrings.set(fileName, currentFileContent);
      //global.logger("File content is the same as the latest backup. No changes made.", "cassWatchJob");
    }
  } catch (error) {
    global.logger(`Error in cassWatchJob: ${error.message}`, "cassWatchJob");

    if (currentFileContent && oldFileContent) {
      try {
        await fs.promises.writeFile(currentFilePath, oldFileContent);
        global.logger("Reverted current file content.", "cassWatchJob");
      } catch (revertError) {
        global.logger(
          `Error reverting current file content: ${revertError.message}`,
          "cassWatchJob",
        );
      }
    }
  }
}
