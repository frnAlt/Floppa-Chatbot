/**
 * @author frnAlt & Neoaz 🐊
 * Persistent File-based Session Store for Floppa-Chatbot Web Dashboard
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const { Store } = require("express-session");

const SESSION_DIR = path.join(process.cwd(), "database", "data", "sessions");

class FileStore extends Store {
	constructor(options = {}) {
		super(options);
		this.ttl = options.ttl || 1000 * 60 * 60 * 24 * 7; // 7 days
		this.dir = options.dir || SESSION_DIR;
		fs.ensureDirSync(this.dir);
		this.cleanupInterval = setInterval(() => this.reap(), 1000 * 60 * 60).unref();
	}

	filePath(sid) {
		return path.join(this.dir, `${encodeURIComponent(sid)}.json`);
	}

	read(sid) {
		try {
			const file = this.filePath(sid);
			if (!fs.existsSync(file)) return null;
			const data = JSON.parse(fs.readFileSync(file, "utf8"));
			const expires = data?.cookie?.expires;
			if (expires && new Date(expires).getTime() < Date.now()) {
				fs.removeSync(file);
				return null;
			}
			return data;
		} catch (_) {
			return null;
		}
	}

	get(sid, callback) {
		try {
			callback(null, this.read(sid));
		} catch (err) {
			callback(err);
		}
	}

	set(sid, session, callback) {
		try {
			fs.outputFileSync(this.filePath(sid), JSON.stringify(session));
			if (callback) callback(null);
		} catch (err) {
			if (callback) callback(err);
		}
	}

	touch(sid, session, callback) {
		this.set(sid, session, callback);
	}

	destroy(sid, callback) {
		try {
			fs.removeSync(this.filePath(sid));
			if (callback) callback(null);
		} catch (err) {
			if (callback) callback(err);
		}
	}

	all(callback) {
		try {
			if (!fs.existsSync(this.dir)) return callback(null, []);
			const sessions = fs.readdirSync(this.dir)
				.filter(name => name.endsWith(".json"))
				.map(name => {
					try {
						return JSON.parse(fs.readFileSync(path.join(this.dir, name), "utf8"));
					} catch (_) {
						return null;
					}
				})
				.filter(Boolean);
			callback(null, sessions);
		} catch (err) {
			callback(err);
		}
	}

	length(callback) {
		try {
			if (!fs.existsSync(this.dir)) return callback(null, 0);
			const count = fs.readdirSync(this.dir).filter(name => name.endsWith(".json")).length;
			callback(null, count);
		} catch (err) {
			callback(err);
		}
	}

	clear(callback) {
		try {
			fs.emptyDirSync(this.dir);
			if (callback) callback(null);
		} catch (err) {
			if (callback) callback(err);
		}
	}

	reap() {
		try {
			if (!fs.existsSync(this.dir)) return;
			const now = Date.now();
			for (const name of fs.readdirSync(this.dir)) {
				if (!name.endsWith(".json")) continue;
				const file = path.join(this.dir, name);
				try {
					const data = JSON.parse(fs.readFileSync(file, "utf8"));
					const expires = data?.cookie?.expires;
					if (expires && new Date(expires).getTime() < now) {
						fs.removeSync(file);
					}
				} catch (_) {
					fs.removeSync(file);
				}
			}
		} catch (_) {}
	}
}

module.exports = FileStore;
