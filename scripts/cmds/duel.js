// @ts-check

import { parseBet } from "@cass-modules/ArielUtils";
import { PetPlayer } from "@cass-plugins/pet-fight";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "duel",
  description: "Challenge another player to a pet duel!",
  author: "@lianecagara",
  version: "1.0.0",
  usage: "{prefix}duel <pet name>",
  category: "Pet Games",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  otherNames: [],
  requirement: "3.0.0",
  icon: "⚔️",
  cmdType: "cplx_g",
  isGame: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Pet Duel ⚔️",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};

const activeChallenges = new Map();

/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
export async function entry(ctx) {
  const { args, input, output, money, Inventory } = ctx;
  const challengerData = await money.getItem(input.senderID);

  const challengePetName = args[0];
  const items = Inventory.from(challengerData);
  let bet = parseBet(args[1], challengerData.money);
  let hasPass = items.has("highRollPass");

  if (!challengePetName || isNaN(bet) || bet <= 0) {
    return output.reply(
      `⚠️ | Please specify a pet name and bet to challenge.\n**Example**: ${ctx.prefix}duel <pet-name> <bet>\n\n**Other Modifiers:**\n--fair\n--self-only`
    );
  }

  if (challengerData.money < bet) {
    return output.reply(`⚠️ | You don't have enough money to place this bet.`);
  }

  if (!hasPass && bet > global.Cassidy.highRoll) {
    return output.reply(
      `You need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
    );
  }

  const challengerPets = new Inventory(challengerData.petsData);
  const challengePet = challengerPets
    .getAll()
    .find((pet) => pet.name.toLowerCase() === challengePetName.toLowerCase());

  if (!challengePet) {
    return output.reply("⚠️ | Pet not found in your pet list.");
  }

  activeChallenges.set(input.senderID, {
    petName: challengePetName,
    status: "awaiting",
  });

  const responseMessage = await output.reply(
    `📝 | You've challenged another player with your pet **${challengePetName}**. Awaiting response...\n\nType **accept <pet-name>** to accept the challenge.\n\nThe winner will receive $**${bet}**💵 while the loser will loose the same amount of cash.`
  );

  input.setReply(responseMessage.messageID, {
    key: "duel",
    callback: handleChallengeResponse,
    challengeDetails: {
      challengerID: input.senderID,
      petName: challengePetName,
      bet,
      isOver: false,
      selfOnly: args.includes("--self-only"),
      fairMode: args.includes("--fair"),
    },
  });
}
/**
 *
 * @param {CommandContext} ctx
 * @returns
 */
async function handleChallengeResponse(ctx) {
  const { input, output, money, Inventory, GearsManage, PetPlayer } = ctx;
  /**
   *
   * @param {UserData} data
   * @returns
   */
  function getInfos(data) {
    const gearsManage = new GearsManage(data.gearsData);
    const petsData = new Inventory(data.petsData);
    const playersMap = new Map();
    for (const pet of petsData) {
      const gear = gearsManage.getGearData(pet.key);
      const player = new PetPlayer(pet, gear);
      playersMap.set(pet.key, player);
    }
    return {
      gearsManage,
      petsData,
      playersMap,
    };
  }

  if (String(input.words[0]).toLowerCase() !== "accept") {
    return;
  }
  const opponentPetName = input.words[1];

  // @ts-ignore
  const challengeDetails = ctx.repObj.challengeDetails;
  if (!challengeDetails || !challengeDetails.challengerID) {
    return output.replyStyled(
      "⚠️ | Challenge details are missing or invalid.",
      style
    );
  }
  if (challengeDetails.isOver) {
    return output.replyStyled("⚠️ | The challenge is already over.", style);
  }
  if (
    challengeDetails.selfOnly &&
    challengeDetails.challengerID !== input.senderID
  ) {
    return output.replyStyled(
      "⚠️ | The challenger only challenges themselves.",
      style
    );
  }
  const { fairMode } = challengeDetails;
  const notAllUsers = await money.getItems(
    challengeDetails.challengerID,
    input.senderID
  );

  const challengerData = notAllUsers[challengeDetails.challengerID];
  if (!challengerData) {
    return output.replyStyled("⚠️ | Something went wrong.", style);
  }

  if (challengerData.money < challengeDetails.bet) {
    return output.replyStyled(
      "⚠️ | This duel cannot continue because the challenger weirdly doesn't have enough money.",
      style
    );
  }
  const challengerPets = new Inventory(challengerData.petsData);
  const challengerPet = challengerPets
    .getAll()
    .find(
      (pet) => pet.name.toLowerCase() === challengeDetails.petName.toLowerCase()
    );

  const opponentData = notAllUsers[input.senderID];
  if (!opponentData) {
    return output.replyStyled("⚠️ | Something went wrong.", style);
  }
  if (opponentData.money < challengeDetails.bet) {
    return output.replyStyled(
      "⚠️ | You do not have enough money to accept the challenge.",
      style
    );
  }
  const opponentPets = new Inventory(opponentData.petsData);
  const opponentPet = opponentPets
    .getAll()
    .find((pet) => pet.name.toLowerCase() === opponentPetName.toLowerCase());

  if (!opponentPet) {
    return output.replyStyled("⚠️ | Pet not found in your pet list.", style);
  }
  const { playersMap: challengerPlayersMap } = getInfos(challengerData);
  const { playersMap: opponentPlayersMap } = getInfos(opponentData);
  /**
   * @type {PetPlayer}
   */
  const chalPet = challengerPlayersMap.get(challengerPet.key);
  // @ts-ignore
  chalPet.ownerID = challengeDetails.challengerID;
  /**
   * @type {PetPlayer}
   */
  const oppPet = opponentPlayersMap.get(opponentPet.key);
  // @ts-ignore
  oppPet.ownerID = input.senderID;
  const oppElemental = oppPet.getElementals();
  // @ts-ignore
  oppPet.cacheElemental = oppElemental;
  const chalElemental = chalPet.getElementals();
  // @ts-ignore
  chalPet.cacheElemental = chalElemental;
  const oppModifier =
    oppElemental.getModifierAgainst(chalElemental) -
    chalElemental.getModifierAgainst(oppElemental);
  const chalModifier =
    chalElemental.getModifierAgainst(oppElemental) -
    oppElemental.getModifierAgainst(chalElemental);
  // @ts-ignore
  oppPet.m = oppModifier;
  // @ts-ignore
  chalPet.m = chalModifier;

  activeChallenges.delete(challengeDetails.challengerID);
  let round = 0;
  /**
   *
   * @param {PetPlayer} attacker
   * @param {PetPlayer} defender
   * @returns
   */
  function attack(attacker, defender) {
    let damage = Math.round(attacker.calculateAttack(defender.DF));
    const originalDamage = damage;
    if (fairMode) {
      damage = Math.floor(
        damage * (round < 3 && damage > defender.HP ? 0.55 : 0.65)
      );
      /*if (damage > defender.HP && round < 3) {
        damage = Math.floor(defender.HP * 0.9);
      }*/
    }
    const damageWithoutElemental = damage;
    // @ts-ignore
    damage = damage + damage * attacker.m;
    const fail = damage < damageWithoutElemental;

    const diff = Math.round(Math.abs(damage - damageWithoutElemental));
    damage = Math.round(damage);
    defender.HP -= damage;
    // @ts-ignore
    const defenderElemental = defender.cacheElemental;
    // @ts-ignore
    const attackerElemental = attacker.cacheElemental;

    const randomDef = defenderElemental.elements.toSorted(
      () => Math.random() - 0.5
    )[0];

    const randomAtt = attackerElemental.elements.toSorted(
      () => Math.random() - 0.5
    )[0];

    return {
      originalDamage,
      damage,
      // @ts-ignore
      text: `* ${attacker.weapon[0].icon ?? "👊"} ${attacker.petIcon} **${
        // @ts-ignore
        attacker.petName
      }** dealth **${Math.round(damageWithoutElemental)}** damage to ${
        // @ts-ignore
        defender.petIcon
        // @ts-ignore
      } **${defender.petName}**!${
        damageWithoutElemental !== damage
          ? `\n${
              fail
                ? // @ts-ignore
                  `* 🔰 **${defender.petName}** used ${randomDef.class} ${randomDef.name}Shield! blocked **${diff}** damage.`
                : // @ts-ignore
                  `* ⚡ **${attacker.petName}** used ${randomAtt.class} ${randomAtt.name}Slash! Inflicted **${diff}** elemental damage!`
            }`
          : ""
      }\n\n${defender.getPlayerUI({
        upperPop: `-${damage} HP`,
      })}`,
    };
  }
  let result = "";
  // @ts-ignore
  result += `🏆 | ${chalPet.petIcon} **${chalPet.petName}** vs ${
    // @ts-ignore
    oppPet.petIcon
    // @ts-ignore
  } **${oppPet.petName}** (${Math.floor(oppModifier * 100)}% Gap)\n${
    fairMode ? "⚡ ***Fair Mode***\n" : ""
  }\n`;
  if (fairMode) {
    const lowestLevel = Math.min(chalPet.level, oppPet.level);
    const origChal = chalPet.level;
    const origOpp = oppPet.level;
    chalPet.changeLevel(lowestLevel);
    oppPet.changeLevel(lowestLevel);

    for (let i = 0; i < 2; i++) {
      const orig = i === 0 ? origChal : origOpp;
      const pet = i === 0 ? chalPet : oppPet;
      if (orig !== pet.level) {
        // @ts-ignore
        result += `⚠️ ${pet.petIcon} **${pet.petName}'s** level has been capped from **LV${orig}** to **LV${pet.level}** to make the duel fairer.\n\n`;
      }
    }
  }
  result += `${chalPet.getPlayerUI()}\n\n${oppPet.getPlayerUI()}\n\n`;

  while (!chalPet.isDown() && !oppPet.isDown()) {
    round++;
    result += `☆ ***Round #${round}*** ☆\n\n`;
    result += `${attack(chalPet, oppPet).text}\n\n`;

    result += `${attack(oppPet, chalPet).text}\n\n`;
  }
  let winner = chalPet.isDown() ? oppPet : chalPet;
  let loser = oppPet.isDown() ? oppPet : chalPet;
  if (winner.isDown() && loser.isDown() && !fairMode) {
    result += `🏆 It's a tie! Both pets are knocked down.\n\n${chalPet.getPlayerUI(
      { upperPop: "Tie" }
    )}\n\n${oppPet.getPlayerUI({ upperPop: "Tie" })}\n\n`;
  } else if (winner.isDown() && loser.isDown() && fairMode) {
    const sorted = [chalPet, oppPet].toSorted((a, b) => b.HP - a.HP);
    const trueWinner = sorted[0];
    const trueLoser = sorted[1];
    result += `⚡ Both **pets** are impressively **knocked down**! Yet the true winner is ${
      // @ts-ignore
      trueWinner.petIcon
      // @ts-ignore
    } **${trueWinner.petName}**!\n\n${trueWinner.getPlayerUI({
      upperPop: "Winner",
    })}\n\n${trueLoser.getPlayerUI({ upperPop: "Loser" })}\n\n`;
    winner = trueWinner;
    loser = trueLoser;
  } else {
    // @ts-ignore
    result += `🏆 ${winner.petIcon} **${
      // @ts-ignore
      winner.petName
    }** won the duel!\n\n${loser.getPlayerUI({ upperPop: "Loser" })}\n\n`;
  }

  challengeDetails.isOver = true;
  // @ts-ignore
  const winnerData = notAllUsers[winner.ownerID];
  // @ts-ignore
  const loserData = notAllUsers[loser.ownerID];
  if (!winnerData || !loserData) {
    return output.replyStyled(
      "⚠️ | Weird, loser and winner data doesn't exist, why....?",
      style
    );
  }
  const { bet } = challengeDetails;

  // @ts-ignore
  if (winner.ownerID !== loser.ownerID) {
    // @ts-ignore
    await money.setItem(winner.ownerID, {
      money: (winnerData.money ?? 0) + bet,
    });
    // @ts-ignore
    await money.setItem(loser.ownerID, {
      money: (loserData.money ?? 0) - bet,
    });
    result += `🎉 **${
      winnerData.name ?? "Unregistered"
    }** has received $**${bet}**💵!\n`;
    result += `💔 **${
      loserData.name ?? "Unregistered"
    }** lost $**${bet}**💵!\n`;
  } else {
    result += `**${winnerData.name}** has won nothing, has lost nothing, the bet $**${bet}**💵 does not make sense here.`;
  }

  return output.replyStyled(result, style);
}
