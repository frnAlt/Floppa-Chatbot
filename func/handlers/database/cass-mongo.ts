import mongoose from "mongoose";
import os from "os";

let connectedURI: string = null;

class CassMongo {
  static schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  });
  collection: string;
  ignoreError: boolean;
  allowClear: boolean;
  #uri: string;
  jsonMode: boolean;
  KeyValue: mongoose.Model<
    {
      key: string;
      value: any;
    },
    {},
    {},
    {},
    mongoose.Schema<
      any,
      mongoose.Model<any, any, any, any, any>,
      {},
      {},
      {},
      {},
      mongoose.DefaultSchemaOptions,
      {
        key: string;
        value: any;
      }
    >
  >;

  constructor({
    uri,
    collection,
    isOwnHost = false,
    ignoreError = false,
    allowClear = false,
  }: {
    uri: string;
    collection: string;
    isOwnHost?: boolean;
    ignoreError?: boolean;
    allowClear?: boolean;
  }) {
    if (isOwnHost) {
      const hostname = os.hostname();
      this.#uri = `mongodb://${hostname}:27017/${uri.replace(
        /^mongodb:\/\/[^\/]+\//,
        ""
      )}`;
    } else {
      this.#uri = uri;
    }
    this.collection = collection;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.jsonMode = false;

    const keyValueSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
    });

    const KeyValue = mongoose.model(collection, keyValueSchema);
    this.KeyValue = KeyValue;
  }

  async start() {
    try {
      if (connectedURI) {
        console.log("MongoDB already connected");
        return;
      }

      mongoose.set("strictQuery", true);
      await mongoose.connect(this.#uri);
      connectedURI = this.#uri;
      console.log("MongoDB connection established");
    } catch (error) {
      if (this.ignoreError) console.error("MongoDB connection error:", error);
      else throw error;
    }
  }

  async remove(key: any) {
    try {
      await this.KeyValue.deleteOne({ key: String(key) });
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error removing value:", error);
      } else {
        throw error;
      }
    }
  }

  async containsKey(key: any) {
    try {
      const count = await this.KeyValue.countDocuments({ key: String(key) });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error checking key:", error);
        return false;
      } else {
        throw error;
      }
    }
  }

  async get(key: any) {
    try {
      const result = await this.KeyValue.findOne({ key: String(key) });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting value:", error);
        return null;
      } else {
        throw error;
      }
    }
  }

  async bulkGet(...keys: any[]) {
    keys = keys.flat();
    try {
      const results = await this.KeyValue.find({ key: { $in: keys } });
      return results.map((result: { value: any }) => result.value);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting values:", error);
        return [];
      } else {
        throw error;
      }
    }
  }
  async bulkGetEntries(...keys: any[]): Promise<[string, any][]> {
    keys = keys.flat();
    try {
      const results = await this.KeyValue.find({ key: { $in: keys } });

      return results.map((result: { key: any; value: any }) => [
        result.key,
        result.value,
      ]);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting values:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async put(key: any, value: any) {
    try {
      await this.KeyValue.findOneAndUpdate(
        { key: String(key) },
        { key: String(key), value },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error putting value:", error);
      } else {
        throw error;
      }
    }
  }

  async bulkPut(pairs: { [s: string]: unknown } | ArrayLike<unknown>) {
    try {
      const mappedPairs = Object.entries(pairs).map(([key, value]) => ({
        updateOne: {
          filter: { key: String(key) },
          update: { key: String(key), value },
          upsert: true,
        },
      }));

      await this.KeyValue.bulkWrite(mappedPairs);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error setting values:", error);
      } else {
        throw error;
      }
    }
  }

  async bulkPutProperties(pairs: { [key: string]: any }) {
    try {
      await this.KeyValue.bulkWrite(
        Object.entries(pairs).map(([key, newProperties]) => ({
          updateOne: {
            filter: { key: String(key) },
            update: { $set: newProperties },
            upsert: true,
          },
        }))
      );
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error setting bulk properties:", error);
      } else {
        throw error;
      }
    }
  }

  async toJSON() {
    return await this.load();
  }

  async *[Symbol.iterator]() {
    const entries = await this.entries();
    yield* entries;
  }

  async preProc(data: {}) {
    return data;
  }

  async load() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return await this.preProc(result);
  }

  async clear() {
    if (!this.allowClear) {
      throw new Error("Clearing the collection is not allowed.");
    }

    try {
      await this.KeyValue.deleteMany({});
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error clearing collection:", error);
      } else {
        throw error;
      }
    }
  }

  async entries() {
    try {
      const results = await this.KeyValue.find({}, "key value");
      return results.map((doc: { key: any; value: any }) => ({
        key: doc.key,
        value: doc.value,
      }));
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting entries:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async *iKeys() {
    const keys = await this.keys();
    for (const key of keys) {
      yield key;
    }
  }

  async size() {
    try {
      return await this.KeyValue.countDocuments({});
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting size:", error);
        return 0;
      } else {
        throw error;
      }
    }
  }

  async keys() {
    try {
      const results = await this.KeyValue.find({}, "key");
      return results.map((doc: { key: any }) => doc.key);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting keys:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async values() {
    try {
      const results = await this.KeyValue.find({}, "value");
      return results.map((doc: { value: any }) => doc.value);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting values:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async *iValues() {
    const values = await this.values();
    for (const value of values) {
      yield value;
    }
  }

  async toObject() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return result;
  }

  async query(
    filter:
      | Record<string, any>
      | ((q: typeof this.KeyValue) => mongoose.Query<any, any>)
  ): Promise<[string, any][]> {
    try {
      let queryInstance: mongoose.Query<any, any>;

      if (typeof filter === "function") {
        queryInstance = filter(this.KeyValue);
      } else {
        queryInstance = this.KeyValue.find(filter);
      }

      const result = await queryInstance.lean();

      return result.flatMap((obj) => Object.entries(obj));
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error querying data:", error);
        return [];
      } else {
        throw error;
      }
    }
  }
}

class CassMongoManager {
  #instances;
  constructor() {
    this.#instances = new Map<string, CassMongo>();
  }

  getInstance({
    uri,
    collection,
    ...options
  }: {
    uri: string;
    collection: string;
  }) {
    const key = `${uri}-${collection}`;
    if (!this.#instances.has(key)) {
      this.#instances.set(key, new CassMongo({ uri, collection, ...options }));
    }
    return this.#instances.get(key);
  }

  getAll() {
    return Object.fromEntries(this.#instances);
  }

  listInstances() {
    return Array.from(this.#instances.keys());
  }
}

export { CassMongo, CassMongoManager };
