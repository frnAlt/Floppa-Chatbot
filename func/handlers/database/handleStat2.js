import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const LiaMongo = require("lia-mongo");

export default class UserStatsManager {
  #uri;

  constructor(filePath, { uri = global.Cassidy.config.MongoConfig?.uri } = {}) {
    this.filePath = filePath;
    this.defaults = {
      money: 0,
      exp: 0,
    };
    this.#uri = process.env[uri];
    this.isMongo = !!global.Cassidy.config.MongoConfig?.status;
    if (this.isMongo) {
      this.mongo = new LiaMongo({
        uri: this.#uri,
        //collection: "cassidyuserstats",
        collection: "reduxcassstats",
      });
    }
  }
  process(data) {
    data ??= {};
    data.money ??= 0;
    data.money = data.money <= 0 ? 0 : parseInt(data.money);

    if (data.money > Number.MAX_SAFE_INTEGER) {
      data.money = Number.MAX_SAFE_INTEGER;
    }
    data.battlePoints ??= 0;
    data.battlePoints =
      data.battlePoints <= 0 ? 0 : parseInt(data.battlePoints);
    data.exp ??= 0;
    data.inventory ??= [];
    if (isNaN(data.exp)) {
      data.exp = 0;
    }
    if (data.name) {
      data.name = data.name.trim();
    }

    if (isNaN(data.battlePoints)) {
      data.battlePoints = 0;
    }
    return data;
  }
  calcMaxBalance(users, specificID) {
    const balances = Object.keys(users)
      .filter((id) => id !== specificID)
      .map((id) => users[id].money);

    const totalBalance = balances.reduce(
      (sum, balance) => parseInt(sum) + balance,
      0
    );
    const averageBalance = totalBalance / balances.length;

    const maxBalance = Math.floor(10 * averageBalance);

    return maxBalance;
  }

  async connect() {
    if (this.isMongo) {
      if (!this.#uri) {
        throw new Error(
          "Missing MongoDB URI while the status is true, please check your settings.json"
        );
      }
      await this.mongo.start();
      await this.mongo.put("test", this.defaults);
    }
  }

  async get(key) {
    if (this.isMongo) {
      return this.process(
        (await this.mongo.get(key)) || {
          ...this.defaults,
          lastModified: Date.now(),
        }
      );
    } else {
      const data = this.readMoneyFile();
      return this.process(
        data[key] || { ...this.defaults, lastModified: Date.now() }
      );
    }
  }

  async deleteUser(key) {
    if (this.isMongo) {
      await this.mongo.remove(key);
    } else {
      const data = this.readMoneyFile();
      if (data[key]) {
        delete data[key];
        this.writeMoneyFile(data);
      }
    }
    return this.getAll();
  }

  async remove(key, removedProperties = []) {
    if (this.isMongo) {
      const user = await this.get(key);
      for (const item of removedProperties) {
        delete user[item];
      }
      await this.mongo.put(key, user);
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
    }
    return this.getAll();
  }

  async set(key, updatedProperties = {}) {
    if (this.isMongo) {
      const user = await this.get(key);
      const updatedUser = {
        ...user,
        ...updatedProperties,
        lastModified: Date.now(),
      };
      //await this.mongo.put(key, updatedUser);
      await this.mongo.bulkPut({
        [key]: updatedUser,
      });
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
    }
  }

  async getAllOld() {
    if (this.isMongo) {
      return await this.mongo.toObject();
    } else {
      return this.readMoneyFile();
    }
  }
  async getAll() {
    const allData = await this.getAllOld();

    const result = {};
    for (const key in allData) {
      result[key] = this.process(allData[key]);
    }
    return result;
  }

  readMoneyFile() {
    try {
      const jsonData = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(jsonData);
    } catch (error) {
      console.error("Error reading money data:", error);
      return {};
    }
  }

  writeMoneyFile(data) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, jsonData);
    } catch (error) {
      console.error("Error writing money data:", error);
    }
  }
  async toLeanObject() {
    try {
      const results = await this.mongo.KeyValue.find({}, "key value").lean();

      const resultObj = {};
      results.forEach((doc) => {
        resultObj[doc.key] = doc.value;
      });

      return resultObj;
    } catch (error) {
      if (this.mongo.ignoreError) {
        console.error("Error getting entries:", error);
        return {};
      } else {
        throw error;
      }
    }
  }
}
