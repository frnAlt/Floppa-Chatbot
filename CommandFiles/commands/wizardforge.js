// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "wizardsforge",
  description:
    "Craft magical items, gather enchanted materials, and unlock powerful spells to earn greater rewards!",
  version: "1.0.0",
  author: "@lianecagara",
  usage: "{prefix}wizardsforge",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🪄",
  otherNames: ["wizardf"],
  shopPrice: 1000000,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Wizard's Forge 🪄",
  contentFont: "fancy",
  titleFont: "bold",
};

const wizardsForgeSimulation = {
  key: "wizardsforge",
  verb: "craft",
  verbing: "crafting",
  pastTense: "crafted",
  checkIcon: "✅",
  initialStorage: 15,
  itemData: [
    {
      icon: "🔮",
      delay: 7,
      priceA: 40,
      priceB: 60,
      name: "Magic Crystal",
      chance: 0.85,
    },
    {
      icon: "📜",
      delay: 10,
      priceA: 30,
      priceB: 50,
      name: "Ancient Scroll",
      chance: 0.8,
    },
    {
      icon: "🧪",
      delay: 5,
      priceA: 20,
      priceB: 35,
      name: "Potion Ingredients",
      chance: 0.9,
    },
    {
      icon: "⚡",
      delay: 12,
      priceA: 60,
      priceB: 100,
      name: "Lightning Essence",
      chance: 0.75,
    },
  ],
  actionEmoji: "🪄",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(wizardsForgeSimulation);
  await simu.simulateAction();
}
