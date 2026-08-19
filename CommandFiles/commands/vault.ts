import { parseBet } from "@cass-modules/ArielUtils";
import { BriefcaseAPI } from "@cass-modules/BriefcaseAPI";
import { Datum } from "@cass-modules/Datum";
import { UNIRedux } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "vault",
  description:
    "Organize and manage your external inventory with an additional 100 slots.",
  author: "Liane Cagara | JenicaDev",
  version: "1.1.5",
  usage: "{prefix}vault <action> [arguments]",
  category: "Inventory",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["box", "bx", "vt"],
  shopPrice: 10000,
  requirement: "3.0.0",
  icon: "🗃️",
  cmdType: "cplx_g",
  isGame: true,
};

const { invLimit } = global.Cassidy;

export const style = {
  title: "Vault 🗃️",
  titleFont: "bold",
  contentFont: "fancy",
};

export async function entry(ctx: CommandContext) {
  const { input, output, money, args, Inventory } = ctx;
  const userData = await money.getCache(input.senderID);
  let userInventory = new Inventory(userData.inventory);

  let [...actionArgs] = args;
  let newActionArgs = [];
  for (let i = 0; i < actionArgs.length; i++) {
    const value = actionArgs[i];

    let [key, amount = "1"] = value.split("*") as Array<string | number>;
    amount = parseBet(amount, Infinity);
    if (isNaN(amount)) {
      amount = 1;
    }
    if (amount > invLimit) {
      amount = invLimit;
    }
    for (let j = 0; j < amount; j++) {
      newActionArgs.push(key);
    }
  }
  actionArgs = newActionArgs;

  let vaultItems = userData.boxItems || [];
  let vaultInventory = new Inventory(vaultItems, 100);
  let name = userData.name;

  async function createList() {
    const vaultItemsList = vaultInventory.getAll();
    const invItemsList = userInventory.getAll();

    let vaultItemList = `${UNIRedux.arrow} ***Vault Items***\n\n`;
    let invItemList = `${UNIRedux.arrow} ***Inventory Items***\n\n`;

    const invCounts = new Map();
    invItemsList.forEach((item) => {
      invCounts.set(item.key, (invCounts.get(item.key) || 0) + 1);
    });
    invItemList +=
      invCounts.size > 0
        ? Array.from(invCounts.entries())
            .map(([key, count]) => {
              const item = invItemsList.find((i) => i.key === key);
              return `${item.icon} **${item.name}**${
                count > 1 ? ` (x${count})` : ""
              } [${item.key}]`;
            })
            .join("\n")
        : "No items available.";

    const vaultCounts = new Map();
    vaultItemsList.forEach((item) => {
      vaultCounts.set(item.key, (vaultCounts.get(item.key) || 0) + 1);
    });
    vaultItemList +=
      vaultCounts.size > 0
        ? Array.from(vaultCounts.entries())
            .map(([key, count]) => {
              const item = vaultItemsList.find((i) => i.key === key);
              return `${item.icon} **${item.name}**${
                count > 1 ? ` (x${count})` : ""
              } [${item.key}]`;
            })
            .join("\n")
        : "No items available.";

    return (
      `👤 **${
        name || "Unregistered"
      }** (**${userInventory.size()}/${invLimit}**)\n\n` +
      `${invItemList}\n\n` +
      `${UNIRedux.standardLine}\n` +
      `🗃️ **Vault** (**${vaultInventory.size()}/100**)\n\n` +
      `${vaultItemList}`
    );
  }

  const home = new BriefcaseAPI(
    {
      isHypen: true,
      inventoryKey: "boxItems",
      inventoryName: "Vault",
      inventoryIcon: "🗃️",
      inventoryLimit: 100,
      showCollectibles: false,
    },
    [
      {
        key: "status",
        description: "Lists all items in your vault inventory",
        aliases: ["-st"],
        async handler() {
          return output.reply(`${await createList()}`);
        },
      },
      {
        key: "peek",
        description: "Check someone's items.",
        args: ["<uid>"],
        aliases: ["-p"],
        async handler() {
          const {
            inventory = [],
            boxItems = [],
            name: name2 = "Unregistered",
          } = await money.getCache(actionArgs[0]);
          vaultInventory = new Inventory(boxItems, 100);
          userInventory = new Inventory(inventory);
          name = name2;
          return output.reply(`✅ Checking ${name}\n\n${await createList()}`);
        },
      },
      {
        key: "store",
        aliases: ["-s"],
        description: "Store an item from your inventory into the vault.",
        args: ["<key1> <key2> <...etc>"],
        async handler() {
          const keysToStore = actionArgs;
          if (keysToStore.length < 1) {
            return output.reply(
              `❌ Please specify an item key to store.\n\n${await createList()}`
            );
          }
          const results: string[] = [];
          for (const keyToStore of keysToStore) {
            const itemToStore = userInventory.getOne(keyToStore);
            if (!itemToStore) {
              results.push(
                `❌ Item with key "${keyToStore}" not found in your inventory.`
              );
              continue;
            }
            if (vaultInventory.getAll().length >= 100) {
              results.push(`❌ The vault is full.`);
              continue;
            }
            if (itemToStore.cannotvault === true) {
              results.push(`❌ "${keyToStore}" can't be stored in the vault.`);
              continue;
            }
            userInventory.deleteOne(keyToStore);
            vaultInventory.addOne(itemToStore);
            results.push(
              `✅ Stored ${itemToStore.icon} **${itemToStore.name}** in the vault.`
            );
          }
          await money.setItem(input.senderID, {
            inventory: Array.from(userInventory),
            boxItems: Array.from(vaultInventory),
          });
          return output.reply(
            `${Datum.toUniqueArray(results)
              .map((i) => `**x${results.filter((j) => j === i).length}** ${i}`)
              .join("\n")}\n\n${await createList()}`
          );
        },
      },
      {
        key: "retrieve",
        aliases: ["-r"],
        description: "Retrieve an item from the vault into your inventory.",
        args: ["<key1> <key2> <...etc>"],
        async handler() {
          const keysToRetrieve = actionArgs;
          if (keysToRetrieve.length < 1) {
            return output.reply(
              `❌ Please specify an item key to retrieve.\n\n${await createList()}`
            );
          }
          const results: string[] = [];
          for (const keyToRetrieve of keysToRetrieve) {
            const itemToRetrieve = vaultInventory.getOne(keyToRetrieve);
            if (!itemToRetrieve) {
              results.push(
                `❌ Item with key "${keyToRetrieve}" not found in the vault.`
              );
              continue;
            }
            if (userInventory.getAll().length >= invLimit) {
              results.push(`❌ Your inventory is full.`);
              continue;
            }
            vaultInventory.deleteOne(keyToRetrieve);
            userInventory.addOne(itemToRetrieve);
            results.push(
              `✅ Retrieved ${itemToRetrieve.icon} **${itemToRetrieve.name}** from the vault.`
            );
          }
          await money.setItem(input.senderID, {
            inventory: Array.from(userInventory),
            boxItems: Array.from(vaultInventory),
          });
          return output.reply(
            `${Datum.toUniqueArray(results)
              .map((i) => `**x${results.filter((j) => j === i).length}** ${i}`)
              .join("\n")}\n\n${await createList()}`
          );
        },
      },
    ]
  );
  home.runInContext(ctx);
}
