"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopItems = exports.style = exports.meta = void 0;
exports.predictProduction = predictProduction;
exports.entry = entry;
const cassEXP_js_1 = require("../modules/cassEXP.js");
const unisym_js_1 = require("../modules/unisym.js");
const spectral_home_1 = require("@cassidy/spectral-home");
const ArielUtils_1 = require("@cass-modules/ArielUtils");
exports.meta = {
    name: "skyrise",
    description: "Build and manage your floating island empire!",
    otherNames: ["srs", "sky", "skyr"],
    version: "1.0.2",
    usage: "{prefix}{name} <command> [args]",
    category: "Idle Investment Games",
    author: "frnAlt",
    permissions: [0],
    noPrefix: false,
    waitingTime: 1,
    requirement: "3.0.0",
    icon: "🏰",
    cmdType: "cplx_g",
    isGame: true,
};
const { invLimit } = global.Cassidy;
exports.style = {
    title: "SkyRise Empire 🏰",
    titleFont: "bold",
    contentFont: "fancy",
    footer: {
        content: "Made with 🤍 by Liane Cagara",
        text_font: "fancy",
    },
};
exports.shopItems = [
    {
        icon: "🌬️",
        name: "Aether Collector",
        flavorText: "Harvests mystical **Aether** from the skies.",
        key: "aetherCollector",
        price: { aether: 5000, crystal: 2500, stone: 1000, money: 1000 },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Aether Collector",
                buildingName: "",
                key: "aetherCollector",
                flavorText: "Produces **Aether** over time.",
                icon: "🌬️",
                type: "srbuilding",
                sellPrice: 25,
                production: { resource: ["aether"], amount: 10, interval: 60 * 1000 },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "💎",
        name: "Crystal Mine",
        flavorText: "Mines sparkling **Crystals** from the island core.",
        key: "crystalMine",
        price: { aether: 75000, crystal: 50000, stone: 50000, money: 25000 },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Crystal Mine",
                buildingName: "",
                key: "crystalMine",
                flavorText: "Produces **Crystals** over time.",
                icon: "💎",
                type: "srbuilding",
                sellPrice: 25,
                production: { resource: ["crystal"], amount: 10, interval: 60 * 1000 },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "🪨",
        name: "Stone Quarry",
        flavorText: "Extracts sturdy **Stone** from the island.",
        key: "stoneQuarry",
        price: { aether: 75000, crystal: 75000, stone: 50000, money: 50000 },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Stone Quarry",
                buildingName: "",
                key: "stoneQuarry",
                flavorText: "Produces **Stone** over time.",
                icon: "🪨",
                type: "srbuilding",
                sellPrice: 25,
                production: { resource: ["stone"], amount: 100, interval: 60 * 1000 },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "⚒️",
        name: "Sky Forge",
        flavorText: "Crafts powerful upgrades for your empire.",
        key: "skyForge",
        price: {
            aether: 1250000,
            crystal: 1250000,
            stone: 1250000,
            money: 1250000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Sky Forge",
                buildingName: "",
                key: "skyForge",
                flavorText: "Boosts production of **all resources** when upgraded.",
                icon: "⚒️",
                type: "srbuilding",
                sellPrice: 50,
                production: { resource: ["all"], amount: 500, interval: 120 * 1000 },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "🛠️",
        name: "Worker",
        type: "srworker",
        flavorText: "Increases building efficiency.",
        key: "srworker",
        price: { aether: 250000, crystal: 250000, stone: 250000, money: 2500000 },
        onPurchase({ moneySet }) {
            moneySet.srworkers = (moneySet.srworkers || 0) + 1;
        },
    },
    {
        icon: "⚡",
        name: "Aetheric Accelerator",
        flavorText: "Supercharges **Aether** production at lightning speed.",
        key: "aethericAccelerator",
        price: {
            aether: 50000000,
            crystal: 25000000,
            stone: 25000000,
            money: 5000000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Aetheric Accelerator",
                buildingName: "",
                key: "aethericAccelerator",
                flavorText: "Boosts production of **Aether** when upgraded.",
                icon: "⚡",
                type: "srbuilding",
                sellPrice: 200,
                production: { resource: ["aether"], amount: 8000, interval: 25 * 1000 },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "🔥",
        name: "Dual-Forge Dynamo",
        flavorText: "A hybrid forge that crafts **Aether** and **Crystals** with enhanced efficiency.",
        key: "dualForgeDynamo",
        price: {
            aether: 37500000,
            crystal: 37500000,
            stone: 37500000,
            money: 3750000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Dual-Forge Dynamo",
                buildingName: "",
                key: "dualForgeDynamo",
                flavorText: "Boosts production of **Aether** and **Crystals** when upgraded.",
                icon: "🔥🔥",
                type: "srbuilding",
                sellPrice: 150,
                production: {
                    resource: ["aether", "crystal"],
                    amount: 1000,
                    interval: 40 * 1000,
                },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "🌪️",
        name: "Elemental Fusion Forge",
        flavorText: "Merges the elements to produce **Aether** and **Stone** at an accelerated rate.",
        key: "elementalFusionForge",
        price: {
            aether: 37500000,
            crystal: 18750000,
            stone: 37500000,
            money: 3750000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Elemental Fusion Forge",
                buildingName: "",
                key: "elementalFusionForge",
                flavorText: "Boosts production of **Aether** and **Stone** when upgraded.",
                icon: "🌪️🔥",
                type: "srbuilding",
                sellPrice: 150,
                production: {
                    resource: ["aether", "stone"],
                    amount: 1000,
                    interval: 40 * 1000,
                },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "💨",
        name: "Crystal Catalyst",
        flavorText: "Doubles the speed of **Crystal** production.",
        key: "crystalCatalyst",
        price: {
            aether: 40000000,
            crystal: 40000000,
            stone: 20000000,
            money: 4000000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Crystal Catalyst",
                buildingName: "",
                key: "crystalCatalyst",
                flavorText: "Doubles the speed of **Crystal** production when upgraded.",
                icon: "💨",
                type: "srbuilding",
                sellPrice: 160,
                production: {
                    resource: ["crystal"],
                    amount: 8000,
                    interval: 25 * 1000,
                },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
    {
        icon: "🌋",
        name: "Volcanic Vault",
        flavorText: "A hybrid forge producing **Stone** and **Crystals** with volcanic efficiency.",
        key: "volcanicVault",
        price: {
            aether: 35000000,
            crystal: 35000000,
            stone: 35000000,
            money: 3500000,
        },
        onPurchase({ moneySet, xPurchasedBy }) {
            moneySet.inventory.push({
                name: "Volcanic Vault",
                buildingName: "",
                key: "volcanicVault",
                flavorText: "Boosts production of **Stone** and **Crystals** when upgraded.",
                icon: "🌋",
                type: "srbuilding",
                sellPrice: 140,
                production: {
                    resource: ["stone", "crystal"],
                    amount: 1000,
                    interval: 40 * 1000,
                },
                level: 1,
                lastCollect: Date.now(),
                workers: 0,
                xPurchasedBy,
            });
        },
    },
];
function generateUniqueBuildingNames(existingBuildings) {
    const cleanBaseName = (existingBuildings[0]?.buildingName || "Building").replace(/\s+/g, "");
    let candidateName = cleanBaseName;
    for (let i = 0; i < existingBuildings.length; i++) {
        if (existingBuildings[i].buildingName?.toLowerCase() ===
            candidateName.toLowerCase()) {
            candidateName = `${cleanBaseName}${i + 1}`;
        }
    }
    return candidateName;
}
function updateBuildingData(building, existingBuildings) {
    const defaults = {
        level: 1,
        lastCollect: Date.now(),
        production: building.production || {
            resource: ["none"],
            amount: 0,
            interval: 0,
        },
        workers: 0,
        key: building.key || `building:unknown_${Date.now()}`,
        name: building.name || "Unnamed",
        buildingName: building.buildingName || generateUniqueBuildingNames(existingBuildings),
        icon: building.icon || "🏠",
        type: building.type || "srbuilding",
        sellPrice: building.sellPrice || 0,
    };
    const updatedBuilding = { ...defaults, ...building };
    if (!Array.isArray(updatedBuilding.production.resource)) {
        updatedBuilding.production.resource = [updatedBuilding.production.resource];
    }
    updatedBuilding.level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(updatedBuilding.level)));
    return updatedBuilding;
}
function calculateProduction(building, _srworkers) {
    const updatedBuilding = updateBuildingData(building, []);
    const timeSinceCollectX = Date.now() - updatedBuilding.lastCollect;
    const baseCapMinutes = 3 * 60;
    const levelCapMinutes = baseCapMinutes * Math.pow(2, updatedBuilding.level - 1);
    const capMilliseconds = levelCapMinutes * 60 * 1000;
    const timeSinceCollect = Math.min(timeSinceCollectX, capMilliseconds);
    const randomizedInterval = updatedBuilding.production.interval * (1 + (Math.random() - 0.5));
    const intervals = Math.floor(timeSinceCollect / randomizedInterval);
    const workerBoost = 1 + (updatedBuilding.workers || 0) * 0.2;
    const levelPow = Math.pow(2, updatedBuilding.level ?? 0);
    const baseAmountX = updatedBuilding.production.amount * levelPow * intervals * workerBoost;
    const baseAmount = baseAmountX + (Math.random() - 0.5) * baseAmountX;
    const srWorkerMultiplier = Math.pow(2, Math.min(5, _srworkers ?? 0));
    return Math.floor(baseAmount * srWorkerMultiplier);
}
function predictProduction(shopItem, buildingItem, totalWorkers) {
    if (!shopItem || !shopItem.key) {
        throw new Error(`Invalid shop item: ${JSON.stringify(shopItem)}`);
    }
    if (!buildingItem || !buildingItem.production) {
        throw new Error(`Invalid building item: ${JSON.stringify(buildingItem)}`);
    }
    const buildingKey = buildingItem.key.split(":")[1]?.split("_")[0] || buildingItem.key;
    if (shopItem.key !== buildingKey && shopItem.key !== buildingItem.key) {
        throw new Error(`Shop item key "${shopItem.key}" does not match building item key "${buildingItem.key}"`);
    }
    const production = {
        ...buildingItem.production,
    };
    if (production.resource.includes("none") ||
        production.amount <= 0 ||
        production.interval <= 0) {
        throw new Error(`Invalid production data: ${JSON.stringify(production)}`);
    }
    const baseCapMinutes = 5;
    const levelCapMinutes = baseCapMinutes * Math.pow(2, buildingItem.level - 1);
    const capMilliseconds = levelCapMinutes * 60 * 1000;
    const intervals = Math.floor(capMilliseconds / production.interval);
    const workerBoost = 1 + (buildingItem.workers || 0) * 0.2;
    const baseAmountX = production.amount * buildingItem.level * intervals * workerBoost;
    const minBaseAmount = baseAmountX * 0.5;
    const maxBaseAmount = baseAmountX * 1.5;
    const srWorkerMultiplier = Math.pow(2, Math.min(5, totalWorkers));
    const minAmount = Math.floor(minBaseAmount * srWorkerMultiplier);
    const maxAmount = Math.floor(maxBaseAmount * srWorkerMultiplier);
    return {
        resource: !Array.isArray(production.resource)
            ? [production.resource]
            : production.resource,
        minAmount,
        maxAmount,
    };
}
function calculateUpgradeCost(building) {
    const level = building.level || 1;
    return {
        aether: Math.round(Math.pow(2, level - 1) * 1000),
        crystal: Math.round(Math.pow(2.1, level - 1) * 1000),
        stone: Math.round(Math.pow(2.2, level - 1) * 1000),
        money: Math.round(Math.pow(2.3, level - 1) * 1000),
    };
}
function hasEnoughResources(playerResources, cost) {
    return (playerResources.aether >= (cost.aether || 0) &&
        playerResources.crystal >= (cost.crystal || 0) &&
        playerResources.stone >= (cost.stone || 0) &&
        playerResources.money >= (cost.money || 0));
}
function suggestNextAction(buildingsData, resources, srworkers, prefix) {
    const buildings = buildingsData.getAll();
    const hasResources = resources.aether >= 50 || resources.crystal >= 50 || resources.stone >= 50;
    const canUpgrade = buildings.some((b) => {
        const cost = calculateUpgradeCost(b);
        return hasEnoughResources(resources, cost);
    });
    const canBuyWorker = hasEnoughResources(resources, {
        aether: 200,
        crystal: 200,
        stone: 200,
        money: 0,
    });
    const totalAssignedWorkers = buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
    if (buildings.length === 0) {
        return `***Start building*** your empire! Use ${prefix}skyrise shop to buy an **Aether Collector**.`;
    }
    if (buildings.some((b) => calculateProduction(b, srworkers) > 0)) {
        return `***Collect resources*** now! Use ${prefix}skyrise collect to gather **Aether**, **Crystal**, and **Stone**.`;
    }
    if (canUpgrade) {
        return `***Upgrade a building*** to boost production! Use ${prefix}skyrise upgrade <building_name> (check ${prefix}skyrise status).`;
    }
    if (canBuyWorker && totalAssignedWorkers < srworkers) {
        return `***Assign workers*** to improve efficiency! Use ${prefix}skyrise worker <building_name> assign 1 or buy more with ${prefix}skyrise shop.`;
    }
    if (hasResources && buildings.length < invLimit) {
        return `***Expand your empire***! Use ${prefix}skyrise shop to build more structures like a **Crystal Mine**.`;
    }
    return `***Defend your empire***! Use ${prefix}skyrise defend to protect against **Sky Pirates**.`;
}
const achievements = {
    "First Collector": {
        condition: (buildings) => buildings.some((b) => b.key === "aetherCollector"),
        reward: { aether: 100 },
    },
    "Mining Magnate": {
        condition: (buildings) => buildings.filter((b) => b.key === "crystalMine").length >= 3,
        reward: { crystal: 200 },
    },
    "Stone Lord": {
        condition: (buildings) => buildings.filter((b) => b.key === "stoneQuarry").length >= 3,
        reward: { stone: 200 },
    },
    "Forge Master": {
        condition: (buildings) => buildings.some((b) => b.key === "skyForge" && b.level >= 2),
        reward: { aether: 150, crystal: 150, stone: 150 },
    },
};
function calculatePlayerRankings(allPlayers, shopItems) {
    return Object.values(allPlayers)
        .filter((player) => player.srbuildings?.length > 0)
        .map((player) => {
        const buildings = (player.srbuildings || []).map((b) => updateBuildingData(b, player.srbuildings || []));
        const buildingCount = buildings.length;
        const totalLevel = buildings.reduce((sum, b) => sum + (b.level || 1), 0);
        const averageLevel = buildingCount > 0 ? totalLevel / buildingCount : 0;
        const totalWorkers = buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
        const totalAether = player.aether || 0;
        const totalCrystal = player.crystal || 0;
        const totalStone = player.stone || 0;
        let bestBuilding = null;
        let bestBuildingScore = 0;
        const productionScore = buildings.reduce((sum, b) => {
            const shopItem = shopItems.find((i) => i.key === b.key.split(":")[1]?.split("_")[0]);
            if (!shopItem)
                return sum;
            const prod = predictProduction(shopItem, b, player.srworkers || 0);
            const prodPerMin = prod.maxAmount / (b.production.interval / 60000);
            const buildingScore = (b.level || 1) * 1000 + (b.workers || 0) * 500 + prodPerMin * 10000;
            if (buildingScore > bestBuildingScore) {
                bestBuildingScore = buildingScore;
                bestBuilding = b;
            }
            return sum + prodPerMin;
        }, 0);
        const score = totalLevel * 1000 +
            totalWorkers * 500 +
            (totalAether + totalCrystal + totalStone) * 10 +
            productionScore * 10000;
        return {
            name: player.name || "Unknown",
            score,
            averageLevel,
            totalWorkers,
            totalResources: totalAether + totalCrystal + totalStone,
            productionScore,
            buildingCount,
            bestBuilding,
            resources: {
                aether: totalAether,
                stone: totalStone,
                crystal: totalCrystal,
            },
        };
    })
        .sort((a, b) => b.score - a.score);
}
const MAX_LEVEL = 10;
async function entry(ctx) {
    const { input, output, money, Inventory, prefix } = ctx;
    let { name = "Unregistered", srbuildings: rawBuildingsData = [], inventory: rawInventory = [], aether = 0, crystal = 0, stone = 0, srworkers = 0, cassEXP: cxp, money: userMoney, tutorialStep = 0, isUptSkyRise = false, isSkyRiseV2 = false, getFreeSrBuilding = false, } = await money.getCache(input.senderID);
    const r = rawBuildingsData;
    rawBuildingsData = r.map((i) => updateBuildingData(i, r));
    if (!isUptSkyRise) {
        const buildingsData = new Inventory(rawBuildingsData);
        const upt = buildingsData
            .getAll()
            .map((i) => updateBuildingData(i, buildingsData.getAll()));
        await money.setItem(input.sid, {
            isUptSkyRise: true,
            srbuildings: upt,
        });
    }
    if (!isSkyRiseV2) {
        await money.setItem(input.sid, {
            srbuildings: [],
            stone: 0,
            aether: 0,
            crystal: 0,
            srworkers: 0,
            tutorialStep: 0,
            isSkyRiseV2: true,
        });
    }
    const home = new spectral_home_1.SpectralCMDHome({
        isHypen: false,
        defaultKey: "lobby",
    }, [
        {
            key: "status",
            description: "View your empire's **status** and **resources**",
            aliases: ["-s"],
            args: ["[page]"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const buildings = buildingsData.getAll();
                const pageSize = 5;
                const totalPages = Math.ceil(Math.min(36, buildings.length) / pageSize);
                let page = parseInt(spectralArgs[0]) || 1;
                page = Math.max(1, Math.min(page, totalPages || 1));
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Empire Status***\n\n`;
                result += `**Resources**:\n`;
                result += `🌬️ **Aether**: ${aether}\n`;
                result += `💎 **Crystal**: ${crystal}\n`;
                result += `🪨 **Stone**: ${stone}\n`;
                result += `👷 **Workers**: ${srworkers}/10\n`;
                result += `💰 **Money**: ${(0, ArielUtils_1.formatCash)(userMoney)}\n\n`;
                result += `${unisym_js_1.UNIRedux.arrow} ***Buildings (Page ${page}/${totalPages})***\n\n`;
                if (buildings.length === 0) {
                    result += `❌ No **buildings** yet! Visit the **Sky Market** with ${prefix}skyrise shop.\n`;
                }
                else {
                    const startIdx = (page - 1) * pageSize;
                    const endIdx = Math.min(startIdx + pageSize, Math.min(36, buildings.length));
                    const pageBuildings = buildings.slice(startIdx, endIdx);
                    for (const building of pageBuildings) {
                        const updatedBuilding = updateBuildingData(building, buildings);
                        const production = predictProduction(exports.shopItems.find((i) => i.name === updatedBuilding.name), updatedBuilding, srworkers);
                        result += `${updatedBuilding.icon} **${updatedBuilding.name}** (Level ${updatedBuilding.level}/${MAX_LEVEL})\n`;
                        result += `🏛️ Name: ${updatedBuilding.buildingName}\n`;
                        result += `👷 Workers: ${updatedBuilding.workers || 0}\n`;
                        result += `📈 Min Production: ${production.minAmount} **${production.resource}**\n`;
                        result += `📈 Max Production: ${production.maxAmount} **${production.resource}**\n`;
                        result += `🆔 ID: ${updatedBuilding.key}\n\n`;
                    }
                    if (totalPages > 1) {
                        result += `📄 **Navigation**: Use ${prefix}skyrise status <page>\n`;
                        if (page < totalPages) {
                            result += `➡️ Next page: ${prefix}skyrise status ${page + 1}\n`;
                        }
                        if (page > 1) {
                            result += `⬅️ Previous page: ${prefix}skyrise status ${page - 1}\n`;
                        }
                    }
                }
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Check ${prefix}skyrise guide for all commands!`;
                return output.reply(result);
            },
        },
        {
            key: "build",
            description: "Construct a new **building** for your empire",
            aliases: ["-b"],
            args: ["<building_key>", "<building_name>"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const inventory = new Inventory(rawInventory);
                const [buildingKey, buildingName] = spectralArgs;
                if (!buildingKey || !buildingName) {
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Build Guide***\n\n`;
                    result += `❌ Missing **building key** or **name**! To ***build***, visit the **Sky Market** and provide a unique name.\n\n`;
                    result += `**Usage**: ${prefix}skyrise build <building_key> <building_name>\n`;
                    result += `**Example**: ${prefix}skyrise build aetherCollector SkyAether1 to build an **Aether Collector** named SkyAether1.\n\n`;
                    result += `📝 **Next Step**: Use ${prefix}skyrise shop to browse available **buildings**!\n`;
                    result += `🔔 **Reminder**: Check your **resources** with ${prefix}skyrise status.`;
                    return output.reply(result);
                }
                if (!/^[a-zA-Z0-9]+$/.test(buildingName)) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Invalid **building name**! Use only alphanumeric characters, no spaces.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Check ${prefix}skyrise status for valid names.`);
                }
                const existingNames = buildingsData.getAll()
                    .map((b) => b.buildingName?.toLowerCase())
                    .filter((n) => !!n);
                if (existingNames.includes(buildingName.toLowerCase())) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ **Building name** "${buildingName}" already exists! Choose a unique name.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Check ${prefix}skyrise status for existing names.`);
                }
                let newBuilding2 = inventory
                    .getAll()
                    .find((i) => i.key === buildingKey &&
                    typeof i.xPurchasedBy === "string" &&
                    i.xPurchasedBy !== input.senderID) || inventory.getAll().find((i) => i.key === buildingKey);
                let newBuilding = newBuilding2;
                if (!newBuilding) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Invalid **building key**! Use ${prefix}skyrise shop to see options.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                if (typeof newBuilding.xPurchasedBy === "string" &&
                    newBuilding.xPurchasedBy !== input.senderID) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ This item was purchased by **someone else**! Use ${prefix}skyrise shop to see options and buy your own.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                if (buildingsData.getAll().length >= invLimit) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ **Island full**! Max ${invLimit} **buildings**.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: ***Upgrade*** existing buildings with ${prefix}skyrise upgrade <building_name>.`);
                }
                inventory.deleteOne(buildingKey);
                buildingsData.addOne({
                    ...newBuilding,
                    key: `building:${buildingKey}_${Date.now()}`,
                    level: 1,
                    lastCollect: Date.now(),
                    workers: 0,
                    buildingName,
                });
                await money.setItem(input.senderID, {
                    srbuildings: Array.from(buildingsData),
                    inventory: Array.from(inventory),
                });
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***New Building***\n\n`;
                result += `✅ Built ${newBuilding.icon} **${newBuilding.name}** named **${buildingName}**!\n`;
                result += `📈 Produces ${newBuilding.production.amount} **${newBuilding.production.resource}**/min.\n`;
                result += `📜 Your empire grows stronger with this **building**! It will generate **resources** over time.\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Collect **resources** regularly with ${prefix}skyrise collect.`;
                return output.reply(result);
            },
        },
        {
            key: "collect",
            description: "Collect **resources** from your buildings",
            aliases: ["-c"],
            async handler() {
                const buildingsData = new Inventory(rawBuildingsData);
                const cassEXP = new cassEXP_js_1.CassEXP(cxp);
                let totalAether = aether;
                let totalCrystal = crystal;
                let totalStone = stone;
                let totalMoney = userMoney;
                let collected = false;
                const earns = [];
                for (const building of buildingsData.getAll()) {
                    const updatedBuilding = updateBuildingData(building, buildingsData.getAll());
                    const production = calculateProduction(updatedBuilding, srworkers);
                    if (production > 0) {
                        collected = true;
                        for (const resource of updatedBuilding.production.resource) {
                            if (resource === "aether") {
                                totalAether += production;
                                totalMoney += production * 100;
                                earns.push([
                                    updatedBuilding,
                                    {
                                        aether: production,
                                        money: production * 100,
                                    },
                                ]);
                            }
                            else if (resource === "crystal") {
                                totalCrystal += production;
                                totalMoney += production * 100;
                                earns.push([
                                    updatedBuilding,
                                    {
                                        crystal: production,
                                        money: production * 100,
                                    },
                                ]);
                            }
                            else if (resource === "stone") {
                                totalStone += production;
                                totalMoney += production * 100;
                                earns.push([
                                    updatedBuilding,
                                    {
                                        stone: production,
                                        money: production * 100,
                                    },
                                ]);
                            }
                            else if (resource === "all") {
                                totalAether += production;
                                totalCrystal += production;
                                totalStone += production;
                                totalMoney += production * 3 * 100;
                                earns.push([
                                    updatedBuilding,
                                    {
                                        aether: production,
                                        crystal: production,
                                        stone: production,
                                        money: production * 3 * 100,
                                    },
                                ]);
                            }
                        }
                        updatedBuilding.lastCollect = Date.now();
                        buildingsData.deleteOne(updatedBuilding.key);
                        buildingsData.addOne(updatedBuilding);
                    }
                }
                if (!collected) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ No **resources** to ***collect*** yet! Wait for your **buildings** to produce.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Check your **status** with ${prefix}skyrise status.`);
                }
                const earnsBest = [...earns].sort((a, b) => Object.values(b[1]).reduce((acc, i) => acc + i, 0) -
                    Object.values(a[1]).reduce((acc, i) => acc + i, 0));
                let xf = (a, icon) => a ? `${icon} **x${(0, ArielUtils_1.abbreviateNumber)(a, 2, false)}**, ` : "";
                let earnsSliced = earnsBest.slice(0, 10);
                let earnsStr = earnsSliced
                    .map((i) => `${unisym_js_1.UNIRedux.arrowFromT} ${i[0].icon} LV${i[0].level}/${MAX_LEVEL} **${i[0].buildingName}**: collected ${xf(i[1].aether, "🌬️")}${xf(i[1].crystal, "💎")}${xf(i[1].stone, "🪨")}${xf(i[1].money, "💵")}`)
                    .join("\n");
                if (earnsBest.length - earnsSliced.length) {
                    earnsStr += `\n[...And ${earnsBest.length - earnsSliced.length} others.]`;
                }
                cassEXP.expControls.raise(10);
                await money.setItem(input.senderID, {
                    aether: totalAether,
                    crystal: totalCrystal,
                    stone: totalStone,
                    money: totalMoney,
                    srbuildings: Array.from(buildingsData),
                    cassEXP: cassEXP.raw(),
                });
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Resources Collected***\n\n`;
                result += `✅ Gathered **resources** from your **buildings**!\n`;
                result += `\n${earnsStr}\n\n`;
                result += `📝 ***SUMMARY***\n\n`;
                result += `🌬️ **Aether**: ${totalAether} (+${totalAether - aether})\n`;
                result += `💎 **Crystal**: ${totalCrystal} (+${totalCrystal - crystal})\n`;
                result += `🪨 **Stone**: ${totalStone} (+${totalStone - stone})\n`;
                result += `🌟 **EXP**: +10\n`;
                result += `💰 **Money**: ${(0, ArielUtils_1.formatCash)(totalMoney)} (${(0, ArielUtils_1.formatCash)(totalMoney - userMoney)})\n`;
                result += `📜 Collecting keeps your empire thriving! Use **resources** to ***build*** or ***upgrade***.\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Protect your **resources** with ${prefix}skyrise defend.`;
                return output.reply(result);
            },
        },
        {
            key: "upgrade",
            description: "Upgrade a **building** to boost production",
            aliases: ["-u"],
            args: ["<building_name>"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const buildingName = spectralArgs.join(" ");
                if (!buildingName) {
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Upgrade Guide***\n\n`;
                    result += `❌ No **building name** provided! To ***upgrade***, specify a building from your empire.\n\n`;
                    result += `**Usage**: ${prefix}skyrise upgrade <building_name>\n`;
                    result += `**Example**: ${prefix}skyrise upgrade SkyAether1 to upgrade a building named **SkyAether1**.\n\n`;
                    result += `**Your Buildings**:\n`;
                    const buildings = buildingsData.getAll();
                    if (buildings.length === 0) {
                        result += `❌ No **buildings** yet! Visit the **Sky Market** with ${prefix}skyrise shop.\n`;
                    }
                    else {
                        buildings
                            .filter((i) => (i.level ?? 1) < 10)
                            .forEach((b) => {
                            const cost = calculateUpgradeCost(b);
                            result += `${b.icon} **${b.name}** (Level ${b.level}/${MAX_LEVEL})\n`;
                            result += `🏛️ Name: ${b.buildingName}\n`;
                            result += `💰 Cost: ${cost.aether} **Aether**, ${cost.crystal} **Crystal**, ${cost.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(cost.money)}\n\n`;
                        });
                    }
                    result += `📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Check your **buildings** with ${prefix}skyrise status.`;
                    return output.reply(result);
                }
                let building = buildingsData.getAll().find((b) => b.buildingName?.toLowerCase() === buildingName.toLowerCase());
                if (!building) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ No **building** named "${buildingName}"! Check ${prefix}skyrise status.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                building = updateBuildingData(building, rawBuildingsData);
                if (building.level >= MAX_LEVEL) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ The maximum upgrade is level ${MAX_LEVEL}.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                const cost = calculateUpgradeCost(building);
                if (!hasEnoughResources({ aether, crystal, stone, money: userMoney }, cost)) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Not enough **resources**! Need: ${cost.aether} **Aether**, ${cost.crystal} **Crystal**, ${cost.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(cost.money)}\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                building.level += 1;
                building.lastCollect = Date.now();
                buildingsData.deleteOne(building.key);
                buildingsData.addOne(updateBuildingData(building, buildingsData.getAll()));
                await money.setItem(input.senderID, {
                    aether: aether - (cost.aether ?? 0),
                    crystal: crystal - (cost.crystal ?? 0),
                    stone: stone - (cost.stone ?? 0),
                    money: userMoney - (cost.money ?? 0),
                    srbuildings: Array.from(buildingsData),
                });
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Building Upgraded***\n\n`;
                result += `✅ Upgraded ${building.icon} **${building.name}** (**${building.buildingName}**) to **Level ${building.level}**!\n`;
                result += `💰 Spent: ${cost.aether} **Aether**, ${cost.crystal} **Crystal**, ${cost.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(cost.money)}\n`;
                result += `📈 **Production increased**! Your **${building.name}** now generates more **${building.production.resource}**.\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Assign **workers** to this building with ${prefix}skyrise worker ${building.buildingName} assign 1.`;
                return output.reply(result);
            },
        },
        {
            key: "defend",
            description: "Defend against **Sky Pirates**",
            aliases: ["-d"],
            async handler() {
                const buildingsData = new Inventory(rawBuildingsData);
                const cassEXP = new cassEXP_js_1.CassEXP(cxp);
                const totalLevel = buildingsData.getAll().reduce((sum, b) => sum + b.level, 0);
                const pirateStrength = Math.floor(Math.random() * 10) + 5;
                const defenseStrength = totalLevel + srworkers * 2;
                const success = defenseStrength >= pirateStrength;
                let totalProduction = 0;
                for (const building of buildingsData.getAll()) {
                    const updatedBuilding = updateBuildingData(building, buildingsData.getAll());
                    totalProduction += calculateProduction(updatedBuilding, srworkers);
                    updatedBuilding.lastCollect = Date.now();
                    buildingsData.deleteOne(updatedBuilding.key);
                    buildingsData.addOne(updatedBuilding);
                }
                let reward = { aether: 0, crystal: 0, stone: 0 };
                if (success) {
                    reward = {
                        aether: 100 * buildingsData.getAll().length + totalProduction,
                        crystal: 100 * buildingsData.getAll().length + totalProduction,
                        stone: 100 * buildingsData.getAll().length + totalProduction,
                    };
                }
                const totalRewardAcc = reward.aether -
                    totalProduction +
                    (reward.crystal - totalProduction) +
                    (reward.stone - totalProduction);
                if (totalProduction < totalRewardAcc) {
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Sky Pirate Raid***\n\n`;
                    result += `🏴‍☠️ Defense: ${defenseStrength} vs **Pirates**: ${pirateStrength}\n`;
                    result += `❌ **Defense Failed**! Your production was too low to defend effectively.\n`;
                    result += `📜 Consider upgrading or building more to increase production.\n`;
                    result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Check ${prefix}skyrise status to monitor your empire.`;
                    return output.reply(result);
                }
                else {
                    let loss = { aether: 0, crystal: 0, stone: 0 };
                    if (!success) {
                        loss = {
                            aether: Math.min(aether, Math.max(50 * buildingsData.getAll().length, Math.floor(totalProduction * 0.5))),
                            crystal: Math.min(crystal, Math.max(50 * buildingsData.getAll().length, Math.floor(totalProduction * 0.5))),
                            stone: Math.min(stone, Math.max(50 * buildingsData.getAll().length, Math.floor(totalProduction * 0.5))),
                        };
                        cassEXP.expControls.raise(5);
                    }
                    else {
                        cassEXP.expControls.raise(20);
                    }
                    await money.setItem(input.senderID, {
                        aether: aether + reward.aether - loss.aether,
                        crystal: crystal + reward.crystal - loss.crystal,
                        stone: stone + reward.stone - loss.stone,
                        cassEXP: cassEXP.raw(),
                    });
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Sky Pirate Raid***\n\n`;
                    result += `🏴‍☠️ Defense: ${defenseStrength} vs **Pirates**: ${pirateStrength}\n`;
                    if (success) {
                        result += `✅ **Repelled Sky Pirates**!\n`;
                        result += `🏆 Rewards: ${reward.aether} **Aether**, ${reward.crystal} **Crystal**, ${reward.stone} **Stone**\n`;
                        result += `🌟 **EXP**: +20\n`;
                        result += `📜 Your empire stands strong! These **resources** will fuel your growth.\n`;
                    }
                    else {
                        result += `❌ **Sky Pirates stole resources**!\n`;
                        result += `💥 Loss: ${loss.aether} **Aether**, ${loss.crystal} **Crystal**, ${loss.stone} **Stone**\n`;
                        result += `🌟 **EXP**: +5\n`;
                        result += `📜 Don't worry, rebuild stronger! ***Upgrade*** your **buildings** to improve defense.\n`;
                    }
                    result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Check ${prefix}skyrise status to monitor your empire.`;
                    return output.reply(result);
                }
            },
        },
        {
            key: "shop",
            description: "Visit the **Sky Market** to buy buildings or workers",
            aliases: ["-sh"],
            args: ["[buy <item_key>]"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const inventory = new Inventory(rawInventory);
                let hasBuilding = (key) => {
                    return buildingsData.getAll().some((i) => {
                        const b = updateBuildingData(i, buildingsData.getAll());
                        return (b.production?.resource.includes("all") ||
                            b.production?.resource.includes(key));
                    });
                };
                const modifiedShopItems = exports.shopItems.map((i) => {
                    const copy = {
                        ...i,
                        price: {
                            ...i.price,
                            aether: ["aetherCollector"].includes(i.key) && !hasBuilding("aether")
                                ? 0
                                : i.price.aether,
                            crystal: ["crystalMine", "aetherCollector"].includes(i.key) &&
                                !hasBuilding("crystal")
                                ? 0
                                : i.price.crystal,
                            stone: ["crystalMine", "aetherCollector", "stoneQuarry"].includes(i.key) && !hasBuilding("stone")
                                ? 0
                                : i.price.stone,
                        },
                    };
                    if (copy.key !== "aetherCollector" || getFreeSrBuilding) {
                        return copy;
                    }
                    return {
                        ...copy,
                        price: {
                            ...copy.price,
                            aether: 0,
                            crystal: 0,
                            stone: 0,
                        },
                    };
                });
                if (spectralArgs[0] === "buy" && spectralArgs[1]) {
                    const itemKey = spectralArgs[1];
                    const shopItem = modifiedShopItems.find((item) => item.key === itemKey);
                    if (!shopItem) {
                        return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Invalid **item key** "${itemKey}"! Use ${prefix}skyrise shop to see available items.\n` +
                            `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                            `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                    }
                    if (!hasEnoughResources({ aether, crystal, stone, money: userMoney }, shopItem.price)) {
                        return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Not enough **resources**! Need: ${shopItem.price.aether} **Aether**, ${shopItem.price.crystal} **Crystal**, ${shopItem.price.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(shopItem.price.money)}\n` +
                            `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                            `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                    }
                    shopItem.onPurchase({
                        moneySet: {
                            inventory: inventory.inv,
                            srworkers,
                        },
                        xPurchasedBy: input.senderID,
                    });
                    await money.setItem(input.senderID, {
                        aether: aether - (shopItem.price.aether || 0),
                        crystal: crystal - (shopItem.price.crystal || 0),
                        stone: stone - (shopItem.price.stone || 0),
                        money: userMoney - (shopItem.price.money || 0),
                        inventory: Array.from(inventory),
                        srworkers: shopItem.type === "srworker" ? srworkers + 1 : srworkers,
                        getFreeSrBuilding: shopItem.key === "aetherCollector" && !getFreeSrBuilding
                            ? true
                            : false,
                    });
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Purchase Successful***\n\n`;
                    result += `✅ Bought ${shopItem.icon} **${shopItem.name}**!\n`;
                    result += `💰 Spent: ${shopItem.price.aether} **Aether**, ${shopItem.price.crystal} **Crystal**, ${shopItem.price.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(shopItem.price.money)}\n`;
                    result += `📜 ${shopItem.type === "srworker"
                        ? `Your new **worker** can be assigned to buildings!`
                        : `Use ${prefix}skyrise build ${shopItem.key} <building_name> to construct this **building**.`}\n`;
                    result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Check ${prefix}skyrise status to monitor your empire.`;
                    return output.reply(result);
                }
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Sky Market***\n\n`;
                result += `🏪 Welcome to the **Sky Market**! Browse **buildings** and **workers** to expand your empire.\n\n`;
                result += `**Usage**: ${prefix}skyrise shop [buy <item_key>]\n`;
                result += `**Example**: ${prefix}skyrise shop buy aetherCollector to buy an **Aether Collector**.\n\n`;
                result += `**Available Items**:\n`;
                modifiedShopItems.forEach((item) => {
                    result += `${item.icon} **${item.name}** (${item.key})\n`;
                    result += `💰 Cost: ${item.price.aether} **Aether**, ${item.price.crystal} **Crystal**, ${item.price.stone} **Stone**, and ${(0, ArielUtils_1.formatCash)(item.price.money)}\n`;
                    result += `📜 ${item.flavorText}\n\n`;
                });
                result += `📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect to afford purchases.`;
                return output.reply(result);
            },
        },
        {
            key: "worker",
            description: "Assign or remove **workers** from buildings",
            aliases: ["-w"],
            args: ["<building_name>", "<assign|remove>", "<amount>"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const [buildingName, action, amountStr] = spectralArgs;
                const amount = parseInt(amountStr) || 1;
                if (!buildingName || !action || isNaN(amount)) {
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Worker Guide***\n\n`;
                    result += `❌ Missing or invalid arguments! To manage **workers**, specify a **building**, action, and amount.\n\n`;
                    result += `**Usage**: ${prefix}skyrise worker <building_name> <assign|remove> <amount>\n`;
                    result += `**Examples**:\n`;
                    result += `- ${prefix}skyrise worker SkyAether1 assign 1 to assign 1 **worker**.\n`;
                    result += `- ${prefix}skyrise worker SkyCrystal1 remove 2 to remove 2 **workers**.\n\n`;
                    result += `**Your Buildings**:\n`;
                    const buildings = buildingsData.getAll();
                    if (buildings.length === 0) {
                        result += `❌ No **buildings** yet! Visit the **Sky Market** with ${prefix}skyrise shop.\n`;
                    }
                    else {
                        buildings.forEach((b) => {
                            result += `${b.icon} **${b.name}** (Workers: ${b.workers || 0})\n`;
                            result += `🏛️ Name: ${b.buildingName}\n`;
                        });
                    }
                    result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Buy more **workers** with ${prefix}skyrise shop.`;
                    return output.reply(result);
                }
                const building = buildingsData.getAll().find((b) => b.buildingName?.toLowerCase() === buildingName.toLowerCase());
                if (!building) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ No **building** named "${buildingName}"! Check ${prefix}skyrise status.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                const currentWorkers = building.workers || 0;
                const totalAssigned = buildingsData.getAll().reduce((sum, b) => sum + (b.workers || 0), 0);
                let newWorkers;
                if (action === "assign") {
                    if (totalAssigned + amount > srworkers) {
                        return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Not enough **workers**! Available: ${srworkers - totalAssigned}\n` +
                            `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                            `🔔 **Reminder**: Buy more **workers** with ${prefix}skyrise shop.`);
                    }
                    newWorkers = currentWorkers + amount;
                }
                else if (action === "remove") {
                    newWorkers = Math.max(0, currentWorkers - amount);
                }
                else {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ Invalid action! Use **assign** or **remove**.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Check ${prefix}skyrise status for **worker** assignments.`);
                }
                building.workers = newWorkers;
                buildingsData.deleteOne(building.key);
                buildingsData.addOne(updateBuildingData(building, buildingsData.getAll()));
                await money.setItem(input.senderID, {
                    srbuildings: Array.from(buildingsData),
                });
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Worker Management***\n\n`;
                result += `✅ Updated **workers** for ${building.icon} **${building.name}** (**${building.buildingName}**)!\n`;
                result += `👷 **Workers**: ${newWorkers} (${action === "assign" ? "+" : "-"}${amount})\n`;
                result += `📈 **${building.name}** now produces ${action === "assign" ? "more" : "less"} **${building.production.resource}**.\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Protect your empire with ${prefix}skyrise defend.`;
                return output.reply(result);
            },
        },
        {
            key: "top",
            description: "View top players ranked by empire performance",
            aliases: ["-t"],
            args: ["[page]"],
            async handler(_, { spectralArgs }) {
                const pageSize = 10;
                const page = Math.max(1, parseInt(spectralArgs[0]) || 1);
                const queried = await money.queryItemAll({
                    "value.srbuildings": { $exists: true },
                }, "name", "srbuildings", "srworker", "aether", "crystal", "stone");
                const playerScores = calculatePlayerRankings(queried, exports.shopItems);
                const totalPages = Math.ceil(playerScores.length / pageSize);
                const startIdx = (page - 1) * pageSize;
                const pagePlayers = playerScores.slice(startIdx, startIdx + pageSize);
                let result = `👑 **SkyRise Empire Leaderboard** (Page ${page}/${totalPages})\n\n`;
                if (playerScores.length === 0) {
                    result += `❌ No empires found! Start building with ${prefix}skyrise shop.\n`;
                }
                else {
                    pagePlayers.forEach((player, idx) => {
                        const rank = startIdx + idx + 1;
                        result += `🏆 #${rank} **${player.name}**\n`;
                        result += `📊 Score: ${(0, ArielUtils_1.abbreviateNumber)(player.score, 2, false)}\n`;
                        result += `🏛️ Buildings: ${player.buildingCount} (Avg Level: ${player.averageLevel.toFixed(1)})\n`;
                        result += `👷 Workers: ${player.totalWorkers}\n`;
                        result += `💎 Total Resources: ${(0, ArielUtils_1.abbreviateNumber)(player.totalResources, 2, false)}\n`;
                        result += `🌬️ Aether: ${(0, ArielUtils_1.abbreviateNumber)(player.resources.aether, 2, false)}\n`;
                        result += `💎 Crystal: ${(0, ArielUtils_1.abbreviateNumber)(player.resources.crystal, 2, false)}\n`;
                        result += `🪨 Stone: ${(0, ArielUtils_1.abbreviateNumber)(player.resources.stone, 2, false)}\n`;
                        result += `⚙️ Production: ${(0, ArielUtils_1.abbreviateNumber)(player.productionScore, 2, false)}/min\n`;
                        if (player.bestBuilding) {
                            const prod = predictProduction(exports.shopItems.find((i) => i.key ===
                                player.bestBuilding.key.split(":")[1]?.split("_")[0]), player.bestBuilding, player.totalWorkers);
                            result += `🌟 Best Building: ${player.bestBuilding.icon} **${player.bestBuilding.name}** (Lv${player.bestBuilding.level}/${MAX_LEVEL}, ${player.bestBuilding.workers} workers)\n`;
                            result += `   Produces: ${(0, ArielUtils_1.abbreviateNumber)(prod.maxAmount, 2, false)} **${prod.resource.join(", ")}**/min\n`;
                        }
                        else {
                            result += `🌟 Best Building: None\n`;
                        }
                        result += `\n`;
                    });
                    if (totalPages > 1) {
                        result += `📄 **Navigation**: Use ${prefix}skyrise top <page>\n`;
                        if (page < totalPages) {
                            result += `➡️ Next page: ${prefix}skyrise top ${page + 1}\n`;
                        }
                        if (page > 1) {
                            result += `⬅️ Previous page: ${prefix}skyrise top ${page - 1}\n`;
                        }
                    }
                }
                result += `\n📝 **Next Step**: ${suggestNextAction(new Inventory([]), { aether: 0, crystal: 0, stone: 0, money: 0 }, 0, prefix)}\n`;
                result += `🔔 **Reminder**: Climb the ranks by upgrading buildings!`;
                return output.reply(result);
            },
        },
        {
            key: "tutorial",
            description: "Start or continue the **tutorial**",
            aliases: ["-t"],
            async handler() {
                const steps = [
                    {
                        text: `Welcome to **SkyForge Empire**! Let's build your first **Aether Collector**.\nUse ${prefix}skyrise shop and buy an **Aether Collector**.`,
                        condition: () => !rawBuildingsData.some((b) => b.key.includes("aetherCollector")),
                    },
                    {
                        text: `Great! Now ***build*** your **Aether Collector**.\nUse ${prefix}skyrise build aetherCollector SkyAether1.`,
                        condition: () => rawBuildingsData.some((b) => b.key.includes("aetherCollector")),
                    },
                    {
                        text: `Nice work! ***Collect resources*** from your **Aether Collector**.\nUse ${prefix}skyrise collect.`,
                        condition: () => rawBuildingsData.some((b) => b.buildingName === "SkyAether1"),
                    },
                    {
                        text: `Awesome! ***Upgrade*** your **Aether Collector** to boost production.\nUse ${prefix}skyrise upgrade SkyAether1.`,
                        condition: () => aether >= 50 && crystal >= 50 && stone >= 50,
                    },
                    {
                        text: `You're ready to ***defend*** your empire! Fight off **Sky Pirates**.\nUse ${prefix}skyrise defend.`,
                        condition: () => rawBuildingsData.some((b) => b.level >= 2),
                    },
                    {
                        text: `**Tutorial complete**! Explore more with ${prefix}skyrise guide.`,
                        condition: () => true,
                    },
                ];
                const currentStep = steps[tutorialStep] || steps[steps.length - 1];
                const nextStep = tutorialStep + 1 < steps.length && !currentStep.condition()
                    ? tutorialStep
                    : tutorialStep + 1;
                await money.setItem(input.senderID, { tutorialStep: nextStep });
                return output.reply(`👤 **${name}** (SkyRise)\n\n📜 **Tutorial Step ${tutorialStep + 1}**\n${currentStep.text}`);
            },
        },
        {
            key: "guide",
            description: "View all **commands** and **guides**",
            aliases: ["-h"],
            async handler() {
                const buildingsData = new Inventory(rawBuildingsData);
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***SkyForge Empire Guide***\n\n`;
                result += `Build a floating island empire by collecting **Aether**, **Crystal**, and **Stone**.\n\n`;
                result += `**Commands**:\n`;
                result += `- **status** (-s) [page]: Check your **resources** and **buildings**.\n`;
                result += `- **build** (-b) <building_key> <building_name>: Construct a new **building**.\n`;
                result += `- **collect** (-c): Gather **resources** from your **buildings**.\n`;
                result += `- **upgrade** (-u) <building_name>: Improve a **building**'s **production**.\n`;
                result += `- **defend** (-d): Protect against **Sky Pirate** raids.\n`;
                result += `- **shop** (-sh) [buy <item_key>]: Buy **buildings** and **workers**.\n`;
                result += `- **worker** (-w) <building_name> <assign|remove> <amount>: Manage **workers**.\n`;
                result += `- **tutorial** (-t): Start or continue the **tutorial**.\n`;
                result += `- **lobby** (-l): View **achievements** and **commands**.\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Use ${prefix}skyrise <command> to play!`;
                return output.reply(result);
            },
        },
        {
            key: "lobby",
            description: "View all **achievements** and **commands**",
            aliases: ["-l"],
            async handler(_, { itemList }) {
                const buildingsData = new Inventory(rawBuildingsData);
                let newAether = aether;
                let newCrystal = crystal;
                let newStone = stone;
                let achievementMessages = [];
                for (const [achName, { condition, reward }] of Object.entries(achievements)) {
                    if (!rawBuildingsData.some((b) => b.achievements?.includes(achName)) &&
                        condition(buildingsData.getAll())) {
                        newAether += reward.aether || 0;
                        newCrystal += reward.crystal || 0;
                        newStone += reward.stone || 0;
                        achievementMessages.push(`🏆 **Achievement Unlocked**: ${achName}!\n` +
                            `🎁 Rewards: ${reward.aether || 0} **Aether**, ${reward.crystal || 0} **Crystal**, ${reward.stone || 0} **Stone**`);
                        buildingsData.getAll().forEach((b) => {
                            b.achievements = b.achievements || [];
                            b.achievements.push(achName);
                            buildingsData.deleteOne(b.key);
                            buildingsData.addOne(updateBuildingData(b, buildingsData.getAll()));
                        });
                    }
                }
                if (newAether !== aether ||
                    newCrystal !== crystal ||
                    newStone !== stone) {
                    await money.setItem(input.senderID, {
                        aether: newAether,
                        crystal: newCrystal,
                        stone: newStone,
                        srbuildings: Array.from(buildingsData),
                    });
                }
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***SkyForge Lobby***\n\n`;
                result += `📜 Welcome to your empire's **lobby**! Check your **achievements** and plan your next move.\n\n${unisym_js_1.UNIRedux.arrow} ***Commands***\n\n${itemList}\n\n`;
                if (achievementMessages.length > 0) {
                    result += `${unisym_js_1.UNIRedux.arrow} ***Achievements***\n\n${achievementMessages.join("\n")}\n\n`;
                }
                else {
                    result += `🏆 **No new achievements**! Keep building to unlock rewards.\n\n`;
                }
                result += `📝 **Next Step**: ${suggestNextAction(buildingsData, {
                    aether: newAether,
                    crystal: newCrystal,
                    stone: newStone,
                    money: userMoney,
                }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Use ${prefix}skyrise guide to see all commands!`;
                return output.reply(result);
            },
        },
        {
            key: "destroy",
            description: "Permanently **destroy** a building with no refunds",
            aliases: ["-des"],
            args: ["<building_name>"],
            async handler(_, { spectralArgs }) {
                const buildingsData = new Inventory(rawBuildingsData);
                const buildingName = spectralArgs.join(" ");
                if (!buildingName) {
                    let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Destroy Guide***\n\n`;
                    result += `❌ No **building name** provided! To ***destroy*** a building, specify its name.\n\n`;
                    result += `⚠️ **WARNING**: Destroying a building is **permanent** and offers **no refunds**!\n\n`;
                    result += `**Usage**: ${prefix}skyrise destroy <building_name>\n`;
                    result += `**Example**: ${prefix}skyrise destroy SkyAether1 to destroy a building named **SkyAether1**.\n\n`;
                    result += `**Your Buildings**:\n`;
                    const buildings = buildingsData.getAll();
                    if (buildings.length === 0) {
                        result += `❌ No **buildings** to destroy! Build some with ${prefix}skyrise shop.\n`;
                    }
                    else {
                        buildings.forEach((b) => {
                            result += `${b.icon} **${b.name}** (Level ${b.level}/${MAX_LEVEL})\n`;
                            result += `🏛️ Name: ${b.buildingName}\n\n`;
                        });
                    }
                    result += `📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                    result += `🔔 **Reminder**: Check your **buildings** with ${prefix}skyrise status.`;
                    return output.reply(result);
                }
                const building = buildingsData.getAll().find((b) => b.buildingName?.toLowerCase() === buildingName.toLowerCase());
                if (!building) {
                    return output.reply(`👤 **${name}** (SkyRise)\n\n❌ No **building** named "${buildingName}"! Check ${prefix}skyrise status.\n` +
                        `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n` +
                        `🔔 **Reminder**: Collect **resources** with ${prefix}skyrise collect.`);
                }
                buildingsData.deleteOne(building.key);
                await money.setItem(input.senderID, {
                    srbuildings: Array.from(buildingsData),
                });
                let result = `👤 **${name}** (SkyRise)\n\n${unisym_js_1.UNIRedux.arrow} ***Building Destroyed***\n\n`;
                result += `💥 Permanently destroyed ${building.icon} **${building.name}** (**${building.buildingName}**)!\n`;
                result += `⚠️ **No resources refunded** as per destruction policy.\n`;
                result += `📜 Your empire has been reshaped. Plan your next move carefully!\n`;
                result += `\n📝 **Next Step**: ${suggestNextAction(buildingsData, { aether, crystal, stone, money: userMoney }, srworkers, prefix)}\n`;
                result += `🔔 **Reminder**: Build new structures with ${prefix}skyrise shop.`;
                return output.reply(result);
            },
        },
    ]);
    await home.runInContext(ctx);
}
