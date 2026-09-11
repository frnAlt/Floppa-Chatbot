/**
 * @author frnAlt & Gtajisan
 * Floppa Strong Response Database Engine (database/controller/responseDB.js)
 * 
 * Provides high-performance, crash-proof persistent storage for:
 * 1. Taught & Auto-Reply Responses (trigger -> responses[]) with exact, fuzzy, and regex matching.
 * 2. High-speed AI Response Caching with TTL & LRU eviction for sub-millisecond query responses.
 * 3. Persistent Multi-Turn Conversation Memory across bot reboots.
 * 4. Safe Atomic Storage with automatic .bak backup and corruption self-healing.
 */

"use strict";

const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { readJSONSafe, writeJSONSafeSync, writeJSONSafe } = require("./safeStorage.js");

const DB_FILE = path.join(__dirname, "../data/responseDB.json");
const MAX_AI_CACHE_ITEMS = 1000;
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours
const MAX_CONTEXT_MESSAGES = 20;

class ResponseDB {
  constructor() {
    this.filePath = DB_FILE;
    this.dirty = false;
    this.flushTimer = null;

    // In-memory data store
    this.data = {
      version: "1.0.0",
      triggers: {},        // key: lowercase trigger -> { id, trigger, responses: [], isRegex, isGlobal, threadID, author, createdAt, updatedAt, usageCount }
      aiCache: {},         // key: md5 hash -> { prompt, response, provider, model, timestamp, expiresAt, hitCount }
      conversations: {},   // key: contextId -> [ { role, content, timestamp } ]
      settings: {},        // key: threadID -> { autoReply: boolean, fuzzy: boolean }
      stats: {
        totalAdded: 0,
        totalReplied: 0,
        cacheHits: 0
      }
    };

    this._init();
  }

  _init() {
    const loaded = readJSONSafe(this.filePath, this.data);
    if (loaded && typeof loaded === "object") {
      this.data = {
        version: loaded.version || "1.0.0",
        triggers: loaded.triggers || {},
        aiCache: loaded.aiCache || {},
        conversations: loaded.conversations || {},
        settings: loaded.settings || {},
        stats: {
          totalAdded: loaded.stats?.totalAdded || 0,
          totalReplied: loaded.stats?.totalReplied || 0,
          cacheHits: loaded.stats?.cacheHits || 0
        }
      };
    }

    // Clean expired AI cache items on startup
    this._cleanExpiredCache();

    // Hook process exit to flush any pending writes
    this._hookProcessExit();
  }

  _scheduleFlush() {
    this.dirty = true;
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, 2500);
    }
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.dirty) return;

    try {
      writeJSONSafeSync(this.filePath, this.data);
      this.dirty = false;
    } catch (err) {
      console.error("[RESPONSE_DB] Error writing response database:", err.message);
    }
  }

  _hookProcessExit() {
    const saveOnExit = () => {
      if (this.dirty) {
        try {
          writeJSONSafeSync(this.filePath, this.data);
          this.dirty = false;
        } catch (_) {}
      }
    };

    process.once("exit", saveOnExit);
    process.once("SIGINT", () => {
      saveOnExit();
      process.exit(0);
    });
    process.once("SIGTERM", () => {
      saveOnExit();
      process.exit(0);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. TAUGHT & AUTO-REPLY RESPONSES
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Add or extend a taught response.
   */
  add(trigger, reply, options = {}) {
    if (!trigger || !reply) throw new Error("Trigger and reply are required.");

    const cleanTrigger = String(trigger).trim();
    const cleanReply = String(reply).trim();
    if (!cleanTrigger || !cleanReply) throw new Error("Trigger and reply cannot be empty.");

    const key = cleanTrigger.toLowerCase();
    const threadID = options.threadID ? String(options.threadID) : null;
    const isGlobal = options.isGlobal !== false && !threadID;
    const author = options.author ? String(options.author) : "unknown";
    const isRegex = Boolean(options.isRegex);

    const storageKey = isGlobal ? `global:${key}` : `${threadID}:${key}`;

    if (!this.data.triggers[storageKey]) {
      this.data.triggers[storageKey] = {
        id: crypto.randomBytes(4).toString("hex"),
        trigger: cleanTrigger,
        key,
        responses: [cleanReply],
        isRegex,
        isGlobal,
        threadID,
        author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };
      this.data.stats.totalAdded++;
    } else {
      const entry = this.data.triggers[storageKey];
      if (!entry.responses.includes(cleanReply)) {
        entry.responses.push(cleanReply);
      }
      entry.updatedAt = new Date().toISOString();
      if (author !== "unknown") entry.author = author;
    }

    this._scheduleFlush();
    return this.data.triggers[storageKey];
  }

  /**
   * Match a message against stored response triggers.
   * Priority:
   * 1. Exact match in current thread
   * 2. Exact match in global triggers
   * 3. Regex match
   * 4. Keyword / contains match (min 3 chars)
   */
  get(text, options = {}) {
    if (!text || typeof text !== "string") return null;

    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();
    const threadID = options.threadID ? String(options.threadID) : null;

    // Check if auto-reply is disabled for this thread
    if (threadID && this.data.settings[threadID]?.autoReply === false) {
      return null;
    }

    let match = null;

    // 1. Exact match in thread
    if (threadID && this.data.triggers[`${threadID}:${lowerText}`]) {
      match = this.data.triggers[`${threadID}:${lowerText}`];
    }
    // 2. Exact match in global
    else if (this.data.triggers[`global:${lowerText}`]) {
      match = this.data.triggers[`global:${lowerText}`];
    }
    // 3. Regex / Fuzzy / Contains scan
    else {
      const candidates = Object.values(this.data.triggers).filter(t => {
        return t.isGlobal || (threadID && t.threadID === threadID);
      });

      // Try regex patterns first
      for (const entry of candidates) {
        if (entry.isRegex) {
          try {
            const re = new RegExp(entry.trigger, "i");
            if (re.test(cleanText)) {
              match = entry;
              break;
            }
          } catch (_) {}
        }
      }

      // Try contains/keyword match (trigger length >= 3 and surrounded by word boundary or space)
      if (!match) {
        for (const entry of candidates) {
          if (!entry.isRegex && entry.key.length >= 3) {
            const wordBoundary = new RegExp(`(^|\\s|[.,!?])${entry.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[.,!?])`, "i");
            if (wordBoundary.test(lowerText)) {
              match = entry;
              break;
            }
          }
        }
      }
    }

    if (!match || !match.responses || match.responses.length === 0) {
      return null;
    }

    // Update metrics
    match.usageCount = (match.usageCount || 0) + 1;
    this.data.stats.totalReplied++;
    this._scheduleFlush();

    // Select random response from available variants
    const randomIndex = Math.floor(Math.random() * match.responses.length);
    return {
      id: match.id,
      trigger: match.trigger,
      reply: match.responses[randomIndex],
      allReplies: match.responses,
      scope: match.isGlobal ? "global" : "thread",
      author: match.author,
      usageCount: match.usageCount
    };
  }

  /**
   * Edit a specific response variation
   */
  edit(trigger, oldReply, newReply, options = {}) {
    const key = String(trigger).trim().toLowerCase();
    const threadID = options.threadID ? String(options.threadID) : null;
    const storageKey = threadID && this.data.triggers[`${threadID}:${key}`]
      ? `${threadID}:${key}`
      : `global:${key}`;

    const entry = this.data.triggers[storageKey];
    if (!entry) return false;

    const idx = entry.responses.findIndex(r => r.toLowerCase() === oldReply.trim().toLowerCase());
    if (idx === -1) return false;

    entry.responses[idx] = newReply.trim();
    entry.updatedAt = new Date().toISOString();
    this._scheduleFlush();
    return true;
  }

  /**
   * Remove a trigger or a specific response index
   */
  remove(trigger, options = {}) {
    const key = String(trigger).trim().toLowerCase();
    const threadID = options.threadID ? String(options.threadID) : null;
    const index = options.index !== undefined ? parseInt(options.index, 10) : null;

    const keysToCheck = [
      threadID ? `${threadID}:${key}` : null,
      `global:${key}`
    ].filter(Boolean);

    for (const storageKey of keysToCheck) {
      if (this.data.triggers[storageKey]) {
        const entry = this.data.triggers[storageKey];
        if (index !== null && !isNaN(index) && index >= 1 && index <= entry.responses.length) {
          entry.responses.splice(index - 1, 1);
          if (entry.responses.length === 0) {
            delete this.data.triggers[storageKey];
          } else {
            entry.updatedAt = new Date().toISOString();
          }
        } else {
          delete this.data.triggers[storageKey];
        }
        this._scheduleFlush();
        return true;
      }
    }
    return false;
  }

  /**
   * List responses with pagination
   */
  list(options = {}) {
    const threadID = options.threadID ? String(options.threadID) : null;
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 20));

    const all = Object.values(this.data.triggers).filter(t => {
      if (options.onlyThread && threadID) return t.threadID === threadID;
      if (options.onlyGlobal) return t.isGlobal;
      return t.isGlobal || (threadID && t.threadID === threadID);
    });

    // Sort by recent update
    all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const total = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = all.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      totalPages,
      limit
    };
  }

  /**
   * Clear all responses for a thread
   */
  clear(threadID) {
    if (!threadID) return 0;
    const prefix = `${threadID}:`;
    let count = 0;
    for (const key of Object.keys(this.data.triggers)) {
      if (key.startsWith(prefix)) {
        delete this.data.triggers[key];
        count++;
      }
    }
    if (count > 0) this._scheduleFlush();
    return count;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. HIGH-PERFORMANCE AI RESPONSE CACHE
  // ══════════════════════════════════════════════════════════════════════════════

  _hashQuery(prompt, provider = "default", model = "default") {
    const normalized = `${provider.toLowerCase()}:${model.toLowerCase()}:${prompt.trim().toLowerCase()}`;
    return crypto.createHash("md5").update(normalized).digest("hex");
  }

  cacheAIResponse(prompt, response, options = {}) {
    if (!prompt || !response || typeof response !== "string") return;
    if (response.startsWith("❌") || response.includes("Error:") || response.trim().length === 0) return;

    const provider = options.provider || "default";
    const model = options.model || "default";
    const ttlMs = options.ttlMs || DEFAULT_CACHE_TTL_MS;
    const hash = this._hashQuery(prompt, provider, model);

    // Evict oldest if exceeding limit
    const keys = Object.keys(this.data.aiCache);
    if (keys.length >= MAX_AI_CACHE_ITEMS) {
      const oldestKey = keys.reduce((oldest, k) => {
        return this.data.aiCache[k].timestamp < this.data.aiCache[oldest].timestamp ? k : oldest;
      }, keys[0]);
      delete this.data.aiCache[oldestKey];
    }

    const now = Date.now();
    this.data.aiCache[hash] = {
      prompt: prompt.trim().slice(0, 300),
      response: response.trim(),
      provider,
      model,
      timestamp: now,
      expiresAt: now + ttlMs,
      hitCount: 0
    };

    this._scheduleFlush();
  }

  getCachedAIResponse(prompt, options = {}) {
    if (!prompt) return null;
    const provider = options.provider || "default";
    const model = options.model || "default";
    const hash = this._hashQuery(prompt, provider, model);

    const entry = this.data.aiCache[hash];
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      delete this.data.aiCache[hash];
      this._scheduleFlush();
      return null;
    }

    entry.hitCount = (entry.hitCount || 0) + 1;
    this.data.stats.cacheHits = (this.data.stats.cacheHits || 0) + 1;
    this._scheduleFlush();
    return entry.response;
  }

  _cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [hash, entry] of Object.entries(this.data.aiCache)) {
      if (entry.expiresAt && now > entry.expiresAt) {
        delete this.data.aiCache[hash];
        cleaned++;
      }
    }
    if (cleaned > 0) this._scheduleFlush();
  }

  clearAICache() {
    this.data.aiCache = {};
    this._scheduleFlush();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. PERSISTENT MULTI-TURN CONVERSATION MEMORY
  // ══════════════════════════════════════════════════════════════════════════════

  saveConversation(contextId, history) {
    if (!contextId || !Array.isArray(history)) return;
    this.data.conversations[contextId] = history.slice(-MAX_CONTEXT_MESSAGES);
    this._scheduleFlush();
  }

  getConversation(contextId) {
    if (!contextId) return [];
    return this.data.conversations[contextId] || [];
  }

  clearConversation(contextId) {
    if (contextId && this.data.conversations[contextId]) {
      delete this.data.conversations[contextId];
      this._scheduleFlush();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. SETTINGS & METRICS
  // ══════════════════════════════════════════════════════════════════════════════

  setSetting(threadID, key, value) {
    if (!threadID) return;
    const tid = String(threadID);
    if (!this.data.settings[tid]) this.data.settings[tid] = {};
    this.data.settings[tid][key] = value;
    this._scheduleFlush();
  }

  getSetting(threadID, key, defaultValue = null) {
    if (!threadID) return defaultValue;
    const tid = String(threadID);
    return this.data.settings[tid]?.[key] ?? defaultValue;
  }

  getStats() {
    let totalReplies = 0;
    for (const entry of Object.values(this.data.triggers)) {
      totalReplies += (entry.responses || []).length;
    }

    let fileSize = 0;
    try {
      if (fs.existsSync(this.filePath)) {
        fileSize = fs.statSync(this.filePath).size;
      }
    } catch (_) {}

    return {
      totalTriggers: Object.keys(this.data.triggers).length,
      totalResponses: totalReplies,
      aiCacheEntries: Object.keys(this.data.aiCache).length,
      cacheHits: this.data.stats.cacheHits,
      activeConversations: Object.keys(this.data.conversations).length,
      totalAdded: this.data.stats.totalAdded,
      totalReplied: this.data.stats.totalReplied,
      storageSizeBytes: fileSize,
      storageSizeKb: (fileSize / 1024).toFixed(2)
    };
  }
}

// Export singleton instance
const responseDBInstance = new ResponseDB();
module.exports = responseDBInstance;
