// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "beekeep",
  description: "Harvest honey from your bee farm!",
  version: "1.0.0",
  author: "MrkimstersDev",
  usage: "{prefix}beekeep",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["honey"],
  shopPrice: 150,
  requirement: "1.0.0",
  icon: "🍯",
  isGame: true,
  cmdType: "cplx_g",
};

export const style = {
  title: "Beekeeping 🍯",
  contentFont: "fancy",
  titleFont: "bold",
};

const honeyItems = [
  {
    name: "Wild Honey",
    priceA: 2,
    priceB: 6,
    delay: 0.5,
    icon: "🍯",
    chance: 0.3,
  },
  {
    name: "Bee Wax",
    priceA: 4,
    priceB: 9,
    delay: 1,
    icon: "🐝",
    chance: 0.2,
  },
  {
    name: "Royal Jelly",
    priceA: 10,
    priceB: 30,
    delay: 2,
    icon: "👑",
    chance: 0.15,
  },
  {
    name: "Honeycomb",
    priceA: 25,
    priceB: 50,
    delay: 13,
    icon: "🍯",
    chance: 0.1,
  },
  {
    name: "Queen’s Honey",
    priceA: 50,
    priceB: 150,
    delay: 15,
    icon: "🍀",
    chance: 0.05,
  },
];

const beekeep = {
  key: "beekeep",
  verb: "collect",
  verbing: "collecting",
  pastTense: "collected",
  checkIcon: "✓",
  initialStorage: 25,
  itemData: honeyItems,
  actionEmoji: "🐝",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(beekeep);
  await simu.simulateAction();
}
