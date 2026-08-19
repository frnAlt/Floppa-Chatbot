import fs from "fs";

const MONEY_FILE_PATH = "handlers/database/userStat.json";
const defaults = {
  money: 0,
  exp: 0,
};
export function get(key) {
  const data = readMoneyFile();
  if (data[key]) {
    return data[key];
  } else {
    data[key] = { ...defaults };
    writeMoneyFile(data);
    return data[key];
  }
}

export function deleteUser(key) {
  const data = readMoneyFile();
  if (data[key]) {
    delete data[key];
    writeMoneyFile(data);
  }
  return readMoneyFile();
}
export function remove(key, removedProperties = []) {
  const data = readMoneyFile();
  if (data[key]) {
    for (const item of removedProperties) {
      if (!data[key][item]) {
        continue;
      }
      delete data[key][item];
    }
    writeMoneyFile(data);
  } else {
    
  }
  return readMoneyFile();
}

export function set(key, updatedProperties = {}) {
  const data = readMoneyFile();
  if (data[key]) {
    data[key] = { ...data[key], ...updatedProperties };
  } else {
    data[key] = { ...defaults, ...updatedProperties };
  }
  writeMoneyFile(data);
}

export function getAll() {
  return readMoneyFile();
}

function readMoneyFile() {
  try {
    const jsonData = fs.readFileSync(MONEY_FILE_PATH, "utf8");
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("Error reading money data:", error);
    return {};
  }
}

function writeMoneyFile(data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(MONEY_FILE_PATH, jsonData);
    return readMoneyFile();
  } catch (error) {
    console.error("Error writing money data:", error);
  }
}


export class UserStatsManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.defaults = {
      money: 0,
      exp: 0,
    };
  }

  get(key) {
    const data = this.readMoneyFile();
    if (data[key]) {
      return data[key];
    } else {
      data[key] = { ...this.defaults };
      this.writeMoneyFile(data);
      return data[key];
    }
  }

  deleteUser(key) {
    const data = this.readMoneyFile();
    if (data[key]) {
      delete data[key];
      this.writeMoneyFile(data);
    }
    return this.readMoneyFile();
  }

  remove(key, removedProperties = []) {
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
    return this.readMoneyFile();
  }

  set(key, updatedProperties = {}) {
    const data = this.readMoneyFile();
    if (data[key]) {
      data[key] = { ...data[key], ...updatedProperties };
    } else {
      data[key] = { ...this.defaults, ...updatedProperties };
    }
    this.writeMoneyFile(data);
  }

  getAll() {
    return this.readMoneyFile();
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
      return this.readMoneyFile();
    } catch (error) {
      console.error("Error writing money data:", error);
    }
  }
}




