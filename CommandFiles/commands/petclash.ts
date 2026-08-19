import { GearsManage, PetPlayer } from "@cass-plugins/pet-fight";
import { Inventory } from "@cass-modules/InventoryEnhanced";
import { FontSystem, UNIRedux } from "cassidy-styler";
import { OutputResult } from "@cass-plugins/output";
import { PersistentStats, PetSchema } from "@cass-modules/Encounter";

export const meta: CommandMeta = {
  name: "petclash",
  description: "Multi-pet PvP battle system with up to 7 pets per player",
  otherNames: ["clash"],
  version: "1.0.3",
  usage: "{prefix}{name} [pet1|pet2|pet3...]",
  category: "Pet Games",
  author: "@lianecagara",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.7.0",
  icon: "⚔️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style: CommandStyle = {
  title: `⚔️ PetClash ${FontSystem.applyFonts("EX", "double_struck")}`,
  titleFont: "bold_italic",
  contentFont: "fancy",
  lineDeco: "altar",
};

const petSchema: PetSchema = {
  fight: false,
  item: false,
  magic: false,
  mercy: false,
  defend: true,
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
  },
};

const MAX_TURNS = 300;
const MIN_PETS = 3;
const MAX_PETS = 7;

interface PetClashGameState {
  player1Pets: PetPlayer[];
  player2Pets: PetPlayer[];
  player1Author: string;
  player2Author: string | null;
  activePlayer: 1 | 2;
  flavorCache: string;
  prevMoves1: Map<string, string>;
  prevMoves2: Map<string, string>;
  turnCount: number;
  downPets1: Set<string>;
  downPets2: Set<string>;
}

const statMap = new Map<string, PersistentStats>();

function getInfos(data: UserData) {
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

function getDownHeal(pet: PetPlayer): number {
  const heal = Math.round(Math.random() * 10 + 10);
  return Math.min(heal, Math.round(pet.maxHP * 0.17));
}

function getRandomPet(pets: PetPlayer[], preferLowestHP: boolean): PetPlayer {
  if (pets.length === 0) throw new Error("No pets available");
  if (preferLowestHP) {
    const lowestHP = pets.reduce(
      (min, pet) => (!pet.isDown() && pet.HP < min.HP ? pet : min),
      pets[0]
    );
    return lowestHP;
  }
  const activePets = pets.filter((pet) => !pet.isDown());
  return activePets[Math.floor(Math.random() * activePets.length)] || pets[0];
}

export async function entry({
  input,
  output,
  money,
  getInflationRate,
}: CommandContext): Promise<any> {
  let gameState: PetClashGameState | null = {
    player1Pets: [],
    player2Pets: [],
    player1Author: input.senderID,
    player2Author: null,
    activePlayer: 1,
    flavorCache: "",
    prevMoves1: new Map(),
    prevMoves2: new Map(),
    turnCount: 0,
    downPets1: new Set(),
    downPets2: new Set(),
  };
  let isDefeat = false;
  const rate = await getInflationRate();

  const player1Data = await money.getItem(input.senderID);
  const { petsData, playersMap } = getInfos(player1Data);
  if (petsData.getAll().length < MIN_PETS)
    return output.replyStyled(`You need at least ${MIN_PETS} pets.`, style);

  const player1PetNames = input.splitArgs("|") || [];
  if (player1PetNames.length < MIN_PETS || player1PetNames.length > MAX_PETS)
    return output.replyStyled(
      `Select ${MIN_PETS} to ${MAX_PETS} pets (e.g., pet1|pet2|pet3).`,
      style
    );

  const player1Pets: PetPlayer[] = [];
  const uniqueNames = new Set<string>();
  for (const name of player1PetNames) {
    const petData = petsData
      .getAll()
      .find(
        (i) =>
          String(i?.name).toLowerCase().trim() === name.toLowerCase().trim()
      );
    if (!petData || uniqueNames.has(name.toLowerCase()))
      return output.replyStyled(`Invalid or duplicate pet "${name}".`, style);
    const pet = playersMap.get(petData.key);
    if (!pet) return output.replyStyled(`Error loading pet "${name}".`, style);
    player1Pets.push(pet);
    uniqueNames.add(name.toLowerCase());
  }
  gameState.player1Pets = player1Pets;

  const infoBegin = await output.replyStyled(
    `⚔️ **PetClash Challenge**:\n${player1Data.name} selected:\n\n${player1Pets
      .map((pet) => pet.getPlayerUI({ showStats: true, hideHP: true }))
      .join(
        "\n"
      )}\n\nReply with ${MIN_PETS} to ${MAX_PETS} pet names (e.g., pet1|pet2|pet3) to join.`,
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
    if (player2PetsData.getAll().length < MIN_PETS) {
      await ctx.output.replyStyled(
        `❌ | You need ${MIN_PETS} pets to join.`,
        style
      );
      return;
    }

    const player2PetNames = ctx.input.splitBody("|") || [];
    if (
      player2PetNames.length < MIN_PETS ||
      player2PetNames.length > MAX_PETS
    ) {
      await ctx.output.replyStyled(
        `❌ | Select ${MIN_PETS} to ${MAX_PETS} pets (e.g., pet1|pet2|pet3).`,
        style
      );
      return;
    }

    const player2Pets: PetPlayer[] = [];
    const uniqueNames = new Set<string>();
    for (const name of player2PetNames) {
      const petData = player2PetsData
        .getAll()
        .find(
          (i) =>
            String(i?.name).toLowerCase().trim() === name.toLowerCase().trim()
        );
      if (!petData || uniqueNames.has(name.toLowerCase()))
        return ctx.output.replyStyled(
          `❌ | Invalid or duplicate pet "${name}".`,
          style
        );
      const pet = player2PlayersMap.get(petData.key);
      if (!pet)
        return ctx.output.replyStyled(
          `❌ | Error loading pet "${name}".`,
          style
        );
      player2Pets.push(pet);
      uniqueNames.add(name.toLowerCase());
    }
    gameState!.player2Pets = player2Pets;
    gameState!.player2Author = ctx.input.senderID;

    const player1Strength = player1Pets.reduce(
      (sum, pet) => sum + calculatePetStrength(pet),
      0
    );
    const player2Strength = player2Pets.reduce(
      (sum, pet) => sum + calculatePetStrength(pet),
      0
    );
    gameState!.activePlayer =
      player1Strength < player2Strength ? 1 : Math.random() < 0.5 ? 1 : 2;

    const boost =
      Math.max(player1Strength, player2Strength) / (2 * player1Pets.length);
    for (const pet of player1Pets) {
      const hpBoost = Math.round(boost);
      pet.hpModifier += hpBoost;
      pet.maxHPModifier += hpBoost;
      pet.HP = pet.maxHP;
      statMap.set(`${gameState!.player1Author}_${pet.OgpetData.key}`, {
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        mercyContributed: 0,
        defenseBoosts: 0,
        attackBoosts: 0,
        healsPerformed: 0,
        lastMove: null,
      });
    }
    for (const pet of player2Pets) {
      const hpBoost = Math.round(boost);
      pet.hpModifier += hpBoost;
      pet.maxHPModifier += hpBoost;
      pet.HP = pet.maxHP;
      statMap.set(`${gameState!.player2Author}_${pet.OgpetData.key}`, {
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        mercyContributed: 0,
        defenseBoosts: 0,
        attackBoosts: 0,
        healsPerformed: 0,
        lastMove: null,
      });
    }

    gameState!.flavorCache = `PetClash begins! ${
      gameState!.activePlayer === 1 ? player1Data.name : player2Data.name
    } goes first.`;

    infoBegin.removeAtReply();
    await displayPetSelection(ctx);
  };

  infoBegin.atReply(startHandler);

  async function displayPetSelection(ctx: CommandContext): Promise<void> {
    if (
      !gameState ||
      !gameState.player1Pets.length ||
      !gameState.player2Pets.length
    )
      return;
    const activePets =
      gameState.activePlayer === 1
        ? gameState.player1Pets
        : gameState.player2Pets;
    const opponentPets =
      gameState.activePlayer === 1
        ? gameState.player2Pets
        : gameState.player1Pets;

    const activeUI = activePets
      .map((pet, ind) =>
        pet.getPlayerUI({
          selectionOptions: petSchema,
          turn: ind === 0,
          showStats: true,
          upperPop: gameState[
            gameState.activePlayer === 1 ? "downPets1" : "downPets2"
          ].has(pet.OgpetData.key)
            ? "DOWN"
            : undefined,
        })
      )
      .join("\n\n");
    const opponentUI = opponentPets
      .map((pet) =>
        pet.getPlayerUI({
          showStats: true,
          upperPop: gameState[
            gameState.activePlayer === 1 ? "downPets2" : "downPets1"
          ].has(pet.OgpetData.key)
            ? "DOWN"
            : undefined,
        })
      )
      .join("\n\n");

    const result = `${UNIRedux.charm} ${
      gameState.flavorCache
    }\n\n**Your Team**\n${activeUI}\n\n**Opponent Team**\n${opponentUI}\n\n⚠️ **Turn ${
      gameState.turnCount + 1
    }/${MAX_TURNS}**\n\n***Reply with moves (e.g., bash:pet1 | hexsmash:pet2 or bash all)***`;

    const newInfo = await ctx.output.replyStyled(result, style);
    newInfo.atReply(
      async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
    );
  }

  async function handlePlayerTurn(
    ctx: CommandContext,
    info: OutputResult
  ): Promise<void> {
    if (
      isDefeat ||
      !gameState ||
      !gameState.player1Pets.length ||
      !gameState.player2Pets.length ||
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

    const turnInput = ctx.input.body.trim();
    const moves = turnInput.includes("|")
      ? turnInput.split("|").map((s) => s.trim())
      : [turnInput];
    const isAll =
      ctx.input.words.some((w) => w.toLowerCase() === "all") ||
      (!turnInput.includes("|") && moves.length === 1);

    if (isAll && moves.length > 1) {
      await ctx.output.replyStyled(
        `❌ | Use 'all' with one move or use '|' for multiple moves.`,
        style
      );
      return;
    }

    const activePets = (
      gameState.activePlayer === 1
        ? gameState.player1Pets
        : gameState.player2Pets
    ).filter((pet) => !pet.isDown());
    if (activePets.length === 0) {
      await handleDefeat(ctx, info, gameState.activePlayer === 1 ? 2 : 1);
      return;
    }

    const parsedMoves: { move: string; targetPet: PetPlayer | null }[] = [];
    if (isAll) {
      const [move, targetName] = moves[0]
        .split(":")
        .map((s) => s.trim().toLowerCase());
      const targetPet = targetName
        ? activePets.find((pet) => pet.petName.toLowerCase() === targetName) ||
          null
        : null;
      for (const _ of activePets) {
        parsedMoves.push({ move, targetPet });
      }
    } else {
      for (const moveStr of moves) {
        const [move, targetName] = moveStr
          .split(":")
          .map((s) => s.trim().toLowerCase());
        const targetPet = targetName
          ? (gameState.activePlayer === 1
              ? gameState.player2Pets
              : gameState.player1Pets
            ).find((pet) => pet.petName.toLowerCase() === targetName) || null
          : null;
        parsedMoves.push({ move, targetPet });
      }
    }

    await handlePetClashTurn(ctx, info, parsedMoves);
  }

  async function handlePetClashTurn(
    ctx: CommandContext,
    info: OutputResult,
    moves: { move: string; targetPet: PetPlayer | null }[]
  ): Promise<void> {
    if (
      !gameState ||
      !gameState.player1Pets.length ||
      !gameState.player2Pets.length
    )
      return;

    if (gameState.turnCount >= MAX_TURNS) {
      info.removeAtReply();
      await handleNoTurns(ctx, info);
      return;
    }
    gameState.turnCount += 1;

    const activePets =
      gameState.activePlayer === 1
        ? gameState.player1Pets
        : gameState.player2Pets;
    const opponentPets =
      gameState.activePlayer === 1
        ? gameState.player2Pets
        : gameState.player1Pets;
    const activeDownSet =
      gameState.activePlayer === 1 ? gameState.downPets1 : gameState.downPets2;
    const prevMoves =
      gameState.activePlayer === 1
        ? gameState.prevMoves1
        : gameState.prevMoves2;
    let flavorText = "";

    for (const pet of activePets) {
      if (pet.isDown()) {
        const heal = getDownHeal(pet);
        pet.HP += heal;
        if (pet.HP > 0) {
          activeDownSet.delete(pet.OgpetData.key);
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** revived with **${heal}** HP!\n`;
        }
      }
    }
    for (const pet of opponentPets) {
      if (pet.isDown()) {
        const heal = getDownHeal(pet);
        pet.HP += heal;
        if (pet.HP > 0) {
          (gameState.activePlayer === 1
            ? gameState.downPets2
            : gameState.downPets1
          ).delete(pet.OgpetData.key);
        }
      }
    }

    for (let i = 0; i < moves.length && i < activePets.length; i++) {
      const { move, targetPet: specifiedTarget } = moves[i];
      const activePet = activePets[i % activePets.length];
      if (activePet.isDown()) continue;

      const petStats = statMap.get(
        `${
          gameState.activePlayer === 1
            ? gameState.player1Author
            : gameState.player2Author
        }_${activePet.OgpetData.key}`
      )!;
      const prevMove = prevMoves.get(activePet.OgpetData.key) || null;
      let targetPet = specifiedTarget;
      let opponentStats: PersistentStats | null = null;

      if (!targetPet || targetPet.isDown()) {
        const preferLowestHP = Math.random() < 0.5;
        targetPet = getRandomPet(
          opponentPets.filter((p) => !p.isDown()),
          preferLowestHP
        );
      }
      opponentStats = statMap.get(
        `${
          gameState.activePlayer === 1
            ? gameState.player2Author
            : gameState.player1Author
        }_${targetPet.OgpetData.key}`
      )!;

      let dodgeChance = Math.random();
      switch (move) {
        case "cheat":
          if (ctx.input.isAdmin) {
            const damage =
              targetPet.maxHP - activePet.calculateAttack(targetPet.DF);
            targetPet.HP -= damage;
            petStats.totalDamageDealt += damage;
            opponentStats.totalDamageTaken += damage;
            flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${
              activePet.petName
            }** cheated on **${
              targetPet.petName
            }**! Dealt **${damage}** damage.\n${targetPet.getPlayerUI({})}\n`;
          } else {
            flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** tried to cheat but failed.\n`;
          }
          break;
        case "bash":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🥊 **Bash** on **${targetPet.petName}**!\n`;
          if ((prevMove === "bash" && dodgeChance < 0.7) || dodgeChance < 0.1) {
            flavorText += `${UNIRedux.charm} **${targetPet.petName}** dodged!\n`;
          } else {
            const damage = Math.round(activePet.calculateAttack(targetPet.DF));
            targetPet.HP -= damage;
            petStats.totalDamageDealt += damage;
            opponentStats.totalDamageTaken += damage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${damage}** damage.\n${targetPet.getPlayerUI()}\n`;
          }
          break;
        case "hexsmash":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 💥 **HexSmash** on **${targetPet.petName}**!\n`;
          if (
            (prevMove === "hexsmash" && dodgeChance < 0.7) ||
            dodgeChance < 0.1
          ) {
            flavorText += `${UNIRedux.charm} **${targetPet.petName}** dodged!\n`;
          } else {
            const meanStat = Math.min(
              (activePet.ATK + activePet.MAGIC) / 2,
              activePet.ATK * 3
            );
            const damage = Math.round(
              activePet.calculateAttack(targetPet.DF, meanStat) * 1.5
            );
            targetPet.HP -= damage;
            petStats.totalDamageDealt += damage;
            opponentStats.totalDamageTaken += damage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${damage}** magical damage.\n${targetPet.getPlayerUI()}\n`;
          }
          break;
        case "fluxstrike":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🌩️ **FluxStrike** on **${targetPet.petName}**!\n`;
          if (
            (prevMove === "fluxstrike" && dodgeChance < 0.7) ||
            dodgeChance < 0.1
          ) {
            flavorText += `${UNIRedux.charm} **${targetPet.petName}** dodged!\n`;
          } else {
            const damageFactor = Math.max(
              0.5,
              1 - petStats.totalDamageDealt / (targetPet.maxHP * 2)
            );
            const fluxMultiplier =
              1 +
              Math.random() *
                0.5 *
                (targetPet.HP / targetPet.maxHP) *
                damageFactor;
            const damage = Math.round(
              activePet.ATK * fluxMultiplier - targetPet.DF / 5
            );
            targetPet.HP -= damage;
            petStats.totalDamageDealt += damage;
            opponentStats.totalDamageTaken += damage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${damage}** fluctuating damage.\n${targetPet.getPlayerUI()}\n`;
          }
          break;
        case "chaosbolt":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used ⚡ **ChaosBolt** on **${targetPet.petName}**!\n`;
          if (
            (prevMove === "chaosbolt" && dodgeChance < 0.9) ||
            dodgeChance < 0.5
          ) {
            flavorText += `${UNIRedux.charm} **${targetPet.petName}** dodged!\n`;
          } else {
            const statThreshold = activePet.level * 2;
            const statFactor = Math.min(
              (activePet.ATK + activePet.MAGIC) / statThreshold,
              1
            );
            const effectiveStat = Math.max(activePet.ATK, activePet.MAGIC / 2);
            let damage = Math.round(
              activePet.calculateAttack(targetPet.DF, effectiveStat) *
                statFactor
            );
            const chaosChance =
              Math.min(
                ((activePet.ATK + activePet.MAGIC) / (targetPet.DF || 1)) * 0.2,
                0.3
              ) *
              (1 - petStats.attackBoosts * 0.1);
            if (Math.random() < chaosChance && statFactor >= 1) {
              damage = Math.round(damage * 1.5);
              flavorText += `${UNIRedux.charm} Critical chaos hit! `;
            }
            damage = Math.min(damage, Math.round(targetPet.maxHP * 0.25));
            targetPet.HP -= damage;
            petStats.totalDamageDealt += damage;
            opponentStats.totalDamageTaken += damage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${damage}** damage.\n${targetPet.getPlayerUI()}\n`;
            petStats.lastMove = "chaosbolt";
          }
          break;
        case "equilibrium":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used ⚖️ **Equilibrium** on **${targetPet.petName}**!\n`;
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
            )}\n`;
            petStats.lastMove = "equilibrium";
          } else {
            flavorText += `${UNIRedux.charm} No effect! Opponent's HP% not higher.\n`;
          }
          break;
        case "defend":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🛡️ **Defend**!\n`;
          break;
        // case "lifeup":
        //   flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used ✨ **LifeUp**!\n`;
        //   const healing = Math.max(
        //     Math.round((activePet.maxHP / 9) * (activePet.MAGIC * 0.09)),
        //     Math.round(activePet.maxHP / 9)
        //   );
        //   const targetHealPet =
        //     Math.random() < 0.3 || activePet.HP < activePet.maxHP
        //       ? activePet
        //       : activePets.reduce(
        //           (min, pet) => (!pet.isDown() && pet.HP < min.HP ? pet : min),
        //           activePets[0]
        //         );
        //   const finalHealing = Math.min(
        //     healing,
        //     targetHealPet.maxHP - targetHealPet.HP
        //   );
        //   targetHealPet.HP += finalHealing;
        //   petStats.healsPerformed += 1;
        //   flavorText += `${
        //     UNIRedux.charm
        //   } Healed **${finalHealing}** HP for **${
        //     targetHealPet.petName
        //   }**.\n${targetHealPet.getPlayerUI({
        //     upperPop:
        //       targetHealPet.HP >= targetHealPet.maxHP
        //         ? `MAX`
        //         : `+${finalHealing} HP`,
        //   })}\n`;
        //   break;
        case "vitalsurge":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 💖 **VitalSurge**!\n`;
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
          const targetSurgePet = activePets.reduce(
            (min, pet) => (!pet.isDown() && pet.HP < min.HP ? pet : min),
            activePets[0]
          );
          const finalHeal = Math.min(
            surgeHeal,
            targetSurgePet.maxHP - targetSurgePet.HP
          );
          targetSurgePet.HP += finalHeal;
          petStats.healsPerformed += 1;
          flavorText += `${UNIRedux.charm} Healed **${finalHeal}** HP for **${
            targetSurgePet.petName
          }**.\n${targetSurgePet.getPlayerUI({
            upperPop: `+${finalHeal} HP`,
          })}\n`;
          break;
        case "guardpulse":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🛡️ **GuardPulse**!\n`;
          const guardFactor = Math.max(0.5, 1 - petStats.defenseBoosts * 0.2);
          const guardTarget =
            Math.random() < 0.5
              ? activePets.reduce(
                  (min, pet) => (!pet.isDown() && pet.DF < min.DF ? pet : min),
                  activePets[0]
                )
              : getRandomPet(activePets, false);
          const guardBoost = Math.round(
            guardTarget.DF *
              (1 - guardTarget.HP / guardTarget.maxHP) *
              1.5 *
              guardFactor
          );
          guardTarget.defModifier += guardBoost;
          petStats.defenseBoosts += 1;
          flavorText += `${
            UNIRedux.charm
          } Defense boosted by **${guardBoost}** for **${
            guardTarget.petName
          }**.\n${guardTarget.getPlayerUI({
            showStats: true,
          })}\n`;
          break;
        case "statsync":
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** used 🔄 **StatSync**!\n`;
          const syncFactor = Math.max(0.5, 1 - petStats.attackBoosts * 0.2);
          const syncTarget =
            Math.random() < 0.5
              ? activePets.reduce(
                  (min, pet) =>
                    !pet.isDown() && pet.ATK < min.ATK ? pet : min,
                  activePets[0]
                )
              : getRandomPet(activePets, false);
          const syncBoost = Math.round(
            Math.max(
              0,
              Math.min(
                (syncTarget.DF + 1) *
                  (targetPet.DF / (syncTarget.DF || 1)) *
                  0.4 *
                  syncFactor,
                syncTarget.level * 2
              )
            )
          );
          syncTarget.atkModifier += syncBoost;
          petStats.attackBoosts += 1;
          flavorText += `${UNIRedux.charm} ${
            syncBoost < 1
              ? `ATK boost too weak for **${syncTarget.petName}**.`
              : `ATK boosted by **${syncBoost}** for **${syncTarget.petName}**.`
          }\n${syncTarget.getPlayerUI({ showStats: true })}\n`;
          break;
        default:
          flavorText += `${UNIRedux.charm} ${activePet.petIcon} **${activePet.petName}** doesn't know **${move}**.\n`;
      }

      if (targetPet.HP <= 0 && !targetPet.isDown()) {
        (gameState.activePlayer === 1
          ? gameState.downPets2
          : gameState.downPets1
        ).add(targetPet.OgpetData.key);
        flavorText += `${UNIRedux.charm} **${targetPet.petName}** is down!\n`;
      }
      prevMoves.set(activePet.OgpetData.key, move);
    }

    const opponentActivePets = opponentPets.filter((pet) => !pet.isDown());
    if (opponentActivePets.length === 0) {
      info.removeAtReply();
      await handleWin(ctx, gameState.activePlayer);
      return;
    }
    if (activePets.length === 0) {
      info.removeAtReply();
      await handleDefeat(ctx, info, gameState.activePlayer === 1 ? 2 : 1);
      return;
    }

    info.removeAtReply();
    gameState.activePlayer = gameState.activePlayer === 1 ? 2 : 1;
    const player1Data = await ctx.money.getItem(gameState.player1Author);
    const player2Data = await ctx.money.getItem(gameState.player2Author);
    gameState.flavorCache = `${
      gameState.activePlayer === 1 ? player1Data.name : player2Data.name
    }'s turn!`;

    const activeUI = (
      gameState.activePlayer === 1
        ? gameState.player1Pets
        : gameState.player2Pets
    )
      .map((pet, ind) =>
        pet.getPlayerUI({
          selectionOptions: petSchema,
          turn: ind === 0,
          showStats: true,
          upperPop: (gameState.activePlayer === 1
            ? gameState.downPets1
            : gameState.downPets2
          ).has(pet.OgpetData.key)
            ? "DOWN"
            : undefined,
        })
      )
      .join("\n\n");
    const opponentUI = (
      gameState.activePlayer === 1
        ? gameState.player2Pets
        : gameState.player1Pets
    )
      .map((pet) =>
        pet.getPlayerUI({
          showStats: true,
          upperPop: (gameState.activePlayer === 1
            ? gameState.downPets2
            : gameState.downPets1
          ).has(pet.OgpetData.key)
            ? "DOWN"
            : undefined,
        })
      )
      .join("\n\n");

    const newInfo = await ctx.output.replyStyled(
      `${flavorText}\n\n**Your Team**\n${activeUI}\n\n**Opponent Team**\n${opponentUI}\n\n⚠️ **Turn ${
        gameState.turnCount + 1
      }/${MAX_TURNS}**\n\n***Reply with moves (e.g., bash:pet1 | hexsmash:pet2 or bash all)***`,
      style
    );

    newInfo.atReply(
      async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
    );
  }

  async function handleWin(
    ctx: CommandContext,
    winner: 1 | 2,
    isMaxTurns = false
  ): Promise<void> {
    if (
      !gameState ||
      !gameState.player1Pets.length ||
      !gameState.player2Pets.length
    )
      return;
    const winnerPets =
      winner === 1 ? gameState.player1Pets : gameState.player2Pets;
    const loserPets =
      winner === 1 ? gameState.player2Pets : gameState.player1Pets;
    const winnerId =
      winner === 1 ? gameState.player1Author : gameState.player2Author;
    const loserId =
      winner === 1 ? gameState.player2Author : gameState.player1Author;

    let winnerPts = Math.round(
      winnerPets.reduce(
        (sum, pet) =>
          sum +
          statMap.get(`${winnerId}_${pet.OgpetData.key}`)!.totalDamageDealt /
            10,
        0
      ) * 1.5
    );
    let loserPts = Math.round(
      loserPets.reduce(
        (sum, pet) =>
          sum +
          statMap.get(`${loserId}_${pet.OgpetData.key}`)!.totalDamageDealt / 10,
        0
      )
    );
    winnerPts += Math.round(winnerPts * rate);
    loserPts += Math.round(loserPts * rate);

    const winnerData = await ctx.money.getItem(winnerId);
    const loserData = await ctx.money.getItem(loserId);
    await ctx.money.setItem(winnerId, {
      ...winnerData,
      battlePoints: (winnerData.battlePoints || 0) + winnerPts,
    });
    await ctx.money.setItem(loserId, {
      ...loserData,
      battlePoints: (loserData.battlePoints || 0) + loserPts,
    });

    await ctx.output.replyStyled(
      isMaxTurns
        ? `${UNIRedux.charm} Max turns reached!\n${
            winnerData.name
          } wins by having **higher total team HP%**!\n${winnerPets
            .map((pet) => `${pet.petIcon} **${pet.petName}**`)
            .join(", ")} outlasted ${loserPets
            .map((pet) => `${pet.petIcon} **${pet.petName}**`)
            .join(", ")}.\n${winnerData.name} earned **${winnerPts} 💷**, ${
            loserData.name
          } earned **${loserPts} 💷**.`
        : `${UNIRedux.charm} ${winnerData.name} wins!\n${winnerPets
            .map((pet) => `${pet.petIcon} **${pet.petName}**`)
            .join(", ")} defeated ${loserPets
            .map((pet) => `${pet.petIcon} **${pet.petName}**`)
            .join(", ")}!\n${winnerData.name} earned **${winnerPts} 💷**, ${
            loserData.name
          } earned **${loserPts} 💷**.`,
      style
    );

    gameState = null;
  }

  async function handleDefeat(
    ctx: CommandContext,
    info: OutputResult,
    winner: 1 | 2,
    isMaxTurns = false
  ): Promise<void> {
    isDefeat = true;
    info.removeAtReply();
    await handleWin(ctx, winner, isMaxTurns);
  }

  async function handleNoTurns(
    ctx: CommandContext,
    info: OutputResult
  ): Promise<void> {
    if (
      !gameState ||
      !gameState.player1Pets.length ||
      !gameState.player2Pets.length
    )
      return;
    info.removeAtReply();

    const hp1Total = gameState.player1Pets.reduce(
      (sum, pet) => sum + (pet.isDown() ? 0 : pet.getPercentHP()),
      0
    );
    const hp2Total = gameState.player2Pets.reduce(
      (sum, pet) => sum + (pet.isDown() ? 0 : pet.getPercentHP()),
      0
    );
    const winner = hp1Total > hp2Total ? 1 : 2;

    await handleWin(ctx, winner, true);
  }
}
