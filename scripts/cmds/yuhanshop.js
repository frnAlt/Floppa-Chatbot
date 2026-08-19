// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "yuhanshop",
  description: "A brave lonely dog, until now no one knows where he came.",
  version: "1.0.3",
  author: "Yhander Toyco",
  usage: "{prefix}Yuhanshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🐶",
  cmdType: "cplx_g",
  isGame: true,
};

const yuhanshop = {
  key: "yuhanShop",
  itemData: [
    {
      icon: "🥧",
      name: "Pie",
      key: "Pie",
      cannotBuy: true,
      flavorText: "A normal pie, baked by Yuhan it will heal you 20 HP",
      price: 2_000_000_000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Pie",
          key: "Pie",
          flavorText: "A normal pie, baked by Yuhan, it will heal you 20 HP.",
          icon: "🥧",
          type: "food",
          heal: 200_000,
          sellPrice: 1000,
        });
      },
    },
    {
      icon: "🪃",
      name: "Boomerang",
      flavorText:
        "A boomerang crafted by Yuhan. it increases your TP to %12, Infinite power!",
      price: 50_000_000,
      atk: 1_000_000_000_000_000,
      def: 1_000_000_000_000_000,
      type: "weapon",
      key: "boomerang",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Boomerang",
          key: "boomerang",
          flavorText:
            "A boomerang created by Yuhan. it increases your TP to %12. And you were scammed.",
          icon: "🪃",
          type: "weapon",
          atk: 50,
          def: 50,
          tpBoost: 12,
          sellPrice: 30_000_000,
        });
      },
    },
    {
      icon: "🗡️",
      name: "Leeyan Sword",
      flavorText: "A sword crafted by my cousin when he was still alive.",
      key: "leeyanSword",
      price: 5_000_000_000,
      type: "weapon",
      atk: 150,
      def: 70,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Leeyan Sword",
          key: "leeyanSword",
          flavorText: "A sword created by my cousin when he was still alive.",
          icon: "🗡️",
          type: "weapon",
          atk: 150,
          def: -25,
          sellPrice: 2_500_000_000,
        });
      },
    },
    {
      icon: "🥎",
      name: "Ball",
      key: "Ball",
      flavorText:
        "This is my toy! I don't know why it's here in my shop. Anyways, YOU CAN'T HAVE IT!",
      price: 50,
      cannotBuy: true,
    },
    {
      icon: "⚜️",
      name: "Yuhan Astrum",
      key: "yuhanAstrum",
      cannotBuy: true,
      flavorText:
        "it's the most POWERFUL amulet and It was forged under a lunar eclipse. It carries the whispers of old star prophecies. The etchings on the amulet show the constellations of a civilization that's been lost for a long time, and it's said to guide the person wearing it through dark and light.",
      price: 100_000_000_000_000,
      type: "weapon",
      def: 500,
      atk: 600,
      magic: 650,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Yuhan Astrum",
          key: "yuhanAstrum",
          flavorText:
            "it's an amulet and It was forged under a lunar eclipse. It carries the whispers of old star prophecies. The etchings on the amulet show the constellations of a civilization that's been lost for a long time, and it's said to guide the person wearing it through dark and light.",
          icon: "⚜️",
          type: "weapon",
          def: 500,
          atk: 600,
          magic: 650,
          sellPrice: 3_000_000_000_000,
        });
      },
    },

    {
      icon: "🧪",
      name: "Celestium Potion",
      key: "celestiumPotion",
      flavorText:
        "A potion from the highlands, created by an unknown witchcrafter. Restores a lot of HP to one ally.",
      price: 600_000_000_000,
      cannotBuy: true,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Celestium Potion",
          key: "celestiumPotion",
          flavorText:
            "A potion from the highlands. Restores 40 HP to one ally.",
          icon: "🧪",
          type: "food",
          heal: 60_000_000,
          sellPrice: 20_000_000,
        });
      },
    },
  ],
  sellTexts: [
    "🐶 awhh.. I'm sorry I can't buy items for now.",
    "🐶 Thanks for your understanding! woof!",
  ],
  talkTexts: [
    {
      name: "Leeyan's Story",
      responses: [
        "🐶 Me and my cousin are selling a lot of stuffs!",
        "🐶 But one day, our village got attack by a mysterious creature!",
        "🐶 My cousin tried to kill that mysterious creature, but he wasn't successful at all, he died.",
      ],
      icon: "🐩",
    },
    {
      name: "Yuhan's Story",
      responses: [
        "🐶 My story? I travel almost around the world to look for the best ingredient to make a new items to sell!",
        "🐶 Opening this shop was a great decision that I made, we earn money, we help people, and also we make them happy!",
        "🐶 Each item here has a story, waiting to be discovered by those brave enough to explore.",
      ],
      icon: "🐕",
    },
    {
      name: "Favorite Items",
      responses: ["🐶 My favorite item is the BALL!!"],
    },
    {
      name: "Tail-Wagging Tales",
      responses: [
        "🐶 My customers have gone on the most paw-some adventures! I've heard stories of hidden treats and secret parks.",
        "🐾 One pup even discovered a hidden dog beach, and now it's their favorite spot!",
        "🐶 Every customer's tale is a new chapter in the Doggy World - full of excitement and furry friends!",
      ],
      icon: "📚",
    },
    {
      name: "Paw-some Plans",
      responses: [
        "🐶 I'm fetching new treats for my shop, and you won't want to miss them! 🐾",
        "🐶 Woof woof! More doggy delights are on their way to Yuhan Shop! 🎁",
        "🐶 Ruff ruff! I'm digging up exciting surprises for future visitors - stay tuned! 🐶",
      ],
      icon: "🐾",
    },
    {
      name: "Shop Events",
      responses: [
        "🐶 Woof woof! Yuhan Shop is having a Paw-some Sale! Don't miss out on our exciting deals and discounts! 🐾",
        "🐶 Ruff ruff! New Arrivals at Yuhan Shop! Check out our latest collection and get ready to shop 'til you drop! 🐶",
        "🐶 Woof! Yuhan Shop is giving away FREE Gifts! Visit us today and claim your paw-some surprise! 🎁",
      ],
    },
  ],
  buyTexts: [
    "🐶 Which item catches your eye?",
    "🐶 Ready to embark on your next adventure with one of these treasures?",
    "🐶 Take your pick and uncover its hidden powers!",
  ],
  welcomeTexts: [
    "🐶 Welcome to Shawn's Shop in the Dark World!",
    "🐶 Greetings! Step into the realm of mystery and wonder.",
    "🐶 Ah, a traveler! Come, explore the artifacts of the Dark World.",
    "🐶 Welcome, welcome! Seeker of secrets and bearer of curiosity.",
    "🐶 Enter, brave soul! The Dark World awaits your discovery.",
  ],
  goBackTexts: [
    "🐶 No worries, take your time to decide.",
    "🐶 Feel free to browse, adventurer.",
    "🐶 Take a moment to ponder your choice.",
    "🐶 Don't hesitate to return if you change your mind.",
    "🐶 Explore at your own pace.",
  ],
  askTalkTexts: [
    "🐶 Interested in hearing tales of the Dark World?",
    "🐶Let's delve into the mysteries hidden within these walls.",
    "🐶 What stories intrigue you, traveler?",
    "🐶 I'm all ears for your questions and curiosities.",
    "🐶 Seek knowledge and adventure? You've come to the right place.",
  ],
  thankTexts: [
    "🐶 Thank you for choosing Shawn's Shop!",
    "🐶 May your journey through the Dark World be filled with discoveries!",
    "🐶 Until we meet again, adventurer!",
    "🐶 Your patronage is greatly appreciated!",
    "🐶 Farewell, and may the shadows guide your path.",
  ],
  notScaredGeno: true,
};

const closeTexts = [
  "🐶 Woof woof! Yuhan Shop is closed for now, but I'll be barking with excitement from 7 AM to 12 PM! Come back and we'll fetch some fantastic finds together! 🐾",
  "🐶 Ruff ruff! Yuhan Shop is taking a snooze. Wake me up at 7 AM, and we'll go on a tail-wagging adventure until 12 PM! 🐶",
  "🐶 Oh no, Yuhan Shop's on a walkies break! 🐾 Don't worry, I'll be back in the shop from 7 AM to 12 PM, ready to dig up some doggone good deals! 🌟",
  "🐶 Grrr... Yuhan Shop's closed for belly rubs right now. 🐾 But don't worry, I'll be back to serve you from 7 AM to 12 PM, with treats and goodies galore! 🎁",
  "🐶 Woof! Yuhan Shop's door is currently dog-eared shut. 🐾 But I'll be howling with excitement from 7 AM to 12 PM, ready to unleash some paw-some surprises! 🎉",
];

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({
  UTShop,
  isTimeAvailable,
  output,
  args,
  input,
  InputRoles,
  ctx,
}) {
  const a = 7 * 60 * 60 * 1000;
  const b = 12 * 60 * 60 * 1000;
  let isAvailable = isTimeAvailable(a, b);
  if (!isAvailable) {
    if (!input.hasRole(InputRoles.MODERATORBOT) || args[0] !== "force") {
      return output.reply(
        `✦ ${
          closeTexts[Math.floor(Math.random() * closeTexts.length)]
        } **Woof!! Go back next time!!**`
      );
    }
  }
  const shop = new UTShop(yuhanshop);
  return shop.onPlay({ ...ctx, args: [] });
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🐶 Yuhan's Shop",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};
