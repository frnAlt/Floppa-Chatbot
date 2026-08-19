import { GearsManage, PetPlayer, PetTurns } from "@cass-plugins/pet-fight";
import { Collectibles, Inventory } from "@cass-modules/InventoryEnhanced";
import { FontSystem, UNIRedux } from "cassidy-styler";
import { OutputResult } from "@cass-plugins/output";
import { PersistentStats, PetSchema } from "@cass-modules/Encounter";
import { formatCash } from "@cass-modules/ArielUtils";

export const meta: CommandMeta = {
  name: "arena",
  description: "1v1 PvP pet battle system",
  otherNames: ["pvp", "battle"],
  version: "1.4.2",
  usage: "{prefix}{name} [pet] [--ai]",
  category: "Pet Games",
  author: "@lianecagara",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.7.0",
  icon: "⚔️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style: CommandStyle = {
  title: `⚔️ Arena ${FontSystem.applyFonts("EX", "double_struck")}`,
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};

const petSchema: PetSchema = {
  fight: false,
  item: false,
  magic: false,
  mercy: false,
  // defend: true,
  defend: false,
  extra: {
    Bash: "🥊",
    // LifeUp: "✨",
    HexSmash: "💥",
    FluxStrike: "🌩️",
    GuardPulse: "🛡️",
    ChaosBolt: "⚡",
    VitalSurge: "💖",
    StatSync: "🔄",
    Equilibrium: "⚖️",
    Generate: "🤖",
    LastStand: "🛡️",
  },
};

const MAX_TURNS = 100;

interface ArenaGameState {
  player1Pet: PetPlayer | null;
  player2Pet: PetPlayer | null;
  player1Author: string;
  player2Author: string | null;
  activePlayer: 1 | 2;
  flavorCache: string;
  prevMove1: string | null;
  prevMove2: string | null;
  turnCount: number;
  isAIMode: boolean;
}

async function generateAIPet(
  money: CommandContext["money"],
  player1Pet: PetPlayer,
  requestedName: string = ""
): Promise<{ pet: PetPlayer; author: string }> {
  const allUsers = await money.queryItemAll(
    { "value.petsData": { $exists: true } },
    "petsData",
    "gearsData",
    "name",
    "userID"
  );
  const playerStrength = calculatePetStrength(player1Pet);
  const playerPetIcon = player1Pet.petIcon;
  const playerPetName = player1Pet.petName;
  let closestPet: PetPlayer | null = null;
  let closestAuthor: string | null = null;
  let minStrengthDiff = Infinity;
  let fallbackPet: PetPlayer | null = null;
  let fallbackAuthor: string | null = null;
  let fallbackStrengthDiff = Infinity;
  const allPetNamesAndIcons: { name: string; icon: string }[] = [
    { icon: "🔫", name: "PhilCassidy" },
    { icon: "🎀", name: "Liane" },
    { icon: "🃏", name: "HighRollPass" },
    { icon: "🌒", name: "ShadowCoin" },
    { icon: "☄️", name: "CosmicCrunchEX" },
    { icon: "⚖️", name: "Equilibrium" },
    { icon: "⛪", name: "Jesus" },
    { icon: "👨‍💻", name: "Ownersv2" },
    { icon: "✅", name: "PrinceHar" },
    { icon: "⚔️", name: "Yhander" },
  ];

  loop1: for (const user of Object.values(allUsers)) {
    const { petsData } = getInfos(user);
    for (const petData of petsData.getAll()) {
      if (player1Pet.petName !== petData.name) {
        allPetNamesAndIcons.push({ name: petData.name, icon: petData.icon });
      }
      const pet = new PetPlayer(
        petData,
        new GearsManage(user.gearsData).getGearData(petData.key)
      );
      if (
        requestedName &&
        String(pet.petName).toLowerCase() ===
          String(requestedName).toLowerCase()
      ) {
        closestPet = pet;
        closestAuthor = user.userID;
        break loop1;
      }
      const petStrength = calculatePetStrength(pet);
      const strengthDiff = Math.abs(petStrength - playerStrength);
      const isDisqualified =
        pet.petIcon === playerPetIcon &&
        pet.petName === playerPetName &&
        Math.random() < 0.7;

      if (!isDisqualified && strengthDiff < minStrengthDiff) {
        minStrengthDiff = strengthDiff;
        closestPet = pet;
        closestAuthor = user.userID;
      } else if (
        !isDisqualified &&
        strengthDiff === minStrengthDiff &&
        Math.random() < 0.5
      ) {
        closestPet = pet;
        closestAuthor = user.userID;
      }

      if (strengthDiff < fallbackStrengthDiff) {
        fallbackStrengthDiff = strengthDiff;
        fallbackPet = pet;
        fallbackAuthor = user.userID;
      } else if (strengthDiff === fallbackStrengthDiff && Math.random() < 0.5) {
        fallbackPet = pet;
        fallbackAuthor = user.userID;
      }
    }
  }

  if (!closestPet && !fallbackPet) {
    throw new Error("No suitable AI pet found.");
  }

  const selectedPet = closestPet || fallbackPet;
  const selectedAuthor = closestAuthor || fallbackAuthor;

  if (!selectedPet || !selectedAuthor) {
    throw new Error("No suitable AI pet found.");
  }

  if (
    allPetNamesAndIcons.length > 0 &&
    selectedPet.OgpetData.key === player1Pet.OgpetData.key
  ) {
    const randomPet =
      allPetNamesAndIcons[
        Math.floor(Math.random() * allPetNamesAndIcons.length)
      ];
    selectedPet.petName = randomPet.name;
    selectedPet.petIcon = randomPet.icon;
  }

  // selectedPet.atkModifier += 5;
  // selectedPet.defModifier += 25;
  // selectedPet.magicModifier += 163;

  // selectedPet.atkModifier += Math.floor(player1Pet.ATK / 1.5);
  // selectedPet.defModifier += Math.floor(player1Pet.DF / 1.5);
  // selectedPet.magicModifier += Math.floor(player1Pet.MAGIC / 1.5);

  selectedPet.HP = selectedPet.maxHP;

  return { pet: selectedPet, author: `AI_${Date.now()}` };
}

function generateAIMove(
  gameState: ArenaGameState,
  activePet: PetPlayer,
  targetPet: PetPlayer,
  petStats: PersistentStats,
  prevMove: string | null
): string {
  const RANDOMNESS_BASE = 0.15;
  const ENDGAME_RANDOMNESS_REDUCTION = 0.05;
  const CRITICAL_HP_THRESHOLD = 30;
  const URGENT_HP_THRESHOLD = 20;
  const HP_DIFF_THRESHOLD = 15;
  const DEFENSE_BOOST_CAP = 3;
  const ATTACK_BOOST_CAP = 3;
  const HEAL_DIMINISHING_FACTOR = 0.25;
  const MAX_TURN_WEIGHT = 0.9;
  const DODGE_RISK_BASE = 0.08;
  const DAMAGE_THRESHOLD = 0.05;
  const DODGE_RISK_MODIFIERS = {
    bash: 0.65,
    hexsmash: 0.65,
    fluxstrike: 0.65,
    chaosbolt: 0.85,
    default: 0.45,
  };
  const MOOD_SHIFT_CHANCE = 0.3;
  const moves = [
    "bash",
    "hexsmash",
    "fluxstrike",
    "chaosbolt",
    "vitalsurge",
    "guardpulse",
    "statsync",
    "equilibrium",
  ];

  const currentHPPercent = activePet.getPercentHP();
  const targetHPPercent = targetPet.getPercentHP();
  const hpDifference = targetHPPercent - currentHPPercent;
  const turnsRemaining = MAX_TURNS - gameState.turnCount;
  const isEndgame = turnsRemaining <= 15;
  const isEarlyGame = gameState.turnCount <= 25;
  const dodgeRisk = prevMove
    ? DODGE_RISK_MODIFIERS[prevMove as keyof typeof DODGE_RISK_MODIFIERS] ||
      DODGE_RISK_MODIFIERS.default
    : DODGE_RISK_BASE;
  const damageDealtRatio = petStats.totalDamageDealt / (targetPet.maxHP || 1);
  const damageTakenRatio = petStats.totalDamageTaken / (activePet.maxHP || 1);
  const healEfficiency = Math.max(
    0.5,
    1 - petStats.healsPerformed * HEAL_DIMINISHING_FACTOR
  );
  const attackBoostEfficiency = Math.max(0.5, 1 - petStats.attackBoosts * 0.25);
  const defenseBoostEfficiency = Math.max(
    0.5,
    1 - petStats.defenseBoosts * 0.25
  );
  const attackAdvantage = activePet.ATK / (targetPet.DF || 1);
  const defenseDisadvantage = activePet.DF / (targetPet.DF || 1);
  const magicAdvantage = activePet.MAGIC / (targetPet.MAGIC || 1);
  const levelDifference = activePet.level - targetPet.level;
  const statThreshold = activePet.level * 2.5;

  const opponentStats =
    gameState.player1Pet && gameState.player2Pet
      ? gameState.activePlayer === 2
        ? statMap.get(
            `${gameState.player1Author}_${gameState.player1Pet.OgpetData.key}`
          )
        : statMap.get(
            `${gameState.player2Author}_${gameState.player2Pet.OgpetData.key}`
          )
      : null;
  const opponentDamageDealtRatio = opponentStats
    ? opponentStats.totalDamageDealt / (activePet.maxHP || 1)
    : 0;
  const opponentDamageTakenRatio = opponentStats
    ? opponentStats.totalDamageTaken / (targetPet.maxHP || 1)
    : 0;
  const opponentAttackBoosts = opponentStats ? opponentStats.attackBoosts : 0;
  const opponentDefenseBoosts = opponentStats ? opponentStats.defenseBoosts : 0;

  const moveHistory = {
    player: gameState.prevMove1,
    ai: gameState.prevMove2,
  };

  const isHighOpponentAttack = targetPet.ATK > activePet.DF / 5;
  const isLowDefense = activePet.DF / 5 < targetPet.ATK;

  const calculateAverageAttack = (
    attacker: PetPlayer,
    defenderDF: number,
    attackStat?: number
  ): number => {
    let totalDamage = 0;
    for (let i = 0; i < 20; i++) {
      totalDamage += attacker.calculateAttack(defenderDF, attackStat);
    }
    return Math.round(totalDamage / 20);
  };

  const isLowDamageOutput = () => {
    const avgBashDamage = calculateAverageAttack(activePet, targetPet.DF);
    return avgBashDamage < targetPet.maxHP * DAMAGE_THRESHOLD;
  };

  const opponentAvgDamage = calculateAverageAttack(targetPet, activePet.DF);
  const shouldPrioritizeStatSync = isHighOpponentAttack || isLowDamageOutput();

  type AIMood = "aggressive" | "defensive" | "balanced";
  let currentMood: AIMood = "balanced";
  if (Math.random() < MOOD_SHIFT_CHANCE) {
    const moodRoll = Math.random();
    currentMood =
      moodRoll < 0.33
        ? "aggressive"
        : moodRoll < 0.66
        ? "defensive"
        : "balanced";
  } else if (currentHPPercent < 40) {
    currentMood = "defensive";
  } else if (targetHPPercent < 30 && isEndgame) {
    currentMood = "aggressive";
  }

  const calculateBashDamage = (): number => {
    return calculateAverageAttack(activePet, targetPet.DF);
  };

  const calculateHexSmashDamage = (): number => {
    const meanStat = Math.min(
      (activePet.ATK + activePet.MAGIC) / 2,
      activePet.ATK * 3
    );
    return Math.round(
      calculateAverageAttack(activePet, targetPet.DF, meanStat) * 1.5
    );
  };

  const calculateFluxStrikeDamage = (): number => {
    const damageFactor = Math.max(
      0.5,
      1 - petStats.totalDamageDealt / (targetPet.maxHP * 2)
    );
    const fluxMultiplier =
      1 + 0.5 * (targetPet.HP / targetPet.maxHP) * damageFactor;
    return Math.round(activePet.ATK * fluxMultiplier - targetPet.DF / 5);
  };

  const calculateChaosBoltDamage = (): number => {
    const statFactor = Math.min(
      (activePet.ATK + activePet.MAGIC) / statThreshold,
      1
    );
    const effectiveStat = Math.max(activePet.ATK, activePet.MAGIC / 2);
    let damage =
      calculateAverageAttack(activePet, targetPet.DF, effectiveStat) *
      statFactor;
    const chaosChance =
      Math.min(
        ((activePet.ATK + activePet.MAGIC) / (targetPet.DF || 1)) * 0.25,
        0.35
      ) *
      (1 - petStats.attackBoosts * 0.15);
    if (Math.random() < chaosChance && statFactor >= 1) {
      damage = Math.round(damage * 1.6);
    }
    return Math.min(damage, Math.round(targetPet.maxHP * 0.3));
  };

  const calculateEquilibriumEffect = (): { damage: number; heal: number } => {
    const eqFactor = Math.min(
      1 + petStats.totalDamageTaken / (activePet.maxHP * 2),
      2.2
    );
    const hpDiff = targetPet.getPercentHP() - activePet.getPercentHP();
    if (hpDiff <= 0) return { damage: 0, heal: 0 };
    const attackStat = activePet.ATK + activePet.MAGIC;
    const defenseStat = activePet.DF + activePet.MAGIC;
    const attackFactor = Math.min(attackStat / statThreshold, 1);
    const defenseFactor = Math.min(defenseStat / statThreshold, 1);
    const damage = Math.round(
      calculateAverageAttack(
        activePet,
        targetPet.DF,
        (activePet.ATK + activePet.MAGIC) / 2
      ) *
        (hpDiff / 100) *
        eqFactor *
        attackFactor
    );
    const heal = Math.round(
      ((activePet.DF + activePet.MAGIC) / 4) *
        (hpDiff / 100) *
        eqFactor *
        defenseFactor +
        activePet.maxHP * 0.06
    );
    const maxDamage = Math.round(targetPet.maxHP * 0.25);
    const maxHeal = Math.round(activePet.maxHP * 0.3);
    return {
      damage: Math.min(damage, maxDamage),
      heal: Math.min(heal, activePet.maxHP - activePet.HP, maxHeal),
    };
  };

  const calculateVitalSurgeHeal = (): number => {
    const healFactor = Math.min(
      1.6,
      1 + (1 - petStats.healsPerformed * HEAL_DIMINISHING_FACTOR)
    );
    const surgeHeal = Math.round(
      activePet.MAGIC * (1 + activePet.HP / activePet.maxHP) * 0.6 * healFactor
    );
    return Math.min(surgeHeal, activePet.maxHP - activePet.HP);
  };

  const calculateGuardPulseBoost = (): number => {
    const guardFactor = Math.max(0.5, 1 - petStats.defenseBoosts * 0.3);
    return Math.round(
      activePet.DF * (1 - activePet.HP / activePet.maxHP) * 1.8 * guardFactor
    );
  };

  const calculateStatSyncBoost = (): number => {
    const syncFactor = Math.max(0.5, 1 - petStats.attackBoosts * 0.3);
    return Math.round(
      Math.max(
        0,
        Math.min(
          (activePet.DF + 1) *
            (targetPet.DF / (activePet.DF || 1)) *
            0.5 *
            syncFactor,
          activePet.level * 2.5
        )
      )
    );
  };

  const assessDodgeRisk = (move: string): number => {
    if (prevMove === move) {
      return (
        DODGE_RISK_MODIFIERS[move as keyof typeof DODGE_RISK_MODIFIERS] ||
        DODGE_RISK_MODIFIERS.default
      );
    }
    return DODGE_RISK_BASE;
  };

  const assessCriticalSituation = (): boolean => {
    return (
      currentHPPercent <= CRITICAL_HP_THRESHOLD &&
      activePet.HP < activePet.maxHP
    );
  };

  const assessUrgentSituation = (): boolean => {
    return (
      currentHPPercent <= URGENT_HP_THRESHOLD && activePet.HP < activePet.maxHP
    );
  };

  const assessEndgamePressure = (): number => {
    if (isEndgame) {
      const hpRatio = currentHPPercent / (targetHPPercent || 1);
      return Math.min(1.2, MAX_TURN_WEIGHT * (1 - hpRatio));
    }
    return 0;
  };

  const randomnessFactor = isEndgame
    ? Math.max(0.05, RANDOMNESS_BASE - ENDGAME_RANDOMNESS_REDUCTION)
    : RANDOMNESS_BASE + (isEarlyGame ? 0.1 : 0);

  const predictOpponentMove = (): string => {
    if (!moveHistory.player)
      return moves[Math.floor(Math.random() * moves.length)];
    const lastMove = moveHistory.player.toLowerCase();
    const moveCounts: { [key: string]: number } = {};
    moves.forEach((m) => (moveCounts[m] = 0));
    moveCounts[lastMove] = 1;
    if (
      ["bash", "hexsmash", "fluxstrike", "chaosbolt"].includes(lastMove) &&
      Math.random() < 0.75
    ) {
      return lastMove;
    }
    if (lastMove === "guardpulse" && Math.random() < 0.3) {
      return "statsync";
    }
    if (lastMove === "statsync" && Math.random() < 0.3) {
      return "guardpulse";
    }
    if (lastMove === "vitalsurge" && Math.random() < 0.8) {
      return ["bash", "hexsmash", "fluxstrike", "chaosbolt"][
        Math.floor(Math.random() * 4)
      ];
    }
    if (lastMove === "equilibrium" && Math.random() < 0.3) {
      return "guardpulse";
    }
    const weights = moves.map((m) => moveCounts[m] + 0.1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let randomWeight = Math.random() * totalWeight;
    for (let i = 0; i < moves.length; i++) {
      randomWeight -= weights[i];
      if (randomWeight <= 0) return moves[i];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  };

  interface MoveScore {
    move: string;
    score: number;
    expectedDamage?: number;
    expectedHeal?: number;
    boostType?: "attack" | "defense";
    boostAmount?: number;
  }

  const moveScores: MoveScore[] = [];

  const bashDodgeRisk = assessDodgeRisk("bash");
  const bashDamage = calculateBashDamage();
  let bashScore = bashDamage * (1 - bashDodgeRisk) * attackAdvantage;
  if (isEndgame && targetHPPercent < 25) bashScore *= 1.6;
  if (isEarlyGame && attackAdvantage < 0.9) bashScore *= 0.7;
  if (opponentAttackBoosts > 1) bashScore *= 0.8;
  if (shouldPrioritizeStatSync || isLowDefense) bashScore *= 0.5;
  if (currentMood === "aggressive") bashScore *= 1.2;
  if (currentMood === "defensive") bashScore *= 0.8;
  if (moveHistory.player === "guardpulse") bashScore *= 1.2;
  if (moveHistory.player === "statsync") bashScore *= 0.8;
  moveScores.push({
    move: "bash",
    score: bashScore,
    expectedDamage: bashDamage,
  });

  const hexSmashDodgeRisk = assessDodgeRisk("hexsmash");
  const hexSmashDamage = calculateHexSmashDamage();
  let hexSmashScore =
    (hexSmashDamage *
      (1 - hexSmashDodgeRisk) *
      (attackAdvantage + magicAdvantage)) /
    2;
  if (magicAdvantage > 1.3) hexSmashScore *= 1.4;
  if (damageDealtRatio > 0.6) hexSmashScore *= 0.85;
  if (opponentDefenseBoosts > 1) hexSmashScore *= 1.2;
  if (shouldPrioritizeStatSync || isLowDefense) hexSmashScore *= 0.5;
  if (currentMood === "aggressive") hexSmashScore *= 1.25;
  if (currentMood === "defensive") hexSmashScore *= 0.75;
  if (moveHistory.player === "guardpulse") hexSmashScore *= 1.2;
  if (moveHistory.player === "statsync") hexSmashScore *= 0.8;
  moveScores.push({
    move: "hexsmash",
    score: hexSmashScore,
    expectedDamage: hexSmashDamage,
  });

  const fluxStrikeDodgeRisk = assessDodgeRisk("fluxstrike");
  const fluxStrikeDamage = calculateFluxStrikeDamage();
  let fluxStrikeScore =
    fluxStrikeDamage *
    (1 - fluxStrikeDodgeRisk) *
    attackAdvantage *
    (targetHPPercent / 100);
  if (targetHPPercent > 60) fluxStrikeScore *= 1.3;
  if (isEndgame && targetHPPercent < 35) fluxStrikeScore *= 1.5;
  if (opponentAttackBoosts > 2) fluxStrikeScore *= 0.9;
  if (shouldPrioritizeStatSync || isLowDefense) fluxStrikeScore *= 0.5;
  if (currentMood === "aggressive") fluxStrikeScore *= 1.2;
  if (currentMood === "defensive") fluxStrikeScore *= 0.8;
  if (moveHistory.player === "guardpulse") fluxStrikeScore *= 1.2;
  if (moveHistory.player === "statsync") fluxStrikeScore *= 0.8;
  moveScores.push({
    move: "fluxstrike",
    score: fluxStrikeScore,
    expectedDamage: fluxStrikeDamage,
  });

  const chaosBoltDodgeRisk = assessDodgeRisk("chaosbolt");
  const chaosBoltDamage = calculateChaosBoltDamage();
  let chaosBoltScore =
    chaosBoltDamage *
    (1 - chaosBoltDodgeRisk) *
    Math.max(attackAdvantage, magicAdvantage / 2);
  const chaosCriticalChance = Math.min(
    ((activePet.ATK + activePet.MAGIC) / (targetPet.DF || 1)) * 0.25,
    0.35
  );
  chaosBoltScore *= 1 + chaosCriticalChance * 0.6;
  if (isEarlyGame && levelDifference < -2) chaosBoltScore *= 0.6;
  if (isEndgame && targetHPPercent < 20) chaosBoltScore *= 1.8;
  if (opponentDefenseBoosts > 2) chaosBoltScore *= 1.3;
  if (shouldPrioritizeStatSync || isLowDefense) chaosBoltScore *= 0.5;
  if (currentMood === "aggressive") chaosBoltScore *= 1.3;
  if (currentMood === "defensive") chaosBoltScore *= 0.7;
  if (moveHistory.player === "guardpulse") chaosBoltScore *= 1.2;
  if (moveHistory.player === "statsync") chaosBoltScore *= 0.8;
  moveScores.push({
    move: "chaosbolt",
    score: chaosBoltScore,
    expectedDamage: chaosBoltDamage,
  });

  const vitalSurgeHeal = calculateVitalSurgeHeal();
  let vitalSurgeScore =
    vitalSurgeHeal * healEfficiency * (1 - currentHPPercent / 100);
  if (assessCriticalSituation()) vitalSurgeScore *= 2.5;
  if (assessUrgentSituation()) vitalSurgeScore *= 3.0;
  if (petStats.healsPerformed >= 4) vitalSurgeScore *= 0.5;
  if (magicAdvantage < 0.7) vitalSurgeScore *= 0.7;
  if (opponentDamageDealtRatio > 0.5) vitalSurgeScore *= 1.4;
  if (vitalSurgeHeal < opponentAvgDamage && !assessUrgentSituation())
    vitalSurgeScore *= 0.5;
  if (currentMood === "defensive") vitalSurgeScore *= 1.3;
  if (currentMood === "aggressive") vitalSurgeScore *= 0.8;
  if (moveHistory.player === "vitalsurge") vitalSurgeScore *= 0.8;
  if (
    ["bash", "hexsmash", "fluxstrike", "chaosbolt"].includes(moveHistory.player)
  )
    vitalSurgeScore *= 1.2;
  moveScores.push({
    move: "vitalsurge",
    score: vitalSurgeScore,
    expectedHeal: vitalSurgeHeal,
  });

  const guardPulseBoost = calculateGuardPulseBoost();
  let guardPulseScore =
    guardPulseBoost * defenseBoostEfficiency * (1 - defenseDisadvantage);
  if (petStats.defenseBoosts >= DEFENSE_BOOST_CAP) guardPulseScore = 0;
  if (damageTakenRatio > 0.6) guardPulseScore *= 1.6;
  if (isEarlyGame && defenseDisadvantage < 0.9) guardPulseScore *= 1.1;
  if (opponentAttackBoosts >= 2) guardPulseScore *= 1.5;
  if (isLowDefense && petStats.defenseBoosts < DEFENSE_BOOST_CAP)
    guardPulseScore *= 1.1;
  if (opponentDamageDealtRatio > 0.4) guardPulseScore *= 1.1;
  if (currentMood === "defensive") guardPulseScore *= 1.1;
  if (currentMood === "aggressive") guardPulseScore *= 0.7;
  if (
    ["bash", "hexsmash", "fluxstrike", "chaosbolt"].includes(moveHistory.player)
  )
    guardPulseScore *= 1.1;
  if (moveHistory.player === "statsync") guardPulseScore *= 1.1;
  moveScores.push({
    move: "guardpulse",
    score: guardPulseScore,
    boostType: "defense",
    boostAmount: guardPulseBoost,
  });

  const statSyncBoost = calculateStatSyncBoost();
  let statSyncScore = statSyncBoost * attackBoostEfficiency * attackAdvantage;
  if (petStats.attackBoosts >= ATTACK_BOOST_CAP) statSyncScore = 0;
  if (attackAdvantage < 0.9) statSyncScore *= 1.4;
  if (isEndgame) statSyncScore *= 0.7;
  if (opponentDefenseBoosts >= 2) statSyncScore *= 1.1;
  if (opponentDamageTakenRatio < 0.3) statSyncScore *= 1.1;
  if (shouldPrioritizeStatSync && petStats.attackBoosts < ATTACK_BOOST_CAP)
    statSyncScore *= 2.0;
  if (currentMood === "aggressive") statSyncScore *= 1.1;
  if (currentMood === "defensive") statSyncScore *= 0.8;
  if (moveHistory.player === "guardpulse") statSyncScore *= 1.1;
  if (moveHistory.player === "statsync") statSyncScore *= 0.8;
  moveScores.push({
    move: "statsync",
    score: statSyncScore,
    boostType: "attack",
    boostAmount: statSyncBoost,
  });

  const equilibriumEffect = calculateEquilibriumEffect();
  let equilibriumScore =
    (equilibriumEffect.damage + equilibriumEffect.heal) * (hpDifference / 100);
  if (hpDifference <= 0) equilibriumScore = 0;
  if (hpDifference > HP_DIFF_THRESHOLD) equilibriumScore *= 1.6;
  if (isEndgame && equilibriumEffect.damage > targetPet.HP)
    equilibriumScore *= 2.2;
  if (assessCriticalSituation() && !assessUrgentSituation())
    equilibriumScore *= 2.0;
  if (equilibriumEffect.heal < opponentAvgDamage && !assessUrgentSituation())
    equilibriumScore *= 0.5;
  if (opponentAttackBoosts > 1) equilibriumScore *= 0.9;
  if (currentMood === "balanced") equilibriumScore *= 1.2;
  if (currentMood === "aggressive") equilibriumScore *= 0.9;
  if (moveHistory.player === "vitalsurge") equilibriumScore *= 0.8;
  if (
    ["bash", "hexsmash", "fluxstrike", "chaosbolt"].includes(moveHistory.player)
  )
    equilibriumScore *= 1.2;
  moveScores.push({
    move: "equilibrium",
    score: equilibriumScore,
    expectedDamage: equilibriumEffect.damage,
    expectedHeal: equilibriumEffect.heal,
  });

  const predictedOpponentMove = predictOpponentMove();
  if (
    ["bash", "hexsmash", "fluxstrike", "chaosbolt"].includes(
      predictedOpponentMove
    )
  ) {
    moveScores.forEach((move) => {
      if (
        move.move === "guardpulse" &&
        petStats.defenseBoosts < DEFENSE_BOOST_CAP
      ) {
        move.score *= 1.1;
      }
      if (move.move === "vitalsurge" && currentHPPercent < 10) {
        move.score *= 1.1;
      }
      if (move.move === "guardpulse" && currentHPPercent < 50) {
        move.score *= 1.1;
      }
    });
  }
  if (
    predictedOpponentMove === "guardpulse" &&
    petStats.attackBoosts < ATTACK_BOOST_CAP
  ) {
    moveScores.forEach((move) => {
      if (move.move === "statsync") {
        move.score *= 1.1;
      }
    });
  }
  if (
    predictedOpponentMove === "statsync" &&
    petStats.defenseBoosts < DEFENSE_BOOST_CAP
  ) {
    moveScores.forEach((move) => {
      if (move.move === "guardpulse") {
        move.score *= 1.1;
      }
    });
  }

  if (isEndgame) {
    moveScores.forEach((move) => {
      if (move.expectedDamage) {
        const damagePotential = move.expectedDamage / (targetPet.HP || 1);
        move.score *= 1 + assessEndgamePressure() * damagePotential;
        if (move.expectedDamage > targetPet.HP) {
          move.score *= 1.8;
        }
      }
    });
  }

  if (isEarlyGame && damageTakenRatio < 0.25) {
    moveScores.forEach((move) => {
      if (move.boostType) {
        move.score *= 1.3;
      }
    });
  }

  moveScores.forEach((move) => {
    if (move.move === moveHistory.ai) {
      move.score = 0;
    }
  });

  const assessMoveRisk = (move: MoveScore): number => {
    let risk = 0;
    if (move.expectedDamage) {
      risk += dodgeRisk * (1 - move.expectedDamage / (targetPet.maxHP || 1));
      if (opponentDefenseBoosts > 1) risk += 0.1;
    }
    if (move.expectedHeal) {
      risk -= move.expectedHeal / (activePet.maxHP || 1);
      if (opponentAttackBoosts > 1) risk += 0.05;
    }
    if (move.boostType) {
      risk -= (move.boostAmount || 0) / (activePet.level * 3);
      if (move.boostType === "attack" && opponentDefenseBoosts > 1) risk += 0.1;
      if (move.boostType === "defense" && opponentAttackBoosts > 1) risk -= 0.1;
    }
    return Math.max(-0.5, Math.min(0.5, risk));
  };

  const moodModifiers = {
    aggressive: (move: MoveScore) =>
      move.expectedDamage ? 1.2 : move.boostType === "attack" ? 1.1 : 0.8,
    defensive: (move: MoveScore) =>
      move.expectedHeal || move.move === "guardpulse"
        ? 1.2
        : move.boostType === "defense"
        ? 1.1
        : 0.8,
    balanced: () => 1,
  };

  moveScores.forEach((move) => {
    move.score *= moodModifiers[currentMood](move);
  });

  const unpredictabilityFactor = Math.random() * 0.2 + 0.8;
  moveScores.forEach((move) => {
    move.score *= unpredictabilityFactor + (Math.random() * 0.1 - 0.05);
  });

  const maxScore = Math.max(...moveScores.map((m) => m.score), 1);
  moveScores.forEach((move) => {
    move.score = (move.score / maxScore) * 100;
    move.score *= 1 - assessMoveRisk(move);
    move.score = Math.max(0, move.score);
  });

  if (Math.random() < randomnessFactor) {
    const nonZeroMoves = moveScores.filter((m) => m.score > 0);
    return nonZeroMoves.length > 0
      ? nonZeroMoves[Math.floor(Math.random() * nonZeroMoves.length)].move
      : moves[Math.floor(Math.random() * moves.length)];
  }

  if (
    assessUrgentSituation() &&
    vitalSurgeHeal > targetPet.calculateAttack(activePet.DF) &&
    Math.random() < 0.4
  ) {
    return "vitalsurge";
  }

  if (
    assessCriticalSituation() &&
    hpDifference > HP_DIFF_THRESHOLD &&
    equilibriumEffect.damage > 0 &&
    equilibriumEffect.heal > targetPet.calculateAttack(activePet.DF) &&
    Math.random() < 0.5
  ) {
    return "equilibrium";
  }

  if (
    isEndgame &&
    targetHPPercent < 20 &&
    moveScores.find((m) => m.move === "chaosbolt")?.expectedDamage! >
      targetPet.HP &&
    Math.random() < 0.9
  ) {
    return "chaosbolt";
  }

  if (
    isLowDefense &&
    petStats.defenseBoosts < DEFENSE_BOOST_CAP &&
    guardPulseBoost > activePet.level &&
    Math.random() < 0.3
  ) {
    return "guardpulse";
  }

  if (
    shouldPrioritizeStatSync &&
    petStats.attackBoosts < ATTACK_BOOST_CAP &&
    statSyncBoost > activePet.level &&
    Math.random() < 0.3
  ) {
    return "statsync";
  }

  const validMoves = moveScores.filter((m) => m.score > 0);
  if (validMoves.length === 0)
    return moves[Math.floor(Math.random() * moves.length)];

  const totalScore = validMoves.reduce((sum, m) => sum + m.score, 0);
  let randomScore = Math.random() * totalScore;
  for (const move of validMoves.sort((a, b) => b.score - a.score)) {
    randomScore -= move.score;
    if (randomScore <= 0) {
      return move.move;
    }
  }

  return (
    validMoves[Math.floor(Math.random() * validMoves.length)].move ||
    moves[Math.floor(Math.random() * moves.length)]
  );
}

const statMap = new Map<string, PersistentStats>();

function getInfos(data: UserData | Pick<UserData, "petsData" | "gearsData">) {
  const gearsManage = new GearsManage(data.gearsData);
  const petsData = new Inventory(data.petsData);
  const playersMap = new Map<string, PetPlayer>();
  for (const pet of petsData) {
    const petPlayer = new PetPlayer(pet, gearsManage.getGearData(pet.key));
    playersMap.set(pet.key, petPlayer);
  }

  return { petsData, playersMap };
}

function calculatePetStrength(pet: PetPlayer): number {
  return (
    (pet.ATK +
      Math.round(pet.DF / 10) +
      pet.MAGIC +
      pet.maxHP +
      Math.round(pet.ATK * 2.1)) *
    3.5
  );
}

export async function entry({
  input,
  output,
  money,
  ctx,
  prefix,
  commandName,
  getInflationRate,
}: CommandContext): Promise<any> {
  const rate = await getInflationRate();
  let gameState: ArenaGameState | null = {
    player1Pet: null,
    player2Pet: null,
    player1Author: input.senderID,
    player2Author: null,
    activePlayer: 1,
    flavorCache: "",
    prevMove1: null,
    prevMove2: null,
    turnCount: 0,
    isAIMode: input.arguments.includes("--ai"),
  };
  let isDefeat = false;

  const player1Data = await money.getItem(input.senderID);
  const { petsData, playersMap } = getInfos(player1Data);
  if (petsData.getAll().length < 1)
    return output.replyStyled(`You need at least one pet.`, style);

  const player1PetName = input.arguments.at(0);
  if (!player1PetName)
    return output.replyStyled(`Specify one pet name.`, style);

  const player1PetData = petsData
    .getAll()
    .find(
      (i) =>
        String(i?.name).toLowerCase().trim() ===
        player1PetName.toLowerCase().trim()
    );
  if (!player1PetData)
    return output.replyStyled(`Pet "${player1PetName}" not found.`, style);

  const player1Pet = playersMap.get(player1PetData.key);
  if (!player1Pet)
    return output.replyStyled(`Error loading pet "${player1PetName}".`, style);
  gameState.player1Pet = player1Pet;
  if (gameState.isAIMode) {
    const { pet: aiPet, author: aiAuthor } = await generateAIPet(
      money,
      player1Pet,
      input.arguments[1] !== "--ai" ? input.arguments[1] : ""
    );
    gameState.player2Pet = aiPet;
    gameState.player2Author = aiAuthor;

    // const player1StatSum = calculatePetStrength(player1Pet);
    // const player2StatSum = calculatePetStrength(aiPet);
    // const boost = Math.max(player1StatSum, player2StatSum) / 2;

    // const player1HpBoost = Math.round(boost);
    // player1Pet.hpModifier += player1HpBoost;
    // player1Pet.maxHPModifier += player1HpBoost;
    // player1Pet.HP = player1Pet.maxHP;

    // const player2HpBoost = Math.round(boost);
    // aiPet.hpModifier += player2HpBoost;
    // aiPet.maxHPModifier += player2HpBoost;
    // aiPet.HP = aiPet.maxHP;

    gameState.flavorCache = `Arena battle begins! ${
      gameState.activePlayer === 1 ? player1Data.name : "AI Opponent"
    } goes first.`;

    statMap.set(`${gameState.player1Author}_${player1Pet.OgpetData.key}`, {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      mercyContributed: 0,
      defenseBoosts: 0,
      attackBoosts: 0,
      healsPerformed: 0,
      lastMove: null,
    });
    statMap.set(`${gameState.player2Author}_${aiPet.OgpetData.key}`, {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      mercyContributed: 0,
      defenseBoosts: 0,
      attackBoosts: 0,
      healsPerformed: 0,
      lastMove: null,
    });

    await displayPetSelection(ctx);
    return;
  }

  const { pet: aiPetBefore } = await generateAIPet(
    money,
    player1Pet,
    input.arguments[1] !== "--ai" ? input.arguments[1] : ""
  );

  const infoBegin = await output.replyStyled(
    `⚔️ **Arena Challenge**:\n${
      player1Data.name
    } selected:\n\n${player1Pet.getPlayerUI({
      showStats: true,
      hideHP: true,
    })}\n\nReply with one pet name to join.\n\n🔎 Don't have actual opponents, or you want to win 💎 gems? Try --ai now! Just put --ai at the end.\n***EXAMPLE*** ${prefix}${commandName} ${
      input.arguments[0]
    } --ai\n***EXAMPLE w/ OPPONENT*** ${prefix}${commandName} ${
      input.arguments[0]
    } ${aiPetBefore?.petName ?? "<pet_name>"} --ai`,
    style
  );

  const startHandler = async (ctx: CommandContext) => {
    if (isDefeat || ctx.input.senderID === input.senderID) {
      await ctx.output.replyStyled(`❌ | A different player must join.`, style);
      return;
    }

    const player2Data = await ctx.money.getItem(ctx.input.senderID);
    const { petsData: player2PetsData, playersMap: player2PlayersMap } =
      getInfos(player2Data);
    if (player2PetsData.getAll().length < 1) {
      await ctx.output.replyStyled(`❌ | You need one pet to join.`, style);
      return;
    }

    const player2PetName = String(ctx.input.words[0]).trim();
    const player2PetData = player2PetsData
      .getAll()
      .find(
        (i) =>
          String(i?.name).toLowerCase().trim() ===
          player2PetName.toLowerCase().trim()
      );
    if (!player2PetData) {
      await ctx.output.replyStyled(
        `❌ | Pet "${player2PetName}" not found.`,
        style
      );
      return;
    }

    const player2Pet = player2PlayersMap.get(player2PetData.key);
    if (!player2Pet) {
      await ctx.output.replyStyled(
        `❌ | Error loading pet "${player2PetName}".`,
        style
      );
      return;
    }

    gameState!.player2Pet = player2Pet;
    gameState!.player2Author = ctx.input.senderID;
    gameState!.activePlayer = gameState.isAIMode
      ? 1
      : calculatePetStrength(player1Pet) < calculatePetStrength(player2Pet)
      ? 1
      : Math.random() < 0.5
      ? 1
      : 2;

    // const player1StatSum = calculatePetStrength(player1Pet);
    // const player2StatSum = calculatePetStrength(player2Pet);
    // const boost = Math.max(player1StatSum, player2StatSum) / 2;

    // const player1HpBoost = Math.round(boost);
    // player1Pet.hpModifier += player1HpBoost;
    // player1Pet.maxHPModifier += player1HpBoost;
    // player1Pet.HP = player1Pet.maxHP;

    // const player2HpBoost = Math.round(boost);
    // player2Pet.hpModifier += player2HpBoost;
    // player2Pet.maxHPModifier += player2HpBoost;
    // player2Pet.HP = player2Pet.maxHP;

    gameState!.flavorCache = `Arena battle begins! ${
      gameState!.activePlayer === 1 ? player1Data.name : player2Data.name
    } goes first.`;

    statMap.set(`${gameState!.player1Author}_${player1Pet.OgpetData.key}`, {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      mercyContributed: 0,
      defenseBoosts: 0,
      attackBoosts: 0,
      healsPerformed: 0,
      lastMove: null,
    });
    statMap.set(`${gameState!.player2Author}_${player2Pet.OgpetData.key}`, {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      mercyContributed: 0,
      defenseBoosts: 0,
      attackBoosts: 0,
      healsPerformed: 0,
      lastMove: null,
    });

    infoBegin.removeAtReply();
    await displayPetSelection(ctx);
  };

  infoBegin.atReply(startHandler);

  async function displayPetSelection(ctx: CommandContext): Promise<void> {
    if (!gameState || !gameState.player1Pet || !gameState.player2Pet) return;
    const activePet =
      gameState.activePlayer === 1
        ? gameState.player1Pet
        : gameState.player2Pet;
    const opponentPet =
      gameState.activePlayer === 1
        ? gameState.player2Pet
        : gameState.player1Pet;

    const result = `${UNIRedux.charm} ${
      gameState.flavorCache
    }\n\n${activePet.getPlayerUI({
      selectionOptions: petSchema,
      turn: true,
      showStats: true,
    })}\n\n**Opponent**\n${opponentPet.getPlayerUI({
      showStats: true,
    })}\n\n⚠️ **Remaining turns before ending:  ${
      MAX_TURNS - (gameState.turnCount + 1)
    }**\n\n***Reply with one option (word only)***`;

    if (gameState.isAIMode && gameState.activePlayer === 2) {
      const aiMove = generateAIMove(
        gameState,
        gameState.player2Pet,
        gameState.player1Pet,
        statMap.get(
          `${gameState.player2Author}_${gameState.player2Pet.OgpetData.key}`
        )!,
        gameState.prevMove2
      );
      await handleArenaTurn(
        ctx,
        new OutputResult(ctx, {
          messageID: "dummy",
          threadID: "dummy",
          senderID: "dummy",
          timestamp: Date.now(),
        }),
        aiMove,
        result
      );
    } else {
      const newInfo = await ctx.output.replyStyled(result, style);
      newInfo.atReply(
        async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
      );
    }
  }

  async function handlePlayerTurn(
    ctx: CommandContext,
    info: OutputResult,
    extraRes = ""
  ): Promise<void> {
    if (
      isDefeat ||
      !gameState ||
      !gameState.player1Pet ||
      !gameState.player2Pet
    ) {
      return;
    }

    if (gameState.isAIMode && gameState.activePlayer === 2) {
      const aiMove = generateAIMove(
        gameState,
        gameState.player2Pet,
        gameState.player1Pet,
        statMap.get(
          `${gameState.player2Author}_${gameState.player2Pet.OgpetData.key}`
        )!,
        gameState.prevMove2
      );
      await handleArenaTurn(ctx, info, aiMove, extraRes);
      return;
    }
    if (
      isDefeat ||
      !gameState ||
      !gameState.player1Pet ||
      !gameState.player2Pet ||
      ctx.input.senderID !==
        (gameState.activePlayer === 1
          ? gameState.player1Author
          : gameState.player2Author)
    ) {
      const player1Data = await ctx.money.getItem(gameState?.player1Author);
      const player2Data = await ctx.money.getItem(gameState?.player2Author);
      await ctx.output.replyStyled(
        `❌ | It's ${
          gameState?.activePlayer === 1 ? player1Data.name : player2Data.name
        }'s turn.`,
        style
      );
      return;
    }

    const turn = ctx.input.body.toLowerCase().trim();
    await handleArenaTurn(ctx, info, turn);
  }

  async function handleArenaTurn(
    ctx: CommandContext,
    info: OutputResult,
    turn: string,
    extraAIRes = ""
  ): Promise<void> {
    if (!gameState || !gameState.player1Pet || !gameState.player2Pet) return;

    if (
      gameState!.turnCount >= MAX_TURNS &&
      gameState.player1Pet.getPercentHP() !==
        gameState.player2Pet.getPercentHP()
    ) {
      info.removeAtReply();
      await handleNoTurns(ctx, info);
      return;
    }

    gameState!.turnCount += 1;
    const activePet =
      gameState.activePlayer === 1
        ? gameState.player1Pet
        : gameState.player2Pet;
    const targetPet =
      gameState.activePlayer === 1
        ? gameState.player2Pet
        : gameState.player1Pet;
    const petStats = statMap.get(
      `${
        gameState.activePlayer === 1
          ? gameState.player1Author
          : gameState.player2Author
      }_${activePet.OgpetData.key}`
    )!;
    const opponentStats = statMap.get(
      `${
        gameState.activePlayer === 1
          ? gameState.player2Author
          : gameState.player1Author
      }_${targetPet.OgpetData.key}`
    )!;
    const prevMove =
      gameState.activePlayer === 1 ? gameState.prevMove1 : gameState.prevMove2;
    let flavorText = "";
    let dodgeChance = Math.random();

    if (activePet.isDown()) {
      await handleDefeat(
        ctx,
        info,
        gameState.activePlayer === 1 ? 2 : 1,
        false,
        extraAIRes
      );
      return;
    }

    if (turn === "generate") {
      turn = generateAIMove(
        gameState,
        activePet,
        targetPet,
        petStats,
        prevMove
      );
    }
    const turnCTX = {
      activePet,
      opponentStats,
      petStats,
      targetPet,
      dodgeChance,
      prevMove,
    };

    switch (turn) {
      case "cheat":
        if (ctx.input.isAdmin) {
          const damage =
            targetPet.maxHP - activePet.calculateAttack(targetPet.DF);
          targetPet.HP -= damage;
          petStats.totalDamageDealt += damage;
          opponentStats.totalDamageTaken += damage;
          flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${
            activePet.petName
          }** cheated! Dealt **${damage}** damage.\n${targetPet.getPlayerUI(
            {}
          )}`;
        } else {
          flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** tried to cheat but failed.`;
        }
        break;

      case "bash": {
        const res = PetTurns.Bash(turnCTX);
        flavorText += res.flavor;
        break;
      }

      case "hexsmash": {
        const res = PetTurns.HexSmash(turnCTX);
        flavorText += res.flavor;
        break;
      }

      case "fluxstrike": {
        const res = PetTurns.FluxStrike(turnCTX);
        flavorText += res.flavor;
        break;
      }

      case "chaosbolt": {
        const res = PetTurns.ChaosBolt(turnCTX);
        flavorText += res.flavor;
        break;
      }

      case "laststand": {
        const res = PetTurns.LastStand(turnCTX);
        flavorText += res.flavor;
        break;
      }

      case "equilibrium":
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used ⚖️ **Equilibrium**!\n`;
        const eqFactor = Math.min(
          1 + petStats.totalDamageTaken / (activePet.maxHP * 2),
          2
        );
        const hpDiff = targetPet.getPercentHP() - activePet.getPercentHP();
        if (hpDiff > 0) {
          const statThreshold = activePet.level * 2;
          const attackStat = activePet.ATK + activePet.MAGIC;
          const defenseStat = activePet.DF + activePet.MAGIC;
          const attackFactor = Math.min(attackStat / statThreshold, 1);
          const defenseFactor = Math.min(defenseStat / statThreshold, 1);
          const damage = Math.round(
            activePet.calculateAttack(
              targetPet.DF,
              (activePet.ATK + activePet.MAGIC) / 2
            ) *
              (hpDiff / 100) *
              eqFactor *
              attackFactor
          );
          let heal = Math.round(
            ((activePet.DF + activePet.MAGIC) / 4) *
              (hpDiff / 100) *
              eqFactor *
              defenseFactor +
              activePet.maxHP * 0.05
          );
          const maxDamage = Math.round(targetPet.maxHP * 0.2);
          const maxHeal = Math.round(activePet.maxHP * 0.25);
          const finalDamage = Math.min(damage, maxDamage);
          const finalHeal = Math.min(
            heal,
            activePet.maxHP - activePet.HP,
            maxHeal
          );
          targetPet.HP -= finalDamage;
          activePet.HP += finalHeal;
          petStats.totalDamageDealt += finalDamage;
          opponentStats.totalDamageTaken += finalDamage;
          flavorText += `${
            UNIRedux.charm
          } Dealt **${finalDamage}** damage, healed **${finalHeal}** HP.\n${targetPet.getPlayerUI()}\n${activePet.getPlayerUI(
            { upperPop: `+${finalHeal} HP` }
          )}`;
          petStats.lastMove = "equilibrium";
        } else {
          flavorText += `${UNIRedux.charm} No effect! Opponent's HP% not higher.`;
        }
        break;
      case "defend":
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🛡️ **Defend**!`;
        break;
      // case "lifeup":
      //   flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used ✨ **LifeUp**!\n`;
      //   const healing = Math.max(
      //     Math.round((activePet.maxHP / 9) * (activePet.MAGIC * 0.09)),
      //     Math.round(activePet.maxHP / 9)
      //   );
      //   const finalHealing = Math.min(healing, activePet.maxHP - activePet.HP);
      //   activePet.HP += finalHealing;
      //   flavorText += `${UNIRedux.charm} Healed **${finalHealing}** HP.\n${activePet.getPlayerUI(
      //     {
      //       upperPop:
      //         activePet.HP >= activePet.maxHP ? `MAX` : `+${finalHealing} HP`,
      //     }
      //   )}`;
      //   break;
      case "guardpulse":
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🛡️ **GuardPulse**!\n`;
        const guardFactor = Math.max(0.5, 1 - petStats.defenseBoosts * 0.2);
        const guardBoost = Math.round(
          activePet.DF *
            (1 - activePet.HP / activePet.maxHP) *
            1.5 *
            guardFactor
        );
        activePet.defModifier += guardBoost;
        petStats.defenseBoosts += 1;
        flavorText += `${
          UNIRedux.charm
        } Defense boosted by **${guardBoost}**.\n${activePet.getPlayerUI({
          showStats: true,
        })}`;
        break;
      case "vitalsurge":
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 💖 **VitalSurge**!\n`;
        const healFactor = Math.min(
          1.5,
          1 + (1 - petStats.healsPerformed * 0.2)
        );
        const surgeHeal = Math.round(
          activePet.MAGIC *
            (1 + activePet.HP / activePet.maxHP) *
            0.5 *
            healFactor
        );
        const finalHeal = Math.min(surgeHeal, activePet.maxHP - activePet.HP);
        activePet.HP += finalHeal;
        petStats.healsPerformed += 1;
        flavorText += `${
          UNIRedux.charm
        } Healed **${finalHeal}** HP.\n${activePet.getPlayerUI({
          upperPop: `+${finalHeal} HP`,
        })}`;
        break;
      case "statsync":
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🔄 **StatSync**!\n`;
        const syncFactor = Math.max(0.5, 1 - petStats.attackBoosts * 0.2);
        const syncBoost = Math.round(
          Math.max(
            0,
            Math.min(
              (activePet.DF + 1) *
                (targetPet.DF / (activePet.DF || 1)) *
                0.4 *
                syncFactor,
              activePet.level * 2
            )
          )
        );
        activePet.atkModifier += syncBoost;
        petStats.attackBoosts += 1;
        flavorText += `${UNIRedux.charm} ${
          syncBoost < 1
            ? `ATK boost too weak.`
            : `ATK boosted by **${syncBoost}**.`
        }\n${activePet.getPlayerUI({ showStats: true })}`;
        break;
      default:
        flavorText = `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** doesn't know **${turn}**.`;
    }

    if (gameState.activePlayer === 1) gameState.prevMove1 = turn;
    else gameState.prevMove2 = turn;

    if (targetPet.HP <= 0) {
      info.removeAtReply();
      await handleWin(
        ctx,
        gameState.activePlayer,
        false,
        `${extraAIRes}\n\n${flavorText}`
      );
      return;
    }

    info.removeAtReply();
    gameState.activePlayer = gameState.activePlayer === 1 ? 2 : 1;
    const player1Data = await ctx.money.getItem(gameState.player1Author);
    const player2Data = await ctx.money.getItem(gameState.player2Author);
    gameState.flavorCache = `${
      gameState.activePlayer === 1 ? player1Data.name : player2Data.name
    }'s turn!`;
    let isCurrentAI = gameState.isAIMode && gameState.activePlayer === 2;

    let str = `${
      extraAIRes ? `${extraAIRes}\n` : ""
    }${flavorText}\n\n${targetPet.getPlayerUI({
      turn: isCurrentAI ? false : true,
      selectionOptions: petSchema,
      showStats: true,
    })}${isCurrentAI ? `\nAI is thinking...\n` : ""}`;
    if (!isCurrentAI) {
      str += `\n\n${
        gameState.activePlayer === 1 ? player1Data.name : player2Data.name
      }, select your move!\n\n⚠️ **Remaining turns before ending:  ${
        MAX_TURNS - (gameState.turnCount + 1)
      }**\n\n***Reply with one option (word only)***`;
    }
    if (!isCurrentAI) {
      const newInfo = await ctx.output.replyStyled(str, style);

      newInfo.atReply(
        async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
      );
    } else {
      await handlePlayerTurn(ctx, info, str);
    }
  }

  async function handleWin(
    ctx: CommandContext,
    winner: 1 | 2,
    isMaxTurns = false,
    extraText = ""
  ): Promise<void> {
    if (!gameState || !gameState.player1Pet || !gameState.player2Pet) return;
    const winnerPet =
      winner === 1 ? gameState.player1Pet : gameState.player2Pet;
    const loserPet = winner === 1 ? gameState.player2Pet : gameState.player1Pet;
    const winnerId =
      winner === 1 ? gameState.player1Author : gameState.player2Author;
    const loserId =
      winner === 1 ? gameState.player2Author : gameState.player1Author;

    let winnerPts = Math.round(
      (statMap.get(`${winnerId}_${winnerPet.OgpetData.key}`)!.totalDamageDealt /
        10) *
        1.5
    );
    winnerPts = Math.round(winnerPts ** 1.01);
    let winnerCash = Math.round(Math.max(0, Math.pow(winnerPts * 1000, 1.2)));
    winnerCash += Math.round(winnerCash * rate);
    const loserPts = Math.round(
      statMap.get(`${loserId}_${loserPet.OgpetData.key}`)!.totalDamageDealt / 10
    );
    const loserCash = Math.round(Math.max(0, Math.pow(winnerPts * 100, 1.1)));
    winnerCash += Math.round(loserCash * rate);

    const winnerData = await ctx.money.getItem(winnerId);
    const winnerName =
      winner === 2 && gameState.isAIMode ? "AI Opponent" : winnerData.name;
    const loserData: Partial<UserData> = loserId
      ? await ctx.money.getItem(loserId)
      : { name: "AI Opponent", battlePoints: 0 };
    const loserName =
      winner === 1 && gameState.isAIMode ? "AI Opponent" : loserData.name;
    let wonDias = 0;
    if (!gameState.isAIMode || winner === 1) {
      const cll = new Collectibles(winnerData.collectibles);
      // astral momints
      cll.register("stellarGems", {
        key: "stellarGems",
        name: "Stellar Gems",
        flavorText: "Shimmering gems from the cosmos.",
        icon: "💎",
        type: "currency",
      });
      cll.register("intertwinedFate", {
        key: "intertwinedFate",
        name: "Intertwined Fate",
        flavorText: "The threads that bind destinies together.",
        icon: "🔮",
        type: "currency",
      });

      const stre =
        calculatePetStrength(winnerPet) + calculatePetStrength(loserPet);
      const diasReward =
        Math.max(1, Math.min(100, Math.floor(stre / 2 / 500))) || -1;
      if (gameState.isAIMode) {
        cll.raise("gems", diasReward);
        cll.raise("stellarGems", diasReward);
        cll.raise("intertwinedFate", diasReward);
        wonDias = diasReward;
      }
      await ctx.money.setItem(winnerId, {
        ...winnerData,
        collectibles: Array.from(cll),
        money: (winnerData.money || 0) + winnerCash,
        battlePoints: (winnerData.battlePoints || 0) + winnerPts,
      });
    }
    if (!gameState.isAIMode && loserId) {
      await ctx.money.setItem(loserId, {
        ...loserData,
        money: (loserData.money || 0) + loserCash,
        battlePoints: (loserData.battlePoints || 0) + loserPts,
      });
    }

    await ctx.output.replyStyled(
      (extraText ? `${extraText.trimEnd()}\n\n` : "") +
        (isMaxTurns
          ? `${
              UNIRedux.charm
            } Max turns reached!\n${winnerName} wins by having **higher remaining HP%**!\n${
              winnerPet.petIcon
            } **${winnerPet.petName}** had more health than ${
              loserPet.petIcon
            } **${loserPet.petName}**.\n${winnerName} earned ${formatCash(
              winnerPts,
              "💷",
              true
            )}, and ${formatCash(winnerCash, true)} **${
              wonDias
                ? ` and **${wonDias}** 💎 stellar gems & gems & 🔮 intertwined fate`
                : ""
            }**, ${loserName} earned ${formatCash(
              loserPts,
              "💷",
              true
            )} and ${formatCash(loserCash, true)}.`
          : `${UNIRedux.charm} ${winnerName} wins!\n${winnerPet.petIcon} **${
              winnerPet.petName
            }** defeated ${loserPet.petIcon} **${
              loserPet.petName
            }**!\n${winnerName} earned ${formatCash(
              winnerPts,
              "💷",
              true
            )}, and ${formatCash(winnerCash, true)} **${
              wonDias
                ? ` and **${wonDias}** 💎 stellar gems & gems & 🔮 intertwined fate!`
                : ""
            }**, ${loserName} earned ${formatCash(
              loserPts,
              "💷",
              true
            )} and ${formatCash(loserCash, true)}.`),
      style
    );

    gameState = null;
  }

  async function handleDefeat(
    ctx: CommandContext,
    info: OutputResult,
    winner: 1 | 2,
    isMaxTurns = false,
    extraText = ""
  ): Promise<void> {
    isDefeat = true;
    info.removeAtReply();
    await handleWin(ctx, winner, isMaxTurns, extraText);
  }

  async function handleNoTurns(
    ctx: CommandContext,
    info: OutputResult,
    extraText = ""
  ): Promise<void> {
    if (!gameState || !gameState.player1Pet || !gameState.player2Pet) return;
    info.removeAtReply();
    let winner = null;

    const hp1 = gameState.player1Pet.getPercentHP();
    const hp2 = gameState.player2Pet.getPercentHP();

    if (hp1 > hp2) {
      winner = gameState.player1Pet;
    } else if (hp2 > hp1) {
      winner = gameState.player2Pet;
    }

    let xis = winner === gameState.player1Pet ? 1 : 2;

    if (xis === 2) {
      isDefeat = true;
    }

    await handleWin(ctx, xis as 1 | 2, true, extraText);
  }
}
