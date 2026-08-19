import { Casa2d, Casaieah } from "@cass-modules/CasaieahUtils";
import { ShopItem } from "@cass-modules/GardenBalancer";
import { Inventory } from "@cass-modules/InventoryEnhanced";
import { defineHome } from "@cass/define";
import { Config, SpectralCMDHome } from "@cassidy/spectral-home";
import { UTShop } from "@cassidy/ut-shop";

export const meta: Cassieah.Meta = {
  name: "casaieah",
  otherNames: ["casa", "house", "build"],
  icon: "🔨",
  category: "Idle Image-Powered Sim",
  version: "1.0.0",
  description: "Build, Invest, and Earn! Straight from YOUR HOUSE!",
  author: "@lianecagara",
  requirement: "4.0.0",
  role: 0,
  waitingTime: 0,
  isGame: true,
};

export const style: Cassieah.Style = {
  title: "🔨 Casa-Ieah (Build)",
  contentFont: "fancy",
  titleFont: "bold",
  lineDeco: "none",
};

const shop = new UTShop({
  key: "casashop",
  welcomeTexts: ["Welcome to the **Casa Shop**!"],
  buyTexts: ["Don't hesistate to choose your favorite tile!"],
  stockInterval: 5 * 60 * 1000,
  style,
  itemData: [...Casaieah.registry.values()].map((c) => {
    const converted = Casaieah.tileToItem(c);
    return {
      ...converted,
      price: c.price,
      stockChance: 1,
      stockLimit: 5,
      flavorText: "",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          ...converted,
        });
      },
    };
  }) satisfies ShopItem[],
});

const config: Config[] = [
  {
    key: "shop",
    aliases: ["-sh"],
    async handler(ctx) {
      return shop.onPlay(ctx);
    },
  },
  {
    key: "create",
    aliases: ["-cr", "new"],
    args: ["<room_name>"],
    async handler({ input, output, user }, { spectralArgs, useDefault }) {
      const { parsed: casa } = await Casaieah.fromDB(input.senderID);
      const w = 10;
      const h = 4;
      const inpname = spectralArgs[0];
      if (!inpname) {
        return useDefault();
      }

      if (Casaieah.getRoom(casa, inpname)) {
        return output.reply(`❌ Room **${inpname}** already exists!`);
      }

      const room = Casa2d.createRoom(inpname, w, h, () => null);

      casa.rooms.push(room);

      await Casaieah.toDB(input.senderID, casa);

      const roomCan = await room.tiles.renderView();
      return output.attach(
        `👤 **${user.name}**\n✅ Room successfully created, and it is empty!\n\n🚪 **Room**: ${room.name}\n\n***Please refer to the image below***`,
        await roomCan.toStream()
      );
    },
  },
  {
    key: "list",
    aliases: ["-l", "rooms"],
    async handler({ input, output, user }) {
      const { parsed: casa } = await Casaieah.fromDB(input.senderID);
      const rooms = casa.rooms;
      return output.reply(
        `👤 **${user.name}**\n\n${rooms
          .map(
            (room, ind) =>
              `**${ind + 1}**. 🚪 **${room.name}**\n  Size: **${
                room.width
              }**x**${room.height}**\n  Empty Tiles: **x${
                room.tiles.emptyCount
              }**`
          )
          .join("\n\n")}`
      );
    },
  },
  {
    key: "view",
    aliases: ["-v"],
    args: ["[room_name]"],
    async handler({ input, output, user }, { spectralArgs, useDefault }) {
      const { parsed: casa } = await Casaieah.fromDB(input.senderID);
      const inpname = spectralArgs[0];
      if (!inpname) {
        return useDefault();
      }
      const room = Casaieah.getRoom(casa, inpname);
      if (!room) {
        return output.reply(`❌ Room not **found**.`);
      }
      const roomCan = await room.tiles.renderView();
      return output.attach(
        `👤 **${user.name}**\n\n🚪 **Room**: ${room.name}\n\n***Please refer to the image below***`,
        await roomCan.toStream()
      );
    },
  },
  {
    key: "place",
    aliases: ["-p"],
    args: ["<room_name>", "<x>", "<y>", "<item_key>"],
    async handler(
      { input, output, user, usersDB },
      { spectralArgs, useDefault }
    ) {
      const { parsed: casa } = await Casaieah.fromDB(input.senderID);
      const inv = new Inventory(user.inventory);
      const inpname = spectralArgs[0];
      const [x, y] = Casaieah.parseInputCoords(
        spectralArgs[1],
        spectralArgs[2]
      );
      const itemKey = String(spectralArgs[3] ?? "");
      if (!inpname || isNaN(x) || isNaN(y) || !itemKey) {
        return useDefault();
      }
      const room = Casaieah.getRoom(casa, inpname);
      if (!room) {
        return output.reply(`❌ Room not **found**.`);
      }
      const item = inv.getOne(itemKey) as Casaieah.Item;
      if (!item) {
        return output.reply(
          `❌ Can't find an item with key **${itemKey}**, please check your inventory.`
        );
      }
      if (!item.tileID) {
        return output.reply(`❌ This item is not a valid tile.`);
      }
      const tile = Casaieah.registry.get(item.tileID);
      if (!tile && itemKey !== "null") {
        return output.reply(`❌ Can't find a tile with ID **${itemKey}**`);
      }
      if (!room.tiles.inBounds(x, y)) {
        return output.reply(`❌ Out of bounds!`);
      }
      const old = room.tiles.get(x, y);
      const itemOld = Casaieah.tileToItem(old);
      if (itemOld) {
        inv.addOne(itemOld);
      }
      inv.deleteRef(item);
      room.tiles.set(x, y, tile);
      const roomCan = await room.tiles.renderView();

      await Casaieah.toDB(input.senderID, casa, {
        inventory: inv.raw(),
      });
      return output.attach(
        `👤 **${user.name}**\n\n✅ Set from ${old?.emoji ?? "NULL"} **${
          old?.name ?? "Null"
        }** to ${tile?.emoji ?? "NULL"} **${
          tile?.name ?? "Null"
        }**\n🚪 **Room**: ${
          room.name
        }\n\n***Please refer to the image below***`,
        await roomCan.toStream()
      );
    },
  },
  {
    key: "remove",
    aliases: ["-r"],
    args: ["<room_name>", "<x>", "<y>"],
    async handler(
      { input, output, user, usersDB },
      { spectralArgs, useDefault }
    ) {
      const { parsed: casa } = await Casaieah.fromDB(input.senderID);
      const inpname = spectralArgs[0];
      const [x, y] = Casaieah.parseInputCoords(
        spectralArgs[1],
        spectralArgs[2]
      );
      if (!inpname || isNaN(x) || isNaN(y)) {
        return useDefault();
      }
      const room = Casaieah.getRoom(casa, inpname);
      if (!room) {
        return output.reply(`❌ Room not **found**.`);
      }

      if (!room.tiles.inBounds(x, y)) {
        return output.reply(`❌ Out of bounds!`);
      }
      const old = room.tiles.get(x, y);
      const item = Casaieah.tileToItem(old);
      const inv = new Inventory(user.inventory);
      if (item) {
        inv.addOne(item);
      }
      room.tiles.set(x, y, null);
      const roomCan = await room.tiles.renderView();
      await Casaieah.toDB(input.senderID, casa, {
        inventory: inv.raw(),
      });
      return output.attach(
        `👤 **${user.name}**\n\n✅ Set from ${old?.emoji ?? "NULL"} **${
          old?.name ?? "Null"
        }** to ${"NULL"} **${"Null"}**\n🚪 **Room**: ${
          room.name
        }\n\n***Please refer to the image below***`,
        await roomCan.toStream()
      );
    },
  },
];
const home = new SpectralCMDHome(
  {
    isHypen: false,
  },
  config
);

export const entry = defineHome(home);
