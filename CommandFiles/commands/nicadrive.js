// @ts-check
import { UNIRedux } from "@cassidy/unispectra";
import { Slicer } from "../plugins/utils-liane.js";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "nicadrive",
  description:
    "A personal storage system for extra items. Store, retrieve, and manage inventory beyond your main limit. Upgrade for more space!",
  author: "JenicaDev || Fixed by Liane",
  version: "2.1.1",
  usage: "{prefix}ndrive <action> [arguments]",
  category: "Inventory",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["ndrive"],
  requirement: "3.0.0",
  icon: "💾",
  cmdType: "cplx_g",
  isGame: true,
};

const { invLimit } = global.Cassidy;

const ndriveLimit = 100;
const proLimit = 1000;

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "NicaDrive™ 💾",
  titleFont: "bold_italic",
  contentFont: "fancy",
};

/**
 * @param {string[]} args
 */
function normalizeArgAmount(args) {
  const copy = Array.from(args);
  const newCopy = [];
  for (let i = 0; i < copy.length; i++) {
    const value = copy[i];
    /**
     * @type {Array<number | string>}
     */
    let [key, amount = "1"] = value.split("*");
    amount = parseInt(amount);
    if (isNaN(amount)) {
      amount = 1;
    }
    if (amount > invLimit) {
      amount = invLimit;
    }
    for (let j = 0; j < amount; j++) {
      newCopy.push(key);
    }
  }
  return newCopy.map(String);
}

/**
 * @param {CommandContext} ctx
 */
export async function entry({
  input,
  output,
  prefix,
  Inventory,
  money,
  args,
  commandName,
}) {
  let [sub, ...subArgs] = args;
  subArgs = normalizeArgAmount(subArgs);

  const userData = await money.getItem(input.senderID);

  let { ndrive } = userData;
  const userInventory = new Inventory(userData.inventory ?? []);

  let discontinued = !input.isAdmin;
  if (!ndrive) {
    if (discontinued) {
      return output.replyStyled(
        `NicaDrive™ has been discontinued. We're sorry that you can no longer create a **NicaDrive™ Account**`,
        style
      );
    }
    ndrive = {
      name: null,
      items: [],
      storageRequested: 100,
      premium: false,
    };

    const ii = await output.replyStyled(
      `Before we begin, let’s set up your **NicaDrive™ Account**.\nPlease answer a few questions to personalize your experience!\n${UNIRedux.standardLine}\n🏷️ **What name should we use for your NicaDrive™ account?**\n(Example: “Nica’s Storage” or just your name.)\n\n***Reply with your name now!***`,
      style
    );

    input.setReply(ii.messageID, {
      /**
       * @param {CommandContext} repCtx
       */
      async callback(repCtx) {
        const name = String(repCtx.input.body).slice(0, 20);

        if (!name) {
          return;
        }

        if (repCtx.input.senderID !== input.senderID) {
          return;
        }

        const ii2 = await repCtx.output.replyStyled(
          `✅ Great! Your NicaDrive™ account is now named **"${name}"**\n${UNIRedux.standardLine}\n📦 **How many items would you like to store?**\n\n***Reply with a number.***`,
          style
        );

        ndrive.name = name.replace(/\b\w/g, (char) => char.toUpperCase());

        input.setReply(ii2.messageID, {
          /**
           *
           * @param {CommandContext} repCtx2
           * @returns
           */
          async callback(repCtx2) {
            const storageRequested = parseInt(repCtx2.input.body);

            if (!storageRequested) {
              return;
            }

            let isNaNReq = isNaN(storageRequested);

            let res = isNaNReq
              ? `💾 It looks like you're not quite ready to decide. That’s okay! We’ll handle it for you. ✅`
              : storageRequested > 0 && storageRequested <= 100
              ? `💾 All set! Your items are safely stored. Thanks for using NicaDrive™. 📦`
              : storageRequested > 0
              ? `💾 That’s quite a lot! No worries, we’ll handle it as best as we can. 🏗️`
              : `💾 An unconventional choice! Don’t worry, we’ve taken care of everything. 🌱`;

            ndrive.storageRequested = storageRequested;

            const res2 = `${res}\n${UNIRedux.standardLine}\n💾 NicaDrive™ Account Setup Complete! 🎉\n\n**📂 Your NicaDrive™ Features:**\n***Storage Capacity***: 0/${ndriveLimit} used\n***Instant Access***: Store and retrieve items anytime! (When it’s not updating.)\n***Secure ndrive***: Your items are totally safe.\n***Smart Optimization***: We make the best use of your storage!\n\n**💾 You're all set!** Use **${prefix}ndrive** anytime to start storing and managing your items.\n${UNIRedux.standardLine}\n💎 **Upgrade to NicaDrive™ Premium?**\nWant more storage, faster retrievals, and exclusive features? Sign up for NicaDrive Premium™ today!\n\n🔹 Benefits include:\n✔️ Increased storage limit! (How much? That’s a surprise.)\n✔️ Priority item retrieval! (Less waiting)\n✔️ Exclusive support! (We might respond.)`;

            await money.set(input.senderID, {
              ndrive,
            });

            return repCtx2.output.replyStyled(res2, style);
          },
        });
      },
    });

    return;
  }

  if (!Array.isArray(ndrive.items)) {
    return output.wentWrong();
  }

  const nicaItems = new Inventory(ndrive.items ?? [], proLimit);
  const limit = ndrive.premium ? proLimit : ndriveLimit;

  let warn = discontinued
    ? `⚠️ **WARNING**: NicaDrive™ has been discontinued. Please retrieve your items ASAP before it gets deleted!\n\n`
    : "";

  /**
   * @param {typeof nicaItems} items
   */
  // @ts-ignore
  async function createItemMenuOld(items = nicaItems) {
    const ndriveItemsList = items.getAll();
    let pushedKeys = [];
    let ndriveItemList = ndriveItemsList
      .map((item) => {
        if (pushedKeys.includes(item.key)) {
          return null;
        }
        const amount = items.getAmount(item.key);
        pushedKeys.push(item.key);
        return `${item.icon} **${item.name}** (x${amount}) [${item.key}]`;
      })
      .filter(Boolean)
      .join("\n");
    const invItemsList = userInventory.getAll();
    let pushedKeys2 = [];
    let invItemList = invItemsList
      .map((item) => {
        if (pushedKeys2.includes(item.key)) {
          return null;
        }
        const amount = userInventory.getAmount(item.key);

        pushedKeys2.push(item.key);
        return `${item.icon} **${item.name}** (x${amount}) [${item.key}]`;
      })
      .filter(Boolean)
      .join("\n");
    const arrayInv = invItemList.split("\n");
    const diff = 8 - arrayInv.length;
    for (let i = 0; i < diff; i++) {
      arrayInv.push("");
    }
    let result = [];
    arrayInv.forEach((val) => {
      if (!val) {
        result.push("_".repeat(15));
      }
    });

    if (result) {
      invItemList += `\n`;
    }
    invItemList += result.join("\n");

    const arrayndrive = ndriveItemList.split("\n");
    const diff2 = 8 - arrayndrive.length;
    for (let i = 0; i < diff2; i++) {
      arrayndrive.push("");
    }
    let result2 = [];
    arrayndrive.forEach((val) => {
      if (!val) {
        result2.push("_".repeat(15));
      }
    });

    if (result2) {
      ndriveItemList += `\n`;
    }
    ndriveItemList += result2.join("\n");

    return `${warn}***👤 ${
      userData.name
    }*** ${userInventory.size()}/${invLimit}\n\n${
      userInventory.size() > 0 ? invItemList.trim() : "Empty"
    }\n\n***💾 ${ndrive.name}*** ${items.size()}/100\n\n${
      items.size() > 0
        ? ndriveItemList.trim()
        : "No items stored. Start storing now!"
    }`;
  }

  async function createItemMenu(page = 1) {
    page = Slicer.parseNum(page);

    const ndriveItemsList = [...nicaItems.getAll()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const invItemsList = [...userInventory.getAll()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    /**
     * @param {import("cassidy-userData").InventoryItem[]} items
     */
    // @ts-ignore
    function group(items) {
      /**
       * @type {Array<(import("cassidy-userData").InventoryItem) & { count: number }>}
       */
      const groupedItems = [];
      const seenKeys = new Set();

      items.forEach((item) => {
        if (!seenKeys.has(item.key)) {
          const count = items.filter((i) => i.key === item.key).length;
          groupedItems.push({ ...item, count });
          seenKeys.add(item.key);
        }
      });
      return groupedItems;
    }

    /**
     * @param {Array<(import("cassidy-userData").InventoryItem) & { count: number }>} items
     */
    function render(items) {
      const result = [...items].map(
        (item) => `${item.icon} **${item.name}** [${item.key}]`
      );
      while (result.length < 8) {
        result.push("_".repeat(15));
      }

      return result.join("\n");
    }

    const ndriveSlicer = new Slicer(ndriveItemsList, 8);
    const invSlicer = new Slicer(invItemsList, 8);
    const more = `\n[...Type **${prefix}ndrive view ${
      page + 1
    }** to see more items]`;
    return `${UNIRedux.arrow} Page ${page} of ${Math.max(
      ndriveSlicer.pagesLength,
      invSlicer.pagesLength
    )}\n\n***👤 ${
      userData.name
    }*** (${userInventory.size()}/${invLimit})\n\n${render(
      // @ts-ignore
      invSlicer.getPage(page)
    )}${page < invSlicer.pagesLength ? more : ""}\n${
      UNIRedux.standardLine
    }\n***💾 ${ndrive.name}*** (${nicaItems.size()}/${limit})\n\n${render(
      // @ts-ignore
      ndriveSlicer.getPage(page)
    )}${page < ndriveSlicer.pagesLength ? more : ""}`;
  }

  const opts = [
    {
      name: "view",
      icon: "📦",
      desc: "View Stored Items",
      async callback() {
        return output.replyStyled(
          await createItemMenu(parseInt(subArgs[0])),
          style
        );
      },
    },
    {
      name: "store",
      icon: "📥",
      desc: "Store Item(s)",
      async callback() {
        if (discontinued) {
          return output.replyStyled(
            `NicaDrive™ has been discontinued. We have removed the ability to store items but you can still retrieve.`,
            style
          );
        }
        const keysToStore = subArgs;

        if (keysToStore.length < 1) {
          return output.reply(
            `❌ Please specify an item key to store in the NicaDrive.`
          );
        }
        let str = ``;
        for (const keyToStore of keysToStore) {
          const itemToStore = userInventory.getOne(keyToStore);
          if (!itemToStore) {
            return output.reply(
              `❌ Item with key "${keyToStore}" not found in your inventory.`
            );
          }
          if (nicaItems.getAll().length >= limit) {
            return output.reply(`❌ NicaDrive is full.`);
          }
          if (itemToStore.cannotvault === true) {
            return output.reply(
              `❌ Item with key "${keyToStore}" cannot be stored in the NicaDrive.`
            );
          }
          userInventory.deleteOne(keyToStore);
          nicaItems.addOne(itemToStore);

          str += `✅ ${itemToStore.icon} ${itemToStore.name}\n`;
        }
        ndrive.items = nicaItems.getAll();
        await money.set(input.senderID, {
          inventory: Array.from(userInventory),
          ndrive,
        });

        return output.reply(
          `${str.trim()}\n\n💾 Your NicaDrive™ Account is now updated.`
        );
      },
    },
    {
      name: "retrieve",
      icon: "📤",
      desc: "Retrieve Item(s)",
      async callback() {
        const keysToRetrieve = subArgs;
        if (keysToRetrieve.length < 1) {
          return output.reply(
            `❌ Please specify an item key to retrieve from the NicaDrive.`
          );
        }
        let str2 = ``;
        for (const keyToRetrieve of keysToRetrieve) {
          const itemToRetrieve = nicaItems.getOne(keyToRetrieve);
          if (!itemToRetrieve) {
            return output.reply(
              `❌ Item with key "${keyToRetrieve}" not found in the NicaDrive.`
            );
          }
          if (userInventory.getAll().length >= invLimit) {
            return output.reply(`❌ Your Inventory is full.`);
          }
          nicaItems.deleteOne(keyToRetrieve);
          userInventory.addOne(itemToRetrieve);
          str2 += `✅ ${itemToRetrieve.icon} ${itemToRetrieve.name}\n`;
        }
        ndrive.items = nicaItems.getAll();

        await money.set(input.senderID, {
          ndrive,
          inventory: Array.from(userInventory),
        });

        return output.reply(
          `${warn}${str2.trim()}\n\n💾 Your NicaDrive™ Account is now updated.`
        );
      },
    },
    {
      name: "upgrade",
      icon: "🚀",
      desc: "Upgrade to NicaDrive Premium™",
    },
    {
      name: "settings",
      icon: "⚙️",
      desc: "Settings",
    },
  ];

  const handler = opts.find((i) => i.name === sub);

  if (!handler) {
    const items = opts
      .map((i) => `${prefix}${commandName} ${i.name}\n[${i.icon} ${i.desc}]`)
      .join("\n");
    const res = `${warn}📂 Welcome to NicaDrive™!\nName: **${
      ndrive.name
    }**\nYour Storage: ${nicaItems.size()}/${limit} used (Upgrade to NicaDrive Premium™ for more!)\n\n${items}`;

    return output.reply(res);
  }

  if (!handler.callback) {
    return output.reply(
      `${warn}🏗️🚧 Sorry, this feature is still a **work in progress.**`
    );
  }

  return handler.callback();
}
