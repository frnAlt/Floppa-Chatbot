import { defineCommand } from "@cass/define";
import { SpectralCMDHome } from "@cassidy/spectral-home";

export default defineCommand({
  meta: {
    name: "mines",
    otherNames: ["mining"],
    version: "1.0.0",
    author: "Francis Loyd Raval",
    description:
      "Start a mining simulator to earn money, collect ores, or buy better pickaxes.",
    category: "Idle Investment Games",
    usage: "mines start | mines collect | mines buy <pickaxe>",
    icon: "⛏️",
    isGame: true,
  },
  style: {
    preset: ["owners.json"],
    title: {
      content_template: ["⛏️", "MINES"],
    },
  },
  async entry(ctx) {
    const home = new SpectralCMDHome(
      {
        isHypen: false,
      },
      [
        {
          key: "start",
          aliases: ["begin", "go"],
          description: "Start the mining simulator to earn money over time.",
          async handler({ output, input, money }) {
            const userData = await money.getItem(input.senderID);
            if (!userData || !userData.name) {
              return await output.reply(
                "You need to register first! Use: changeuser <username>"
              );
            }
            let message = "";
            let userPickaxe = userData.mining?.pickaxe || "wooden";
            let currentDurability =
              userData.mining?.durability || pickaxes[userPickaxe].durability;
            if (
              userData.mining &&
              userData.mining.active &&
              userData.mining.startTime
            ) {
              const timeElapsed =
                (Date.now() - userData.mining.startTime) / 1000 / 60;
              if (isNaN(timeElapsed) || timeElapsed < 0) {
                message =
                  "Mining session is invalid. Starting a new session.\n";
              } else if (timeElapsed > 0) {
                const availableOres = pickaxes[userPickaxe].ores;
                const collectedOres: Record<string, number> = {};
                let totalEarned = 0;
                const collectionEvents =
                  Math.floor(timeElapsed / (Math.random() * 29 + 1)) || 1;
                let durabilityCost = 0;
                for (let i = 0; i < collectionEvents; i++) {
                  const numOres =
                    Math.floor(Math.random() * availableOres.length) + 1;
                  const selectedOres = availableOres
                    .sort(() => Math.random() - 0.5)
                    .slice(0, numOres);
                  for (const ore of selectedOres) {
                    const quantity =
                      Math.floor(
                        Math.random() *
                          (pickaxes[userPickaxe].maxYield -
                            pickaxes[userPickaxe].minYield +
                            1)
                      ) + pickaxes[userPickaxe].minYield;
                    collectedOres[ore] = (collectedOres[ore] || 0) + quantity;
                    totalEarned += quantity * ores[ore].value;
                  }
                  durabilityCost += 1;
                }
                currentDurability -= durabilityCost;
                if (currentDurability <= 0) {
                  userPickaxe = "wooden";
                  currentDurability = pickaxes.wooden.durability;
                  message = `Your ${
                    pickaxes[userData.mining.pickaxe].name
                  } broke! Reverted to Wooden Pickaxe.\n`;
                }
                const newBalance = (userData.money || 0) + totalEarned;
                await money.setItem(input.senderID, {
                  money: newBalance,
                  mining: {
                    active: false,
                    startTime: 0,
                    earned: 0,
                    pickaxe: userPickaxe,
                    durability: currentDurability,
                    lastCollectionTime: Date.now(),
                  },
                });
                const timeDisplay =
                  timeElapsed < 1
                    ? `${Math.floor(timeElapsed * 60)} seconds`
                    : `${Math.floor(timeElapsed)} minutes`;
                message +=
                  `Mined for ${timeDisplay}:\n` +
                  Object.entries(collectedOres)
                    .map(
                      ([ore, quantity]) =>
                        `${ores[ore].name} ${
                          ores[ore].emoji
                        }: ${quantity} pieces worth $${(
                          quantity * ores[ore].value
                        ).toLocaleString("en-US")}`
                    )
                    .join("\n") +
                  `\nTotal: $${totalEarned.toLocaleString("en-US")}\n`;
              }
            }
            const startTime = Date.now();
            await money.setItem(input.senderID, {
              mining: {
                active: true,
                startTime,
                earned: 0,
                pickaxe: userPickaxe,
                durability: currentDurability,
                lastCollectionTime: userData.mining?.lastCollectionTime || 0,
              },
            });
            message += `Mining started with your ${pickaxes[userPickaxe].name} (Durability: ${currentDurability})! Use 'mines collect' to collect your earnings.`;
            await output.reply(message);
          },
        },
        {
          key: "collect",
          aliases: ["claim", "gather"],
          description: "Collect money earned from mining.",
          async handler({ output, input, money }) {
            const userData = await money.getItem(input.senderID);
            if (!userData || !userData.name) {
              return await output.reply(
                "You need to register first! Use: changeuser <username>"
              );
            }
            if (
              !userData.mining ||
              !userData.mining.active ||
              !userData.mining.startTime
            ) {
              return await output.reply(
                "You haven't started mining! Use 'mines start' to begin."
              );
            }
            const timeElapsed =
              (Date.now() - userData.mining.startTime) / 1000 / 60;
            if (isNaN(timeElapsed) || timeElapsed < 0) {
              await money.setItem(input.senderID, {
                mining: {
                  active: false,
                  startTime: 0,
                  earned: 0,
                  pickaxe: userData.mining?.pickaxe || "wooden",
                  durability:
                    userData.mining?.durability ||
                    pickaxes[userData.mining?.pickaxe || "wooden"].durability,
                  lastCollectionTime: userData.mining?.lastCollectionTime || 0,
                },
              });
              return await output.reply(
                "Mining session is invalid. Please start a new session with 'mines start'."
              );
            }
            const lastCollectionTime = userData.mining.lastCollectionTime || 0;
            if (Date.now() - lastCollectionTime < 60000) {
              return await output.reply(
                "No ore's collected on it. Comeback after an minute or an hour for the collection."
              );
            }
            if (timeElapsed <= 0) {
              return await output.reply(
                "No ore's collected on it. Comeback after an minute or an hour for the collection."
              );
            }
            let userPickaxe = userData.mining.pickaxe || "wooden";
            let currentDurability =
              userData.mining.durability || pickaxes[userPickaxe].durability;
            const availableOres = pickaxes[userPickaxe].ores;
            const collectedOres: Record<string, number> = {};
            let totalEarned = 0;
            const collectionEvents =
              Math.floor(timeElapsed / (Math.random() * 29 + 1)) || 1;
            let durabilityCost = 0;
            for (let i = 0; i < collectionEvents; i++) {
              const numOres =
                Math.floor(Math.random() * availableOres.length) + 1;
              const selectedOres = availableOres
                .sort(() => Math.random() - 0.5)
                .slice(0, numOres);
              for (const ore of selectedOres) {
                const quantity =
                  Math.floor(
                    Math.random() *
                      (pickaxes[userPickaxe].maxYield -
                        pickaxes[userPickaxe].minYield +
                        1)
                  ) + pickaxes[userPickaxe].minYield;
                collectedOres[ore] = (collectedOres[ore] || 0) + quantity;
                totalEarned += quantity * ores[ore].value;
              }
              durabilityCost += 1;
            }
            currentDurability -= durabilityCost;
            let breakMessage = "";
            if (currentDurability <= 0) {
              userPickaxe = "wooden";
              currentDurability = pickaxes.wooden.durability;
              breakMessage = `Your ${
                pickaxes[userData.mining.pickaxe].name
              } broke! Reverted to Wooden Pickaxe.\n`;
            }
            const newBalance = (userData.money || 0) + totalEarned;
            const newStartTime = Date.now();
            await money.setItem(input.senderID, {
              money: newBalance,
              mining: {
                active: true,
                startTime: newStartTime,
                earned: 0,
                pickaxe: userPickaxe,
                durability: currentDurability,
                lastCollectionTime: newStartTime,
              },
            });
            const timeDisplay =
              timeElapsed < 1
                ? `${Math.floor(timeElapsed * 60)} seconds`
                : `${Math.floor(timeElapsed)} minutes`;
            const replyMessage =
              breakMessage +
              `Mined for ${timeDisplay}:\n` +
              Object.entries(collectedOres)
                .map(
                  ([ore, quantity]) =>
                    `${ores[ore].name} ${
                      ores[ore].emoji
                    }: ${quantity} pieces worth $${(
                      quantity * ores[ore].value
                    ).toLocaleString("en-US")}`
                )
                .join("\n") +
              `\nTotal: $${totalEarned.toLocaleString(
                "en-US"
              )}\nYour new balance is $${newBalance.toLocaleString("en-US")}.`;
            await output.reply(replyMessage);
          },
        },
        {
          key: "buy",
          aliases: ["purchase", "shop"],
          description: "Buy a better pickaxe to mine higher-value ores.",
          args: ["<stone | iron | diamond | netherite>"],
          async handler({ output, input, money }, { spectralArgs }) {
            const userData = await money.getItem(input.senderID);
            if (!userData || !userData.name) {
              return await output.reply(
                "You need to register first! Use: changeuser <username>"
              );
            }
            let pickaxeType = spectralArgs[0]?.toLowerCase().trim() || "";
            if (pickaxeType === "buy" && spectralArgs.length > 1) {
              pickaxeType = spectralArgs[1].toLowerCase().trim();
            }
            if (!pickaxeType || pickaxeType === "wooden") {
              const purchasablePickaxes = Object.values(pickaxes).filter(
                (p) => p.cost > 0
              );
              return await output.reply(
                `No pickaxe specified. Usage: mines buy <stone | iron | diamond | netherite>\n` +
                  `The Wooden Pickaxe is provided for free and does not need to be purchased.\n` +
                  `Available pickaxes for purchase:\n\n` +
                  purchasablePickaxes
                    .map(
                      (p) =>
                        `${p.name}\n` +
                        `Description: ${p.description}\n` +
                        `Durability: ${p.durability}\n` +
                        `Cost: $${p.cost.toLocaleString("en-US")}\n` +
                        `Ores: ${p.ores
                          .map((o) => `${ores[o].name} ${ores[o].emoji}`)
                          .join(", ")}`
                    )
                    .join("\n\n")
              );
            }
            if (!pickaxes[pickaxeType]) {
              return await output.reply(
                `Invalid pickaxe: ${
                  spectralArgs[0] || pickaxeType
                }. Use: mines buy <stone | iron | diamond | netherite>`
              );
            }
            const currentPickaxe = userData.mining?.pickaxe || "wooden";
            const currentDurability =
              userData.mining?.durability ||
              pickaxes[currentPickaxe].durability;
            if (
              pickaxes[pickaxeType].tier < pickaxes[currentPickaxe].tier &&
              currentDurability > 0
            ) {
              return await output.reply(
                `You cannot buy a lower-quality pickaxe while your ${pickaxes[currentPickaxe].name} has durability remaining (${currentDurability}).`
              );
            }
            if (currentPickaxe === pickaxeType) {
              return await output.reply(
                `You already own a ${pickaxes[pickaxeType].name}!`
              );
            }
            const cost = pickaxes[pickaxeType].cost;
            const currentBalance = userData.money || 0;
            if (currentBalance < cost) {
              return await output.reply(
                `You need $${cost.toLocaleString("en-US")} to buy a ${
                  pickaxes[pickaxeType].name
                }, but you only have $${currentBalance.toLocaleString(
                  "en-US"
                )}!`
              );
            }
            await money.setItem(input.senderID, {
              money: currentBalance - cost,
              mining: {
                active: userData.mining?.active || false,
                startTime: userData.mining?.startTime || 0,
                earned: userData.mining?.earned || 0,
                pickaxe: pickaxeType,
                durability: pickaxes[pickaxeType].durability,
                lastCollectionTime: userData.mining?.lastCollectionTime || 0,
              },
            });
            await output.reply(
              `Successfully purchased a ${
                pickaxes[pickaxeType].name
              } for $${cost.toLocaleString(
                "en-US"
              )}! You can now mine: ${pickaxes[pickaxeType].ores
                .map((o) => `${ores[o].name} ${ores[o].emoji}`)
                .join(", ")}. Durability: ${pickaxes[pickaxeType].durability}.`
            );
          },
        },
      ]
    );
    return home.runInContext(ctx);
  },
});

export const ores = {
  stone: { name: "Stone", value: 2, emoji: "🪨" },
  coal: { name: "Coal", value: 5, emoji: "⛏️" },
  clay: { name: "Clay", value: 3, emoji: "🏺" },
  copper: { name: "Copper", value: 100, emoji: "🟠" },
  iron: { name: "Iron", value: 50, emoji: "🔩" },
  gold: { name: "Gold", value: 1000, emoji: "🪙" },
  emerald: { name: "Emerald", value: 2500, emoji: "💚" },
  diamond: { name: "Diamond", value: 5000, emoji: "💎" },
};

export const pickaxes = {
  wooden: {
    name: "Wooden Pickaxe",
    description: "A basic pickaxe for mining common ores.",
    cost: 0,
    ores: ["stone", "coal", "clay"],
    durability: 59,
    minYield: 50,
    maxYield: 150,
    tier: 1,
  },
  stone: {
    name: "Stone Pickaxe",
    description: "A sturdy pickaxe for mining basic and copper ores.",
    cost: 1000,
    ores: ["stone", "coal", "clay", "copper"],
    durability: 131,
    minYield: 100,
    maxYield: 200,
    tier: 2,
  },
  iron: {
    name: "Iron Pickaxe",
    description: "A strong pickaxe for mining iron and other ores.",
    cost: 5000,
    ores: ["stone", "coal", "clay", "copper", "iron"],
    durability: 250,
    minYield: 150,
    maxYield: 300,
    tier: 3,
  },
  diamond: {
    name: "Diamond Pickaxe",
    description: "A premium pickaxe for mining valuable gems.",
    cost: 25000,
    ores: ["stone", "coal", "clay", "copper", "iron", "gold", "emerald"],
    durability: 1561,
    minYield: 200,
    maxYield: 400,
    tier: 4,
  },
  netherite: {
    name: "Netherite Pickaxe",
    description:
      "The ultimate pickaxe for mining all ores, including diamonds.",
    cost: 100000,
    ores: [
      "stone",
      "coal",
      "clay",
      "copper",
      "iron",
      "gold",
      "emerald",
      "diamond",
    ],
    durability: 2031,
    minYield: 300,
    maxYield: 600,
    tier: 5,
  },
};
