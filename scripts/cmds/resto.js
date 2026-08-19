// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "resto",
  description: "Manage your restaurant, sell items, and earn money!",
  version: "1.0.3",
  author: "@lianecagara",
  usage: "{prefix}resto",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: [],
  shopPrice: 40,
  requirement: "3.0.0",
  icon: "🍽️",
  cmdType: "cplx_g",
  isGame: true,
};

/*export const style = {
  title: "🍽️ Restaurant Simulation",
  contentFont: "elegant" "fancy",
  titleFont: "bold",
};
*/
export class style {
  preset = ["aesthetic.json"];
  title = {
    content_template: ["RESTO-PLUS"],
  };
  love = {
    content_template: ["Liane"],
  };
}

const restoSimulation = {
  key: "resto",
  verb: "sell",
  verbing: "selling",
  pastTense: "sold",
  checkIcon: "🍽️",
  initialStorage: 50,
  itemData: [
    {
      icon: "🍔",
      delay: 10,
      priceA: 5,
      priceB: 8,
      name: "Burger",
      chance: 0.8,
    },
    {
      icon: "🍕",
      delay: 15,
      priceA: 7,
      priceB: 10,
      name: "Pizza",
      chance: 0.7,
    },
    { icon: "🥗", delay: 5, priceA: 4, priceB: 6, name: "Salad", chance: 0.9 },
    {
      icon: "🍣",
      delay: 12,
      priceA: 9,
      priceB: 12,
      name: "Sushi",
      chance: 0.85,
    },
    {
      icon: "🥩",
      delay: 20,
      priceA: 15,
      priceB: 20,
      name: "Steak",
      chance: 0.75,
    },
    {
      icon: "🍝",
      delay: 15,
      priceA: 8,
      priceB: 11,
      name: "Pasta",
      chance: 0.8,
    },
    {
      icon: "🥪",
      delay: 5,
      priceA: 3,
      priceB: 5,
      name: "Sandwich",
      chance: 0.9,
    },
    { icon: "🌮", delay: 8, priceA: 6, priceB: 9, name: "Taco", chance: 0.85 },
    {
      icon: "🌯",
      delay: 10,
      priceA: 7,
      priceB: 10,
      name: "Burrito",
      chance: 0.8,
    },
    {
      icon: "🍜",
      delay: 12,
      priceA: 8,
      priceB: 11,
      name: "Ramen",
      chance: 0.8,
    },
    { icon: "🍟", delay: 5, priceA: 2, priceB: 4, name: "Fries", chance: 0.9 },
    {
      icon: "🌭",
      delay: 7,
      priceA: 4,
      priceB: 6,
      name: "Hotdog",
      chance: 0.85,
    },
    {
      icon: "🍦",
      delay: 2,
      priceA: 3,
      priceB: 5,
      name: "Ice Cream",
      chance: 0.95,
    },
    { icon: "🍩", delay: 3, priceA: 2, priceB: 4, name: "Donut", chance: 0.9 },
    { icon: "🍪", delay: 4, priceA: 1, priceB: 3, name: "Cookie", chance: 0.9 },
    { icon: "🥧", delay: 15, priceA: 5, priceB: 8, name: "Pie", chance: 0.8 },
    {
      icon: "🍫",
      delay: 2,
      priceA: 2,
      priceB: 4,
      name: "Chocolate",
      chance: 0.95,
    },
    { icon: "🧀", delay: 5, priceA: 3, priceB: 5, name: "Cheese", chance: 0.9 },
    {
      icon: "🍿",
      delay: 3,
      priceA: 1,
      priceB: 2,
      name: "Popcorn",
      chance: 0.9,
    },
    {
      icon: "🍤",
      delay: 8,
      priceA: 6,
      priceB: 9,
      name: "Shrimp",
      chance: 0.85,
    },
    { icon: "🥓", delay: 6, priceA: 4, priceB: 6, name: "Bacon", chance: 0.85 },
    {
      icon: "🥑",
      delay: 5,
      priceA: 4,
      priceB: 7,
      name: "Avocado Toast",
      chance: 0.9,
    },
    {
      icon: "🥟",
      delay: 10,
      priceA: 5,
      priceB: 8,
      name: "Dumpling",
      chance: 0.8,
    },
    { icon: "🐟", delay: 12, priceA: 8, priceB: 12, name: "Fish", chance: 0.8 },
    {
      icon: "🍛",
      delay: 15,
      priceA: 7,
      priceB: 10,
      name: "Curry",
      chance: 0.8,
    },
  ],
  actionEmoji: "🔥",
  stoData: {
    price: 100,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(restoSimulation);
  await simu.simulateAction();
}
