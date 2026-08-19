// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "mitem",
  description: "Make any items to add to your inventory.",
  author: "frnAlt",
  version: "1.0.2",
  usage: "{prefix}mitem <...json>",
  category: "Inventory",
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["makeitem"],
  botAdmin: true,
  requirement: "3.0.0",
  icon: "🛠️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Make Item 🛠️",
  titleFont: "bold",
  contentFont: "fancy",
};

const { invLimit } = global.Cassidy;

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry({ input, output, args, Inventory, money }) {
  const userData = await money.queryItem(input.senderID, "inventory");
  let userInventory = new Inventory(userData.inventory);

  if (userData.inventory.length >= invLimit) {
    return output.reply(`❌ You're carrying too many items!`);
  }

  if (args.length === 0) {
    return output.reply(
      `❌ Please provide a JSON string to create a custom item.`
    );
  }

  let itemData;
  try {
    itemData = JSON.parse(args.join(" "));
  } catch (e) {
    return output.reply(
      `❌ Invalid JSON format. Please provide a valid JSON string.`
    );
  }

  const { key, icon, flavorText, name, type, sellPrice } = itemData;

  if (!key || !icon || !flavorText || !name || !type || !sellPrice) {
    return output.reply(
      `❌ Missing important required fields. Ensure your JSON includes "key", "icon", "flavorText", "type", "sellPrice" and "name".`
    );
  }
  if (userInventory.has(key)) {
    await output.quickWaitReact(
      `⚠️ You already had this item, please react with 👍 to proceed.`,
      {
        emoji: "👍",
        authorOnly: true,
        edit: "✅ Proceeding...",
      }
    );
  }

  const sanitizedItem = {
    ...itemData,
  };

  userInventory.addOne(sanitizedItem);

  await money.setItem(input.senderID, {
    inventory: Array.from(userInventory),
  });

  return output.reply(
    `✅ Created a new item: ${sanitizedItem.name}. Check your inventory to see it.`
  );
}
