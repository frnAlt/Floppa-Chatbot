/**
 * @author frnAlt & Gtajisan
 * Safe Atomic JSON File Storage Engine (database/controller/safeStorage.js)
 * 
 * Guarantees crash-proof persistence:
 * 1. Atomic write via temporary file + atomic filesystem rename (POSIX atomic rename).
 * 2. Automatic .bak backup management before every modification.
 * 3. Automatic corruption recovery: If primary file is corrupted or truncated, auto-recovers from .bak.
 * 4. Safe read fallback to prevent fatal startup crashes.
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

const DEFAULT_OPTIONS = {
  spaces: 2,
  EOL: "\n"
};

/**
 * Safely read a JSON file with automatic corruption detection and backup recovery.
 * @param {string} filePath Absolute or relative path to the JSON file
 * @param {*} defaultValue Fallback value if neither primary nor backup can be read (default: [])
 * @returns {*} Parsed JSON data
 */
function readJSONSafe(filePath, defaultValue = []) {
  const absPath = path.resolve(filePath);
  const backupPath = `${absPath}.bak`;

  // 1. Attempt primary file read
  try {
    if (fs.existsSync(absPath)) {
      const stats = fs.statSync(absPath);
      if (stats.size > 0) {
        return fs.readJsonSync(absPath);
      }
    }
  } catch (err) {
    console.warn(`[SAFE_STORAGE] Primary file "${path.basename(absPath)}" corrupted or invalid (${err.message}). Attempting backup recovery...`);
  }

  // 2. Attempt backup recovery
  try {
    if (fs.existsSync(backupPath)) {
      const stats = fs.statSync(backupPath);
      if (stats.size > 0) {
        const recovered = fs.readJsonSync(backupPath);
        console.info(`[SAFE_STORAGE] Successfully recovered "${path.basename(absPath)}" from valid backup!`);
        // Restore primary from valid backup
        writeJSONSafeSync(absPath, recovered);
        return recovered;
      }
    }
  } catch (bakErr) {
    console.error(`[SAFE_STORAGE] Backup file "${path.basename(backupPath)}" also unreadable: ${bakErr.message}`);
  }

  // 3. Fallback: Initialize with safe default value
  try {
    writeJSONSafeSync(absPath, defaultValue);
  } catch (_) {}

  return defaultValue;
}

/**
 * Synchronously write JSON data atomically using temp file + atomic rename.
 * Creates a .bak backup of the existing file prior to replacement.
 * @param {string} filePath Target file path
 * @param {*} data Data to serialize
 * @param {object} options fs-extra write options
 */
function writeJSONSafeSync(filePath, data, options = DEFAULT_OPTIONS) {
  const absPath = path.resolve(filePath);
  const dir = path.dirname(absPath);
  fs.ensureDirSync(dir);

  const rand = Math.random().toString(36).slice(2, 8);
  const tempPath = `${absPath}.tmp.${Date.now()}.${rand}`;
  const backupPath = `${absPath}.bak`;

  // 1. Write completely to temporary file
  fs.writeJsonSync(tempPath, data, options);

  // 2. If target already exists and is non-empty, preserve as .bak
  try {
    if (fs.existsSync(absPath)) {
      const stat = fs.statSync(absPath);
      if (stat.size > 0) {
        fs.copyFileSync(absPath, backupPath);
      }
    }
  } catch (_) {}

  // 3. Atomic rename replaces target atomically in POSIX/Linux
  fs.renameSync(tempPath, absPath);

  // 4. Ensure backup exists even if this was the initial write
  try {
    if (!fs.existsSync(backupPath) && fs.existsSync(absPath)) {
      fs.copyFileSync(absPath, backupPath);
    }
  } catch (_) {}
}

/**
 * Asynchronously write JSON data atomically.
 * @param {string} filePath Target file path
 * @param {*} data Data to serialize
 * @param {object} options fs-extra write options
 */
async function writeJSONSafe(filePath, data, options = DEFAULT_OPTIONS) {
  const absPath = path.resolve(filePath);
  const dir = path.dirname(absPath);
  await fs.ensureDir(dir);

  const rand = Math.random().toString(36).slice(2, 8);
  const tempPath = `${absPath}.tmp.${Date.now()}.${rand}`;
  const backupPath = `${absPath}.bak`;

  // 1. Write completely to temporary file
  await fs.writeJson(tempPath, data, options);

  // 2. Preserve backup
  try {
    if (await fs.pathExists(absPath)) {
      const stat = await fs.stat(absPath);
      if (stat.size > 0) {
        await fs.copyFile(absPath, backupPath);
      }
    }
  } catch (_) {}

  // 3. Atomic rename
  await fs.rename(tempPath, absPath);

  // 4. Ensure backup exists even if this was the initial write
  try {
    if (!(await fs.pathExists(backupPath)) && (await fs.pathExists(absPath))) {
      await fs.copyFile(absPath, backupPath);
    }
  } catch (_) {}
}

module.exports = {
  readJSONSafe,
  writeJSONSafeSync,
  writeJSONSafe,
  DEFAULT_OPTIONS
};
