// Too many imports? Just rely on auto-imports of Typescript Language Server. 🧑‍🌾👍
// NOTE: Do not modify without the help of Typescript Checking

// ---- For Inventory and Collectibles class to handle arrays (of items) in a simpler way ----
import { Collectibles, Inventory } from "@cass-modules/InventoryEnhanced";

// ---- For Unicode symbols, UNIRedux is outdated, but hey? just use it ----
import { UNIRedux, UNISpectra } from "@cass-modules/unisym.js";

// ---- The main component used to list subcommands (in commands) and handle them automatically ----
import { Config, SpectralCMDHome } from "@cassidy/spectral-home";

// ---- Only used as type : ) ----
import { InventoryItem, UserStatsManager } from "@cass-modules/cassidyUser";

// ---- For the sake of consistency in formatting and parsing NUMERICAL input. ----
import {
  abbreviateNumber,
  formatCash,
  formatTimeSentence,
  formatValue,
  parseBet,
} from "@cass-modules/ArielUtils";

// ---- Just used as type too for CommandContext.output ----
import OutputProps from "output-cassidy";

// ---- Just also used as type for CommandContext.input and for the roles ----
import InputClass, { InputRoles } from "@cass-modules/InputClass";

// ---- Shop items and other components! ----
import {
  GardenChoice,
  GardenChoiceConfig,
  gardenShop,
} from "@cass-modules/GardenShop";

// ---- Garden Configuration I wanna move somewhere else ----
import { CROP_CONFIG, fetchSeedStock } from "@cass-modules/GardenConfig";
import {
  EVENT_CONFIG,
  GardenEventItem,
  GardenWeatherItem,
  PlayRelapseMinigame,
} from "@cass-modules/GardenEventConfig";

// ---- For unicode fonts (barely used) ----
import { FontSystem } from "cassidy-styler";

// ---- For biased random numbers, because I love to make their life worst, maybe? ----
import { randomBiased } from "@cass-modules/unitypes";

// ---- Do not ask wth this was ----
import { Datum } from "@cass-modules/Datum";

// ---- Just used as types ----
import { BreifcaseUsagePlugin } from "@cass-modules/BriefcaseAPI";

// ---- Hacky stuff ----
import { evaluateItemBalance } from "@cass-modules/GardenBalancer";
import {
  GardenItem,
  GardenSeed,
  GardenPlot,
  GardenBarn,
  GardenTool,
  GardenPetActive,
  GardenStats,
} from "@cass-modules/GardenTypes";

export const meta: CommandMeta = {
  name: "garden",
  description: "Grow crops and earn Money in your garden!",
  otherNames: ["grow", "growgarden", "gr", "g", "gag", "plant"],
  version: "2.2.0",
  usage: "{prefix}{name} [subcommand]",
  category: "Idle Investment Games",
  author: "Solo Programmed By: Liane Cagara 🎀",
  role: 0,
  // self, please do not use "both" or true, i hate noprefix
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "🌱",
  cmdType: "cplx_g",
  isGame: true,
};

// ---- For the sake of gift/giftPack to give seeds as rewards too ----
export const treasuresTable: InventoryItem[] = [
  ...EVENT_CONFIG.ALL_EVENTS.filter((i) => i.key !== "bizzyBees")
    .map((i) => i.shopItems)
    .flat()
    .map((shopItem) => {
      let inventoryItem: GardenItem | null = null;
      const mockMoneySet = {
        inventory: [] as GardenItem[],
      };

      shopItem.onPurchase({ moneySet: mockMoneySet });
      inventoryItem = mockMoneySet.inventory[0] || null;

      if (!inventoryItem) {
        return null;
      }

      return {
        ...inventoryItem,
        group: [shopItem.pack],
        prob: shopItem.packChance ?? 0,
      };
    }),
  ...gardenShop.honeyShop
    .filter((i) => i.pack === "pFlowerSeed")
    .map((shopItem) => {
      let inventoryItem: GardenItem | null = null;
      const mockMoneySet = {
        inventory: [] as GardenItem[],
      };

      shopItem.onPurchase({ moneySet: mockMoneySet });
      inventoryItem = mockMoneySet.inventory[0] || null;

      if (!inventoryItem) {
        return null;
      }

      return {
        ...inventoryItem,
        group: ["pFlowers"],
        prob: shopItem.packChance ?? 0,
      };
    })
    .filter(Boolean),
  ...gardenShop.itemData
    .map((shopItem) => {
      let inventoryItem: GardenItem | null = null;
      const mockMoneySet = {
        inventory: [] as GardenItem[],
      };

      shopItem.onPurchase({ moneySet: mockMoneySet });
      inventoryItem = mockMoneySet.inventory[0] || null;

      if (!inventoryItem) {
        return null;
      }

      return {
        ...inventoryItem,
        group: ["generic", "gardenShop"],
        prob: (shopItem.stockChance ?? 0.5) ** 3,
      };
    })
    .filter(Boolean),
];

// ---- For bc use ----
export const briefcaseUsage: Record<string, BreifcaseUsagePlugin> = {
  gardenSeed(arg, ctx, _bctx) {
    const item = arg.item as GardenSeed;
    return `${UNISpectra.arrowFromT} ${item.icon} **${
      item.name
    }** is a garden seed! You can **plant** this item.\n\n${
      UNIRedux.charm
    } Base Value: ${formatCash(item.cropData?.baseValue, true)}\n\nType **${
      ctx.prefix
    }${meta.name} plant ${item.key} ${arg.customInventory.getAmount(
      item.key
    )}** without fonts to plant it.`;
  },
  gardenPet(arg, ctx, _bctx) {
    const item = arg.item as GardenSeed;
    return `${UNISpectra.arrowFromT} ${item.icon} **${item.name}** is a garden pet! You can **uncage** this pet.\n\nType **${ctx.prefix}${meta.name} uncage ${item.key}** without fonts to uncage it.`;
  },
  gardenTool(arg, _ctx, _bctx) {
    const item = arg.item as GardenSeed;
    return `${UNISpectra.arrowFromT} ${item.icon} **${item.name}** is a garden gear! Just **keep** it in your inventory/briefcase and it will have an **effect**.`;
  },
};

export const PLOT_LIMIT = 36;
export const PLOT_EXPANSION_LIMIT = 56 * 2;
export const PET_LIMIT = 60;
export const PET_EQUIP_LIMIT = 8;
export const ITEMS_PER_PAGE = 6;

export function toBarnItem(
  plot: GardenPlot,
  inflationRate: number
): GardenBarn[] {
  const {
    key,
    icon,
    name,
    flavorText,
    mutation,
    kiloGrams,
    seedKey,
    isFavorite,
    price,
  } = plot;

  const { final: value, yields } = calculateCropValue(plot, inflationRate);

  const item: GardenBarn = {
    key,
    uuid: Inventory.generateUUID(),
    icon,
    name,
    flavorText,
    value,
    mutation,
    kiloGrams,
    seedKey,
    type: "gardenBarn",
    isFavorite,
    price,
  };

  return Array.from({ length: yields }, () => ({
    ...item,
    uuid: Inventory.generateUUID(),
  }));
}
export function calculateCropValue(crop: GardenPlot, inflationRate: number) {
  const mutations = (crop.mutation || [])
    .map((mutationName) =>
      CROP_CONFIG.MUTATIONS.find((m) => m.name === mutationName)
    )
    .filter(Boolean);

  const totalMutationBonus = mutations.reduce(
    (acc, curr) => acc * (curr.valueMultiplier || 1),
    1
  );

  const yields = getPossibleYields(crop);

  const combinedMultiplier = totalMutationBonus;

  const final = Math.floor(
    crop.baseValue * combinedMultiplier * (crop.maxKiloGrams + 1)
  );

  const noExtra = Math.floor(final - crop.baseValue * combinedMultiplier);

  const allYield = Math.floor(final * yields);

  let resOrig = {
    final: Math.max(final, 0) || 0,
    noExtra: Math.max(0, noExtra) || 0,
    yields,
    allYield,
    remainingHarvests: (crop.harvestsLeft || 0) - yields,
  };

  const res = {
    ...resOrig,
    final: Math.round(resOrig.final + resOrig.final * inflationRate),
    noExtra: Math.round(resOrig.noExtra + resOrig.noExtra * inflationRate),
    allYield: Math.round(resOrig.allYield + resOrig.allYield * inflationRate),
  };

  return res;
}

function isCropReady(crop: GardenPlot) {
  return cropTimeLeft(crop) <= 0;
}

function cropTimeLeft(plot: GardenPlot, allowNegative = false) {
  const e = plot.plantedAt + plot.growthTime - Date.now();
  if (allowNegative) {
    return e;
  }
  const timeLeft = Math.max(0, e);
  return timeLeft;
}

function safeEX(a: number, p: number) {
  return a === 0 ? 0 : a < 0 ? -Math.pow(-a, p) : Math.pow(a, p);
}

function calculateCropKG(crop: GardenPlot): number {
  const percent =
    getCropFullnessPercent(crop) + getOvergrownBonusPercent(crop) / 2;
  const rawKG = crop.maxKiloGrams * percent;
  return Number(rawKG.toFixed(2));
}

function getPossibleYields(crop: GardenPlot): number {
  const timeLeft = cropTimeLeft(crop, true);
  if (cropTimeLeft(crop, true) > 0) return 0;

  const growthTimePerYield = crop.growthTime;

  if (growthTimePerYield <= 0) return 0;

  const timeRemaining = -timeLeft;
  const yieldCountFromTime = Math.ceil(timeRemaining / growthTimePerYield);

  const maxPossibleYields = Math.min(crop.yields || 1, crop.harvestsLeft || 1);

  const possibleYields = Math.min(yieldCountFromTime, maxPossibleYields);

  return Math.max(0, possibleYields);
}

function getOvergrownBonusPercent(crop: GardenPlot): number {
  const timeLeft = cropTimeLeft(crop, true);
  const originalGrowth = crop.growthTime;
  const elapsed = originalGrowth - timeLeft;

  const overgrownElapsed = elapsed * originalGrowth;

  if (overgrownElapsed <= 0) return 0;

  const bonusPercent = overgrownElapsed / originalGrowth;

  return Math.floor(Math.min(bonusPercent, 2) / 2);
}

function getCropFullnessPercent(plot: GardenPlot): number {
  const timeLeft = cropTimeLeft(plot, true);
  const growthTime = plot.growthTime;
  const elapsed = growthTime - timeLeft;

  const percent = elapsed / growthTime;
  return Math.min(Math.max(percent, 0), 1);
}

async function autoUpdateCropData(
  crop: GardenPlot,
  tools: Inventory<GardenTool>,
  pets: Inventory<GardenPetActive>
) {
  if (!crop) return null;
  crop.lastUpdated ??= Date.now();
  crop.yields ??= 1;
  crop.mutationAttempts ??= 0;
  crop.maxKiloGrams ??= randomBiased(
    CROP_CONFIG.MIN_KG,
    CROP_CONFIG.MAX_KG,
    CROP_CONFIG.KILO_BIAS
  );
  crop.maxKiloGrams = Math.max(
    Math.min(CROP_CONFIG.MAX_KG, crop.maxKiloGrams),
    CROP_CONFIG.MIN_KG
  );
  crop.originalGrowthTime ??= crop.growthTime;
  crop.mutation ??= [];
  if (typeof crop.mutation === "string") {
    crop.mutation = [crop.mutation];
  }

  if (!Array.isArray(crop.mutation)) {
    crop.mutation = [];
  }

  const isOver = isCropOvergrown(crop);
  let now = Date.now();
  const allowM = crop.lastMutation
    ? now - crop.lastMutation >= CROP_CONFIG.MUTATION_INTERVAL
    : true;

  if (
    isOver &&
    allowM &&
    crop.mutationAttempts <= CROP_CONFIG.MAX_MUTATION_ATT
  ) {
    const maxCycles = Math.floor(
      CROP_CONFIG.MAX_AFK / CROP_CONFIG.MUTATION_INTERVAL
    );
    const timeSinceMutation = crop.lastMutation
      ? now - crop.lastMutation
      : CROP_CONFIG.MUTATION_INTERVAL;
    const repeats = Math.min(
      Math.floor(timeSinceMutation / CROP_CONFIG.MUTATION_INTERVAL),
      maxCycles
    );

    const skipStamp =
      (await Cassidy.databases.globalDB.getCache("skipStamp"))?.skipStamp || 0;

    const cycle = EVENT_CONFIG.WEATHER_CYCLE_NEW;
    const adjustedNow = now + skipStamp;
    const currentCycle = Math.floor(adjustedNow / cycle);

    for (let i = 0; i < repeats; i++) {
      const simulatedTime =
        crop.lastMutation + i * CROP_CONFIG.MUTATION_INTERVAL;
      const adjustedSimTime = simulatedTime + skipStamp;
      const simCycle = Math.floor(adjustedSimTime / cycle);

      const skips = simCycle - currentCycle;
      const nextWeather = await getNextWeather(skips);

      await applyMutation(crop, tools, pets, true, nextWeather);
    }
  }

  const weather = await getCurrentWeather();

  const baseGrowthMultiplier = weather.growthMultiplier || 1;

  let growthBoost = Math.min(0.99, safeEX(baseGrowthMultiplier, 0.9));

  tools.getAll().forEach((tool) => {
    if (tool.toolData?.growthMultiplier) {
      const toolBoost = tool.toolData.growthMultiplier || 0;
      growthBoost += safeEX(toolBoost / (1 - growthBoost), 0.9);
      growthBoost = Math.min(10.0, growthBoost);
    }
  });

  crop.growthTime = Math.floor(
    Math.max(
      crop.originalGrowthTime / Math.max(growthBoost, 1),
      crop.originalGrowthTime * 0.25
    )
  );

  if ((crop.mutation ?? []).length > 0 && crop.harvestsLeft > 1) {
    crop.growthTime = Math.floor(
      crop.growthTime * CROP_CONFIG.OVERGROWTH_PENALTY
    );
  }

  for (const mutation of CROP_CONFIG.MUTATIONS) {
    if (Array.isArray(mutation.both)) {
      if (
        mutation.both.every((i) => crop.mutation.includes(i)) &&
        !crop.mutation.includes(mutation.name)
      ) {
        crop.mutation.push(mutation.name);
      }
    }
  }

  crop.mutation = [...new Set(crop.mutation)];

  crop.kiloGrams = calculateCropKG(crop);

  crop.name = String(crop.name).replaceAll("Seed", "").trim();

  crop = correctPlot(crop);

  crop.lastUpdated = Date.now();

  return crop;
}

function isCropOvergrown(crop: GardenPlot) {
  const timeLeft = cropTimeLeft(crop, true);
  const originalGrowth = crop.originalGrowthTime ?? crop.growthTime;
  const growthProgress = (originalGrowth - timeLeft) / originalGrowth;

  return growthProgress >= 2;
}
// function getCropOvergrown(crop: GardenPlot) {
//   const timeLeft = cropTimeLeft(crop, true);
//   const originalGrowth = crop.originalGrowthTime ?? crop.growthTime;
//   const growthProgress = (originalGrowth - timeLeft) / originalGrowth;

//   return Math.max(0, growthProgress - 2);
// }

// function getOvergrownElapsed(crop: GardenPlot): number {
//   const timeLeft = cropTimeLeft(crop, true);
//   const originalGrowth = crop.originalGrowthTime ?? crop.growthTime;
//   const elapsed = originalGrowth - timeLeft;
//   const overgrownThreshold = 2 * originalGrowth;

//   return Math.max(0, elapsed - overgrownThreshold);
// }

async function getTimeForNextWeather() {
  const { globalDB } = Cassidy.databases;

  const { skipStamp = 0 } = await globalDB.getCache("skipStamp");
  const cycle = EVENT_CONFIG.WEATHER_CYCLE_NEW;
  const now = Date.now() + skipStamp;
  const timeIntoCycle = now % cycle;
  const timeUntilNextEvent = cycle - timeIntoCycle;
  return timeUntilNextEvent;
}

export async function getCurrentWeather() {
  const { globalDB } = Cassidy.databases;
  const { skipStamp = 0 } = await globalDB.getCache("skipStamp");
  const adjustedNow = Date.now() + skipStamp;
  const weekNumber =
    Math.floor(adjustedNow / EVENT_CONFIG.WEATHER_CYCLE_NEW) %
    EVENT_CONFIG.WEATHERS.length;
  const event = EVENT_CONFIG.WEATHERS[weekNumber];

  return event;
}
async function getCurrentEvent() {
  const event = EVENT_CONFIG.CURRENT_EVENT;

  return event;
}
async function getNextWeather(skips: number = 1) {
  const { globalDB } = Cassidy.databases;
  const { skipStamp = 0 } = await globalDB.getCache("skipStamp");

  const adjustedNow = Date.now() + skipStamp;
  const cycle = EVENT_CONFIG.WEATHER_CYCLE_NEW;

  const totalCyclesPassed = Math.floor(adjustedNow / cycle) + skips;
  const len = EVENT_CONFIG.WEATHERS.length;
  const weekNumber = ((totalCyclesPassed % len) + len) % len;

  const event = EVENT_CONFIG.WEATHERS[weekNumber];

  return event;
}

function forgivingRandom(bias?: number) {
  return Math.random() ** (bias || 1.2);
}

async function skipWeather(
  skipped: number,
  targetTimeLeft = EVENT_CONFIG.WEATHER_CYCLE_NEW
) {
  const { globalDB } = Cassidy.databases;
  const cycle = EVENT_CONFIG.WEATHER_CYCLE_NEW;
  const now = Date.now();

  const { skipStamp: currentSkipStamp = 0 } = await globalDB.getCache(
    "skipStamp"
  );

  const adjustedNow = now + currentSkipStamp;
  const newAdjustedNow = adjustedNow + skipped * cycle;

  const newTimeIntoCycle = newAdjustedNow % cycle;
  const desiredTimeIntoCycle = cycle - targetTimeLeft;
  const correction = desiredTimeIntoCycle - newTimeIntoCycle;

  const finalAdjustedNow = newAdjustedNow + correction;
  const skipStamp = finalAdjustedNow - now;

  await globalDB.setItem("skipStamp", { skipStamp });

  return skipStamp;
}

async function applyMutation(
  crop: GardenPlot,
  tools: Inventory<GardenTool>,
  pets: Inventory<GardenPetActive>,
  accum = false,
  weather: GardenWeatherItem
) {
  if (!accum) {
    crop.mutation = [];
  }

  const mutationBoosts = new Map<string, number>();

  CROP_CONFIG.MUTATIONS.forEach((mutation) => {
    mutationBoosts.set(mutation.name, 0.0);
  });

  tools.getAll().forEach((tool) => {
    if (tool.toolData?.mutationChance) {
      Object.entries(tool.toolData.mutationChance).forEach(([key, value]) => {
        const currentBoost = mutationBoosts.get(key) ?? 0;
        const newBoost = currentBoost + safeEX(value / (1 - currentBoost), 0.9);
        mutationBoosts.set(key, Math.min(0.5, newBoost));
      });
    }
  });

  const mutationEffects = weather.effects ?? [];
  const mutationTypeSet = new Set(
    mutationEffects.map((e) => e.mutationType).filter(Boolean)
  );

  const mutations = [
    ...Array.from({ length: CROP_CONFIG.MBIAS }, () =>
      CROP_CONFIG.MUTATIONS.filter((m) => mutationTypeSet.has(m.name))
    ).flat(),
    ...CROP_CONFIG.MUTATIONS.filter((m) => !mutationTypeSet.has(m.name)),
  ];

  for (const mutation of mutations) {
    if (!mutation) continue;

    const matchingEffect = mutationEffects.find(
      (e) => e.mutationType === mutation.name
    );
    let mchance = matchingEffect?.mutationChance ?? mutation.chance;

    if (Array.isArray(mutation.pet)) {
      if (
        mutation.pet.some((i) => pets.has(i)) &&
        !crop.mutation.includes(mutation.name)
      ) {
        mchance = mutation.chance;
      } else {
        mchance = 0;
      }
    }

    const roll = Math.random();
    const boost =
      mchance === 0
        ? 0
        : Math.min(0.99, mutationBoosts.get(mutation.name) ?? 0);
    let ratio = crop.kiloGrams / CROP_CONFIG.MAX_KG;
    let normalized = 1 - Math.min(1, ratio);

    const extraFactor = Math.max(normalized ** 2, 0.05);
    const chance = Math.min(0.5, mchance * (1 + boost) * extraFactor);

    if (roll <= chance && Math.random() < 0.3) {
      if (!crop.mutation.includes(mutation.name)) {
        crop.mutation.push(mutation.name);
      }
    }
  }
  crop.mutationAttempts ??= 0;
  crop.lastMutation = Date.now();
  crop.mutationAttempts++;
  return crop;
}
function getMutation(name: string) {
  return CROP_CONFIG.MUTATIONS.find((m) => m.name === name);
}

function formatMutationStr(plot: GardenPlot | GardenBarn) {
  if (!plot) {
    return ` ❔ **Nothing**`;
  }
  return `${
    (plot.mutation ?? []).length > 0
      ? `[ ${plot.mutation
          .map(
            (i) =>
              `${getMutation(i)?.icon ?? "❓"} ${FontSystem.fonts.double_struck(
                i
              )}`
          )
          .join(" + ")} ] `
      : ""
  }${plot.icon} **${plot.name}** (${plot.kiloGrams}kg)${
    plot.isFavorite ? " 💖" : ""
  }`;
}

// function updatePetCollection(
//   pet: GardenPetActive,
//   inventory: Inventory<GardenItem>,
//   ctx: CommandContext
// ): {
//   pet: GardenPetActive;
//   collections: number;
//   inventory: Inventory<GardenItem>;
//   collected: GardenItem[];
// } {
//   if (!pet.isEquipped) return { pet, collections: 0, inventory, collected: [] };
//   const currentTime = Date.now();
//   const timeSinceLastCollect = currentTime - (pet.lastCollect || currentTime);
//   const collections = Math.round(
//     Math.floor(timeSinceLastCollect / (60 * 1000)) * pet.petData.collectionRate
//   );
//   const collected: GardenItem[] = [];
//   if (collections >= 1) {
//     const shopItems = [...gardenShop.itemData, ...gardenShop.eventItems];
//     pet.lastCollect = currentTime;
//     for (let i = 0; i < collections; i++) {
//       // const seed =
//       //   pet.petData.seedTypes[
//       //     Math.floor(Math.random() * pet.petData.seedTypes.length)
//       //   ];
//       const seed = pickRandomWithProb(
//         pet.petData.seedTypes.map((i) => {
//           const shopItem = shopItems.find((item) => item.key === i);
//           return {
//             chance: (shopItem?.stockChance ?? 0) ** 9,
//             value: i,
//           };
//         })
//       );

//       if (!seed) {
//         continue;
//       }

//       const shopItem = shopItems.find((item) => item.key === seed);
//       if (Math.random() < shopItem.stockChance) {
//         if (shopItem && inventory.size() < global.Cassidy.invLimit) {
//           const cache = inventory.getAll();
//           const cache2 = [...cache];
//           shopItem.onPurchase({ ...ctx, moneySet: { inventory: cache } });
//           inventory = new Inventory(cache);
//           const newItems = cache.filter((i) => !cache2.includes(i));
//           collected.push(...newItems);
//         }
//       }
//     }
//   }
//   return { pet, collections: collected.length, inventory, collected };
// }

async function checkAchievements(
  user: UserData,
  money: UserStatsManager,
  output: OutputProps,
  input: InputClass
) {
  const plotsHarvested = user.gardenStats?.plotsHarvested || 0;
  const mutationsFound = user.gardenStats?.mutationsFound || 0;
  const expansions = user.gardenStats?.expansions || 0;
  let newMoney = user.money || 0;
  let achievementsUnlocked: string[] = [];

  for (const achievement of CROP_CONFIG.ACHIEVEMENTS) {
    if (!user.gardenStats?.achievements?.includes(achievement.key)) {
      if (
        achievement.key === "harvest_100" &&
        plotsHarvested >= achievement.harvests
      ) {
        newMoney += achievement.reward;
        achievementsUnlocked.push(
          `${achievement.name} (+${formatCash(achievement.reward)})`
        );
        user.gardenStats.achievements = user.gardenStats.achievements || [];
        user.gardenStats.achievements.push(achievement.key);
      } else if (
        achievement.key === "mutation_10" &&
        mutationsFound >= achievement.mutations
      ) {
        newMoney += achievement.reward;
        achievementsUnlocked.push(
          `${achievement.name} (+${formatCash(achievement.reward)})`
        );
        user.gardenStats.achievements = user.gardenStats.achievements || [];
        user.gardenStats.achievements.push(achievement.key);
      } else if (
        achievement.key === "expand_1" &&
        expansions >= achievement.expansions
      ) {
        newMoney += achievement.reward;
        achievementsUnlocked.push(
          `${achievement.name} (+${formatCash(achievement.reward)})`
        );
        user.gardenStats.achievements = user.gardenStats.achievements || [];
        user.gardenStats.achievements.push(achievement.key);
      }
    }
  }

  if (achievementsUnlocked.length > 0) {
    await money.setItem(user.senderID, {
      money: newMoney,
      gardenStats: user.gardenStats,
    });
    if (!input.isWeb) {
      await output.replyStyled(
        `🏆 **Achievements Unlocked**:\n${achievementsUnlocked.join(
          "\n"
        )}\n\n💰 New Balance: ${formatCash(newMoney)}`,
        style
      );
    }
  }
}

let officialUpdatedAt: number = null;
const USE_TRUE_STOCK = false;

async function refreshShopStock(force = false) {
  const currentTime = Date.now();
  const timeLeft = getTimeUntilRestock();

  if (timeLeft > 0 && !force) {
    return false;
  }
  let stocks: Awaited<ReturnType<typeof fetchSeedStock>>;
  if (USE_TRUE_STOCK) {
    stocks = await fetchSeedStock();

    if (typeof stocks.updatedAt === "number") {
      if (officialUpdatedAt === stocks.updatedAt) {
        return false;
      }
      officialUpdatedAt = stocks.updatedAt;

      const timePassed = currentTime - officialUpdatedAt;
      const timeLeft =
        (Math.abs(timePassed) % gardenShop.stockRefreshInterval) + 1000;
      gardenShop.lastRestock = currentTime - Math.abs(timeLeft);
      if (getTimeUntilRestock() <= 0) {
        gardenShop.lastRestock = currentTime;
      }
    } else {
      gardenShop.lastRestock = currentTime;
    }
  } else {
    gardenShop.lastRestock = currentTime;
  }
  const event = await getCurrentEvent();
  gardenShop.eventItems = [];

  if (event.shopItems && event.shopItems.length > 0) {
    event.shopItems.forEach((shopItem) => {
      if (!gardenShop.eventItems.some((item) => item.key === shopItem.key)) {
        gardenShop.eventItems.push({ ...shopItem, isEventItem: true });
      }
    });
  }

  const getStock = (item: gardenShop.GardenShopItem) => {
    return typeof item.minStock === "number" &&
      typeof item.maxStock === "number"
      ? Math.ceil(
          randomBiased(item.minStock, item.maxStock, CROP_CONFIG.STOCK_MIN_BIAS)
        )
      : Infinity;
  };
  for (const item of gardenShop.itemData) {
    let fetched =
      stocks && USE_TRUE_STOCK && Array.isArray(stocks.seeds)
        ? stocks.seeds.find(
            (i) =>
              item.name.includes(i) ||
              String(i).includes(item.name) ||
              item.name.split(" ")[0] === String(i).split(" ")[0]
          )
        : null;
    const localChance = USE_TRUE_STOCK
      ? false
      : forgivingRandom() < item.stockChance;
    item.inStock = !!fetched || localChance;
    item.isOfficialStock = !!fetched;
    const reg = /\*\*x(\d+)\*\*/;
    const stockOf = Number(fetched?.match(reg)?.[1]);
    if (!isNaN(stockOf)) {
      item.stockLimitOfficial = stockOf;
    } else {
      delete item.stockLimitOfficial;
    }
    item.stockLimit = getStock(item);
  }

  gardenShop.eventItems.forEach((item) => {
    item.inStock = forgivingRandom() < item.stockChance;
    item.stockLimit = getStock(item);
  });
  gardenShop.gnpShop.forEach((item) => {
    item.inStock = forgivingRandom() < item.stockChance;
    item.stockLimit = getStock(item);
  });

  return true;
}

function getTimeUntilRestock() {
  const currentTime = Date.now();
  const timePassed = currentTime - gardenShop.lastRestock;
  const timeLeft = gardenShop.stockRefreshInterval - timePassed;

  return Math.max(0, timeLeft);
}

function formatShopItems(
  items = gardenShop,
  currentEvent: GardenEventItem,
  isEvent = false
): typeof gardenShop {
  const timeText = `🕒 **Next Restock**:\n${formatTimeSentence(
    getTimeUntilRestock()
  )}`;
  return {
    ...items,
    // itemData: items.itemData.filter((item) => item.inStock !== false),
    itemData: items.itemData.map((item) => {
      let noStock = item.inStock === false;
      let flavor = item.flavorText || "";
      if (item.isOfficialStock) {
        // flavor = `🌱 **STOCKED IN ROBLOX!**\n${flavor}`;
      }
      const moneySet: { inventory: GardenItem[] } = { inventory: [] };
      item.onPurchase({ moneySet });
      const purchased = moneySet.inventory[0];
      if (purchased) {
        if (purchased.type === "gardenSeed") {
          flavor = `${`***${item.rarity}*** - ${Math.round(
            (item.stockChance ?? 1) * 100
          )}%`.toUpperCase()}\n🪙 ${abbreviateNumber(
            purchased.cropData.baseValue || 0
          )} | 🧺 ${abbreviateNumber(purchased.cropData.harvests || 0)} | ⏳ ${
            formatTimeSentence(purchased.cropData.growthTime || 0) || "Instant"
          }`;
        }
      }
      const stockLimit = item.stockLimitOfficial ?? item.stockLimit;
      return {
        ...item,
        cannotBuy: noStock,
        stockLimit: noStock ? 0 : stockLimit,
        flavorText: noStock ? `` : flavor,
      };
    }),
    // .filter((i) => i.inStock !== false),
    buyTexts: [timeText],
    thankTexts: [timeText],
    ...(currentEvent?.isNoEvent !== true && isEvent && currentEvent
      ? {
          welcomeTexts: [
            `Welcome to the ${currentEvent?.icon ?? "🌱"} **${
              currentEvent.shopName2 ?? "Event Shop."
            }!**`,
          ],
          key: currentEvent?.shopName,
        }
      : {}),
  };
}

function correctItems(rawInv: GardenItem[]) {
  const allItems = EVENT_CONFIG.allItems;
  for (const item of rawInv ?? []) {
    const found = allItems.find((i) => i?.key === item?.key);
    if (found) {
      const temp = [];
      found.onPurchase({ moneySet: { inventory: temp } });
      const newItem = temp[0] as GardenItem;
      if (newItem && newItem.key === item.key) {
        Object.assign(item, newItem);
      }
    }
  }
  return rawInv;
}
function correctPlot(plot: GardenPlot) {
  const allItems = EVENT_CONFIG.allItems;

  const found = allItems.find((i) => i?.key === plot?.seedKey);
  if (found) {
    const temp = [];
    found.onPurchase({ moneySet: { inventory: temp } });
    const foundSeed = temp[0] as GardenSeed;
    if (foundSeed && foundSeed.key === plot.seedKey && foundSeed.cropData) {
      if (plot.baseValue !== foundSeed.cropData.baseValue) {
        plot.baseValue = foundSeed.cropData.baseValue;
        plot.harvestsLeft = foundSeed.cropData.harvests;
        plot.price =
          found.priceType !== "money" && found.priceType
            ? 0
            : Math.min(
                foundSeed.cropData.baseValue || 0,
                (found.price ?? foundSeed.cropData.baseValue) /
                  (foundSeed.cropData.harvests || 1)
              );
      }

      plot.yields = foundSeed.cropData.yields;

      plot.originalGrowthTime = foundSeed.cropData.growthTime;
      plot.icon = foundSeed.icon;
      plot.baseKiloGrams = foundSeed.cropData.baseKG ?? 0;
      if (
        plot.maxKiloGrams <
        (foundSeed.cropData.baseKG ?? 0) + CROP_CONFIG.MIN_KG
      ) {
        plot.maxKiloGrams = randomBiased(
          CROP_CONFIG.MIN_KG + (foundSeed.cropData.baseKG ?? 0),
          CROP_CONFIG.MAX_KG,
          CROP_CONFIG.KILO_BIAS
        );
      }
    }
  }
  return plot;
}

// interface NotifMapItem {
//   threads: Array<{
//     timeout: NodeJS.Timeout;
//     threadID: string;
//     output: OutputProps;
//     ts: number;
//   }>;
//   userID: string;
// }

// export async function registerNotif(ctx: CommandContext) {
//   const { input, output } = ctx;
//   if (input.isWeb) return;

//   const now = Date.now();
//   const userID = input.senderID;
//   const threadID = input.threadID;

//   let notifMap = NOTIF_MAP.find((i) => i.userID === userID);
//   if (!notifMap) {
//     notifMap = { userID, threads: [] };
//     NOTIF_MAP.push(notifMap);
//   }

//   const threads = notifMap.threads;
//   const ex = threads.find((i) => i.threadID === threadID);

//   if (!ex) {
//     const timeout = setTimeout(() => {
//       notifJob(output, userID, threadID);
//       const idx = threads.findIndex((i) => i.threadID === threadID);
//       if (idx !== -1) threads.splice(idx, 1);
//     }, CROP_CONFIG.NOTIF_TIMEOUT);

//     threads.push({
//       output,
//       threadID,
//       timeout,
//       ts: now,
//     });
//   }
// }

// export const NOTIF_MAP: NotifMapItem[] = [];

// export async function notifJob(
//   output: OutputProps,
//   uid: string,
//   threadID: string
// ) {
//   const { databases } = global.Cassidy;
//   const { usersDB } = databases;
//   let {
//     name = "",
//     gardenPlots: rawPlots = [],
//     gardenPets: rawPets = [],
//     inventory: rawInventory = [],
//     // money: userMoney = 0,
//     // gardenStats = {
//     //   plotsHarvested: 0,
//     //   mutationsFound: 0,
//     //   expansions: 0,
//     //   achievements: [],
//     // },
//     // plotLimit = PLOT_LIMIT,
//     // lastSideExpansion = 0,
//     // lastRearExpansion1 = 0,
//     // lastRearExpansion2 = 0,
//     // allowGifting = true,
//     // gardenEarns = 0,
//     // collectibles: rawCLL,
//     // enableGardenNotif = false,
//   } = await usersDB.getCache(uid);
//   // if (!enableGardenNotif) {
//   //   return;
//   // }

//   const plots = new Inventory<GardenPlot>(rawPlots);
//   const exiTool = new Inventory(
//     rawInventory.filter(
//       (item): item is GardenTool => item.type === "gardenTool"
//     )
//   );
//   const exiPets = new Inventory<GardenPetActive>(rawPets, PET_LIMIT);
//   rawPlots.forEach((i: GardenPlot) => autoUpdateCropData(i, exiTool, exiPets));

//   const updatedPlots = new Inventory<GardenPlot>();

//   for (const plot of plots) {
//     const updated = await autoUpdateCropData(plot, exiTool, exiPets);
//     updatedPlots.addOne(updated);
//   }

//   const mutationUpdates: Array<{
//     added: string[];
//     all: string[];
//     plot: GardenPlot;
//   }> = [];

//   for (const plot of updatedPlots) {
//     const outdated = plots.getOne(plot.key);
//     if (!outdated) continue;

//     const oldMut = outdated.mutation ?? [];
//     const newMut = plot.mutation ?? [];

//     const addedMut = newMut.filter((i) => !oldMut.includes(i));
//     if (addedMut.length > 0) {
//       mutationUpdates.push({
//         added: addedMut,
//         all: newMut,
//         plot,
//       });
//     }
//   }

//   if (mutationUpdates.length > 0) {
//     return output.sendStyled(
//       `🌱 Congratulations, **${name}**! Some of your crops mutated!\n\n${mutationUpdates
//         .slice(0, 20)
//         .map((i) => formatMutationStr(i.plot))
//         .join("\n")}`,
//       gardenNotif,
//       threadID
//     );
//   }
// }

// const gardenNotif: CommandStyle = {
//   title: {
//     content: `🔔 ${UNISpectra.charm} **G🍓rden** Notification`,
//     text_font: "fancy",
//     line_bottom: "default",
//   },
//   contentFont: "fancy",
//   footer: {
//     content: "Rewards multiply with success.",
//     text_font: "fancy",
//   },
// };

// ---- The main shi ----
export async function entry(ctx: CommandContext) {
  // await registerNotif(ctx);
  const {
    input,
    output,
    money,
    Inventory,
    UTShop,
    prefix,
    commandName,
    command,
    fonts,
    getInflationRate,
  } = ctx;
  await money.ensureUserInfo(input.senderID);
  const inflationRate = await getInflationRate();

  await (async () => {
    const { money: balance, gardenPlots: rawPlots = [] } = await money.getCache(
      input.senderID
    );
    if (balance <= 0 && rawPlots.length === 0) {
      await money.setItem(input.senderID, {
        money: balance + 40,
      });
    }
  })();

  let {
    name = "",
    gardenPlots: rawPlots = [],
    gardenBarns: rawBarns = [],
    gardenPets: rawPets = [],
    gardenHeld = "",
    inventory: rawInventory = [],
    money: userMoney = 0,
    gardenStats: _gs = {
      plotsHarvested: 0,
      mutationsFound: 0,
      expansions: 0,
      achievements: [],
    },
    plotLimit = PLOT_LIMIT,
    lastSideExpansion = 0,
    lastRearExpansion1 = 0,
    lastRearExpansion2 = 0,
    // allowGifting = true,
    gardenEarns = 0,
    collectibles: rawCLL,
  } = await money.getCache(input.senderID);
  const gardenStats = _gs as GardenStats;
  let isHypen = !!input.propertyArray[0];
  const collectibles = new Collectibles(rawCLL);
  correctItems(rawInventory as GardenItem[]);
  const exiTool = new Inventory(
    rawInventory.filter(
      (item): item is GardenTool => item.type === "gardenTool"
    )
  );
  const exiPets = new Inventory<GardenPetActive>(rawPets, PET_LIMIT);
  rawPlots.forEach((i: GardenPlot) => autoUpdateCropData(i, exiTool, exiPets));

  gardenEarns = gardenEarns || 0;
  gardenEarns = Math.max(gardenEarns, 0);

  const currWeather = await getCurrentWeather();
  let hasWeather = !currWeather.isNoEvent;
  const plotSorts = [
    "latest",
    "lowest",
    "highest",
    "smallest",
    "largest",
    "least-time",
    "most-time",
  ] as const;

  const currEvent = await getCurrentEvent();
  const xBarn = new Inventory<GardenBarn>(rawBarns, CROP_CONFIG.BARN_LIMIT);

  const currentHeld = xBarn.getOneByID(gardenHeld);
  const style: CommandStyle = {
    ...command.style,
    title: {
      content: `${currEvent.icon} ${UNISpectra.charm} **G🍓rden**`,
      text_font: "fancy",
      line_bottom: "default",
    },
    footer: {
      content: hasWeather
        ? `${currWeather.icon} Weather: **${currWeather.name}**${
            currWeather.effects?.length
              ? " - " +
                currWeather.effects
                  .map(
                    (e) =>
                      `${Math.round((e.mutationChance ?? 0) * 100)}% ${
                        e.mutationType
                      } mutations`
                  )
                  .join(", ")
              : ""
          }`
        : "Rewards multiply with success.",
      text_font: "fancy",
    },
    // ...(xBarn.hasByID(gardenHeld)
    //   ? {
    //       held: {
    //         content: `🫴 ${formatMutationStr(currentHeld)}`,
    //         text_font: "fancy",
    //         line_top: "default",
    //       },
    //     }
    //   : {}),
  };

  if (!name || name === "Unregistered") {
    return output.reply(
      `🌱 Please register first!\nUse: **${prefix}register** without fonts.`
    );
  }

  output.setStyle(style);

  const isRef = await refreshShopStock();

  const isRelapsed = currEvent.key === "relapsed";

  const relapseChars: Array<{ key: string; icon: string; texts: string[] }> = [
    {
      key: "oldGardener",
      icon: "🧙‍♂️",
      texts: [
        "The soil feels heavier tonight. No need to blossom",
        "Even the strongest roots bend in the storm. They don't break.",
        "This garden remembers every tear that watered it.",
        "If your heart feels loud tonight, let the wind answer back.",
      ],
    },
    {
      key: "whispy",
      icon: "🐦",
      texts: [
        "You again? Couldn't sleep either? The stars are loud tonight.",
        "Funny thing about the night… it plays the thoughts you tried to bury all day.",
        "Thinking of them again? It's alright. Some echoes just don't fade easy.",
        "If you sit long enough, I'll sing you a song that starts with sorrow... but ends in light.",
        "Not everything grows in daylight. Some seeds only stir when it's quiet enough to listen.",
        "Shops close, paths twist... but sometimes a machine hums softly behind forgotten vines.",
        "They say there's a **hidden vending machine** out here. But it won't hum unless you hum first.",
        "I guard nothing. I just wait for tunes the world forgot. Maybe you're one of them.",
        "You ask about seeds, but have you asked the wind? Or followed the cold wires underground?",
        "This garden remembers. Even when the doors lock, it leaves whispers for those who still wander.",
      ],
    },
    {
      key: "lumen",
      icon: "🌸",
      texts: [
        "You are wilting... But not dying.",
        "The moon listens when the heart breaks.",
        "Give pain to the petals. They know how to change it.",
        "Stay. The night isn't there to hurt... it's here to remember.",
      ],
    },
  ];

  const relapsedConfig: Config[] = [
    {
      key: "energize",
      icon: "⚡🎫",
      description: "Turn your relapsed tickets into minigame energies.",
      aliases: ["e"],
      async handler(_, {}) {
        const str = `⚡ Time to recharge! Let's play, unwind, and detch away from the sadness.`;
        const maxEnergy = 1000;
        const kgToEnergy = 12;
        const choices: GardenChoiceConfig["choices"] = [
          {
            txt: `How many energy do I have?`,
            async callback(rep) {
              let { collectibles } = await rep.usersDB.getCache(rep.uid);
              const cll = new Collectibles(collectibles);
              return rep.output.reply(
                `${
                  UNISpectra.charm
                } ⚡ Here's your energy!\n\n**${cll.getAmount(
                  "relapseEnergy"
                )}**/${maxEnergy}`
              );
            },
          },
          {
            txt: `I want to convert 🫳 this to an energy.`,
            async callback(rep) {
              let {
                gardenBarns = [],
                gardenHeld = "",
                collectibles,
              } = await rep.usersDB.getCache(rep.uid);
              const cll = new Collectibles(collectibles);

              const barns = new Inventory<GardenBarn>(
                gardenBarns,
                CROP_CONFIG.BARN_LIMIT
              );
              const item = barns.getOneByID(gardenHeld);

              if (!item || !item.mutation.includes("Relapsed")) {
                return rep.output.reply(
                  `${UNISpectra.charm} ⚡ No held **RELAPSED** plant!\n\n💡 Hint: try opening your garden barn and hold an item!`
                );
              }

              if (item.isFavorite) {
                return rep.output.reply(
                  `${UNISpectra.charm} ⚡ Cannot give favorited plant!\n\n💡 Hint: try opening your garden barn and unfavorite an item!`
                );
              }

              const am = cll.getAmount("relapseEnergy");
              if (am >= maxEnergy) {
                return rep.output.reply(
                  `${UNISpectra.charm} ⚡ Energy is already **${am}**/${maxEnergy}! Try playing some minigames, I guess.`
                );
              }

              const energyAdded = Math.min(
                Math.round(item.kiloGrams * kgToEnergy),
                maxEnergy - am
              );

              cll.raise("relapseEnergy", energyAdded);
              barns.deleteByID(item.uuid);

              await rep.money.setItem(rep.uid, {
                gardenBarns: barns.raw(),
                collectibles: [...cll],
              });

              return rep.output.reply(
                `${
                  UNISpectra.charm
                } ⚡ Added **${energyAdded}** energy!\n\n**${cll.getAmount(
                  "relapseEnergy"
                )}**/${maxEnergy}`
              );
            },
          },
          {
            txt: `How do I use my energy?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `⚡ I don't know, play minigames maybe?`,
              })(rep);
            },
          },
        ];

        return GardenChoice({ title: str, choices, style })(ctx);
      },
    },
    {
      key: "minigame",
      icon: "🧩🥀",
      description: "Play minigames to avoid relapsing.",
      aliases: ["game", "m"],
      async handler(_, {}) {
        const intros = [
          "Hah… so you followed the echoes after all. Figures.",
          "You thought I just **perch and ponder**, huh? Nah. I guard games too.",
          "See, not all healing looks like rest. Some looks like puzzles, patterns, tapping at just the right beat.",
          "Welcome to my little corner. Costs energy, sure… but the kind that spins storms into stillness.",
          "Wanna play? Good. But don't expect just fun—expect clarity between each flicker.",
        ];

        const targ = relapseChars.find((i) => i.key === "whispy");
        let title = `${targ.icon} ${intros.randomValue()}`;
        const energyCost = 60;

        const choices: GardenChoiceConfig["choices"] = [
          {
            txt: `Why do I need energy to play?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Because playing ain't free—not when your mind's cluttered. ⚡ is what your heart spills when it's too full. You use it to **burn the fog**, not just pass time.`,
              })(rep);
            },
          },
          {
            txt: `Where do I find more energy?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Energy? ⚡ Doesn't just fall from stars. Look for **mutated plants**, the ones grown from relapse. They shimmer wrong. Pluck them gently, then bring 'em to that humming guy near the broken lamppost—he knows how to turn hurt into fuel.`,
              })(rep);
            },
          },
          {
            txt: `Can I trade energy for points?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Not directly. ⚡ fuels action. Points bloom only **after** you play. Energy's the spark—points are the echo.`,
              })(rep);
            },
          },
          {
            txt: `What kind of puzzles are these?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} These aren't just puzzles—they're echoes. **Fragments of focus**. Some ask you to listen, others want you to dodge, remember, or rebuild. Every one is a piece of clarity hidden in the noise.`,
              })(rep);
            },
          },
          {
            txt: `What can I do with the points I earned?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Trade those points at the **vending machine**, tucked behind some tangled wires. It offers seeds—some sprouted from old cravings, but grown to soothe. Only way to reach it? Solve my puzzles first.`,
              })(rep);
            },
          },
          {
            txt: `Why is the vending machine selling seeds?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Machines forget nothing. They offer what they've seen you reach for: comfort. These seeds? Tiny, coded memories turned into hope. Plant one, and watch it speak back.`,
              })(rep);
            },
          },
          {
            txt: `Why would I even need to play your game?`,
            async callback(rep) {
              return GardenChoice({
                style,
                choices,
                title: `${targ.icon} Because sometimes distraction isn't denial—it's survival. My games hum in patterns your pain can't scramble. Try it. You might hear yourself again.`,
              })(rep);
            },
          },
          {
            txt: `I want to play a minigame for ⚡ ${energyCost}`,
            async callback(rep) {
              let { collectibles } = await rep.usersDB.getCache(rep.uid);
              const cll = new Collectibles(collectibles);
              if (cll.getAmount("relapseEnergy") < energyCost) {
                return rep.output.reply(
                  `${UNISpectra.charm} ${
                    targ.icon
                  } Not enough energy. You had ⚡ **${cll.getAmount(
                    "relapseEnergy"
                  )}** but we need ⚡ **${energyCost}**`
                );
              }
              cll.raise("relapseEnergy", -energyCost);
              await rep.usersDB.setItem(rep.uid, {
                collectibles: [...cll],
              });
              return PlayRelapseMinigame(rep, style);
            },
          },
        ];

        return GardenChoice({ title, choices, style })(ctx);
      },
    },
  ];

  const beeCombpressor: Config = {
    key: "combpressor",
    description: "interact with the honey combpressor.",
    aliases: ["comb", "cb"],
    icon: "🍯🏠",
    async handler(_, {}) {
      const linesNeedKG: string[] = [
        "I'll put that in the **Compressor**. But we've still got more to go!",
        "Whoa! Did you get this one from a 🌱 **Supreme Sprout**?",
        "This'll work great. But the grind **never stops**!",
        "We'll convert this into 🍯 **honey**.",
        "Nice!! We'll turn this into 🍯 **honey**, somehow.",
        "This looks like it'll give a lot of **bond**...",
        "Once it's **full**, we'll **combpress** it down.",
        "Just stuff that right into the **Combpressor**.",
        "Plant 🌱 **seeds**! Collect 🥥 **fruits**! Make 🍯 **honey**!",
        "Oh! This one is 🐝💖 **Basic Bee's favorite**.",
        "I bet **Tabby Bee** would like this one!",
      ];
      const lineCompleteKG: string[] = [
        "Here comes the 🍯 **honey**!",
        "Let's convert this stuff into 🍯 **honey**!",
        "Ok! Now you just wait while I **Combpress** this down.",
        "That's all we need! Now, it's my turn to **work..**",
        "Perfect! You wait while I get 🐼 **Panda Bear** to press this down.",
        "Time to **press**! Just uh, give, me a minute.",
        "Filled up faster than a 🐝 **Photon Bee**! Now we wait.",
      ];
      const lineReward: string[] = [
        "Good work, **Beekeeper**! Keep up the grind.",
        "✅ **Quest complete**! Here's your sweet **reward**.",
        "The honey turned out great! 🐻 **Black Bear** would be proud.",
        "Could buy alot of 🪼 **Royal Jelly** with this stuff.",
        "I like 🍯 **honey**, but I don't like it **THAT** much.",
        "More 🍯 **honey** than a 🌧️ **honey storm**.",
      ];

      const timeNeed = 2 * 60 * 1000;
      const rewardHoney = 10;
      const neededKg = Number((10).toFixed(2));
      const neededMutation = "Pollinated";

      const str = `🍯🏠 Hi I am Onett, I guess.`;
      const choices: GardenChoiceConfig["choices"] = [
        {
          txt: `How much is in the honey combpressor?`,
          async callback(rep) {
            let { honeyStamp, honeyKG: honeyKG_ = 0 } =
              await rep.usersDB.getCache(rep.uid);
            let honeyKG = honeyKG_ as number;
            if (typeof honeyStamp === "number") {
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 The combpressor is currently running! Try to collect it.`
              );
            }

            return rep.output.reply(
              `${UNISpectra.charm} 🍯🏠 **${Number(
                honeyKG.toFixed(2)
              )}**/${neededKg} KG`
            );
          },
        },
        {
          txt: `I want to put 🫴 this to the honey combpressor.`,
          async callback(rep) {
            let {
              gardenBarns = [],
              honeyStamp,
              gardenHeld = "",
              honeyKG: honeyKG_ = 0,
              name = "User",
            } = await rep.usersDB.getCache(rep.uid);
            let honeyKG = honeyKG_ as number;
            if (typeof honeyStamp === "number") {
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 The combpressor is currently running! Try to collect it.`
              );
            }
            const barns = new Inventory<GardenBarn>(
              gardenBarns,
              CROP_CONFIG.BARN_LIMIT
            );
            let kg = 0;
            const item = barns.getOneByID(gardenHeld);
            let isAlreadyFull = honeyKG >= neededKg;
            if (!isAlreadyFull) {
              if (!item || !item.mutation.includes(neededMutation)) {
                return rep.output.reply(
                  `${UNISpectra.charm} 🍯🏠 No held **POLLINATED** plant!\n\n💡 Hint: try opening your garden barn and hold an item!`
                );
              }
              if (item.isFavorite) {
                return rep.output.reply(
                  `${UNISpectra.charm} 🍯🏠 Cannot give favorited plant!\n\n💡 Hint: try opening your garden barn and unfavorite an item!`
                );
              }

              kg = item.kiloGrams;
              honeyKG += kg;

              barns.deleteByID(item.uuid);
            }

            if (honeyKG >= neededKg) {
              await rep.usersDB.setItem(rep.uid, {
                honeyStamp: Date.now(),
                gardenBarns: barns.raw(),
                honeyKG: Math.max(0, honeyKG - honeyKG), //TF?
              });
              setTimeout(() => {
                if (!rep.input.isWeb) {
                  const stx: CommandStyle = {
                    ...style,
                  };
                  delete st.footer;
                  const y = GardenChoice({
                    title: `Hello **${name}**! Your 🍯 **honey** is ready! Please collect it.`,
                    choices,
                    style: stx,
                  });
                  return y(rep);
                }
              }, timeNeed);
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 ${lineCompleteKG.randomValue()}\n\n${
                  !isAlreadyFull
                    ? `🫴 ${formatMutationStr(
                        item
                      )}\n✅ Added **${kg} kilograms** to the combpressor.\n\n`
                    : "✅ Already full, no need for a plant!\n\n"
                }🍯🏠 **${Number(
                  honeyKG.toFixed(2)
                )}**/${neededKg} KG\n\nThe combpressor will start making honey, collect it after **${
                  timeNeed / 1000
                } seconds.**`
              );
            } else {
              await rep.usersDB.setItem(rep.uid, {
                gardenBarns: barns.raw(),
                honeyKG,
                honeyStamp: null,
              });
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 ${linesNeedKG.randomValue()}\n\n${
                  !isAlreadyFull
                    ? `🫴 ${formatMutationStr(
                        item
                      )}\n✅ Added **${kg} KG** to the combpressor.\n\n`
                    : ""
                }🍯🏠 **${Number(honeyKG.toFixed(2))}**/${neededKg} KG\n\n💡 ${
                  honeyKG - neededKg
                } KG left!`
              );
            }
          },
        },
        {
          txt: `I want to collect the honey 🍯`,
          async callback(rep) {
            const { collectibles: putCll = [], honeyStamp } =
              await rep.usersDB.getCache(rep.uid);
            if (typeof honeyStamp !== "number") {
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 Looks like there is nothing in here.`
              );
            }
            const now = Date.now();
            const elapsed = now - honeyStamp;
            if (elapsed < timeNeed) {
              const sLeft = Math.ceil((timeNeed - elapsed) / 1000);
              return rep.output.reply(
                `${UNISpectra.charm} 🍯🏠 **${String(sLeft).padStart(
                  3,
                  "0"
                )}** Seconds left!`
              );
            }
            const cll = new Collectibles(putCll);
            cll.raise("honey", rewardHoney);
            await rep.usersDB.setItem(rep.uid, {
              honeyStamp: null,
              collectibles: [...cll],
            });

            return rep.output.reply(
              `${
                UNISpectra.charm
              } 🍯🏠 ${lineReward.randomValue()}\n\nYou got 🍯**${rewardHoney}**!\n🍯 Your Honey: ${formatValue(
                cll.getAmount("honey"),
                "🍯",
                true
              )}`
            );
          },
        },
      ];
      const st: CommandStyle = {
        ...style,
      };
      delete st.footer;
      const x = GardenChoice({
        title: str,
        choices,
        style: st,
      });
      return x(ctx);
    },
  };
  const home = new SpectralCMDHome({ isHypen }, [
    {
      key: "shop",
      description: "Visit the Shop",
      aliases: ["-sh"],
      icon: "🛒",
      async handler() {
        if (isRelapsed) {
          const targ = relapseChars.find((i) => i.key === "whispy");
          let title = `${targ.icon} ${targ.texts.randomValue()}`;
          const choices: GardenChoiceConfig["choices"] = [
            {
              txt: `How can I access the seed shop?`,
              async callback(rep) {
                return GardenChoice({
                  title: `${targ.icon} Chirp... **not time yet**. The wind hasn't carried the right tune. But... I did see something **blink near the vending tree**. Might not be a shop, but if you **solve its little hum**, it might trade.`,
                  choices,
                  style,
                })(rep);
              },
            },
            {
              txt: `Who tf are you?`,
              async callback(rep) {
                return GardenChoice({
                  title: `${targ.icon} Me? Just a **bird with too many stories** stuck in my feathers. Name's **Whispy**. I perch where memories echo the loudest.`,
                  choices,
                  style,
                })(rep);
              },
            },
            {
              txt: `Why are you blocking the seed shop?`,
              async callback(rep) {
                return GardenChoice({
                  title: `${targ.icon} Blocking? No, no... I'm just **nesting** where the soil remembers. The shop **sleeps for now**. But maybe... try the **vending roots** nearby. Heard they stir when **riddles are whispered**.`,
                  choices,
                  style,
                })(rep);
              },
            },
            {
              txt: `Just show me the seed shop!!!`,
              async callback(rep2) {
                const shop = new UTShop({
                  ...formatShopItems(gardenShop, currEvent),
                  style,
                });
                if (isRef) {
                  shop.resetStocks(
                    ...gardenShop.itemData
                      .filter((i) => i.inStock !== false)
                      .map((i) => i.key)
                  );
                }
                await shop.onPlay({ ...rep2, args: [] });
              },
            },
          ];

          const x = GardenChoice({
            title,
            choices,
            style,
          });
          await x(ctx);
          return;
        }
        const shop = new UTShop({
          ...formatShopItems(gardenShop, currEvent),
          style,
        });
        if (isRef) {
          shop.resetStocks(
            ...gardenShop.itemData
              .filter((i) => i.inStock !== false)
              .map((i) => i.key)
          );
        }
        await shop.onPlay({ ...ctx, args: [] });
      },
    },
    // {
    //   key: "gnpshop",
    //   description: "Visit the Gears & Pets Shop",
    //   aliases: ["-gnpsh", "-gnp"],
    //   icon: "🛒",
    //   async handler() {
    //     const shop = new UTShop({
    //       ...formatShopItems(
    //         { ...gardenShop, itemData: gardenShop.gnpShop },
    //         currEvent
    //       ),
    //       style,
    //     });
    //     if (isRef) {
    //       shop.resetStocks(
    //         ...gardenShop.gnpShop
    //           .filter((i) => i.inStock !== false)
    //           .map((i) => i.key)
    //       );
    //     }
    //     await shop.onPlay({ ...ctx, args: [] });
    //   },
    // },
    ...(((currEvent.shopItems ?? []).length > 0
      ? [
          {
            key: currEvent?.shopName ?? "eventshop",
            description: `Shop for ${currEvent.name}.`,
            aliases: [...(currEvent.shopAlias ?? []), "-esh", "eshop"],
            icon: `${currEvent.icon ?? "🛒"}`,
            async handler() {
              const shop = new UTShop({
                ...formatShopItems(
                  {
                    ...gardenShop,
                    itemData: gardenShop.eventItems,
                  },
                  currEvent,
                  true
                ),
                style,
              });
              if (isRef) {
                shop.resetStocks(
                  ...gardenShop.eventItems
                    .filter((i) => i.inStock !== false)
                    .map((i) => i.key)
                );
              }
              await shop.onPlay({ ...ctx, args: [] });
            },
          },
        ]
      : []) as Config[]),
    {
      key: "sell",
      description: "sell stuffs in Steven's stand!",
      aliases: ["-s"],
      icon: "🌱",
      async handler(_, {}) {
        const str = `🧑‍🌾 Got anything to sell?`;
        const choices: GardenChoiceConfig["choices"] = [
          {
            txt: `I want to sell my inventory (entire barn).`,
            async callback(rep) {
              const { gardenBarns = [], money: userMoney = 0 } =
                await rep.usersDB.getCache(rep.uid);
              const barns = new Inventory<GardenBarn>(
                gardenBarns,
                CROP_CONFIG.BARN_LIMIT
              );
              const canBuy = barns.getAll().filter((i) => !i.isFavorite);
              if (canBuy.length === 0) {
                return rep.output.reply(
                  `${UNISpectra.charm} 💬 🧑‍🌾 Nothing to buy.`
                );
              }
              let acc = 0;
              for (const item of canBuy) {
                acc += item.value || 0;
                barns.deleteByID(item.uuid);
              }
              const newMoney = userMoney + (acc || 0);
              await rep.usersDB.setItem(rep.uid, {
                gardenBarns: Array.from(barns),
                money: newMoney,
              });
              return rep.output.reply(
                `${UNISpectra.charm} 💬 🧑‍🌾 Here's your ${formatCash(
                  acc,
                  true
                )}\n\n💰 New Balance: ${formatCash(newMoney)}`
              );
            },
          },
          {
            txt: `I want to sell 🫴 this.`,
            async callback(rep) {
              const {
                gardenBarns = [],
                money: userMoney = 0,
                gardenHeld = "",
              } = await rep.usersDB.getCache(rep.uid);
              const barns = new Inventory<GardenBarn>(
                gardenBarns,
                CROP_CONFIG.BARN_LIMIT
              );
              const canBuy = [barns.getOneByID(gardenHeld)]
                .filter(Boolean)
                .filter((i) => !i.isFavorite);
              if (canBuy.length === 0) {
                return rep.output.reply(
                  `${UNISpectra.charm} 💬 🧑‍🌾 I don't see anything.\n\n💡 Hint: try opening your garden barn and hold an item!`
                );
              }
              let acc = 0;
              for (const item of canBuy) {
                acc += item.value || 0;
                barns.deleteByID(item.uuid);
              }
              const newMoney = userMoney + (acc || 0);
              await rep.usersDB.setItem(rep.uid, {
                gardenBarns: Array.from(barns),
                money: newMoney,
              });
              return rep.output.reply(
                `${UNISpectra.charm} 💬 🧑‍🌾 Here's your ${formatCash(
                  acc,
                  true
                )}\n\nSold: ${formatMutationStr(
                  canBuy[0]
                )}\n💰 New Balance: ${formatCash(newMoney)}`
              );
            },
          },

          {
            txt: `How much is 🫴 this worth?`,
            async callback(rep) {
              const { gardenBarns = [], gardenHeld = "" } =
                await rep.usersDB.getCache(rep.uid);
              const barns = new Inventory<GardenBarn>(
                gardenBarns,
                CROP_CONFIG.BARN_LIMIT
              );
              const canBuy = [barns.getOneByID(gardenHeld)].filter(Boolean);
              if (canBuy.length === 0) {
                return rep.output.reply(
                  `${UNISpectra.charm} 💬 🧑‍🌾 I don't see anything.\n\n💡 Hint: try opening your garden barn and hold an item!`
                );
              }
              let acc = 0;
              for (const item of canBuy) {
                acc += item.value || 0;
              }

              return rep.output.reply(
                `${UNISpectra.charm} 💬 🧑‍🌾 I'd value the ${formatMutationStr(
                  canBuy[0]
                )} at ${formatCash(acc, true)}`
              );
            },
          },

          {
            txt: `Nevermind.`,
            callback(rep) {
              return rep.output.reply(`${UNISpectra.charm} 💬 🧑‍🌾 Goodbye!`);
            },
          },
        ];
        const st: CommandStyle = {
          ...style,
          ...(xBarn.hasByID(gardenHeld)
            ? {
                held: {
                  content: `🫴 ${formatMutationStr(currentHeld)}`,
                  text_font: "fancy",
                },
              }
            : {}),
        };
        delete st.footer;
        const x = GardenChoice({
          title: str,
          choices,
          style: st,
        });
        return x(ctx);
      },
    },
    ...(currEvent.key === "bizzyBees" ? [beeCombpressor] : []),
    ...(isRelapsed ? relapsedConfig : []),
    {
      key: "plant",
      description: "Plant one or more seeds in plots",
      aliases: ["-p"],
      args: ["[seed_key] [quantity]"],
      icon: "🌱",
      async handler(_, { spectralArgs }) {
        let inventory = new Inventory<GardenItem | InventoryItem>(rawInventory);
        let plots = new Inventory<GardenPlot>(rawPlots, plotLimit);
        let seeds = inventory
          .toUnique()
          .filter((item): item is GardenSeed => item.type === "gardenSeed");
        const availablePlots = plotLimit - plots.getAll().length;
        if (availablePlots <= 0) {
          return output.replyStyled(
            `🌱 Max plots reached (${
              plots.getAll().length
            }/${plotLimit})! Harvest with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }harvest or expand with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }expand.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest\n` +
              `${UNISpectra.arrowFromT} Expand plot: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }expand`,
            style
          );
        }
        if (seeds.length === 0) {
          return output.replyStyled(
            `🌱 No seeds! Buy some with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }shop.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Visit shop: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop\n` +
              `${UNISpectra.arrowFromT} Check items: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }list`,
            style
          );
        }

        let seed: GardenSeed | null = null;
        let quantity =
          parseBet(
            spectralArgs[1],
            inventory.getAmount(spectralArgs[0] || "")
          ) || 1;
        quantity = Math.min(
          quantity,
          availablePlots,
          inventory.getAmount(spectralArgs[0] || "")
        );
        if (spectralArgs[0]) {
          const selected = inventory.getOne(spectralArgs[0]);
          if (selected && selected.type === "gardenSeed") {
            seed = selected as GardenSeed;
          }
        }
        if (!seed || quantity < 1) {
          const seedList = seeds
            .map(
              (s) =>
                `**x${inventory.getAmount(s.key)}** ${s.icon} **${
                  s.name
                }** (Key: **${s.key}**)`
            )
            .join("\n");
          return output.replyStyled(
            `❌ Invalid seed key${
              spectralArgs[0] ? ` "${spectralArgs[0]}"` : ""
            } or quantity! Use: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plant [seed_key] [quantity]\n\n` +
              `**Available Seeds**:\n${seedList || "None"}\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} List items: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }list\n` +
              `${UNISpectra.arrowFromT} Buy seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop`,
            style
          );
        }

        const planted: string[] = [];
        let firstPlot: GardenPlot = null;
        for (let i = 0; i < quantity; i++) {
          if (
            inventory.getAmount(seed.key) <= 0 ||
            plots.getAll().length >= plotLimit
          )
            break;
          inventory.deleteOne(seed.key);
          const constructions = EVENT_CONFIG.EVENTS_CONSTRUCTION.map(
            (i) => (i.shopItems ?? []) as typeof gardenShop.itemData
          ).flat();
          if (constructions.some((i) => i.key === seed.key)) {
            return output.reply(
              `🚧 This seed is currently in construction. You **cannot** use it right now.\n\n` +
                `**Next Steps**:\n` +
                `${UNISpectra.arrowFromT} List items: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }list\n` +
                `${UNISpectra.arrowFromT} Buy seeds: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }shop`
            );
          }
          const allItems = EVENT_CONFIG.allItems;
          const shopItem = allItems.find((i) => seed.key === i?.key);
          const priceInt = shopItem?.price ?? seed.cropData.baseValue;
          const price =
            shopItem.priceType !== "money" && shopItem.priceType
              ? 0
              : Math.min(
                  seed.cropData.baseValue || 0,
                  priceInt / (seed.cropData.harvests || 1)
                );
          let plot: GardenPlot = {
            key: `plot_${Date.now()}_${i}`,
            seedKey: seed.key,
            name: `${seed.name}`.replaceAll("Seeds", "").trim(),
            icon: seed.icon,
            plantedAt: Date.now(),
            growthTime: seed.cropData.growthTime,
            originalGrowthTime: seed.cropData.growthTime,
            harvestsLeft: seed.cropData.harvests,
            baseValue: seed.cropData.baseValue,
            mutation: [],
            type: "activePlot",
            yields: seed.cropData.yields,
            isFavorite: false,
            price,
            lastMutation: null,
            kiloGrams: 0,
            maxKiloGrams: randomBiased(
              CROP_CONFIG.MIN_KG + (seed.cropData.baseKG ?? 0),
              CROP_CONFIG.MAX_KG,
              CROP_CONFIG.KILO_BIAS
            ),
            mutationAttempts: 0,
            baseKiloGrams: seed.cropData.baseKG ?? 0,
            lastUpdated: Date.now(),
          };
          if (Math.random() < 0.1) {
            plot = await applyMutation(
              plot,
              new Inventory<GardenTool>(
                rawInventory.filter(
                  (item) => item.type === "gardenTool"
                ) as GardenTool[]
              ),
              exiPets,
              false,
              currWeather
            );
          }
          plot.mutationAttempts = 0;
          plot = await autoUpdateCropData(
            plot,
            new Inventory<GardenTool>(
              rawInventory.filter(
                (item) => item.type === "gardenTool"
              ) as GardenTool[]
            ),
            exiPets
          );

          firstPlot ??= plot;
          plots.addOne(plot);
          if (plot.mutation.length > 0) {
            gardenStats.mutationsFound =
              (gardenStats.mutationsFound || 0) + plot.mutation.length;
          }

          planted.push(
            formatMutationStr({ ...plot, name: seed.name, icon: seed.icon })
          );
        }

        await money.setItem(input.senderID, {
          inventory: Array.from(inventory),
          gardenPlots: Array.from(plots),
          gardenStats,
        });
        await checkAchievements(
          {
            ...ctx.user,
            gardenStats,
            senderID: input.senderID,
            money: userMoney,
          },
          money,
          output,
          input
        );

        return ctx.output.replyStyled(
          `🌱 Planted ${planted.length} seed${
            planted.length !== 1 ? "s" : ""
          } (${plots.getAll().length}/${plotLimit} plots):\n${planted.join(
            "\n"
          )}\n` +
            `⏳ First ready in: ${
              formatTimeSentence(cropTimeLeft(firstPlot)) ||
              "***ALREADY READY!***"
            }\n\n` +
            `**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Check plots: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plots\n` +
            `${UNISpectra.arrowFromT} Harvest later: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }harvest`,
          style
        );
      },
    },
    {
      key: "collect",
      description: "Collect ready crops",
      aliases: ["-c", "-h", "harvest"],
      icon: "🧺",
      args: ["'all'|seed_key"],
      async handler(_, { spectralArgs }) {
        let origEarns = gardenEarns;
        const plots = new Inventory<GardenPlot>(rawPlots, plotLimit);
        const barn = new Inventory<GardenBarn>(
          rawBarns,
          CROP_CONFIG.BARN_LIMIT
        );
        let inventory = new Inventory<GardenItem | InventoryItem>(rawInventory);
        let moneyEarned = 0;
        const harvested: {
          plot: GardenPlot;
          value: ReturnType<typeof calculateCropValue>;
        }[] = [];
        const seedsGained: string[] = [];
        const tools = new Inventory<GardenTool>(
          rawInventory.filter(
            (item) => item.type === "gardenTool"
          ) as GardenTool[]
        );

        const sortedPlots = [...plots].sort(
          (a, b) =>
            calculateCropValue(b, inflationRate).allYield -
            calculateCropValue(a, inflationRate).allYield
        );

        const type = spectralArgs[0];

        const isAll = type === "all";

        if ((!type || !sortedPlots.some((i) => i.seedKey === type)) && !isAll) {
          const plotList = Datum.toUniqueArray(sortedPlots, (i) => i.seedKey)
            .filter(isCropReady)
            .map(
              (s) =>
                `**x${
                  plots.getAll().filter((i) => i.seedKey === s.seedKey).length
                }** ${s.icon} **${s.name}** (Key: **${s.seedKey}**)`
            )
            .join("\n");
          return output.replyStyled(
            `🌱 Please specify "all" or a seed key to collect.\n\n` +
              `**Plots**:\n${plotList || "None"}\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} List plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots\n` +
              `${UNISpectra.arrowFromT} Buy seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop`,
            style
          );
        }

        const readyPlots: GardenPlot[] = [];
        for (const plot of sortedPlots) {
          const item = await autoUpdateCropData(plot, tools, exiPets);
          if (isCropReady(item) && readyPlots.length < 20) {
            if (isAll || item.seedKey === type) {
              readyPlots.push(item);
            }
          }
        }
        if (readyPlots.length === 0) {
          return output.replyStyled(
            `🌱 No crops ready! Check plots with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plots.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} View plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant`,
            style
          );
        }
        if (barn.isFull()) {
          return output.replyStyled(
            `🌱 Barn is full! Check barn items with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }barn.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} View plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant`,
            style
          );
        }

        for (const plot of readyPlots) {
          await autoUpdateCropData(
            plot,
            new Inventory<GardenTool>(
              rawInventory.filter(
                (item) => item.type === "gardenTool"
              ) as GardenTool[]
            ),
            exiPets
          );

          if (plot.mutation.length > 0) {
            gardenStats.mutationsFound =
              (gardenStats.mutationsFound || 0) + plot.mutation.length;
          }
          const value = calculateCropValue(plot, inflationRate);
          const collected = toBarnItem(plot, inflationRate);
          let yields = Math.min(
            value.yields,
            CROP_CONFIG.BARN_LIMIT - barn.size()
          );
          barn.add(collected.slice(0, yields));
          if (yields <= 0) {
            continue;
          }
          gardenEarns +=
            value.final * yields - (plot.price || plot.baseValue || 0);

          harvested.push({
            plot: { ...plot },
            value: { ...value, allYield: value.final * yields, yields },
          });
          plot.harvestsLeft -= yields;

          gardenStats.plotsHarvested =
            (gardenStats.plotsHarvested || 0) + yields;
          if (Math.random() < CROP_CONFIG.LUCKY_HARVEST_CHANCE) {
            const shopItem = [
              ...gardenShop.itemData,
              ...gardenShop.eventItems,
            ].find((item) => item.key === plot.seedKey);
            if (shopItem && inventory.size() < global.Cassidy.invLimit) {
              const cache = inventory.getAll() as GardenItem[];
              shopItem.onPurchase({ ...ctx, moneySet: { inventory: cache } });
              inventory = new Inventory(cache);
              seedsGained.push(`${plot.icon} ${plot.name} (Seed)`);
            }
          }
          if (plot.harvestsLeft <= 0) {
            plots.deleteByID(plot.uuid);
          } else {
            plot.mutation = [];
            plot.plantedAt = Date.now();
            plot.growthTime = Math.floor(plot.growthTime * 1.2);
            plot.maxKiloGrams = randomBiased(
              CROP_CONFIG.MIN_KG,
              CROP_CONFIG.MAX_KG,
              CROP_CONFIG.KILO_BIAS
            );
            plot.kiloGrams = 0;

            if (Math.random() < 0.1) {
              await applyMutation(
                plot,
                new Inventory<GardenTool>(
                  rawInventory.filter(
                    (item) => item.type === "gardenTool"
                  ) as GardenTool[]
                ),
                exiPets,
                false,
                currWeather
              );
            }
            plot.mutationAttempts = 0;
            plots.deleteByID(plot.uuid);
            plots.addOne(plot);
          }
        }

        gardenEarns = Math.round(Math.max(0, gardenEarns));

        await money.setItem(input.senderID, {
          gardenPlots: Array.from(plots),
          inventory: Array.from(inventory),
          gardenStats,
          gardenEarns,
          gardenBarns: Array.from(barn),
        });
        await checkAchievements(
          {
            ...ctx.user,
            gardenStats,
            senderID: input.senderID,
            money: userMoney + moneyEarned,
          },
          money,
          output,
          input
        );
        const harvestedStr = [...harvested]
          .sort((a, b) => b.value.final - a.value.final)
          .map(
            ({ plot, value }) =>
              `(x${value.yields}) ${
                (plot.mutation ?? []).length > 0
                  ? `[ ${plot.mutation
                      .map(
                        (i) =>
                          `${
                            getMutation(i)?.icon ?? "❓"
                          } ${fonts.double_struck(i)}`
                      )
                      .join(" + ")} ] `
                  : ""
              }${plot.icon} ${plot.name} (${plot.kiloGrams}kg)`
          );
        const addedEarns = gardenEarns - origEarns;

        return output.replyStyled(
          `✅🧺 **Collected and added to the Barn! (${barn.size()}/${
            barn.limit
          })**:\n${harvestedStr.join("\n")}${
            barn.isFull() ? `\n🏡 Barn is full!` : ""
          }\n\n` +
            (seedsGained.length > 0
              ? `🌱🧺 **Lucky Harvest Seeds**:\n${seedsGained.join("\n")}\n\n`
              : "") +
            // `💰 Earned: ${formatCash(moneyEarned, true)}\n` +
            // `💵 Balance: ${formatCash(userMoney + moneyEarned)}\n\n` +
            `📈 Total Earns: **${formatCash(
              gardenEarns
            )}** (+${abbreviateNumber(addedEarns)})\n\n` +
            `**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }sell\n` +
            `${UNISpectra.arrowFromT} Check the barn: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }barn`,
          style
        );
      },
    },
    {
      key: "plots",
      description: "View your garden plots",
      aliases: ["-pl"],
      args: [`[${plotSorts.join("/")}]`, "[page]"],
      icon: "🪴",
      async handler(_, { spectralArgs }) {
        type PlotSorts = (typeof plotSorts)[number];
        const plots = new Inventory<GardenPlot>(rawPlots, plotLimit);
        const page = parseInt(spectralArgs[1]) || 1;
        const type: PlotSorts = `${
          spectralArgs[0] || "least-time"
        }`.toLowerCase() as PlotSorts;
        if (!isNaN(parseInt(spectralArgs[0])) && spectralArgs[0]) {
          return output.reply(
            `🌱 Please use the page number as second argument. For the first argument, choose from: **${plotSorts.join(
              ", "
            )}**`
          );
        }
        if (!plotSorts.includes(type)) {
          return output.reply(
            `🌱 Invalid sorting type as first argument. Choose from: **${plotSorts.join(
              ", "
            )}**`
          );
        }
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = page * ITEMS_PER_PAGE;
        for (const plot of plots) {
          await autoUpdateCropData(
            plot,
            new Inventory<GardenTool>(
              rawInventory.filter(
                (item) => item.type === "gardenTool"
              ) as GardenTool[]
            ),
            exiPets
          );
        }
        const sortedPlots = [...plots.getAll()]
          .sort((a, b) => {
            const timeA = cropTimeLeft(a, true);
            const timeB = cropTimeLeft(b, true);
            if (type === "least-time") {
              return timeA - timeB;
            }
            if (type === "most-time") {
              return timeB - timeA;
            }
            const priceA = calculateCropValue(a, inflationRate).allYield;
            const priceB = calculateCropValue(b, inflationRate).allYield;
            if (type === "highest") {
              return priceB - priceA;
            }
            if (type === "lowest") {
              return priceA - priceB;
            }
            const sizeA = calculateCropKG(a);
            const sizeB = calculateCropKG(b);
            if (type === "largest") {
              return sizeB - sizeA;
            }
            if (type === "smallest") {
              return sizeA - sizeB;
            }
            if (type === "latest") {
              return b.plantedAt - a.plantedAt;
            }
          })
          .slice(start, end)
          .map((i, j) => ({
            plot: i,
            num: start + j + 1,
          }));
        let result = `🌱 **${name}'s Garden Plots (${
          plots.getAll().length
        }/${plotLimit}, Page ${page})**:\n\n`;
        if (sortedPlots.length === 0) {
          return output.replyStyled(
            `🌱 No plots! Plant seeds with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plant.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Buy seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop`,
            style
          );
        }

        for (let [, { num, plot }] of sortedPlots.entries()) {
          plot = await autoUpdateCropData(
            plot,
            new Inventory<GardenTool>(
              rawInventory.filter(
                (item) => item.type === "gardenTool"
              ) as GardenTool[]
            ),
            exiPets
          );
          const timeLeft = cropTimeLeft(plot);
          // const price =
          //   Math.min(plot.price || 0, plot.baseValue) || plot.baseValue || 0;
          const calc = calculateCropValue(plot, inflationRate);
          // const cropValue = calc.final;
          // const earns = Math.floor(cropValue - price);
          result +=
            `${num}. ${formatMutationStr(plot)} (x${calc.yields})\n` +
            `${UNIRedux.charm} Harvests Left: ${plot.harvestsLeft}\n` +
            `${UNIRedux.charm} Time Left: ${
              formatTimeSentence(timeLeft) ||
              (!isCropReady(plot) ? "***BUGGED***!" : "***READY***!")
            }\n\n`;
        }
        if (plots.getAll().length > end) {
          result += `View more: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }plots ${type} ${page + 1}\n`;
        }
        result += `💡🏗️ To Shovel: ***Reply with***:\nshovel <number> <number> <number>\n`;

        result += `\n📈 Total Earns: ${formatCash(gardenEarns, true)}\n\n`;

        result +=
          `**Next Steps**:\n` +
          `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }harvest\n` +
          `${UNISpectra.arrowFromT} Favorite crops: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }plots`;
        await money.setItem(input.senderID, {
          gardenPlots: plots.raw(),
        });
        const info = await output.replyStyled(result, style);
        info.atReply(async (rep) => {
          if (rep.uid !== input.sid) {
            return;
          }
          let [type = "", ...nums_] = rep.input.words;
          type = type.toLowerCase();
          const nums = nums_.map(Number);

          const { gardenPlots: rawPlots = [] } = await rep.usersDB.getCache(
            rep.uid
          );
          const plots = new Inventory<GardenPlot>(rawPlots);
          const targets = nums
            .map((i) => sortedPlots.find((s) => s.num === i)?.plot?.uuid)
            .filter(Boolean)
            .map((i) => plots.getOneByID(i))
            .filter(Boolean);
          rep.output.setStyle(style);
          if (type === "shovel") {
            if (targets.length === 0) {
              return rep.output.reply(`🏗️ No targets provided as arguments.`);
            }
            let str = `✅ **Shoveled Successfully!**\n\n`;
            for (const target of targets) {
              str += `${formatMutationStr(target)}\n`;
              plots.deleteByID(target.uuid);
            }
            str +=
              `\n**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest\n` +
              `${
                UNISpectra.arrowFromT
              } Favorite crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots`;
            await rep.usersDB.setItem(rep.uid, {
              gardenPlots: plots.raw(),
            });
            return rep.output.reply(str);
          }
        });
      },
    },
    {
      key: "barn",
      description: "View your collected items.",
      aliases: ["-b"],
      args: ["[page]"],
      icon: "🏡",
      async handler(_, { spectralArgs }) {
        const barn = new Inventory<GardenBarn>(
          rawBarns,
          CROP_CONFIG.BARN_LIMIT
        );
        const page = parseInt(spectralArgs[0]) || 1;

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = page * ITEMS_PER_PAGE;

        const uniqueBarns = barn
          .toUnique(
            (i) => `${gardenHeld === i.uuid ? `🫴 ` : ""}${formatMutationStr(i)}`
          )
          .map((i) => ({
            item: i,
            amount: barn
              .getAll()
              .filter(
                (j) =>
                  `${gardenHeld === j.uuid ? `🫴 ` : ""}${formatMutationStr(
                    j
                  )}` ===
                  `${gardenHeld === i.uuid ? `🫴 ` : ""}${formatMutationStr(i)}`
              ).length,
          }));

        const sortedBarns = [...uniqueBarns]
          .sort((a, b) => {
            if (a.item.uuid === gardenHeld) return -1;
            if (b.item.uuid === gardenHeld) return 1;

            const aScore =
              a.item.value + (a.item.isFavorite ? 1_000_000_000_000 : 0);
            const bScore =
              b.item.value + (b.item.isFavorite ? 1_000_000_000_000 : 0);

            return bScore - aScore;
          })
          .slice(start, end)
          .map((i, j) => ({
            item: i.item,
            amount: i.amount,
            num: start + j + 1,
          }));
        let result = `🏡 **${name}'s Barn (${barn.getAll().length}/${
          CROP_CONFIG.BARN_LIMIT
        }, Page ${page})**:\n\n`;
        if (sortedBarns.length === 0) {
          return output.replyStyled(
            `🏡 No barn items! Plant and collect crops with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }collect.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Collect crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }collect`,
            style
          );
        }

        for (let [, { num, item, amount }] of sortedBarns.entries()) {
          result += `${num}. ${amount > 1 ? `[**x${amount}**] ` : ""}${
            gardenHeld === item.uuid ? `🫴 ` : ""
          }${formatMutationStr(item)}\n\n`;
        }
        if (barn.getAll().length > end) {
          result += `View more: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }barn ${page + 1}\n`;
        }

        result += `💡🫴 Options: ***Reply with***\nhold <number>\nfavorite <number> [number] [number]\nunfavorite <number> [number] [number]`;

        result += `\n📈 Total Earns: ${formatCash(gardenEarns, true)}\n\n`;

        result +=
          `**Next Steps**:\n` +
          `${UNISpectra.arrowFromT} Collect crops: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }collect\n` +
          `${UNISpectra.arrowFromT} Sell barn items: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }sell`;
        const info = await output.replyStyled(result, style);
        info.atReply(async (rep) => {
          if (rep.uid !== input.sid) {
            return;
          }
          let [type = "", ...nums_] = rep.input.words;
          type = type.toLowerCase();
          const nums = nums_.map(Number);

          const { gardenBarns: rawBarns = [], gardenHeld = "" } =
            await rep.usersDB.getCache(rep.uid);
          const barn = new Inventory<GardenBarn>(rawBarns);
          const targets = nums
            .map((i) => sortedBarns.find((s) => s.num === i)?.item?.uuid)
            .filter(Boolean)
            .map((i) => barn.getOneByID(i))
            .filter(Boolean);
          rep.output.setStyle(style);
          if (type === "hold") {
            if (targets.length === 0) {
              return rep.output.reply(`🫴 No targets provided as arguments.`);
            }
            const target = targets[0];

            let isUnheld = gardenHeld === target.uuid;
            let str = `✅🫴 **${
              isUnheld ? "Unheld" : "Held"
            } Successfully!**\n\n`;
            str += `${formatMutationStr(target)}\n`;

            str +=
              `\n**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Sell the held item: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }sell\n` +
              `${
                UNISpectra.arrowFromT
              } Favorite crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots`;
            await rep.usersDB.setItem(rep.uid, {
              gardenHeld: isUnheld ? "" : target.uuid,
            });
            return rep.output.reply(str);
          } else if (type === "favorite" || type === "unfavorite") {
            if (targets.length === 0) {
              return rep.output.reply(`💖 No targets provided as arguments.`);
            }
            const allFavorited = targets.every((target) => target.isFavorite);
            if (type === "favorite" && allFavorited) {
              return rep.output.reply(`💖 All targets are already favorited!`);
            }
            let str = `✅💖 **${
              type === "favorite" ? "Favorited" : "Unfavorited"
            } Successfully!**\n\n`;
            for (const target of targets) {
              if (type === "favorite" && target.isFavorite) continue;
              if (type === "unfavorite" && !target.isFavorite) continue;
              target.isFavorite = type === "favorite";
              barn.deleteByID(target.uuid);
              barn.addOne(target);
              str += `${formatMutationStr(target)}\n`;
            }
            str +=
              `\n**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }sell\n` +
              `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }barn`;
            await rep.usersDB.setItem(rep.uid, {
              gardenBarns: Array.from(barn),
            });
            return rep.output.reply(str);
          }
        });
      },
    },
    {
      key: "top",
      description:
        "View top 10 garden earners (paged, ranks 20-11 for page 2, etc.)",
      aliases: ["-t"],
      args: ["[page]"],
      icon: "🏆",
      async handler(_, { spectralArgs }) {
        const page = parseInt(spectralArgs[0]) || 1;
        const startRank = (page - 1) * 10 + 1;
        const endRank = startRank + 9;

        const allUsers = await money.getAllCache();
        const userStats: {
          userId: string;
          name: string;
          totalEarns: number;
          user: UserData;
        }[] = [];

        for (const user of Object.values(allUsers)) {
          if (
            ((user.gardenPlots as GardenPlot[]) ?? []).length === 0 ||
            ((user.gardenEarns as number) ?? 0) < 1
          ) {
            continue;
          }

          userStats.push({
            userId: user.userID,
            name: user.name || "Farmer",
            totalEarns: user.gardenEarns || 0,
            user,
          });
        }

        const sortedUsers = userStats.sort(
          (a, b) => b.totalEarns - a.totalEarns
        );
        const currentPageUsers = sortedUsers.slice(startRank - 1, endRank);

        let result = `🏆 **TOP ${endRank} GARDENERS**\n${UNISpectra.arrowFromT} Page **${page}**:\n\n`;
        if (currentPageUsers.length === 0) {
          return output.replyStyled(
            `🌱 No users found for ranks ${startRank}-${endRank}!\n\n` +
              `**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Check another page: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }top [page]\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest`,
            style
          );
        }

        currentPageUsers.forEach((user, index) => {
          result +=
            `━━━━━━ ${startRank + index} ━━━━━━\n` +
            `${UNIRedux.arrowFromT}  **${user.name}**${
              user?.user.userMeta?.name &&
              user.name !== user?.user.userMeta?.name
                ? ` (${user.user.userMeta.name})`
                : ""
            }\n` +
            `📊🌱 ${formatCash(user.totalEarns, false)}\n`;
        });

        if (sortedUsers.length > endRank) {
          result += `${
            UNIRedux.standardLine
          }\nView more: ${prefix}${commandName}${isHypen ? "-" : " "}top ${
            page + 1
          }\n`;
        }
        if (page > 2) {
          result += `View previous: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }top ${page - 1}\n`;
        }

        result +=
          `\n**Next Steps**:\n` +
          `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }harvest\n` +
          `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }plant`;

        return output.replyStyled(result, style);
      },
    },
    {
      key: "list",
      description: "View garden-related items",
      aliases: ["-l"],
      args: ["[page]"],
      icon: "📃",
      async handler(_, { spectralArgs }) {
        const inventory = new Inventory<GardenItem | InventoryItem>(
          rawInventory
        );
        const gardenItems = inventory
          .toUnique()
          .filter((item) =>
            ["gardenSeed", "gardenPetCage", "gardenTool"].includes(item.type)
          );
        const page = parseInt(spectralArgs[0]) || 1;
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = page * ITEMS_PER_PAGE;
        const currentItems = gardenItems.slice(start, end);
        let result = `🎒 **${name}'s Garden Items (Page ${page})**:\n\n`;
        if (currentItems.length === 0) {
          return output.replyStyled(
            `🌱 No garden items! Buy some with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }shop.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Visit shop: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant`,
            style
          );
        }

        currentItems.forEach((_item, index) => {
          let item = _item as GardenItem;
          const count = inventory.getAmount(item.key);
          result +=
            `${start + index + 1}. ${item.icon} **${item.name}**${
              count > 1 ? ` (x${count})` : ""
            }${
              inventory.get(item.key).some((i) => i.isFavorite) ? ` 💖` : ""
            }\n` +
            `${UNIRedux.charm} Type: ${item.type}\n` +
            `${UNIRedux.charm} Key: **${item.key}**\n` +
            `${
              item.type === "gardenSeed"
                ? `${UNIRedux.charm} Base Value: ${formatCash(
                    item.cropData.baseValue,
                    true
                  )}`
                : `${UNIRedux.charm} Sell Price: ${formatCash(item.sellPrice)}`
            }\n` +
            (item.type === "gardenPetCage"
              ? `${UNIRedux.charm} Collects: ${item.petData.seedTypes.join(
                  ", "
                )} (${item.petData.collectionRate}/min)\n`
              : "") +
            (item.type === "gardenTool"
              ? `${UNIRedux.charm} Effect: ${
                  item.toolData.favoriteEnabled
                    ? "Enables favoriting"
                    : `Growth ${
                        item.toolData.growthMultiplier || 1
                      }x, Mutations (${Object.keys(
                        item.toolData.mutationChance || {}
                      ).join(", ")}) +${
                        Object.values(
                          item.toolData.mutationChance || {}
                        ).reduce((a, b) => a + b, 0) * 100
                      }%`
                }\n`
              : "") +
            `\n`;
        });
        if (gardenItems.length > end) {
          result += `View more: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }list ${page + 1}\n`;
        }

        result += `\nUse **${prefix}bc list** to see ALL ITEMS.`;
        result += `\nUse **${prefix}bc use <key>** to use an item.\n\n`;

        result +=
          `**Next Steps**:\n` +
          `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }plant\n` +
          `${UNISpectra.arrowFromT} Favorite items: ${prefix}${commandName}${
            isHypen ? "-" : " "
          }plots`;

        return output.replyStyled(result, style);
      },
    },
    {
      key: "steal",
      description: "Steal a crop from another player's garden",
      aliases: ["-st"],
      args: ["[player_id]"],
      icon: "🥷",
      async handler(_, { spectralArgs }) {
        const stealCost = 200;
        const userGems = collectibles.getAmount("gems");
        if (userGems < stealCost) {
          return output.replyStyled(
            `❌ You need ${formatValue(
              stealCost,
              "💎",
              true
            )} to steal a crop! Your gems: ${formatValue(
              userGems,
              "💎",
              true
            )}.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }sell\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest`,
            style
          );
        }
        const UID = spectralArgs[0] || input.detectID;
        if (!UID || UID === input.sid) {
          return output.replyStyled(
            `❌ Please specify a player ID to steal from or reply to their message, or mention them!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }steal [player_id]`,
            style
          );
        }
        const target = await money.getCache(UID);
        const targetPlots = new Inventory<GardenPlot>(target.gardenPlots || []);
        const stealablePlots = targetPlots
          .getAll()
          .filter((plot) => isCropReady(plot) && !plot.isFavorite);
        for (const plot of stealablePlots) {
          await autoUpdateCropData(plot, exiTool, exiPets);
        }

        if (stealablePlots.length === 0) {
          return output.replyStyled(
            `❌ No stealable crops in that player's garden!\n\n` +
              `**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Try another player: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }steal [player_id]`,
            style
          );
        }

        const sortedPlots = stealablePlots.toSorted(
          (a, b) =>
            calculateCropValue(b, inflationRate).allYield -
            calculateCropValue(a, inflationRate).allYield
        );
        const stolenPlot = sortedPlots[0];
        const stealSuccess = Math.random() < 0.3;
        if (!stealSuccess) {
          await money.setItem(input.senderID, { money: userMoney + 100 });
          return output.replyStyled(
            `❌ Steal failed for ${formatValue(
              stealCost,
              "💎",
              true
            )}! You received ${formatCash(100)} as compensation.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }steal [player_id]\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest`,
            style
          );
        }
        const myPlots = new Inventory<GardenPlot>(rawPlots);
        const availablePlots = plotLimit - myPlots.getAll().length;
        if (availablePlots <= 0) {
          return output.replyStyled(
            `🌱 Max plots reached (${
              myPlots.getAll().length
            }/${plotLimit})! Harvest with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }harvest or expand with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }expand.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest\n` +
              `${UNISpectra.arrowFromT} Expand plot: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }expand`,
            style
          );
        }
        myPlots.addOne(stolenPlot);
        targetPlots.deleteOne(stolenPlot.key);

        collectibles.raise("gems", -stealCost);
        await money.setItem(input.senderID, {
          collectibles: Array.from(collectibles),
          gardenPlots: Array.from(myPlots),
        });
        await money.setItem(UID, {
          gardenPlots: Array.from(targetPlots),
        });

        return output.replyStyled(
          `✅ Stole ${formatMutationStr(stolenPlot)} for ${formatValue(
            stealCost,
            "💎",
            true
          )}! It was added to your plots!\n\n${
            UNISpectra.charm
          } Total Value: ${formatCash(
            calculateCropValue(stolenPlot, inflationRate).allYield,
            true
          )}\n\n` +
            `**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Check items: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }list\n` +
            `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plant`,
          style
        );
      },
    },
    {
      key: "gift",
      description: "Gift a held barn item to another player",
      aliases: ["-g"],
      args: ["[player_id]"],
      icon: "🎁",
      async handler(_, { spectralArgs }) {
        const barn = new Inventory<GardenBarn>(
          rawBarns,
          CROP_CONFIG.BARN_LIMIT
        );
        const currentHeld = barn.getOneByID(gardenHeld);

        if (!currentHeld || !xBarn.hasByID(gardenHeld)) {
          return output.replyStyled(
            `❌ No item held! Hold an item with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }barn.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }barn\n` +
              `${UNISpectra.arrowFromT} Collect crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }collect`,
            style
          );
        }

        if (currentHeld.isFavorite) {
          return output.replyStyled(
            `❌ Cannot gift favorited item ${formatMutationStr(
              currentHeld
            )}!\n\n` +
              `**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Unfavorite item: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots\n` +
              `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }barn`,
            style
          );
        }

        const targetUID = spectralArgs[0] || input.detectID;
        if (!targetUID) {
          return output.replyStyled(
            `❌ Please specify a player ID to gift to, reply to their message, or mention them!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }gift [player_id]`,
            style
          );
        }

        if (targetUID === input.sid) {
          return output.replyStyled(
            `❌ You cannot gift to yourself!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }gift [player_id]\n` +
              `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }barn`,
            style
          );
        }

        const target = await money.getCache(targetUID);
        if (!target || !target.name) {
          return output.replyStyled(
            `❌ Player with ID ${targetUID} not found!\n\n` +
              `**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Try another player: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }gift [player_id]`,
            style
          );
        }

        const targetBarn = new Inventory<GardenBarn>(
          target.gardenBarns || [],
          CROP_CONFIG.BARN_LIMIT
        );
        if (targetBarn.isFull()) {
          return output.replyStyled(
            `❌ ${target.name}'s barn is full (${targetBarn.size()}/${
              CROP_CONFIG.BARN_LIMIT
            })!\n\n` +
              `**Next Steps**:\n` +
              `${
                UNISpectra.arrowFromT
              } Try another player: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }gift [player_id]\n` +
              `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }barn`,
            style
          );
        }

        barn.deleteByID(currentHeld.uuid);

        targetBarn.addOne({
          ...currentHeld,
        });

        await money.setItem(input.senderID, {
          gardenBarns: Array.from(barn),
          gardenHeld: "",
        });
        await money.setItem(targetUID, {
          gardenBarns: Array.from(targetBarn),
        });

        return output.replyStyled(
          `🎁 Successfully gifted ${formatMutationStr(currentHeld)} to **${
            target.name
          }**!\n\n` +
            `**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Check barn: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }barn\n` +
            `${
              UNISpectra.arrowFromT
            } Collect more crops: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }collect`,
          style
        );
      },
    },
    {
      key: "growall",
      icon: "🌱🔓",
      description: "Instantly grow all crops",
      aliases: ["-ga"],
      async handler() {
        const growAllCost = 100;
        const userGems = collectibles.getAmount("gems");
        if (userGems < growAllCost) {
          return output.replyStyled(
            `❌ You need ${formatValue(
              growAllCost,
              "💎",
              true
            )} to grow all crops! Your gems: ${formatValue(
              userGems,
              "💎",
              true
            )}.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }sell\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest`,
            style
          );
        }
        const plots = new Inventory<GardenPlot>(rawPlots, plotLimit);
        if (plots.getAll().length === 0) {
          return output.replyStyled(
            `🌱 No crops to grow! Plant seeds with ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plant.\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Buy seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }shop`,
            style
          );
        }

        for (let plot of plots) {
          plot = await autoUpdateCropData(plot, exiTool, exiPets);
          const timeLeft = cropTimeLeft(plot);
          if (timeLeft <= 0) {
            continue;
          }
          plot.plantedAt -= timeLeft;
        }
        collectibles.raise("gems", -growAllCost);
        await money.setItem(input.senderID, {
          gardenPlots: Array.from(plots),
          collectibles: Array.from(collectibles),
        });

        return output.replyStyled(
          `🌱 All crops grown instantly for ${formatValue(
            growAllCost,
            "💎",
            true
          )}!\n\n` +
            `**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }harvest\n` +
            `${UNISpectra.arrowFromT} Check plots: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plots`,
          style
        );
      },
    },
    {
      key: "expand",
      icon: "🧺🧺",
      description: "Expand your garden plot",
      aliases: ["-ex"],
      args: ["[side/rear1/rear2]"],
      async handler(_, { spectralArgs }) {
        const sideExpansionCost = 250000000;
        const rearExpansion1Cost = 500000000;
        const rearExpansion2Cost = 1000000000;
        const sideExpansionPlots = 8;
        const rearExpansionPlots = 12;
        const sideExpansionDelay = 0;
        const rearExpansion1Delay = 24 * 60 * 60 * 1000;
        const rearExpansion2Delay = 3 * 24 * 60 * 60 * 1000;
        const currentTime = Date.now();

        if (plotLimit >= PLOT_EXPANSION_LIMIT) {
          return output.replyStyled(
            `🌱 Max plot limit (${PLOT_EXPANSION_LIMIT}) reached!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Harvest crops: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }harvest\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant`,
            style
          );
        }

        const expansionType = spectralArgs[0];
        if (!expansionType) {
          return output.replyStyled(
            `❌ Invalid expansion type! Use: side, rear1, or rear2.\n\n` +
              `💰 **Costs**:\n\nSide - ${formatCash(
                sideExpansionCost,
                true
              )}\nRear1 - ${formatCash(
                rearExpansion1Cost,
                true
              )}\nRear2 - ${formatCash(rearExpansion2Cost, true)}\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }expand [side/rear1/rear2]`,
            style
          );
        }

        if (expansionType === "side") {
          if (userMoney < sideExpansionCost) {
            return output.replyStyled(
              `❌ You need ${formatCash(
                sideExpansionCost
              )} for a side expansion! Your balance: ${formatCash(
                userMoney
              )}.\n\n` +
                `**Next Steps**:\n` +
                `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }sell\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          if (currentTime - lastSideExpansion < sideExpansionDelay) {
            return output.replyStyled(
              `⏳ Side expansion on cooldown! Try again in ${
                formatTimeSentence(
                  lastSideExpansion + sideExpansionDelay - currentTime
                ) || "Now?"
              }.\n\n` +
                `**Next Steps**:\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          await money.setItem(input.senderID, {
            money: userMoney - sideExpansionCost,
            plotLimit: plotLimit + sideExpansionPlots,
            lastSideExpansion: currentTime,
            gardenStats: {
              ...gardenStats,
              expansions: (gardenStats.expansions || 0) + 1,
            },
          });
          await checkAchievements(
            {
              ...ctx.user,
              gardenStats: {
                ...gardenStats,
                expansions: (gardenStats.expansions || 0) + 1,
              },
              senderID: input.senderID,
              money: userMoney - sideExpansionCost,
            },
            money,
            output,
            input
          );
          return output.replyStyled(
            `🌱 Plot expanded by ${sideExpansionPlots} slots for ${formatCash(
              sideExpansionCost
            )}!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Check plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots`,
            style
          );
        } else if (expansionType === "rear1") {
          if (userMoney < rearExpansion1Cost) {
            return output.replyStyled(
              `❌ You need ${formatCash(
                rearExpansion1Cost
              )} for the first rear expansion! Your balance: ${formatCash(
                userMoney
              )}.\n\n` +
                `**Next Steps**:\n` +
                `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }sell\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          if (currentTime - lastRearExpansion1 < rearExpansion1Delay) {
            return output.replyStyled(
              `⏳ First rear expansion on cooldown! Try again in ${
                formatTimeSentence(
                  lastRearExpansion1 + rearExpansion1Delay - currentTime
                ) || "Now?"
              }.\n\n` +
                `**Next Steps**:\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          await money.setItem(input.senderID, {
            money: userMoney - rearExpansion1Cost,
            plotLimit: plotLimit + rearExpansionPlots,
            lastRearExpansion1: currentTime,
            gardenStats: {
              ...gardenStats,
              expansions: (gardenStats.expansions || 0) + 1,
            },
          });
          await checkAchievements(
            {
              ...ctx.user,
              gardenStats: {
                ...gardenStats,
                expansions: (gardenStats.expansions || 0) + 1,
              },
              senderID: input.senderID,
              money: userMoney - rearExpansion1Cost,
            },
            money,
            output,
            input
          );
          return output.replyStyled(
            `🌱 Plot expanded by ${rearExpansionPlots} slots for ${formatCash(
              rearExpansion1Cost
            )}!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Check plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots`,
            style
          );
        } else if (expansionType === "rear2") {
          if (userMoney < rearExpansion2Cost) {
            return output.replyStyled(
              `❌ You need ${formatCash(
                rearExpansion2Cost
              )} for the second rear expansion! Your balance: ${formatCash(
                userMoney
              )}.\n\n` +
                `**Next Steps**:\n` +
                `${UNISpectra.arrowFromT} Sell crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }sell\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          if (currentTime - lastRearExpansion2 < rearExpansion2Delay) {
            return output.replyStyled(
              `⏳ Second rear expansion on cooldown! Try again in ${
                formatTimeSentence(
                  lastRearExpansion2 + rearExpansion2Delay - currentTime
                ) || "Now?"
              }.\n\n` +
                `**Next Steps**:\n` +
                `${
                  UNISpectra.arrowFromT
                } Harvest crops: ${prefix}${commandName}${
                  isHypen ? "-" : " "
                }harvest`,
              style
            );
          }
          await money.setItem(input.senderID, {
            money: userMoney - rearExpansion2Cost,
            plotLimit: plotLimit + rearExpansionPlots,
            lastRearExpansion2: currentTime,
            gardenStats: {
              ...gardenStats,
              expansions: (gardenStats.expansions || 0) + 1,
            },
          });
          await checkAchievements(
            {
              ...ctx.user,
              gardenStats: {
                ...gardenStats,
                expansions: (gardenStats.expansions || 0) + 1,
              },
              senderID: input.senderID,
              money: userMoney - rearExpansion2Cost,
            },
            money,
            output,
            input
          );
          return output.replyStyled(
            `🌱 Plot expanded by ${rearExpansionPlots} slots for ${formatCash(
              rearExpansion2Cost
            )}!\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plant\n` +
              `${UNISpectra.arrowFromT} Check plots: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }plots`,
            style
          );
        } else {
          return output.replyStyled(
            `❌ Invalid expansion type! Use: side, rear1, or rear2.\n\n` +
              `💰 **Costs**:\n\nSide - ${formatCash(
                sideExpansionCost,
                true
              )}\nRear1 - ${formatCash(
                rearExpansion1Cost,
                true
              )}\nRear2 - ${formatCash(rearExpansion2Cost, true)}\n\n` +
              `**Next Steps**:\n` +
              `${UNISpectra.arrowFromT} Try again: ${prefix}${commandName}${
                isHypen ? "-" : " "
              }expand [side/rear1/rear2]`,
            style
          );
        }
      },
    },
    {
      key: "weather",
      description: "Check current garden  weather",
      aliases: ["-w"],
      icon: "🎈",
      async handler() {
        const weather = await getCurrentWeather();
        const upcomingEventsCount = 3;
        const upcomingEvents = [];

        for (let i = 1; i <= upcomingEventsCount; i++) {
          const nextEvent = await getNextWeather(i);
          upcomingEvents.push(`${nextEvent.icon} ${nextEvent.name}`);
        }

        const timeLeft = await getTimeForNextWeather();

        const result = [
          `🌦️ **Current Weather**: ${weather.icon} ${weather.name}`,
          `${UNIRedux.charm} Growth Speed: ${weather.growthMultiplier}x`,
        ];

        for (const effect of weather.effects ?? []) {
          if (effect.mutationChance != null) {
            result.push(
              `${UNIRedux.charm} Mutation Chance: +${(
                effect.mutationChance * 100
              ).toFixed(0)}%`
            );
          }

          if (effect.mutationType) {
            result.push(
              `${UNIRedux.charm} Mutation Type: ${effect.mutationType}`
            );
          }
        }

        result.push(
          `🕒 Next Weather in: ${formatTimeSentence(timeLeft) || "Ready!"}`
        );

        result.push(`\n🌟 **Upcoming Weather:**\n${upcomingEvents.join("\n")}`);

        result.push(
          `\n**Next Steps**:\n` +
            `${UNISpectra.arrowFromT} Buy event seeds: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }shop\n` +
            `${UNISpectra.arrowFromT} Plant seeds: ${prefix}${commandName}${
              isHypen ? "-" : " "
            }plant`
        );

        return output.replyStyled(result.join("\n"), style);
      },
    },
    {
      key: "skip",
      icon: "⏩",
      description: "Skip garden weathers, positive or negative.",
      aliases: ["-sk"],
      args: ["[number/'reset']"],
      async handler(_, { spectralArgs }) {
        if (!input.hasRole(InputRoles.MODERATORBOT)) {
          return output.reply(`🔒 Only moderators can skip events.`);
        }
        const weather = await getCurrentWeather();
        if (spectralArgs[0] === "reset") {
          await Cassidy.databases.globalDB.setItem("skipStamp", {
            skipStamp: 0,
          });
        } else {
          const skips = parseInt(spectralArgs[0]) || 1;
          await skipWeather(skips);
        }

        const newEvent = await getCurrentWeather();
        return output.reply(
          `✅ ${
            spectralArgs[0] === "reset"
              ? `Revoked skips to **original**.`
              : `Skipped **${parseInt(spectralArgs[0]) || 1}** events.`
          }\n\n🌦️ **Skipped**: ${weather.icon} ${
            weather.name
          }\n\n 🌦️ **Current Event&Weather**: ${newEvent.icon} ${newEvent.name}`
        );
      },
    },
    {
      key: "best_seeds",
      description: "View best seeds.",
      aliases: ["-bs"],
      args: ["[page]"],
      icon: "✨",
      async handler(_, { spectralArgs }) {
        if (!input.hasRole(InputRoles.MODERATORBOT)) {
          return output.reply(`🔒 | Only admins and moderators can see this.`);
        }
        const allItems = EVENT_CONFIG.allItems;

        const page = parseInt(spectralArgs[0]) || 1;

        if (isNaN(parseInt(spectralArgs[0]))) {
          const key = spectralArgs[0];
          const target = allItems.find((i) => i.key === key);
          if (target) {
            const bres = evaluateItemBalance(target);
            if (bres) {
              const sortedItems = allItems
                .toSorted(
                  (a, b) =>
                    (evaluateItemBalance(b)?.score || 0) -
                    (evaluateItemBalance(a)?.score || 0)
                )
                .filter((i) => evaluateItemBalance(i) !== null);

              const itemIndex = sortedItems.findIndex((i) => i.key === key);

              const foundPage =
                itemIndex === -1
                  ? 1
                  : Math.floor(itemIndex / ITEMS_PER_PAGE) + 1;
              const topNumber = itemIndex + 1;

              return output.replyStyled(
                `Found in **Page**: ${foundPage}\n#${topNumber}. ${
                  bres.item.icon
                } **${bres.item.name}** (${bres.item.key})\n🏅 **SCORE**: ${
                  bres.score
                }\n**Stock Chance**: ${(bres.stockChance * 100).toFixed(
                  2
                )}%\n🛒 ${formatCash(bres.price, true)}\n🪙 ${abbreviateNumber(
                  bres.item.cropData.baseValue || 0
                )} | 🧺 ${abbreviateNumber(
                  bres.item.cropData.harvests || 0
                )} | ⏳ ${
                  formatTimeSentence(bres.item.cropData.growthTime || 0) ||
                  "Instant"
                }\n\n`,
                style
              );
            }
          }
        }
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = page * ITEMS_PER_PAGE;
        const sortedItems = allItems
          .toSorted(
            (a, b) =>
              (evaluateItemBalance(b)?.score || 0) -
              (evaluateItemBalance(a)?.score || 0)
          )
          .filter((i) => evaluateItemBalance(i) !== null);
        const currentItems = sortedItems.slice(start, end);
        let result = `🛒 **Top Best Seeds**:\n\n`;

        if (currentItems.length === 0) {
          result += `No seeds in this page.\n\n`;
        }

        for (const item of currentItems) {
          const bres = evaluateItemBalance(item);

          const i = sortedItems.findIndex((i) => i.key === item.key) + 1;
          result += `${i}. ${bres.item.icon} **${bres.item.name}** (${
            bres.item.key
          })\n🏅 **SCORE**: ${bres.score}\n**Stock Chance**: ${(
            bres.stockChance * 100
          ).toFixed(2)}%\n🛒 ${formatCash(
            bres.price,
            true
          )}\n🪙 ${abbreviateNumber(
            bres.item.cropData.baseValue || 0
          )} | 🧺 ${abbreviateNumber(bres.item.cropData.harvests || 0)} | ⏳ ${
            formatTimeSentence(bres.item.cropData.growthTime || 0) || "Instant"
          }\n\n`;
        }

        result += `${
          UNIRedux.arrowFromT
        } Next page: ${prefix}${commandName} bs ${page + 1}\n${
          UNIRedux.arrowFromT
        } Total Pages: ${Math.ceil(sortedItems.length / ITEMS_PER_PAGE)}`;

        return output.replyStyled(result, style);
      },
    },
  ]);

  await home.runInContext(ctx);
}

export const style: CommandStyle = {
  title: {
    content: `${UNISpectra.charm} **G🍓rden**`,
    text_font: "fancy",
    line_bottom: "default",
  },
  contentFont: "fancy",
  footer: {
    content: "Rewards multiply with success.",
    text_font: "fancy",
  },
};

refreshShopStock(true);
