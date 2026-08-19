import { GearsManage, PetPlayer } from "@cass-plugins/pet-fight";
import { Inventory } from "@cass-modules/InventoryEnhanced";
import { UNIRedux } from "cassidy-styler";
import { PersistentStats } from "@cass-modules/Encounter";
import { formatCash, parseBet } from "@cass-modules/ArielUtils";

export const meta: CommandMeta = {
  name: "oneshot",
  description: "Instant 1v1 pet gambling battle with a single bash",
  otherNames: ["oshot"],
  version: "1.0.4",
  usage: "{prefix}{name} [bet_amount] [pet]",
  category: "Pet Games",
  author: "@lianecagara",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.7.0",
  icon: "🎰",
  cmdType: "cplx_g",
  isGame: true,
};

export const style: CommandStyle = {
  title: `🎰 OneShot Duel`,
  titleFont: "double_struck",
  contentFont: "fancy",
  lineDeco: "altar",
};

interface OneShotGameState {
  player1Pet: PetPlayer | null;
  aiPet: PetPlayer | null;
  player1Author: string;
  betAmount: number;
}

interface PetAttackResult {
  damage: number;
  dodged: boolean;
}

function getPetInfos(
  data: UserData | Pick<UserData, "petsData" | "gearsData">
) {
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

function calculateBashAttack(
  attacker: PetPlayer,
  defender: PetPlayer
): PetAttackResult {
  const dodgeChance = Math.random();
  if (dodgeChance < 0.005) {
    return { damage: 0, dodged: true };
  }
  const damage = Math.round(attacker.calculateAttack(defender.DF));
  return { damage, dodged: false };
}
async function generateAIPet(
  money: CommandContext["money"],
  player1Pet: PetPlayer
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
  const strongerPets: { pet: PetPlayer; author: string }[] = [];
  const weakerPets: { pet: PetPlayer; author: string }[] = [];
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

  for (const user of Object.values(allUsers)) {
    const { petsData } = getPetInfos(user);
    for (const petData of petsData.getAll()) {
      if (player1Pet.petName !== petData.name) {
        allPetNamesAndIcons.push({ name: petData.name, icon: petData.icon });
      }
      const pet = new PetPlayer(
        petData,
        new GearsManage(user.gearsData).getGearData(petData.key)
      );
      const petStrength = calculatePetStrength(pet);
      const isDisqualified =
        pet.petIcon === playerPetIcon && pet.petName === playerPetName;

      if (!isDisqualified) {
        const petEntry = { pet, author: user.userID };
        if (petStrength > playerStrength) {
          strongerPets.push(petEntry);
        } else {
          weakerPets.push(petEntry);
        }
      }
    }
  }

  if (strongerPets.length === 0 && weakerPets.length === 0) {
    throw new Error("No suitable AI pet found.");
  }

  const isStronger = Math.random() < 0.3;
  const petPool = isStronger ? strongerPets : weakerPets;
  const fallbackPool = isStronger ? weakerPets : strongerPets;

  let selectedPet: PetPlayer | null = null;
  let selectedAuthor: string | null = null;

  if (petPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * petPool.length);
    ({ pet: selectedPet, author: selectedAuthor } = petPool[randomIndex]);
  } else if (fallbackPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * fallbackPool.length);
    ({ pet: selectedPet, author: selectedAuthor } = fallbackPool[randomIndex]);
  }

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

  selectedPet.HP = selectedPet.maxHP;

  // selectedPet.atkModifier += Math.floor(player1Pet.ATK / 1.5);
  // selectedPet.defModifier += Math.floor(player1Pet.DF / 1.5);
  // selectedPet.magicModifier += Math.floor(player1Pet.MAGIC / 1.5);

  return { pet: selectedPet, author: `AI_${Date.now()}` };
}
export async function entry({
  input,
  output,
  money,
  prefix,
  commandName,
  user,
}: CommandContext): Promise<any> {
  const gameState: OneShotGameState = {
    player1Pet: null,
    aiPet: null,
    player1Author: input.senderID,
    betAmount: 0,
  };

  const betAmount = parseBet(input.arguments[0], user.money);
  if (isNaN(betAmount) || betAmount <= 0) {
    return output.replyStyled(
      `**Example**: ${prefix}${commandName} 100M Doggo`,
      style
    );
  }
  gameState.betAmount = betAmount;

  const playerData = await money.getItem(input.senderID);
  if (!playerData || (playerData.money || 0) < betAmount) {
    return output.replyStyled(
      `You don't have enough money to bet ${betAmount}.`,
      style
    );
  }

  const { petsData, playersMap } = getPetInfos(playerData);
  if (petsData.getAll().length < 1) {
    return output.replyStyled(`❌ You need at least one pet to play!`, style);
  }

  const player1PetName = input.arguments[1];
  if (!player1PetName) {
    return output.replyStyled(
      `**Example**: ${prefix}${commandName} 100M Doggo`,
      style
    );
  }

  const player1PetData = petsData
    .getAll()
    .find(
      (i) =>
        String(i?.name).toLowerCase().trim() ===
        player1PetName.toLowerCase().trim()
    );
  if (!player1PetData) {
    return output.replyStyled(`Pet "${player1PetName}" not found.`, style);
  }

  const player1Pet = playersMap.get(player1PetData.key);
  if (!player1Pet) {
    return output.replyStyled(`Error loading pet "${player1PetName}".`, style);
  }
  gameState.player1Pet = player1Pet;

  const { pet: aiPet } = await generateAIPet(money, player1Pet);
  gameState.aiPet = aiPet;

  const playerStats: PersistentStats = {
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    mercyContributed: 0,
    defenseBoosts: 0,
    attackBoosts: 0,
    healsPerformed: 0,
    lastMove: null,
  };
  const aiStats: PersistentStats = {
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    mercyContributed: 0,
    defenseBoosts: 0,
    attackBoosts: 0,
    healsPerformed: 0,
    lastMove: null,
  };

  let flavorText = `${UNIRedux.charm} 🎰 **OneShot Battle Begins!**\n`;
  flavorText += `${player1Pet.petIcon} **${player1Pet.petName}** vs ${aiPet.petIcon} **${aiPet.petName}**\n\n`;

  const playerAttack = calculateBashAttack(player1Pet, aiPet);
  if (playerAttack.dodged) {
    flavorText += `${UNIRedux.charm} ${aiPet.petIcon} **${aiPet.petName}** dodged ${player1Pet.petIcon} **${player1Pet.petName}**'s 🥊 **Bash**!\n`;
  } else {
    aiPet.HP -= playerAttack.damage;
    playerStats.totalDamageDealt += playerAttack.damage;
    aiStats.totalDamageTaken += playerAttack.damage;
    flavorText += `${UNIRedux.charm} ${player1Pet.petIcon} **${player1Pet.petName}** used 🥊 **Bash**! Dealt **${playerAttack.damage}** damage.\n`;
  }

  const aiAttack = calculateBashAttack(aiPet, player1Pet);
  if (aiAttack.dodged) {
    flavorText += `${UNIRedux.charm} ${player1Pet.petIcon} **${player1Pet.petName}** dodged ${aiPet.petIcon} **${aiPet.petName}**'s 🥊 **Bash**!\n`;
  } else {
    player1Pet.HP -= aiAttack.damage;
    aiStats.totalDamageDealt += aiAttack.damage;
    playerStats.totalDamageTaken += aiAttack.damage;
    flavorText += `${UNIRedux.charm} ${aiPet.petIcon} **${aiPet.petName}** used 🥊 **Bash**! Dealt **${aiAttack.damage}** damage.\n`;
  }

  const playerHPRemaining = Math.max(0, player1Pet.getPercentHP());
  const aiHPRemaining = Math.max(0, aiPet.getPercentHP());
  const playerHPPercent = player1Pet.getPercentHP();
  const aiHPPercent = aiPet.getPercentHP();
  const hpDifference = playerHPPercent - aiHPPercent;
  let outcomeText = "";
  // @ts-ignore
  let moneyChange = 0;

  if (playerHPRemaining > aiHPRemaining) {
    const baseWinnings = Math.round(
      (aiPet.maxHP - (aiHPPercent * aiPet.maxHP) / 100) * 2 * betAmount
    );

    const hpDiffMultiplier = Math.max(0.1, hpDifference / 100);
    const winnings = Math.round(baseWinnings * hpDiffMultiplier);
    moneyChange = winnings;
    outcomeText = `${UNIRedux.charm} ${player1Pet.petIcon} **${
      player1Pet.petName
    }** wins with **${playerHPPercent.toFixed(1)}% HP** remaining!\n`;
    outcomeText += `${UNIRedux.charm} You won ${formatCash(winnings, true)}`;
    await money.setItem(input.sid, {
      money: playerData.money + winnings,
    });
  } else if (aiHPRemaining > playerHPRemaining) {
    const hpDiffMultiplier = Math.max(0.1, Math.abs(hpDifference) / 100);
    const lossAmount = Math.round(betAmount * hpDiffMultiplier);
    moneyChange = -lossAmount;
    outcomeText = `${UNIRedux.charm} ${aiPet.petIcon} **${
      aiPet.petName
    }** wins with **${aiHPPercent.toFixed(1)}% HP** remaining!\n`;
    outcomeText += `${UNIRedux.charm} You lost ${formatCash(
      lossAmount,
      true
    )} (scaled by **${hpDiffMultiplier.toFixed(2)}x** HP difference).`;
    await money.setItem(input.sid, {
      money: playerData.money - lossAmount,
    });
  } else {
    outcomeText = `${
      UNIRedux.charm
    } It's a tie! Both pets have **${playerHPPercent.toFixed(
      1
    )}% HP** remaining.\n`;
    outcomeText += `${UNIRedux.charm} Your bet of ${formatCash(
      betAmount,
      true
    )} is returned.`;
  }

  const result = `${flavorText}\n${player1Pet.getPlayerUI({
    showStats: true,
  })}\n${aiPet.getPlayerUI({
    showStats: true,
  })}\n\n${outcomeText}\n\n**New Balance**: ${formatCash(
    (await money.queryItem(input.sid, "money")).money,
    true
  )}`;

  await output.replyStyled(result, style);
}
