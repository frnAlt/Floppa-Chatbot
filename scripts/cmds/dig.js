// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "dig",
  description: "Unearth ancient artifacts!",
  version: "1.0.0",
  author: "MrkimstersDev",
  usage: "{prefix}dig",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["excavate"],
  shopPrice: 300,
  requirement: "1.0.0",
  icon: "🏺",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Archeology 🏺",
  contentFont: "fancy",
  titleFont: "bold",
};

const artifacts = [
  {
    name: "Old Pottery",
    priceA: 3,
    priceB: 8,
    delay: 1,
    icon: "🏺",
    chance: 0.3,
  },
  {
    name: "Bronze Dagger",
    priceA: 10,
    priceB: 25,
    delay: 5,
    icon: "🗡️",
    chance: 0.2,
  },
  {
    name: "Pharaoh’s Mask",
    priceA: 2,
    priceB: 5,
    delay: 3,
    icon: "🎭",
    chance: 0.15,
  },
  {
    name: "Lost Scroll",
    priceA: 50,
    priceB: 100,
    delay: 40,
    icon: "📜",
    chance: 0.1,
  },
  {
    name: "Cursed Mummy's Ring",
    priceA: 200,
    priceB: 500,
    delay: 60,
    icon: "💀",
    chance: 0.05,
  },
];

const dig = {
  key: "excavate",
  verb: "dig",
  verbing: "digging",
  pastTense: "dug",
  checkIcon: "✓",
  initialStorage: 20,
  itemData: artifacts,
  actionEmoji: "⛏️",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(dig);
  await simu.simulateAction();
}
