// @ts-check
const fishItems = [
  {
    key: "fishGoldfish",
    name: "Goldfish",
    icon: "🐟",
    type: "cat_food",
    flavorText:
      "A shiny fish with golden scales. Perfect for your feline friend!",
    saturation: 600000, // 10 minutes
    sellPrice: 500,
  },
  {
    key: "fishSalmon",
    name: "Salmon",
    icon: "🐠",
    type: "cat_food",
    flavorText: "A nutritious fish loved by cats. Packed with omega-3!",
    saturation: 3000000,
    sellPrice: 4000,
  },
  {
    key: "fishTuna",
    name: "Tuna",
    icon: "🐡",
    type: "cat_food",
    flavorText: "A large fish known for its rich taste. Your cat will love it!",
    saturation: 240000, // 4 minutes
    sellPrice: 300,
  },
  {
    key: "fishCatfish",
    name: "Catfish",
    icon: "🐟",
    type: "cat_food",
    flavorText:
      "A bottom-dwelling fish with a unique taste. Ideal for your pet!",
    saturation: 180000, // 3 minutes
    sellPrice: 200,
  },
  {
    key: "fishTrout",
    name: "Trout",
    icon: "🐟",
    type: "cat_food",
    flavorText:
      "A freshwater fish with a delicate flavor. Your cat will enjoy it!",
    saturation: 120000, // 2 minutes
    sellPrice: 150,
  },
  {
    key: "fishBass",
    name: "Bass",
    icon: "🐟",
    type: "cat_food",
    flavorText: "A popular fish with a mild taste. A great treat for your pet!",
    saturation: 60000, // 1 minute
    sellPrice: 100,
  },
  {
    key: "fishSwordfish",
    name: "Swordfish",
    icon: "🐟",
    type: "cat_food",
    flavorText:
      "A large and powerful fish. A high-quality treat for your feline friend!",
    saturation: 300000, // 5 minutes
    sellPrice: 500,
  },
  {
    key: "fishMackerel",
    name: "Mackerel",
    icon: "🐟",
    type: "cat_food",
    flavorText: "A flavorful fish rich in nutrients. Your pet will love it!",
    saturation: 240000, // 4 minutes
    sellPrice: 400,
  },
];

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "fish",
  description: "Catch a fish and add it to your inventory.",
  version: "1.0.0",
  author: "@lianecagara",
  category: "Rewards",
  permissions: [0],
  waitingTime: 1,
  noPrefix: false,
  otherNames: ["fishing", "catch"],
  requirement: "3.0.0",
  icon: "🎣",
  requiredLevel: 3,
  cmdType: "cplx_g",
  isGame: true,
};

const fishingDelay = 300000;

export const style = {
  title: "Fishing 🎣",
  titleFont: "bold",
  contentFont: "fancy",
};

const { invLimit } = global.Cassidy;

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, money, Inventory }) {
  const { inventory = [], fishStamp } = await money.getItem(input.senderID);
  let updatedInventory = new Inventory(inventory);

  if (updatedInventory.size() >= invLimit) {
    return output.reply(`❌ You're carrying too many items!`);
  }

  const currentTime = Date.now();
  if (fishStamp && currentTime - fishStamp < fishingDelay) {
    const timeRemaining = fishingDelay - (currentTime - fishStamp);
    const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
    const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    return output.reply(
      `⏳ You need to wait ${minutesRemaining} minutes and ${secondsRemaining} seconds before fishing again.`
    );
  }

  let caughtFish = null;

  let shuffledFishItems = [...fishItems];
  for (let i = 0; i < 5; i++) {
    shuffledFishItems = shuffledFishItems.sort(() => Math.random() - 0.5);
  }

  const randomChance = Math.random();
  if (randomChance < 0.8) {
    caughtFish =
      shuffledFishItems[Math.floor(Math.random() * shuffledFishItems.length)];

    updatedInventory.addOne(caughtFish);

    output.reply(
      `You caught a **${caughtFish.icon} ${caughtFish.name}**!\nPlease check your **inventory** or type **inv check ${caughtFish.key}** for more information.`
    );
  } else {
    output.reply(`🎣 Unfortunately, you didn't catch anything this time.`);
  }

  await money.set(input.senderID, {
    inventory: Array.from(updatedInventory),
    fishStamp: Date.now(),
  });
}
