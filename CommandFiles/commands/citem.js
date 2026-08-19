// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "citem",
  description: "Create custom items to add to your inventory.",
  author: "@lianecagara",
  version: "1.0.2",
  usage: "{prefix}citem <...json>",
  category: "Inventory",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["customitem"],
  shopPrice: 200000,
  requirement: "3.0.0",
  icon: "🛠️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Custom Item 🛠️",
  titleFont: "bold",
  contentFont: "fancy",
};

const { invLimit } = global.Cassidy;

/**
 *
 * @param {CommandContext} octx
 * @returns
 */
export async function entry(octx) {
  const { input, output, args, Inventory, money, cassIO, VirtualFiles } = octx;
  let userData = await money.getItem(input.senderID);
  let userInventory = new Inventory(userData.inventory);
  const vf = new VirtualFiles(userData.virtualFiles);

  if (userData.inventory.length >= invLimit) {
    return output.reply(`❌ You're carrying too many items!`);
  }

  let itemData;

  if (!args[0]) {
    await cassIO.out(
      `❌ Please provide a JSON string to create a custom item, or reply with a file path to open.

${vf}`
    );
    await cassIO.in({
      async callback(ctx) {
        const { output, input, money, VirtualFiles } = ctx;
        let userData = await money.get(input.senderID);
        const vf = new VirtualFiles(userData.virtualFiles);
        const path = input.body;
        const file = vf.readFile(path);
        try {
          itemData = JSON.parse(file);
        } catch (error) {
          return output.error(error);
        }
        return mainCB(ctx);
      },
    });
  } else {
    return mainCB(octx);
  }

  /**
   *
   * @param {CommandContext} ctx
   * @returns
   */
  async function mainCB({ output, args, cassIO }) {
    try {
      itemData ??= JSON.parse(args.join(" "));
    } catch (e) {
      return output.reply(
        `❌ Invalid JSON format. Please provide a valid JSON string.`
      );
    }

    const { key, icon, flavorText, name } = itemData;

    if (!key || !icon || !flavorText || !name) {
      return output.reply(
        `❌ Missing required fields. Ensure your JSON includes "key", "icon", "flavorText", and "name".`
      );
    }
    await cassIO.out(`Do you wanna submit this item? (Reply **yes** to confirm!)

${icon} **${name}** (c_${key})
✦ ${flavorText}`);

    await cassIO.in({
      // @ts-ignore
      test(i) {
        return i.body.startsWith("yes");
      },
      async callback({ input, Inventory, money, cassIO }) {
        userData = await money.get(input.senderID);
        userInventory = new Inventory(userData.inventory);

        const sanitizedItem = {
          key: `c_${key}`,
          icon: icon,
          name: name,
          flavorText: flavorText,
          type: "custom",
        };

        if (userInventory.size() >= invLimit) {
          return cassIO.out(`❌ You're carrying too many items!`);
        }

        userInventory.addOne(sanitizedItem);

        await money.set(input.senderID, {
          inventory: Array.from(userInventory),
        });

        const ID = await cassIO.out(
          `✅ Created a custom item: ${sanitizedItem.name}. Check your inventory to see it.\nReply with **write example.json** to save your file to the cloud, you can freely change the file name.\n\n${vf}`
        );
        console.log(ID);
        save();
      },
      dontUpdate: true,
    });

    async function save() {
      while (true) {
        await cassIO.in({
          // @ts-ignore
          test(i) {
            console.log("citem saving", i.words);
            return i.words[0] === "write";
          },
          async callback({ VirtualFiles, money, input, cassIO }) {
            console.log("citem saving", input.body);
            const bodies = input.splitBody(" ");
            if (bodies[0] !== "write") return;
            let userData = await money.get(input.senderID);
            const vf = new VirtualFiles(userData.virtualFiles);
            const path = bodies.slice(1).join(" ");
            vf.writeFile(path, JSON.stringify(itemData, null, 2));
            await money.set(input.senderID, {
              virtualFiles: vf.raw(),
            });
            return cassIO.out(`✅ Saved the file to ${path}.\n\n${vf}`);
          },
          dontUpdate: true,
        });
      }
    }
  }
}
