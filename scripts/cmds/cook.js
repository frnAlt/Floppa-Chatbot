// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "cook",
  description: "Prepare delicious meals!",
  version: "2.0.0",
  author: "MrkimstersDev",
  usage: "{prefix}cook",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["chef"],
  shopPrice: 150,
  requirement: "2.0.0",
  icon: "🍳",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Cooking Inamo 🍳",
  contentFont: "fancy",
  titleFont: "bold",
};

const meals = [
  { name: "Bread", priceA: 20, priceB: 60, delay: 1, icon: "🍞", chance: 0.3 },
  {
    name: "Grilled Fish",
    priceA: 15,
    priceB: 35,
    delay: 10,
    icon: "🐟",
    chance: 0.2,
  },
  {
    name: "Beef Stew",
    priceA: 3,
    priceB: 8,
    delay: 3,
    icon: "🥩",
    chance: 0.15,
  },
  {
    name: "Royal Feast",
    priceA: 2000,
    priceB: 5000,
    delay: 60,
    icon: "🍗",
    chance: 0.05,
  },
];

const cook = {
  key: "prepare",
  verb: "cook",
  verbing: "cooking",
  pastTense: "cooked",
  checkIcon: "✓",
  initialStorage: 25,
  itemData: meals,
  actionEmoji: "🍽️",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(cook);
  await simu.simulateAction();
}
