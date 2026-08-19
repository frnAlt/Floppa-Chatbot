import fs from "fs";
import { CassMongo, CassMongoManager } from "./cass-mongo";

type UserData = import("cassidy-userData").UserData;

type Nullable = import("cassidy-userData").NullableUserData;
import * as carSys from "@cass-commands/car_nostalgia";
import * as petSys from "@cass-commands/pet_nostalgia";

import mongoose from "mongoose";

const cassMongoManager = new CassMongoManager();

global.cassMongoManager = cassMongoManager;

import type { InventoryItem } from "cassidy-userData";
import fetchMeta from "../../CommandFiles/modules/fetchMeta";
import { UNISpectra } from "@cassidy/unispectra";
import { Inventory } from "@cass-modules/InventoryEnhanced";
import axios from "axios";
import { queryObjects } from "@cass-modules/OBJQuery";
import { IFCAU_User } from "@xaviabot/fca-unofficial";
import { join } from "path";

export type UserDataKV = Partial<
  {
    [K in keyof UserData as `value.${K}`]: any;
  } & { key: string }
>;

export function init(
  this: unknown,
  {
    collection,
    uri,
    filepath,
  }: {
    collection?: string;
    uri?: string;

    filepath?: string;
  } = {}
) {
  const manager = new UserStatsManager(
    filepath ?? "handlers/database/userStat.json",
    {
      uri: uri ?? global.Cassidy.config.MongoConfig?.uri,
      collection,
    }
  );
  return manager;
}

/**
 * Handles database related tasks for CassidySpectra, uses mongodb.
 */
export default class UserStatsManager {
  #uri;
  filePath: string;
  #mongo: CassMongo;
  isMongo: boolean;
  cache: Record<string, UserData>;
  kv: typeof CassMongo.prototype.KeyValue;
  collection;
  ignoreQueue: string[];

  constructor(
    filePath: string,
    {
      uri = global.Cassidy.config.MongoConfig?.uri,
      collection = "reduxcassstats",
    } = {}
  ) {
    this.filePath = filePath;

    this.#mongo = null;
    this.collection = collection;
    this.#uri = process.env[uri];
    this.isMongo = !!global.Cassidy.config.MongoConfig?.status;

    this.cache = {};
    this.ignoreQueue = [];
  }

  setMongo(mongo: CassMongo) {
    this.#mongo = mongo;
  }

  getMongo() {
    return this.#mongo;
  }

  /**
   * Immutable default user data.
   * @readonly
   */
  get defaults() {
    return {
      money: 0,
      exp: 0,
      battlePoints: 0,
      lastModified: Date.now(),
    };
  }

  /**
   * Updates the cache, self explanatory.
   */
  updateCache(key: string, value: UserData) {
    if (typeof value !== "object" || !value) {
      return console.log(`Invalid: ${key} => ${value}`, new Error());
    }
    this.cache[key] = value;
  }

  /**
   * Ensures uniform data.
   */
  process(data: UserData, userID: string | number) {
    data ??= this.defaults;
    if (data.name === "Unregistered") {
      delete data.name;
    }
    data.money ??= 0;
    data.money = data.money <= 0 || isNaN(data.money) ? 0 : Number(data.money);

    if (data.money > Number.MAX_VALUE) {
      data.money = Number.MAX_VALUE;
    }
    data.battlePoints ??= 0;
    data.battlePoints =
      data.battlePoints <= 0 || isNaN(data.battlePoints)
        ? 0
        : Number(data.battlePoints);
    data.exp ??= 0;
    data.inventory ??= [];
    if (isNaN(data.exp)) {
      data.exp = 0;
    }
    if (data.name) {
      data.name = data.name.trim();
    }

    if (data.bankData?.bank) {
      data.bankData.bank = Math.min(Number.MAX_VALUE, data.bankData.bank);
    }

    if (isNaN(data.battlePoints)) {
      data.battlePoints = 0;
    }

    data.userID = String(userID);

    if (!data.name && !global.Cassidy.config.requireRgistration) {
      const { userMeta } = data;
      if (userMeta?.name) {
        data.name = userMeta.name;
      } else {
        data.name = "Unregistered";
      }
    }

    if (typeof data.name === "string") {
      const norm = this.normalizeName(data.name);
      // data.name = norm.finalName;
      if (data.name) {
        data.nameMeta = norm;
      }
    }
    data.money = Math.floor(data.money);
    return data;
  }

  _extractProperty<K extends keyof UserData>(
    data: UserData,
    property: K
  ): UserData[K];

  _extractProperty<K extends keyof UserData>(
    data: UserData,
    property: `${K}.${any}`
  ): UserData[K][any];

  _extractProperty(data: UserData, property: string): any;

  _extractProperty(data: UserData, property: string = "") {
    property = `${property}`;
    const props = property.split(".");
    let value: UserData | keyof UserData | any = data;

    for (const prop of props) {
      if (!prop) {
        continue;
      }
      value = value?.[prop] ?? null;
    }

    return value;
  }

  normalizeName(name: string) {
    const str = name.split(/\s+/);
    let emojis = [...str]
      .filter((char) => UNISpectra.emojiRegex.test(char))
      .join("");
    let nonEmojis = [...str]
      .filter((char) => !UNISpectra.emojiRegex.test(char))
      .map((char) => (/\w|\d/.test(char) ? char : ""))
      .join("")
      .trim()
      .slice(0, 39);
    name = nonEmojis;

    let finalName = `${name}${emojis}`;

    if (finalName.length < 1) {
      finalName = undefined;
      name = undefined;
    }

    return {
      name,
      nonEmojis,
      emojis,
      finalName,
    };
  }

  /**
   * @deprecated - not useful anymore.
   */
  calcMaxBalance(users: Record<string, UserData>, specificID: string) {
    const balances = Object.keys(users)
      .filter((id) => id !== specificID)
      .map((id) => users[id].money);

    const totalBalance = balances.reduce(
      (sum, balance) => parseInt(String(sum)) + balance,
      0
    );
    const averageBalance = totalBalance / balances.length;

    const maxBalance = Math.floor(10 * averageBalance);

    return maxBalance;
  }

  /**
   * We need this
   */
  async connect() {
    if (this.isMongo) {
      this.#mongo = cassMongoManager.getInstance({
        uri: this.#uri,
        collection: this.collection,
      });
      this.kv = this.#mongo.KeyValue;
    }

    if (this.isMongo) {
      try {
        if (!this.#uri) {
          throw new Error(
            "Missing MongoDB URI while the status is true, please check your settings.json"
          );
        }
        await this.#mongo.start();
        await this.#mongo.put("test", this.defaults);
        this.setItems({ test: {} }).then(() => {
          this.deleteItem("test");
        });
      } catch (error) {
        console.error("MONGODB Error, Activating JSON DB Mode", error);
        this.isMongo = false;
        this.set("test", this.defaults);
        delete this.kv;
        this.#mongo = null;
        this.setItems({ test: {} }).then(() => {
          this.deleteItem("test");
        });
      }
    }
  }

  /**
   * Gets the cache of a user.
   */
  async getCache(key: string): Promise<UserData> {
    if (!this.cache[key]) {
      await this.getItem(key);
    }

    return this.process(JSON.parse(JSON.stringify(this.cache[key])), key);
  }

  /**
   * Calculates their money based on other factors (e.g. bank, lend amount, cheques, inventory cheques)
   */
  extractMoney(userData: UserData) {
    const safeNumber = (value: any) =>
      typeof value === "number" && !isNaN(value) ? value : 0;

    const money = safeNumber(userData?.money);
    const bank = safeNumber(userData?.bankData?.bank);
    const lendAmount = safeNumber(userData?.lendAmount);
    const barn = userData.gardenBarns ?? [];

    const getChequeAmount = (items: InventoryItem[]) =>
      Array.isArray(items)
        ? items.reduce(
            (acc, item) =>
              item.type === "cheque"
                ? // @ts-ignore
                  acc + safeNumber(item.chequeAmount)
                : acc,
            0
          )
        : 0;

    const cheques =
      getChequeAmount(userData?.inventory) +
      getChequeAmount(userData?.boxItems) +
      getChequeAmount(userData?.bankData?.items) +
      getChequeAmount(userData?.bagData?.items) +
      getChequeAmount(userData?.ndrive?.items) +
      getChequeAmount(userData?.tradeVentory);

    const cars = new Inventory(userData.carsData ?? []);
    const pets = new Inventory(userData.petsData ?? []);
    let carsAssets = 0;

    for (const car_ of cars) {
      try {
        const car = carSys.updateCarData(car_);

        const worth = carSys.calculateWorth(car, this.cache);
        if (typeof worth === "number" && !isNaN(worth)) {
          carsAssets += worth;
        }
      } catch (error) {}
    }

    let petsAssets = 0;

    for (const pet_ of pets) {
      try {
        const pet = petSys.autoUpdatePetData(pet_);

        const worth = petSys.calculateWorth(pet, this.cache);
        if (typeof worth === "number" && !isNaN(worth)) {
          petsAssets += worth;
        }
      } catch (error) {}
    }

    const barnAccu = barn
      .filter((i) => i && typeof i.price === "number" && !isNaN(i.price))
      .reduce((acc, i) => (i.price || 0) + (acc || 0), 0);

    const total =
      money + bank + lendAmount + cheques + petsAssets + carsAssets + barnAccu;

    return {
      money,
      bank,
      lendAmount,
      cheques,
      total,
      carsAssets,
      petsAssets,
      gardenBarn: barnAccu,
    };
  }

  /**
   * @deprecated - use getItem or getItems
   */
  async get(
    key: string,
    prop: Parameters<UserStatsManager["_extractProperty"]>[1] = ""
  ): Promise<UserData> {
    if (this.isMongo) {
      const data = this.process(
        (await this.#mongo.get(key)) || {
          ...this.defaults,
          lastModified: Date.now(),
        },
        key
      );
      this.updateCache(key, data);
      return this._extractProperty(data, prop);
    } else {
      const data = this.readMoneyFile();
      const p = this.process(
        data[key] || { ...this.defaults, lastModified: Date.now() },
        key
      );
      this.updateCache(key, p);
      return this._extractProperty(p, prop);
    }
  }

  /**
   * Gets a single user data but does not change the fact that it uses the bulk one.
   */
  async getItem(
    key: string,
    prop: Parameters<UserStatsManager["_extractProperty"]>[1] = ""
  ): Promise<UserData> {
    const users = await this.getItems(key);

    return this._extractProperty(users[key], prop);
  }

  async getIDs() {
    if (!this.isMongo) {
      return Object.keys(this.getAllCache());
    }
    return (await this.#mongo?.keys()) as string[];
  }

  async queryItemAll<T extends keyof UserData>(
    key: string | UserDataKV
  ): Promise<Record<string, UserData>>;

  async queryItemAll<T extends keyof UserData>(
    key: string | UserDataKV,
    ...propertyNames: T[]
  ): Promise<Record<string, Pick<UserData, T>>>;

  async queryItemAll<T extends keyof UserData>(
    key: string | UserDataKV,
    ...propertyNames: T[]
  ) {
    if (!this.isMongo) {
      const data = this.readMoneyFile();
      const results: Array<[string, Partial<UserData>]> = [];

      if (typeof key === "string") {
        const userData = data[key];
        if (userData) {
          const partialData: Partial<UserData> = {};
          for (const prop of propertyNames) {
            if (userData.hasOwnProperty(prop)) {
              partialData[prop] = userData[prop];
            }
          }
          results.push([
            key,
            propertyNames.length > 0 ? partialData : userData,
          ]);
        }
      } else {
        const x = queryObjects(data, key, false, propertyNames as string[]);
        results.push(...x);
      }

      return Object.fromEntries(
        results.map(([k, partialData]) => [
          k,
          this.processProperties(partialData, k, propertyNames),
        ])
      );
    }

    const selectedFieldsX = propertyNames.map((prop) => `value.${prop}`);

    if (!selectedFieldsX.includes("key")) {
      selectedFieldsX.push("key");
    }
    const selectedFields = selectedFieldsX.join(" ");
    const queryResult =
      propertyNames.length > 0
        ? await this.#mongo.KeyValue.find(
            typeof key === "string" ? { key } : key
          ).select(selectedFields)
        : await this.#mongo.KeyValue.find(
            typeof key === "string" ? { key } : key
          );

    return Object.fromEntries(
      queryResult.map((i) => {
        const partialData = i?.value || {};
        const newkey = i?.key;
        return [
          newkey,
          this.processProperties(partialData, newkey, propertyNames),
        ];
      })
    );
  }

  async queryItem<T extends keyof UserData>(
    key: string | UserDataKV
  ): Promise<UserData>;

  async queryItem<T extends keyof UserData>(
    key: string | UserDataKV,
    ...propertyNames: T[]
  ): Promise<Pick<UserData, T>>;

  async queryItem<T extends keyof UserData>(
    key: string | UserDataKV,
    ...propertyNames: T[]
  ) {
    if (!this.isMongo) {
      const res = await this.queryItemAll<T>(key, ...propertyNames);
      return res[Object.keys(res)[0]] ?? {};
    }

    const selectedFieldsX = propertyNames.map((prop) => `value.${prop}`);

    if (!selectedFieldsX.includes("key")) {
      selectedFieldsX.push("key");
    }
    const selectedFields = selectedFieldsX.join(" ");
    const queryResult =
      propertyNames.length > 0
        ? await this.#mongo.KeyValue.findOne(
            typeof key === "string" ? { key } : key
          ).select(selectedFields)
        : await this.#mongo.KeyValue.findOne(
            typeof key === "string" ? { key } : key
          );
    const partialData = queryResult?.value || {};
    const newkey = queryResult?.key;
    return this.processProperties(partialData, newkey, propertyNames);
  }

  private processProperties<T extends keyof UserData>(
    userData: Partial<UserData>,
    userID: string,
    propertyNames: T[]
  ): Pick<UserData, T> {
    const processedData = this.process(
      { ...this.defaults, ...userData } as UserData,
      userID
    );
    if (propertyNames.length === 0) {
      return { ...processedData } as UserData;
    }
    const mapped = propertyNames
      .map((prop) => [prop, processedData[prop]])
      .filter(([_, value]) => value !== undefined);
    return Object.fromEntries(mapped);
  }

  /**
   * Gets more than one user data (bulk)
   */
  async getItems<K extends readonly string[]>(
    ...keys: K
  ): Promise<Record<K[number], UserData>> {
    let allData: [string, UserData][];
    if (this.isMongo) {
      let s = await this.#mongo.bulkGetEntries(...keys);
      allData = s;
    } else {
      let s = Object.entries(this.readMoneyFile()).filter(([k]) =>
        keys.includes(k)
      );
      allData = s;
    }
    return Object.fromEntries(
      keys.map((keyx: string) => {
        const [key, userData] = allData.find((i) => i[0] === keyx) ?? [
          keyx,
          { ...this.defaults },
        ];
        const clean = this.process(
          userData || { ...this.defaults, lastModified: Date.now() },
          key
        );
        this.updateCache(key, clean);
        return [key, clean];
      })
    ) as Record<K[number], UserData>;
  }

  /**
   * Gets more than one user data from the cache (bulk).
   * For keys not found in the cache, it falls back to getting the data from the database or file.
   * Does NOT update the cache.
   */
  async getCaches<K extends readonly string[]>(
    ...keys: K
  ): Promise<Record<K[number], UserData>> {
    const missingKeys: string[] = [];

    const cacheData = Object.fromEntries(
      keys.map((keyx: string) => {
        const cachedData = keyx in this.cache ? this.cache[keyx] : undefined;

        if (cachedData) {
          return [keyx, this.process(cachedData, keyx)];
        } else {
          missingKeys.push(keyx);
          return [keyx, null];
        }
      })
    );

    if (missingKeys.length > 0) {
      const missingData = await this.getItems(...missingKeys);

      Object.entries(missingData).forEach(([key, userData]) => {
        cacheData[key] = this.process(userData, key);
      });
    }

    return cacheData as Record<K[number], UserData>;
  }

  /**
   * Bye bye user.
   */
  async deleteItem(key: string) {
    if (this.isMongo) {
      await this.#mongo.remove(key);
    } else {
      const data = this.readMoneyFile();
      if (data[key]) {
        delete data[key];
        this.writeMoneyFile(data);
      }
    }
    delete this.cache[key];
  }

  get deleteUser() {
    return this.deleteItem;
  }

  /**
   * @deprecated - just do it yourself manually to save bandwidth
   */
  async remove(
    key: string,
    removedProperties: string[] = []
  ): Promise<UserData> {
    if (this.isMongo) {
      const user = await this.getItem(key);
      for (const item of removedProperties) {
        delete user[item];
      }
      await this.#mongo.put(key, user);
      this.updateCache(key, user);
      return user;
    } else {
      const data = this.readMoneyFile();
      if (data[key]) {
        for (const item of removedProperties) {
          if (!data[key][item]) {
            continue;
          }
          delete data[key][item];
        }
        this.writeMoneyFile(data);
      }
      this.updateCache(key, data[key]);
      return data[key];
    }
  }

  /**
   * Sets a user data based on a key value record, key is the user id. Returns a record too.
   */
  async setItems(updatedUsers: Record<string, Nullable>) {
    if (this.isMongo) {
      const users = await this.getCaches(...Object.keys(updatedUsers));

      const updatedData: Record<string, UserData> = Object.fromEntries(
        Object.entries(updatedUsers).map(([key, updatedProperties]) => {
          const updatedUser = {
            ...(users[key] || this.defaults),
            ...updatedProperties,
            lastModified: Date.now(),
          };
          return [key, updatedUser];
        })
      );

      await this.#mongo.bulkPut(updatedData);
      Object.entries(updatedData).forEach(([key, user]) =>
        this.updateCache(key, user)
      );
    } else {
      const data = this.readMoneyFile();

      for (const [key, updatedProperties] of Object.entries(updatedUsers)) {
        if (data[key]) {
          data[key] = {
            ...data[key],
            ...updatedProperties,
            lastModified: Date.now(),
          };
        } else {
          data[key] = {
            ...this.defaults,
            ...updatedProperties,
            lastModified: Date.now(),
          };
        }
        this.updateCache(key, data[key]);
      }

      this.writeMoneyFile(data);
    }
  }

  /**
   * Sets or overrides new properties of a user data
   */
  async setItem(key: string, updatedProperties: Nullable = {}) {
    return this.setItems({
      [key]: { ...updatedProperties },
    });
  }

  /**
   * Sets or overrides new properties of a user data
   * @deprecated - use setItem
   */
  async set(key: string, updatedProperties: Nullable = {}) {
    if (this.isMongo) {
      const user = await this.get(key);
      const updatedUser = {
        ...user,
        ...updatedProperties,
        lastModified: Date.now(),
      };
      await this.#mongo.bulkPut({
        [key]: updatedUser,
      });
      this.updateCache(key, updatedUser);
    } else {
      const data = this.readMoneyFile();
      if (data[key]) {
        data[key] = {
          ...data[key],
          ...updatedProperties,
          lastModified: Date.now(),
        };
      } else {
        data[key] = {
          ...this.defaults,
          ...updatedProperties,
          lastModified: Date.now(),
        };
      }
      this.writeMoneyFile(data);
      this.updateCache(key, data[key]);
    }
  }

  /**
   * @deprecated - use getAll
   */
  async getAllOld(): Promise<Record<string, UserData>> {
    if (this.isMongo) {
      return await this.#mongo.toObject();
    } else {
      return this.readMoneyFile();
    }
  }

  /**
   * Gets the user data of all users as record. Use with caution, too large data and bandwidth, you can use getUsers if you only need some users.
   */
  async getAll(cached = true): Promise<Record<string, UserData>> {
    if (cached) {
      return this.getAllCache();
    }
    const allData = await this.getAllOld();

    return Object.fromEntries(
      Object.entries(allData).map(([key, userData]) => {
        const clean = this.process(
          userData || { ...this.defaults, lastModified: Date.now() },
          key
        );
        return [key, clean];
      })
    );
  }

  async getAvatarURLNew(uid: string, size = 720) {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${uid}/picture?width=${size}&height=${size}&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
      );
      return {
        res,
        url: res.request.res.responseUrl as string,
      };
    } catch (error) {
      return {
        res: null,
        url: this.fallbackAva,
      };
    }
  }
  fallbackAva2 =
    "https://pixabay.com/get/g6b010603a8a419317f773ab371d97e9af1356abd642edf8e2603583713e3699fca8e923b2d119b1f00eaecb71c96b96b6075b4079e6644eae8c4dad5cc990db0af5ce8a33aacae3c00acd4167fd559fa_640.png";
  fallbackAva = join(process.cwd(), "public", "broken.jpg");
  async ensureAvatarURL(uid: string, forceNew = false) {
    try {
      const user = await this.getCache(uid);
      if (
        (!user.avatarURL || forceNew || user.avatarURL === this.fallbackAva) &&
        !/\D+/.test(uid)
      ) {
        try {
          const { url } = await this.getAvatarURLNew(uid);
          await this.setItem(uid, {
            avatarURL: url,
          });
          return url;
        } catch (error) {
          return this.fallbackAva;
        }
      }

      return user.avatarURL || this.fallbackAva;
    } catch (error) {
      return this.fallbackAva;
    }
  }

  async getAvatarURL(uid: string) {
    await this.ensureAvatarURL(uid);
    return (await this.getCache(uid)).avatarURL || this.fallbackAva;
  }

  /**
   * Retrieves all cached user data, fetching any missing entries from storage.
   * Ensures consistency by processing all entries similarly to getAll.
   */
  async getAllCache(): Promise<Record<string, UserData>> {
    let allKeys: string[];
    if (this.isMongo && this.#mongo) {
      allKeys = await this.#mongo.keys();
    } else {
      allKeys = Object.keys(this.readMoneyFile());
    }

    const cachedKeys = Object.keys(this.cache);
    const missingKeys = allKeys.filter((key) => !cachedKeys.includes(key));

    if (missingKeys.length > 0) {
      const missingData = await this.getItems(...missingKeys);
      Object.entries(missingData).forEach(([key, userData]) => {
        this.updateCache(key, userData);
      });
    }

    const result: Record<string, UserData> = {};
    for (const [key, userData] of Object.entries(this.cache)) {
      const clean = this.process(
        userData || { ...this.defaults, lastModified: Date.now() },
        key
      );
      result[key] = JSON.parse(JSON.stringify(clean));
    }

    return result;
  }

  /**
   * Wrapper of KeyValue.find of mongoose schema, more precise and saves bandwidth
   */
  query(
    filter:
      | Record<string, any>
      | ((q: typeof this.kv) => mongoose.Query<any, any>)
  ) {
    return this.#mongo.query(filter);
  }

  /**
   * @deprecated - use mongodb
   */
  readMoneyFile(): Record<string, UserData> {
    try {
      const jsonData = fs.readFileSync(
        process.cwd() + "/" + this.filePath,
        "utf8"
      );
      return JSON.parse(jsonData);
    } catch (error) {
      console.error("Error reading money data:", error);
      return {};
    }
  }

  /**
   * Know if a user id exists without wasting so much bandwidth
   */
  exists(key: string) {
    if (!this.isMongo) {
      return !!this.readMoneyFile()[key];
    }
    return this.#mongo.containsKey(key);
  }

  /**
   * @deprecated - use mongodb
   */
  writeMoneyFile(data: Record<string, UserData>) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(process.cwd() + "/" + this.filePath, jsonData);
    } catch (error) {
      console.error("Error writing money data:", error);
    }
  }

  /**
   * Ensures only numerical (FB) ids exist, use when you need to use database keys as value for bot related tasks
   */
  filterNumKeys<T extends Record<string, UserData>>(
    record: T
  ): Record<`${number}` | number, UserData> {
    return Object.fromEntries(
      Object.entries(record).filter((i) => this.isNumKey(i[0]))
    );
  }

  isNumKey(key: string) {
    return !isNaN(parseInt(key));
  }

  /**
   * Use with caution.
   */
  async saveThreadInfo(threadID: string, api = global.api) {
    try {
      if (this.ignoreQueue.includes(threadID)) {
        console.log(
          new Error("saveThreadInfo request ignored because of queue")
        );

        return false;
      }
      if (isNaN(parseInt(threadID))) {
        return false;
      }
      if (
        "getThreadInfo" in (api ?? {}) &&
        typeof api?.getThreadInfo === "function"
      ) {
        this.ignoreQueue.push(threadID);
        const threadInfo = await api.getThreadInfo(threadID);
        if (!threadInfo) {
          console.log(new Error("Missing thread info on api.getThreadInfo"));
          return false;
        }
        const data: Partial<UserData> = {
          threadInfo: {
            threadID: threadID,
            threadName: threadInfo.threadName,
            // @ts-ignore
            emoji: threadInfo.emoji,
            // @ts-ignore
            adminIDs: threadInfo.adminIDs,
            // @ts-ignore
            participantIDs: threadInfo.participantIDs,
            isGroup: threadInfo.isGroup,
          },
          tdCreateTime: {
            timestamp: Date.now(),
          },
        };
        await this.setItem(threadID, { ...data });
        this.ignoreQueue = this.ignoreQueue.filter((i) => i !== threadID);
        return true;
      }

      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async ensureUserInfo(userID: string, refUID?: string) {
    const { userMeta, userInfo } = await this.getCache(userID);

    if (!userMeta || !userInfo) {
      return this.saveUserInfo(userID, refUID);
    }

    const { image } = (await this.getCache(userID)).userMeta;
    if (!image) {
      return this.saveUserInfo(userID, refUID);
    }

    if (global.Cassidy.config.autoRefreshAvatar) {
      try {
        await axios.head(image);
      } catch (error) {
        return this.saveUserInfo(userID, refUID);
      }
    }

    return true;
  }

  async ensureThreadInfo(threadID: string, api = global.api) {
    const { threadInfo } = await this.getCache(threadID);

    if (!threadInfo) {
      return this.saveThreadInfo(threadID, api);
    }

    return true;
  }

  async getUserInfo(userID: string): Promise<UserData["userInfo"]>;

  async getUserInfo(
    userIDs: string[]
  ): Promise<Record<string, UserData["userInfo"]>>;

  async getUserInfo(userIDorIDs: string | string[]) {
    if (Array.isArray(userIDorIDs)) {
      const userIDs = userIDorIDs;
      for (const id of userIDs) {
        await this.ensureUserInfo(id);
      }
      const items = await this.getItems(...userIDs);
      const mapped: [string, UserData["userInfo"]][] = Object.entries(
        items
      ).map((i) => [i[0], i[1].userInfo]);
      const res = Object.fromEntries(mapped);
      return res;
    } else if (typeof userIDorIDs === "string") {
      const userID = userIDorIDs;
      await this.ensureUserInfo(userID);
      const item = await this.getItem(userID);
      return item.userInfo;
    }
    throw new TypeError("Invalid Input.");
  }

  async getThreadInfo(userID: string): Promise<UserData["threadInfo"]>;

  async getThreadInfo(
    userIDs: string[]
  ): Promise<Record<string, UserData["threadInfo"]>>;

  async getThreadInfo(userIDorIDs: string | string[]) {
    if (Array.isArray(userIDorIDs)) {
      const userIDs = userIDorIDs;
      for (const id of userIDs) {
        await this.ensureThreadInfo(id);
      }
      const items = await this.getItems(...userIDs);
      const mapped: [string, UserData["threadInfo"]][] = Object.entries(
        items
      ).map((i) => [i[0], i[1].threadInfo]);
      const res = Object.fromEntries(mapped);
      return res;
    } else if (typeof userIDorIDs === "string") {
      const userID = userIDorIDs;
      await this.ensureThreadInfo(userID);
      const item = await this.getItem(userID);
      return item.threadInfo;
    }
    throw new TypeError("Invalid Input.");
  }

  /**
   * Use with caution.
   */
  async saveUserInfo(userID: string, refUID?: string) {
    try {
      if (this.ignoreQueue.includes(userID)) {
        return false;
      }
      if (isNaN(parseInt(refUID ?? userID))) {
        return false;
      }
      this.ignoreQueue.push(userID);
      const id = refUID ?? userID;

      const data: Partial<UserData> = {
        userMeta: await fetchMeta(id, true),
      };
      let failUserInfo = false;

      if (this.isNumKey(id) && "getUserInfo" in global.api) {
        try {
          const { [id]: userInfo } = await global.api.getUserInfo(id);
          data.userInfo = userInfo as unknown as IFCAU_User;
          data.userMeta.name = data.userInfo.name;
          data.userMeta.url = data.userInfo.profileUrl;
        } catch (error) {
          console.error(error);
          failUserInfo = true;
          data.userInfo = {
            isBirthday: false,
            name: "Unknown User",
            profileUrl: "",
            searchToken: [],
            thumbSrc: "",
            type: "",
          };
        }
      }

      if (
        (!data.userMeta ||
          Object.values(data.userMeta).some((i) => i === "Not found")) &&
        failUserInfo
      ) {
        return false;
      }

      await this.setItem(userID, { ...data });
      this.ignoreQueue = this.ignoreQueue.filter((i) => i !== userID);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * @deprecated - idk
   */
  async toLeanObject() {
    if (!this.isMongo) {
      return this.getAll();
    }
    try {
      const results = await this.#mongo.KeyValue.find({}, "key value").lean();

      const resultObj: Record<string, UserData> = {};
      results.forEach((doc) => {
        resultObj[doc.key] = doc.value;
      });

      return resultObj;
    } catch (error) {
      if (this.#mongo.ignoreError) {
        console.error("Error getting entries:", error);
        return {};
      } else {
        throw error;
      }
    }
  }

  /**
   * @private
   */
  exposeMongo() {
    return this.#mongo;
  }
}
