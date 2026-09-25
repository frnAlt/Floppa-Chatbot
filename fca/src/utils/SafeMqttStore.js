"use strict";

const mqtt = require("mqtt");
const StoreBase = mqtt.Store || require("mqtt/build/lib/store").default;

/**
 * SafeMqttStore wraps MQTT Store to prevent unhandled TypeError: Cannot read properties of null (reading 'set')
 * which occurs when MQTT.js closes its internal in-flight store during reconnection or teardown while
 * in-flight or delayed packets are still processed.
 */
class SafeMqttStore extends StoreBase {
    constructor(options = {}) {
        super({ clean: false, ...options });
        this.options = { clean: false, ...options };
        if (!this._inflights) {
            this._inflights = new Map();
        }
    }

    put(packet, cb) {
        if (!this._inflights) {
            this._inflights = new Map();
        }
        if (packet && packet.messageId !== undefined) {
            this._inflights.set(packet.messageId, packet);
        }
        if (typeof cb === "function") {
            cb();
        }
        return this;
    }

    del(packet, cb) {
        if (!this._inflights) {
            this._inflights = new Map();
            if (typeof cb === "function") cb(new Error("missing packet"));
            return this;
        }
        const toDelete = this._inflights.get(packet?.messageId);
        if (toDelete) {
            this._inflights.delete(packet.messageId);
            if (typeof cb === "function") cb(null, toDelete);
        } else if (typeof cb === "function") {
            cb(new Error("missing packet"));
        }
        return this;
    }

    get(packet, cb) {
        if (!this._inflights) {
            this._inflights = new Map();
            if (typeof cb === "function") cb(new Error("missing packet"));
            return this;
        }
        const stored = this._inflights.get(packet?.messageId);
        if (stored) {
            if (typeof cb === "function") cb(null, stored);
        } else if (typeof cb === "function") {
            cb(new Error("missing packet"));
        }
        return this;
    }

    createStream() {
        if (!this._inflights) {
            this._inflights = new Map();
        }
        try {
            return super.createStream();
        } catch (_) {
            const { Readable } = require("readable-stream");
            const stream = new Readable({ objectMode: true });
            stream._read = () => stream.push(null);
            return stream;
        }
    }

    close(cb) {
        // Critical: Do NOT set this._inflights = null.
        // Keeping the map alive prevents any race condition where an ended or
        // reconnecting client attempts to buffer or flush packets.
        if (typeof cb === "function") {
            cb();
        }
    }
}

module.exports = SafeMqttStore;
