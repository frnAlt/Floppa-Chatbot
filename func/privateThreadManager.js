/**
 * @author frnAlt / Gtajisan (Farhan Muh Tasim)
 * ! Floppa Private DM Thread Manager
 * ! Solves Facebook Messenger E2EE (1545116 / cutoverHandleInvalidSendToOpen) by providing
 * ! dedicated 2-person unencrypted private rooms for direct messaging.
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");

const DATA_FILE = path.join(process.cwd(), "database/data/private_dm_threads.json");

class PrivateThreadManager {
  constructor() {
    this.threadsMap = new Map();
    this.inFlightCreations = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readJsonSync(DATA_FILE);
        if (raw && typeof raw === "object") {
          for (const [uid, tid] of Object.entries(raw)) {
            if (uid && tid) {
              this.threadsMap.set(String(uid), String(tid));
            }
          }
        }
      }
    } catch (err) {
      console.error("[PRIVATE_DM] Failed to load private threads store:", err.message);
    }
  }

  save() {
    try {
      const obj = {};
      for (const [uid, tid] of this.threadsMap.entries()) {
        obj[uid] = tid;
      }
      fs.writeJsonSync(DATA_FILE, obj, { spaces: 2 });
    } catch (err) {
      console.error("[PRIVATE_DM] Failed to save private threads store:", err.message);
    }
  }

  getPrivateThread(senderUID) {
    if (!senderUID) return null;
    const uid = String(senderUID);

    // 1. Direct in-memory lookup
    if (this.threadsMap.has(uid)) {
      return this.threadsMap.get(uid);
    }

    // 2. Discover from existing threads in global.db.allThreadData
    if (global.db && Array.isArray(global.db.allThreadData)) {
      const botID = String(global.botID || global.GoatBot?.botID || "");
      const found = global.db.allThreadData.find(t => {
        if (!t || !t.isGroup || !Array.isArray(t.members)) return false;
        const memberUIDs = t.members.map(m => String(m.userID || m.id || m));
        const hasUser = memberUIDs.includes(uid);
        const isTwoPerson = memberUIDs.length === 2 && (!botID || memberUIDs.includes(botID));
        const isFloppaPrivate = t.threadName && t.threadName.toLowerCase().startsWith("floppa private");
        return hasUser && (isTwoPerson || isFloppaPrivate);
      });

      if (found && found.threadID) {
        const tid = String(found.threadID);
        this.threadsMap.set(uid, tid);
        this.save();
        return tid;
      }
    }

    return null;
  }

  registerPrivateThread(senderUID, threadID) {
    if (!senderUID || !threadID) return;
    this.threadsMap.set(String(senderUID), String(threadID));
    this.save();
  }

  async getOrCreatePrivateThread(api, senderUID, userName = "") {
    if (!senderUID) return null;
    const uid = String(senderUID);

    // Check if already known
    const existing = this.getPrivateThread(uid);
    if (existing) {
      return existing;
    }

    // Deduplicate concurrent creation requests for the same user
    if (this.inFlightCreations.has(uid)) {
      return await this.inFlightCreations.get(uid);
    }

    const creationPromise = (async () => {
      try {
        if (!api || typeof api.createNewGroup !== "function") {
          return null;
        }

        const myID = String(api.getCurrentUserID?.() || global.botID || "");
        if (uid === myID) {
          return null;
        }

        const title = "Floppa Private: " + (userName ? userName.trim() : `User ${uid}`);
        const newThreadID = await api.createNewGroup([uid], title);

        if (newThreadID) {
          const tid = String(newThreadID);
          this.threadsMap.set(uid, tid);
          this.save();

          // Pre-populate global.db so controllers know about this new thread immediately
          if (global.db && Array.isArray(global.db.allThreadData)) {
            const alreadyInDB = global.db.allThreadData.some(t => String(t.threadID) === tid);
            if (!alreadyInDB) {
              global.db.allThreadData.push({
                threadID: tid,
                threadName: title,
                adminIDs: [myID],
                members: [
                  { userID: myID, inGroup: true, permissionConfigDashboard: true },
                  { userID: uid, inGroup: true, permissionConfigDashboard: false }
                ],
                settings: {},
                data: {},
                isGroup: true
              });
            }
          }

          return tid;
        }
      } catch (err) {
        console.error(`[PRIVATE_DM] Failed to create private thread for ${uid}:`, err.message || err);
      } finally {
        this.inFlightCreations.delete(uid);
      }
      return null;
    })();

    this.inFlightCreations.set(uid, creationPromise);
    return await creationPromise;
  }
}

const privateThreadManager = new PrivateThreadManager();

// Seed known verified private thread for Farhan Muh Tasim (100094924471568)
privateThreadManager.registerPrivateThread("100094924471568", "1089640446736327");

global.privateThreadManager = privateThreadManager;

module.exports = privateThreadManager;
