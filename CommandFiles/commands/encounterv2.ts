import {
  GearsManage,
  PetPlayer,
  PetTurns,
  randArr,
  WildPlayer,
} from "@cass-plugins/pet-fight";
import { Inventory } from "@cass-modules/InventoryEnhanced";
import fs from "fs-extra";
import {
  Encounter,
  PetSchema,
  GameState,
  PersistentStats,
} from "@cass-modules/Encounter";
import { FontSystem, UNIRedux } from "cassidy-styler";
import { OutputResult } from "@cass-plugins/output";
import { formatCash } from "@cass-modules/ArielUtils";
import { Datum } from "@cass-modules/Datum";

export const meta: CommandMeta = {
  name: "encounter",
  description: "Pets Encounter - A reworked interactive pet battle system",
  otherNames: ["encv2", "encounterv2", "enc"],
  version: "2.1.12",
  usage: "{prefix}{name} [id | 'new']",
  category: "Pet Games",
  author: "@lianecagara",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.7.0",
  icon: "🔱",
  cmdType: "cplx_g",
  notes:
    "Reworked for improved modularity, scalability, and TypeScript support",
  isGame: true,
};

export const style: CommandStyle = {
  title: `🔱 Encounter ${FontSystem.applyFonts("EX", "double_struck")}`,
  titleFont: "bold_italic",
  contentFont: "fancy",
  lineDeco: "altar",
};

const encounters: Record<string, Encounter> = fs.readJSONSync(
  process.cwd() + "/CommandFiles/resources/spinoff/encounters.json"
);
const petSchema: PetSchema = {
  fight: false,
  item: false,
  magic: false,
  mercy: true,
  defend: true,
  extra: {
    Bash: "🥊",
    Act: "🔈",
    LifeUp: "✨",
    HexSmash: "💥",
    FluxStrike: "🌩️",
    GuardPulse: "🛡️",
    MercyWave: "🌊",
    ChaosBolt: "⚡",
    VitalSurge: "💖",
    StatSync: "🔄",
    Equilibrium: "⚖️",
  },
};

const leaderSchema: PetSchema = {
  fight: false,
  item: false,
  mercy: true,
  magic: false,
  defend: true,
  extra: {
    Bash: "🥊",
    Act: "🔊",
    LifeUp: "✨",
    HexSmash: "💥",
    FluxStrike: "🌩️",
    GuardPulse: "🛡️",
    MercyWave: "🌊",
    ChaosBolt: "⚡",
    VitalSurge: "💖",
    StatSync: "🔄",
    Equilibrium: "⚖️",
  },
};

function generateEnc(): Encounter {
  const values = Object.values(encounters);
  return values[Math.floor(Math.random() * values.length)];
}

let currentEnc: Encounter = generateEnc();

function getInfos(data: UserData) {
  const gearsManage = new GearsManage(data.gearsData);
  const petsData = new Inventory(data.petsData);
  const playersMap = new Map<string, PetPlayer>();
  for (const pet of petsData) {
    const gear = gearsManage.getGearData(pet.key);
    const player = new PetPlayer(pet, gear);
    playersMap.set(pet.key, player);
  }
  return { gearsManage, petsData, playersMap };
}

function getCacheIcon(turn: string | null): string | null {
  if (!turn) return null;
  const mapping: Record<string, string> = {
    fight: "⚔️",
    act: "🔊",
    mercy: "❌",
    defend: "🛡",
    heal: "✨",
  };
  return mapping[turn] ?? null;
}

const MAX_PETS = 7;
const MIN_PETS = 1;

export async function entry({
  input,
  output,
  user,
  Slicer,
  getInflationRate,
}: CommandContext): Promise<any> {
  const rate = await getInflationRate();

  const statMap = new Map<string, PersistentStats>();
  let gameState: GameState | null = null;
  let isDefeat = false;

  if ((user.petsData ?? []).length < MIN_PETS) {
    return output.replyStyled(
      `You must have at least **${MIN_PETS} pets** to proceed.`,
      style
    );
  }
  if (input.arguments[0] === "list") {
    const entries = Object.entries(encounters);
    const slicer = new Slicer(entries, 7);
    let page = Math.min(Number(input.arguments[1]) || 1, slicer.pagesLength);

    const getReM = (gold: number) => {
      let re = Math.round((gold / 15) * 1);
      re += Math.round(re * rate);
      let mercy = Math.round(re * 1.7);
      mercy += Math.round(mercy * rate);

      return { re, mercy };
    };

    const str = (slicer.getPage(page) as [string, Encounter][])
      .map(
        ([key, value]) =>
          `${UNIRedux.charm} ${value.wildIcon} **${value.wildName}** **LV${
            value.level ?? 1
          }**\n🔎 ***ID***: ${key}\n⚔️ ***ATK***: ${value.ATK}\n🔰 ***DEF***: ${
            value.DF
          }\n🗃️ ***Type***: ${value.wildType}\n🪙 **Attacked**: ${formatCash(
            getReM(value.goldFled).re,
            "💷",
            true
          )}\n💗 **Spared**: ${formatCash(
            getReM(value.goldFled).mercy,
            "💷",
            true
          )}\n💎 **Gems**: **${(value.winDias ?? 0) * 10}💎**`
      )
      .join("\n\n");
    await output.reply(
      `🌏 Page **${page}** of **${
        slicer.pagesLength
      }**\n\n${str}\n\n📁 ***NEXT PAGE***, type: ${input.words[0]} ${
        input.words[1]
      } ${page + 1}`
    );
    return;
  }
  if (input.arguments[0] === "new") {
    currentEnc = generateEnc();
  }
  let targetEnc =
    input.arguments[0] !== "new"
      ? encounters[input.arguments[0]] ?? currentEnc
      : currentEnc;
  if (!targetEnc) {
    targetEnc = currentEnc;
  }

  let re = Math.round((targetEnc.goldFled / 15) * 1);
  re += Math.round(re * rate);

  let mercy = Math.round(re * 1.7);
  mercy += Math.round(mercy * rate);

  const infoBegin = await output.replyStyled(
    `🔎 **Random Encounter**:
Your opponent is: ${targetEnc.wildIcon} ${targetEnc.wildName} [${Datum.keyOf(
      targetEnc,
      encounters
    )}]

🪙 **Rewards**:

⚔️ Attacked: More than ${formatCash(re, "💷", true)} per pet.
💗 Spared: More than ${formatCash(mercy, "💷", true)} per pet.
💎 Gems: Approx. **${(targetEnc.winDias ?? 0) * 10}**💎

Please **reply** with the names of minimum of **${MIN_PETS} pets**, maximum of **${MAX_PETS} pets**, separated by |, you cannot use same type of pet twice.
**Example:** ${[
      ...(user.petsData ?? [
        { name: "Doggie" },
        { name: "Meowy" },
        { name: "Cobra" },
      ]),
    ]
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_PETS)
      .map((i: { name: string } & Record<string, any>) => i.name)
      .join(" | ")}

The first **pet** will become the leader, which who can use the 🔊 **Act**\n\n🎲 Type **${
      input.words[0]
    } new** to find new opponent.\n🌏 Type **${
      input.words[0]
    } list** to check all bosses.`,
    style
  );

  const startHandler = async (ctx: CommandContext) => {
    if (isDefeat || ctx.input.senderID !== input.senderID) {
      await ctx.output.replyStyled(
        `❌ | You are **not** the one who started this **game**.`,
        style
      );
      return;
    }

    const userData = await ctx.money.getItem(input.senderID);
    const { petsData, playersMap } = getInfos(userData);

    if (petsData.getAll().length < MIN_PETS) {
      await ctx.output.replyStyled(
        `❌ | Oops, you need at least ${MIN_PETS} pets to start the game. Try **uncaging** ${
          MIN_PETS - petsData.getAll().length
        } more pet(s).`,
        style
      );
      infoBegin.removeAtReply();
      return;
    }

    const petsName = ctx.input.splitBody("|");
    if (petsName.length < MIN_PETS) {
      await ctx.output.replyStyled(
        `❌ | Please specify **at least ${MIN_PETS}** pet **names** split by |`,
        style
      );
      return;
    }
    if (petsName.length > MAX_PETS) {
      await ctx.output.replyStyled(
        `❌ | Too much pets! Maximum of **${MAX_PETS} pets**`,
        style
      );
      return;
    }

    const pets: PetPlayer[] = [];
    for (const petName of petsName) {
      const original = petsData
        .getAll()
        .find(
          (i: any) =>
            String(i?.name).toLowerCase().trim() ===
            String(petName).toLowerCase().trim()
        );
      if (!original) {
        await ctx.output.replyStyled(
          `❌ | Pet "${petName}" doesn't exists in your pet list.`,
          style
        );
        return;
      }
      const pet = playersMap.get(original.key);
      if (pet) pets.push(pet);
    }

    const opponent = new WildPlayer(
      {
        ...targetEnc,
        HP:
          targetEnc.HP +
          Math.round(pets.reduce((acc, pet) => acc + pet.ATK * 2.1, 0)),
        ATK:
          targetEnc.ATK +
          Math.round(pets.reduce((acc, pet) => acc + pet.DF / 10, 0)),
        goldFled:
          targetEnc.goldFled +
          Math.round(pets.reduce((acc, pet) => acc + pet.ATK * 20, 0)),
        goldSpared:
          targetEnc.goldSpared +
          Math.floor(pets.reduce((acc, pet) => acc + pet.ATK * 50, 0)),
      },
      [...pets]
    );

    gameState = {
      pets,
      opponent,
      index: 0,
      turnCache: [],
      prevTurns: [],
      flavorCache: randArr(opponent.flavor.encounter),
      type: "turnPlayer",
      author: input.senderID,
      isEnemyTurn: false,
      get oppIndex() {
        return pets.length + 1;
      },
    };

    infoBegin.removeAtReply();
    await displayPetSelection(ctx);
  };

  infoBegin.atReply(startHandler);

  function initializeStatMap(pets: PetPlayer[], _opponent: WildPlayer) {
    statMap.clear();
    for (const pet of pets) {
      statMap.set(pet.OgpetData.key, {
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        mercyContributed: 0,
        defenseBoosts: 0,
        attackBoosts: 0,
        healsPerformed: 0,
        lastMove: null,
      });
    }
    statMap.set("opponent", {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      mercyContributed: 0,
      defenseBoosts: 0,
      attackBoosts: 0,
      healsPerformed: 0,
      lastMove: null,
    });
  }

  async function displayPetSelection(ctx: CommandContext): Promise<void> {
    if (!gameState) return;
    let result = `${UNIRedux.charm} ${gameState.flavorCache}\n\n`;
    for (let i = 0; i < gameState.pets.length; i++) {
      const pet = gameState.pets[i];
      const schema = i === 0 ? leaderSchema : petSchema;
      result += `${pet.getPlayerUI({
        selectionOptions: schema,
        turn: gameState.index === i,
        showStats: true,
        icon: getCacheIcon(gameState.turnCache[i]),
      })}\n\n`;
    }
    result += `***Reply with the option. (word only)***, you can also use **all** as second argument, you can also use | to split the options. i = ${gameState.index}`;

    initializeStatMap(gameState.pets, gameState.opponent);

    const newInfo = await ctx.output.replyStyled(result, style);
    newInfo.atReply(
      async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
    );
  }

  async function handlePlayerTurn(
    ctx: CommandContext,
    info: OutputResult,
    afterEnemy = false
  ): Promise<void> {
    if (isDefeat || !gameState || ctx.input.senderID !== gameState.author)
      return;
    if (afterEnemy) {
      gameState.index = 0;
    }
    while (gameState.pets[gameState.index]?.isDown()) {
      gameState.index++;
    }

    let turnOption = String(ctx.input.words[0]).toLowerCase();
    if (!gameState.isEnemyTurn) {
      if (ctx.input.words[1] === "all") {
        gameState.turnCache = gameState.pets.map((i) =>
          i.isDown() ? null : turnOption
        );
        gameState.index = gameState.pets.length;
      } else {
        const turns = ctx.input.splitBody("|").slice(0, 3);

        for (const turn of turns) {
          gameState.turnCache[gameState.index] = turn;
          gameState.index++;
          if (gameState.index > gameState.pets.length) {
            gameState.index = 0;
          }
        }
      }
      gameState.turnCache = [...gameState.turnCache].map((i) =>
        i?.toLowerCase()
      );
    }
    if (gameState.pets.every((pet) => pet.isDown())) {
      await handleDefeat(ctx, info);
      return;
    }

    if (gameState.index === gameState.pets.length) {
      gameState.isEnemyTurn = true;
      gameState.turnCache = gameState.turnCache.slice(0, gameState.pets.length);
      await handleEnemyTurn(ctx, info);
    } else {
      gameState.isEnemyTurn = false;

      let extraText = "";
      if (gameState.attack?.turnType === "attack") {
        for (const pet of gameState.pets) {
          if (pet.isDown()) {
            const heal = pet.getDownHeal();
            pet.HP += heal;
            extraText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** has regenerated ${heal} HP.\n\n`;
          }
        }

        const { answer, attackName } = gameState.attack;
        let isHurt =
          String(turnOption).replaceAll(" ", "").toLowerCase() !==
          String(answer).replaceAll(" ", "").toLowerCase();
        if (isHurt) {
          extraText += `${UNIRedux.charm} You chose **${turnOption}**, but it was not effective against **${attackName}**\n\n`;
          const isAllParty = Math.random() < 0.4;
          if (isAllParty) {
            const members = gameState.pets.filter((i) => !i.isDown());
            if (members.length === 0) {
              await handleDefeat(ctx, info);
              return;
            }
            for (const randomMember of members) {
              const damage = Math.round(
                randomMember.calculateTakenDamage(gameState.opponent.ATK) /
                  members.length
              );
              randomMember.HP -= Math.max(damage, 1);
              if (randomMember.HP < 1) {
                randomMember.HP = Math.round(randomMember.maxHP * 0.5) * -1;
              }
              extraText += `${UNIRedux.charm} ${randomMember.petIcon} **${
                randomMember.petName
              }** ${
                randomMember.isDown()
                  ? `is down.`
                  : `has taken **${damage}** damage.`
              }\n`;
              if (
                randomMember.isDown() &&
                gameState.pets.indexOf(randomMember) === gameState.index
              ) {
                gameState.index++;
              }
            }
          } else {
            const availablePets = gameState.pets.filter((i) => !i.isDown());
            const lowestPet = availablePets.toSorted((a, b) => a.HP - b.HP)[0];
            let randomMember =
              availablePets[Math.floor(Math.random() * availablePets.length)];
            if (lowestPet === randomMember) {
              randomMember =
                availablePets[Math.floor(Math.random() * availablePets.length)];
            }
            if (randomMember) {
              const damage = randomMember.calculateTakenDamage(
                gameState.opponent.ATK
              );
              randomMember.HP -= Math.max(damage, 1);
              if (randomMember.HP < 1) {
                randomMember.HP = Math.round(randomMember.maxHP * 0.5) * -1;
              }
              extraText += `${UNIRedux.charm} ${randomMember.petIcon} **${
                randomMember.petName
              }** ${
                randomMember.isDown()
                  ? `is down.`
                  : `has taken **${damage}** damage.`
              }\n`;
            }
            const members = gameState.pets.filter((i) => !i.isDown());
            gameState.pets.forEach((i, j) => {
              if (i.isDown() && j === gameState.index) {
                gameState.index++;
              }
            });
            if (members.length === 0) {
              await handleDefeat(ctx, info);
              return;
            }
          }
          extraText += `\n`;
        } else {
          extraText += `${UNIRedux.charm} You chose **${turnOption}** and the entire party has successfully dodged the **${attackName}**!\n\n`;
        }
      }
      if (gameState.pets.every((pet) => pet.isDown())) {
        await handleDefeat(ctx, info);
        return;
      }

      gameState.attack = undefined;
      info.removeAtReply();
      const newInfo = await ctx.output.replyStyled(
        extraText + (await listPetsNormal()),
        style
      );
      newInfo.atReply(
        async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo)
      );
    }
  }

  async function handleEnemyTurn(
    ctx: CommandContext,
    info: OutputResult
  ): Promise<void> {
    if (!gameState) return;
    const turns = gameState.turnCache.map((i) => String(i).toLowerCase());
    let flavorText = ``;
    let damage = 0;
    let newResponse: string | null = null;
    let dodgeChance = Math.random();

    for (let i = 0; i < turns.length; i++) {
      const pet = gameState.pets[i];
      const turn = turns[i];
      if (!turn || pet.isDown()) {
        flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** ${
          !turn ? "has no turn specified" : "is currently down"
        }.\n`;
        continue;
      }
      const petStats = statMap.get(pet.OgpetData.key);
      const opponentStats = statMap.get("opponent");
      const turnCTX = {
        activePet: pet,
        opponentStats,
        petStats,
        targetPet: gameState.opponent,
        dodgeChance,
        prevMove: gameState.prevTurns[i],
      };
      switch (turn) {
        // case "bash": {
        //   const res = PetTurns.Bash(turnCTX);
        //   flavorText += res.flavor;
        //   break;
        // }

        // case "hexsmash": {
        //   const res = PetTurns.HexSmash(turnCTX);
        //   flavorText += res.flavor;
        //   break;
        // }

        // case "fluxstrike": {
        //   const res = PetTurns.FluxStrike(turnCTX);
        //   flavorText += res.flavor;
        //   break;
        // }

        // case "chaosbolt": {
        //   const res = PetTurns.ChaosBolt(turnCTX);
        //   flavorText += res.flavor;
        //   break;
        // }
        // }
        case "cheat": {
          if (ctx.input.isAdmin) {
            const allAtk = gameState.pets.reduce(
              (acc, pet) => acc + pet.calculateAttack(gameState.opponent.DF),
              0
            );
            damage += gameState.opponent.maxHP - allAtk;
          }
          break;
        }
        case "hexsmash": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 💥 **HexMash**!\n`;
          if (
            (gameState.prevTurns[i] === "hexsmash" && dodgeChance < 0.7) ||
            Math.random() < 0.1
          ) {
            flavorText += `${UNIRedux.charm} ${gameState.opponent.wildIcon} **${gameState.opponent.wildName}** successfully dodges!\n`;
          } else {
            const meanStat = Math.min((pet.ATK + pet.MAGIC) / 2, pet.ATK * 3);
            const init = pet.calculateAttack(gameState.opponent.DF, meanStat);
            const damageEach = Math.round(init * 1.5);
            flavorText += `${
              UNIRedux.charm
            } Inflicted **${damageEach}** magical damage.\n${gameState.opponent.getPlayerUI(
              { damageTemp: damageEach + damage }
            )}\n`;
            damage += damageEach;
            opponentStats.totalDamageTaken += damageEach;
          }
          flavorText += `\n`;

          break;
        }
        case "bash": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** attacks!\n`;
          if (
            (gameState.prevTurns[i] === "bash" && dodgeChance < 0.7) ||
            Math.random() < 0.1
          ) {
            flavorText += `${UNIRedux.charm} ${gameState.opponent.wildIcon} **${gameState.opponent.wildName}** successfully dodges!\n`;
          } else {
            const damageEach = pet.calculateAttack(gameState.opponent.DF);
            flavorText += `${
              UNIRedux.charm
            } Inflicted **${damageEach}** damage.\n${gameState.opponent.getPlayerUI(
              { damageTemp: damageEach + damage }
            )}\n`;
            damage += damageEach;
            opponentStats.totalDamageTaken += damageEach;
          }
          flavorText += `\n`;

          break;
        }
        case "defend": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** defended.\n`;
          break;
        }
        case "mercy": {
          if (gameState.opponent.isSparable()) {
            flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** spared ${gameState.opponent.wildIcon} **${gameState.opponent.wildName}**!`;
            info.removeAtReply();
            await handleWin(ctx, true, flavorText);
            return;
          }
          const calc =
            (pet.calculateAttack(gameState.opponent.DF) /
              gameState.opponent.maxHP) *
            100 *
            0.2;
          gameState.opponent.addMercyInternal(calc * 25);
          petStats.mercyContributed += calc * 25;
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${
            pet.petName
          }** spared ${gameState.opponent.wildIcon} **${
            gameState.opponent.wildName
          }**, but the name isn't **YELLOW**! gained ${Math.round(
            calc
          )}% Mercy Points.\n`;
          break;
        }
        case "debug": {
          flavorText += `${JSON.stringify(gameState.opponent, null, 2)}\n`;
          break;
        }
        case "act": {
          if (i !== 0) {
            const calc =
              (pet.calculateAttack(gameState.opponent.DF) /
                gameState.opponent.maxHP) *
              100 *
              0.4;
            petStats.mercyContributed += calc * 25;
            gameState.opponent.addMercyInternal(calc * 25);
            flavorText += `${UNIRedux.charm} ${pet.petIcon} **${
              pet.petName
            }** used 🔊 **Pet Action**\n* Gained ${Math.floor(
              calc
            )}% Mercy Points.\n`;
          } else {
            const calc =
              (pet.calculateAttack(gameState.opponent.DF) /
                gameState.opponent.maxHP) *
              100 *
              0.6;
            gameState.opponent.addMercyInternal(calc * 25);
            const randomActs = Object.keys(gameState.opponent.acts).filter(
              (i) => gameState.opponent.isActAvailable(i)
            );
            const randomAct =
              randomActs[Math.floor(Math.random() * randomActs.length)];
            const actData = gameState.opponent.getAct(randomAct);
            let {
              flavor = `${pet.petIcon} **${pet.petName}** can't think of what to do.`,
              response,
              mercyPts = 0,
              petLine = "...",
            } = actData ?? {};
            petStats.mercyContributed += mercyPts * 25;
            gameState.opponent.MERCY += mercyPts;
            flavorText += `${
              UNIRedux.charm
            } 🔊 **${randomAct}**\n* ${flavor}\n\n${pet.petIcon} **${
              pet.petName
            }**: ${petLine}\n\n* Gained ${
              mercyPts + Math.floor(calc)
            }% Mercy Points.\n`;
            newResponse = response;
          }
          break;
        }
        case "lifeup": {
          const magic = pet.MAGIC;
          const lowests = gameState.pets.toSorted(
            (a, b) => a.HP / a.maxHP - b.HP / b.maxHP
          );
          const firstLowest = lowests[0];
          const target =
            Math.random() < 0.3 && pet.HP < pet.maxHP ? pet : firstLowest;
          const healing = Math.max(
            Math.round((target.maxHP / 9) * (magic * 0.09)),
            Math.round(target.maxHP / 9)
          );
          const prevDown = target.isDown();
          const finalHealing = Math.min(healing, target.maxHP - target.HP);
          target.HP += finalHealing;
          if (prevDown && target.HP > 0 && target.HP < target.maxHP * 0.17) {
            target.HP = Math.round(target.maxHP * 0.17);
          }
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${
            pet.petName
          }** cast ✨ **Lifeup** to ${
            target === pet ? `itself!` : `**${target.petName}**!`
          } ${
            target.HP >= target.maxHP
              ? `HP has been maxed out.`
              : `Recovered **${finalHealing}** HP.`
          }\n${target.getPlayerUI({
            upperPop:
              prevDown && !target.isDown()
                ? `UP`
                : target.HP >= target.maxHP
                ? `MAX`
                : `+${finalHealing} HP`,
          })}\n\n`;
          break;
        }
        case "fluxstrike": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 🌩️ **FluxStrike**!\n`;
          if (
            dodgeChance < 0.1 ||
            (petStats.lastMove === "fluxstrike" && dodgeChance < 0.7)
          ) {
            flavorText += `${UNIRedux.charm} ${gameState.opponent.wildIcon} **${gameState.opponent.wildName}** dodges!\n`;
          } else {
            const damageFactor = Math.max(
              0.5,
              1 - petStats.totalDamageDealt / (gameState.opponent.maxHP * 2)
            );
            const fluxMultiplier =
              1 +
              Math.random() *
                0.5 *
                (gameState.opponent.HP / gameState.opponent.maxHP) *
                damageFactor;
            const fluxDamage = Math.round(
              pet.ATK * fluxMultiplier - gameState.opponent.DF / 5
            );
            petStats.totalDamageDealt += fluxDamage;
            opponentStats.totalDamageTaken += fluxDamage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${fluxDamage}** fluctuating damage!\n${gameState.opponent.getPlayerUI(
              { damageTemp: damage + fluxDamage }
            )}\n`;
            damage += fluxDamage;
          }
          flavorText += `\n`;
          break;
        }

        case "guardpulse": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 🛡️ **GuardPulse**!\n`;
          const guardFactor = Math.max(0.5, 1 - petStats.defenseBoosts * 0.2);
          const guardBoost = Math.round(
            pet.DF * (1 - pet.HP / pet.maxHP) * 1.5 * guardFactor
          );
          pet.defModifier += guardBoost;
          petStats.defenseBoosts += 1;
          flavorText += `${
            UNIRedux.charm
          } Defense boosted by **${guardBoost}** for the next attack!\n${pet.getPlayerUI()}\n`;
          flavorText += `\n`;
          break;
        }

        case "mercywave": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 🌊 **MercyWave**!\n`;

          const mercyFactor = Math.min(1 + petStats.mercyContributed / 1000, 2);

          const baseMercyPoints = Math.round(
            pet.MAGIC *
              (gameState.opponent.HP / gameState.opponent.maxHP) *
              0.5 *
              mercyFactor
          );

          const opponentCap = Math.round(gameState.opponent.maxHP * 0.1);
          const petCap = Math.round(Math.min(pet.MAGIC, 100) * 10);
          const fixedCap = 625;

          const mercyPoints = Math.min(
            baseMercyPoints,
            opponentCap,
            petCap,
            fixedCap
          );

          gameState.opponent.addMercyInternal(mercyPoints);
          petStats.mercyContributed += mercyPoints;

          flavorText += `${UNIRedux.charm} Gained **${Math.round(
            mercyPoints / 25
          )}%** mercy points!\n${gameState.opponent.getPlayerUI()}\n`;
          flavorText += `\n`;
          break;
        }

        case "chaosbolt": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used ⚡ **ChaosBolt**!\n`;
          if (
            dodgeChance < 0.5 ||
            (petStats.lastMove === "chaosbolt" && dodgeChance < 0.9)
          ) {
            flavorText += `${UNIRedux.charm} ${gameState.opponent.wildIcon} **${gameState.opponent.wildName}** dodges!\n`;
          } else {
            const statThreshold = pet.level * 2;
            const combinedStat = pet.ATK + pet.MAGIC;
            const statFactor = Math.min(combinedStat / statThreshold, 1);

            const effectiveStat = Math.max(pet.ATK, pet.MAGIC / 2);
            let boltDamage = Math.round(
              pet.calculateAttack(gameState.opponent.DF, effectiveStat) *
                statFactor
            );

            const chaosChance =
              Math.min(
                ((pet.ATK + pet.MAGIC) / (gameState.opponent.DF || 1)) * 0.2,
                0.3
              ) *
              (1 - petStats.attackBoosts * 0.1);
            if (Math.random() < chaosChance && statFactor >= 1) {
              boltDamage = Math.round(boltDamage * 1.5);
              flavorText += `${UNIRedux.charm} Critical chaos hit! `;
            }

            boltDamage = Math.min(
              boltDamage,
              Math.round(gameState.opponent.maxHP * 0.25)
            );

            gameState.opponent.HP -= boltDamage;
            petStats.totalDamageDealt += boltDamage;
            opponentStats.totalDamageTaken += boltDamage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${boltDamage}** damage!\n${gameState.opponent.getPlayerUI(
              { damageTemp: boltDamage + damage }
            )}\n`;
            damage += boltDamage;
          }
          flavorText += `\n`;
          petStats.lastMove = "chaosbolt";
          break;
        }

        case "vitalsurge": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 💖 **VitalSurge**!\n`;
          const healFactor = Math.min(
            1.5,
            1 + (1 - petStats.healsPerformed * 0.2)
          );
          const avgTeamHP =
            gameState.pets.reduce(
              (acc, p) => acc + (p.isDown() ? 0 : p.HP / p.maxHP),
              0
            ) / gameState.pets.length;
          const surgeHeal = Math.round(
            pet.MAGIC * (1 + avgTeamHP) * 0.5 * healFactor
          );
          const target = gameState.pets.reduce((a, b) => (a.HP < b.HP ? a : b));
          const prevDown = target.isDown();
          target.HP += Math.min(surgeHeal, target.maxHP - target.HP);
          petStats.healsPerformed += 1;
          flavorText += `${UNIRedux.charm} Healed **${surgeHeal}** HP to **${
            target.petName
          }**!\n${target.getPlayerUI({
            upperPop: prevDown && !target.isDown() ? `UP` : `+${surgeHeal} HP`,
          })}\n`;
          flavorText += `\n`;
          break;
        }

        case "statsync": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used 🔄 **StatSync**!\n`;
          const syncFactor = Math.max(0.5, 1 - petStats.attackBoosts * 0.2);
          const safePetDF = Math.max(0, pet.DF);
          const safeOpponentDF = Math.max(0, gameState.opponent.DF || 1);
          const syncBoost = Math.round(
            Math.max(
              0,
              Math.min(
                (safePetDF + 1) *
                  (safeOpponentDF / (safePetDF || 1)) *
                  0.4 *
                  syncFactor,
                pet.level * 2
              )
            )
          );
          pet.atkModifier += syncBoost;
          petStats.attackBoosts += 1;
          if (syncBoost < 1) {
            flavorText += `${
              UNIRedux.charm
            } ATK boost was too weak to take effect!\n${pet.getPlayerUI()}\n`;
          } else {
            flavorText += `${
              UNIRedux.charm
            } ATK boosted by **${syncBoost}** for the next turn!\n${pet.getPlayerUI()}\n`;
          }
          flavorText += `\n`;
          break;
        }

        case "equilibrium": {
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** used ⚖️ **Equilibrium**!\n`;
          const eqFactor = Math.min(
            1 + petStats.totalDamageTaken / (pet.maxHP * 2),
            2
          );
          const hpDiff = gameState.opponent.getPercentHP() - pet.getPercentHP();
          if (hpDiff > 0) {
            const statThreshold = pet.level * 2;
            const attackStat = pet.ATK + pet.MAGIC;
            const defenseStat = pet.DF + pet.MAGIC;
            const attackFactor = Math.min(attackStat / statThreshold, 1);
            const defenseFactor = Math.min(defenseStat / statThreshold, 1);

            const attackStatValue = (pet.ATK + pet.MAGIC) / 2;
            const eqDamage = Math.round(
              pet.calculateAttack(gameState.opponent.DF, attackStatValue) *
                (hpDiff / 100) *
                eqFactor *
                attackFactor
            );

            const healStatValue = (pet.DF + pet.MAGIC) / 4;
            let eqHeal = Math.round(
              healStatValue * (hpDiff / 100) * eqFactor * defenseFactor +
                pet.maxHP * 0.05
            );

            const maxDamage = Math.round(gameState.opponent.maxHP * 0.2);
            const maxHeal = Math.round(pet.maxHP * 0.25);
            const finalDamage = Math.min(eqDamage, maxDamage);
            const finalHeal = Math.min(eqHeal, pet.maxHP - pet.HP, maxHeal);

            gameState.opponent.HP -= finalDamage;
            pet.HP += finalHeal;
            petStats.totalDamageDealt += finalDamage;
            opponentStats.totalDamageTaken += finalDamage;
            flavorText += `${
              UNIRedux.charm
            } Dealt **${finalDamage}** damage and healed **${finalHeal}** HP!\n${gameState.opponent.getPlayerUI(
              { damageTemp: finalDamage + damage }
            )}\n${pet.getPlayerUI({ upperPop: `+${finalHeal} HP` })}\n`;
            damage += finalDamage;
          } else {
            flavorText += `${UNIRedux.charm} No effect! Opponent's HP percentage is not higher than yours.\n`;
          }
          flavorText += `\n`;
          petStats.lastMove = "equilibrium";
          break;
        }
        default:
          flavorText += `${UNIRedux.charm} ${pet.petIcon} **${pet.petName}** did not learn **${turn}**.\n`;
      }
    }

    gameState.opponent.HP -= damage;
    gameState.prevTurns = [...turns];
    await enemyAttack(ctx, info, { flavorText, newResponse, damage });
  }

  async function enemyAttack(
    ctx: CommandContext,
    _info: OutputResult,
    {
      flavorText,
      damage,
      newResponse,
    }: { flavorText: string; damage?: number; newResponse: string | null }
  ): Promise<void> {
    if (!gameState) return;
    if (gameState.opponent.isDown()) {
      _info.removeAtReply();
      await handleWin(ctx, false, flavorText);
      return;
    }

    const { text, answer, attackName } = gameState.opponent.getAttackMenu();
    if (
      (gameState.opponent.HP < gameState.opponent.maxHP * 0.5 &&
        Math.random() < 0.3) ||
      Math.random() < 0.1
    ) {
      let healing = Math.min(
        gameState.pets.reduce(
          (_, pet) => pet.calculateAttack(gameState.opponent.DF - 2),
          0
        ),
        gameState.opponent.maxHP - gameState.opponent.HP
      );
      healing = Math.round(healing * 2.5);
      gameState.opponent.HP += Math.min(gameState.opponent.maxHP, healing);
      gameState.attack = {
        text: ``,
        healing,
        turnType: "heal",
      };
      _info.removeAtReply();
      gameState.index = 0;

      const newInfo = await ctx.output.replyStyled(
        `${flavorText}\n* ${gameState.opponent.wildIcon} **${
          gameState.opponent.wildName
        }** cast ✨ **Lifeup** α! Recovered **${healing}** HP!\n\n${gameState.opponent.getPlayerUI(
          { upperPop: `+${healing}HP` }
        )}\n\n***Reply anything to proceed.***`,
        style
      );
      gameState.flavorCache = gameState.opponent.getNeutralFlavor();
      gameState.turnCache = [];
      newInfo.atReply(
        async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo, true)
      );
    } else {
      gameState.attack = {
        text,
        answer,
        attackName,
        turnType: "attack",
      };
      _info.removeAtReply();
      gameState.index = 0;
      const newInfo = await ctx.output.replyStyled(
        `${flavorText}\n${gameState.opponent.getPlayerUI({
          upperPop: damage
            ? `-${Math.round((damage / gameState.opponent.maxHP) * 100)}% HP`
            : null,
        })}\n\n${gameState.opponent.wildIcon} **${
          gameState.opponent.wildName
        }**: \n${
          newResponse ?? gameState.opponent.getNeutralDialogue()
        }\n\n${text}\n\n***Reply with the option. (word only)***, i = ${
          gameState.index
        }`,
        style
      );
      gameState.flavorCache = gameState.opponent.getNeutralFlavor();
      gameState.turnCache = [];
      newInfo.atReply(
        async (turnCtx) => await handlePlayerTurn(turnCtx, newInfo, true)
      );
    }
  }

  async function handleWin(
    ctx: CommandContext,
    isGood: boolean,
    flavor: string
  ): Promise<void> {
    if (!gameState) return;
    currentEnc = generateEnc();
    let dialogue: string;
    let multiplier = 1;
    const alivePets = gameState.pets.filter((i) => !i.isDown());
    multiplier = alivePets.length / gameState.pets.length;
    let mercyMode = gameState.opponent.HP >= gameState.opponent.maxHP && isGood;
    let pts = Math.round((gameState.opponent.goldFled / 15) * multiplier);
    if (mercyMode) {
      pts = Math.round(pts * 1.7);
    }
    let winnerCash = Math.round(Math.pow(pts * 1000, 1.2));
    winnerCash += Math.round(winnerCash * rate);
    if (isGood) {
      dialogue = `${gameState.opponent.wildIcon} **${
        gameState.opponent.wildName
      }** has been${mercyMode ? " kindly" : ""} spared by your party.`;
    } else {
      dialogue =
        gameState.opponent.flavor.run?.[0] ??
        `${gameState.opponent.wildIcon} **${gameState.opponent.wildName}** ran away.`;
    }

    const userData = await ctx.money.getItem(input.senderID);
    let newMoney = (userData.money ?? 0) + winnerCash;
    const collectibles = new ctx.Collectibles(userData.collectibles ?? []);
    const wonDias = (gameState.opponent.winDias ?? 0) * 10;
    if (collectibles.has("gems")) {
      collectibles.raise("gems", wonDias);
    }
    await ctx.money.setItem(input.senderID, {
      money: newMoney,
      collectibles: Array.from(collectibles),
      battlePoints: (userData.battlePoints ?? 0) + pts,
    });
    await ctx.output.replyStyled(
      (flavor ?? "").trim() +
        `\n\n` +
        `${UNIRedux.charm} ${dialogue}\n\n${
          isGood
            ? gameState.opponent.spareText()
            : gameState.opponent.fledText()
        }\nObtained **${formatCash(
          winnerCash,
          true
        )}** Cash! and **${formatCash(pts, "💷", true)} Battle Points!**\n${
          wonDias && collectibles.has("gems")
            ? `You also won **${wonDias}** 💎!`
            : ""
        }`,
      style
    );
    gameState = null;
  }

  async function handleDefeat(
    ctx: CommandContext,
    info: OutputResult
  ): Promise<void> {
    isDefeat = true;
    currentEnc = generateEnc();
    info.removeAtReply();
    await ctx.output.replyStyled(
      `❌ **Game Over**\n\n* All your pet members have been fainted. But that's not the end! Stay determined. You can always **try** again.`,
      style
    );
    gameState = null;
  }

  async function listPetsNormal(): Promise<string> {
    if (!gameState) return "";
    let result = `${UNIRedux.charm} ${gameState.flavorCache}\n\n`;
    for (let i = 0; i < gameState.pets.length; i++) {
      const pet = gameState.pets[i];
      const schema = i === 0 ? leaderSchema : petSchema;
      result += `${pet.getPlayerUI({
        selectionOptions: schema,
        showStats: true,
        turn:
          gameState.index === i && gameState.pets[gameState.index]
            ? !gameState.pets[gameState.index].isDown()
            : false,
        icon: getCacheIcon(gameState.turnCache[i]),
      })}\n\n`;
    }
    result += `***Reply with the option. (word only)***, you can also use **all** as second argument, you can also use | to split the options. i = ${gameState.index}`;
    return result;
  }
}
