// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "octoshop",
  description:
    "A mystical shop run by Octokeeper, selling unique potions and magical items.",
  version: "1.0.0",
  author: "Liane",
  usage: "{prefix}octoshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["krakenshop", "deepstore"],
  requirement: "3.0.0",
  icon: "🐙",
  cmdType: "cplx_g",
  isGame: true,
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(octoShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🐙 Octobot Shop",
  titleFont: "bold",
  contentFont: "fancy",
};

const octoShop = {
  key: "octoshop",
  welcomeTexts: ["🐙 Welcome to the **OctoShop** in **Cassidy**!"],
  itemData: [
    {
      icon: "💊",
      name: "Vitamin-D",
      flavorText:
        "A supplement that boosts your defense, might not be useful, might now work, who knows?",
      key: "vitaminD",
      price: 100,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Vitamin-D",
          key: "vitaminD",
          flavorText: "DEF +5.",
          icon: "💊",
          type: "potion",
          def: 5,
          sellPrice: 50,
        });
      },
    },
    {
      icon: "🧪",
      name: "Power Potion",
      flavorText:
        "A potion that enhances your strength, if strength is actually a mechanic here, what if not?",
      key: "powerPotion",
      price: 150,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Power Potion",
          key: "powerPotion",
          flavorText: "ATK +5.",
          icon: "🧪",
          type: "potion",
          atk: 5,
          sellPrice: 75,
        });
      },
    },
    {
      icon: "⛰️",
      name: "Rock Potion",
      flavorText:
        "A potion that grants experience to pets, wait.. so this is basically a pet food? not.",
      key: "rockPotion",
      price: 200,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Rock Potion",
          key: "rockPotion",
          flavorText: "EXP +70 to any pet.",
          icon: "⛰️",
          type: "potion",
          exp: 70,
          sellPrice: 100,
        });
      },
    },
    {
      icon: "⚡",
      name: "Agility Potion",
      flavorText:
        "A potion that increases your speed, if speed is a thing here. But who knows? I don't know anything about Cassidy",
      key: "agilityPotion",
      price: 180,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Agility Potion",
          key: "agilityPotion",
          flavorText: "SPD +2.",
          icon: "⚡",
          type: "potion",
          spd: 2,
          sellPrice: 90,
        });
      },
    },
    {
      icon: "⬆️",
      name: "Skill Plus",
      flavorText:
        "Grants a random new skill to any pet, if skills are a thing... I hope so",
      key: "skillPlus",
      price: 250,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Skill Plus",
          key: "skillPlus",
          flavorText: "Randomly selects new skill for any pet.",
          icon: "⬆️",
          type: "skill",
          sellPrice: 125,
        });
      },
    },
    {
      icon: "🔮",
      name: "Amulet Coin",
      flavorText: "Transforms you into a fairy, how delusional.",
      key: "amuletCoin",
      price: 300,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Amulet Coin",
          key: "amuletCoin",
          flavorText: "Become fairy.",
          icon: "🔮",
          type: "transformation",
          sellPrice: 150,
        });
      },
    },
    {
      icon: "❄️",
      name: "Frozen Heart",
      flavorText:
        "Unlocks the Snowgrave Route, if that was a thing not in Deltarune.",
      key: "frozenHeart",
      price: 500,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Frozen Heart",
          key: "frozenHeart",
          flavorText: "Unlock Snowgrave Route.",
          icon: "❄️",
          type: "key",
          sellPrice: 250,
        });
      },
    },
    {
      icon: "☘️",
      name: "Lucky Drop",
      flavorText:
        "Grants a random new skill, but skills might not be a thing..?",
      key: "luckyDrop",
      price: 350,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Lucky Drop",
          key: "luckyDrop",
          flavorText: "Random NEW SKILL.",
          icon: "☘️",
          type: "skill",
          sellPrice: 175,
        });
      },
    },
    {
      icon: "📗",
      name: "Old Note",
      flavorText:
        "Allows you to edit descriptions, what the hell are descriptions!?",
      key: "oldNote",
      price: 50,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Old Note",
          key: "oldNote",
          flavorText: "Description Edit Pass.",
          icon: "📗",
          type: "utility",
          sellPrice: 25,
        });
      },
    },
    {
      icon: "🏷️",
      name: "Dog Tag",
      flavorText:
        "Changes the name of your pet, if it's actually possible.. I hope so",
      key: "dogTag",
      cannotBuy: true,
      price: 6000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Dog Tag",
          key: "dogTag",
          flavorText: "Changes the name of the pet.",
          icon: "🏷️",
          type: "utility",
          sellPrice: 3000,
        });
      },
    },
    {
      icon: "💥",
      name: "Transmute",
      flavorText:
        "Transforms a pet into any kind, if that's legal to do in Cassidy.",
      key: "transmute",
      price: 400,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Transmute",
          key: "transmute",
          flavorText: "Transmute a pet to any kind.",
          icon: "💥",
          type: "transformation",
          sellPrice: 200,
        });
      },
    },
  ],
  askSellTexts: ["🐙 Which garbages do you want to exchange as cash?"],
  sellDisallowed: [
    "highRollPass",
    "highRollpass",
    "temFlakes",
    "payTemCollege",
    "temArmor",
    "cat",
  ],
  allowSell: true,
  tradeRefuses: ["🐙 Is that even a thing here?"],
  buyTexts: ["🐙 Which item do you want to waste?"],
  thankTexts: ["🐙 Thanks for buying my out-of-the world stuffs. NO REFUNDS!"],
  askTalkTexts: ["🐙 Dahel do you want to talk about?"],
  goBackTexts: ["🐙 Dahel do you actually want?"],
  talkTexts: [
    {
      name: "Why are you here?",
      responses: [
        "🐙 Well.. I'm just bored so I tried smuggling my items into **Cassidy**'s low economy, but I couldn't find a good place to sell them under-the-table, so I decided to open a **legal shop** here.'",
        "🐙 Why is it still legal? I don't know.. That's how the government works here, if they actually existed.",
      ],
      icon: "❓",
    },
    {
      name: "Origin of your items",
      responses: [
        "🐙 I'm not sure, but I'm pretty sure that my items are not the same as the ones you have in your inventory, and other shops..",
        "🐙 Actually they are from an **Octobot Remake**, that's all",
        "🐙 Why they work? I don't know how my items managed to work here, maybe somebody else fixed them?",
        "🐙 They don't work? Well it doesn't matter, I won't give you a refund anyway.",
        "🐙 I've spent hours trying to find the right emoji for my items, why are emoji's required in shops?",
        "🐙 Dang I already made 5 dialogues, I should stop.",
      ],
      icon: "🎒",
    },
    {
      name: "What's Octobot Remake?",
      responses: [
        "It's basically **Octobot** but with a remake, I guess..",
        "Where did my kraken emoji go? Well I don't know..",
        "🦑 Oh it's here, well.. thats weird why do I feel like something is off..",
        "🐙 Oh I used the wrong emoji, BRUH.",
        "🐙 Where am I? oh yes, I'm in **Cassidy**.",
        "🐙 ...",
      ],
      icon: "🐙",
    },
    {
      name: "Are you a kraken?",
      responses: [
        "🐙 Did I accidentally say that? I'm an octopus, from **Octobot**, if I were a kraken, I should have named it **KrakenBot Remake**.",
        "🐙 'Whats with kraken emoji?', well.. It's better than what I use before.. Just go along with it.",
      ],
      icon: "🦑",
    },
    {
      name: "Items not working",
      responses: [
        "🐙 Why would you expect something out-of-the-world to work seamlessly..?",
        "🐙 I already told all of my customers that I wouldn't give any refund.",
        "🐙 Oh! I do give refund, but half the price.. You know.. that's how selling works",
      ],
      icon: "❌",
    },
    {
      name: "Why do you buy items from users?",
      responses: [
        "🐙 It's an agreement I made with the governor, emperor, I forgot the name.. I would be able to sell anything as long as I also buy anything from them.",
        "🐙 You don't understand how accepting garbage feels.",
        "🐙 Why am I even buying garbages from users? Not because they're special, but they are still useful, not gonna lie.",
        "🐙 I'm not buying your Temmie Armor, that's too expensive.",
        "🐙 Oh, temmie? Who the hell was that.",
      ],
      icon: "💰",
    },
    {
      name: "Why are your items cheaper?",
      responses: [
        "🐙 So you noticed that my items here are cheaper than my items in the **Octobot Remake**? Well, the police might arrest me for overpricing my goods..",
        "🐙 The economy works differently here.. The economy works differently here..",
        "🐙 Also, they might not work, selling them on cheaper prices wouldn't be a pain.",
      ],
    },
  ],
};
