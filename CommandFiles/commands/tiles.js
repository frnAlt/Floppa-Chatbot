// @ts-check
import { CassEXP } from "../modules/cassEXP.js";
import { clamp } from "@cassidy/unispectra";

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Tiles 🟨",
  titleFont: "bold",
  contentFont: "fancy",
};

const { delay, Tiles } = global.utils;
const { invLimit } = global.Cassidy;

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "tiles",
  author: "Liane Cagara, idea from Duke",
  description: "Choose tiles and got chance to win large amounts of coins!",
  otherNames: ["tile", "t"],
  version: "1.2.2",
  usage: "{prefix}tiles <tile>",
  waitingTime: 1,
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🟨",
  category: "Chance Games",
  cmdType: "arl_g",
  isGame: true,
};

// Created by Liane Cagara, do not own.
// Allows different emoji so you can literally customize it LMAO
// Also tiles can be customized easily

/**
 * @param {CommandContext} ctx
 */
export async function entry({
  input,
  output,
  args,
  money,
  prefix,
  cancelCooldown,
  commandName,
  Inventory,
}) {
  let sizeX = 10;
  let sizeY = 5;
  let info;
  if (args[0] === "size" && args[1].includes("x")) {
    [sizeX, sizeY] = args[1].split("x").map(Number);
    sizeX = parseInt(String(sizeX));
    sizeY = parseInt(String(sizeY));
    if (isNaN(sizeX) || isNaN(sizeY)) {
      cancelCooldown();
      return output.reply(
        `❌ | Make sure both sizes are numbers! Example: ${prefix}tiles size 3x7`
      );
    }
    if (sizeX > 10 || sizeY > 10 || sizeX < 5 || sizeY < 5) {
      cancelCooldown();
      return output.reply(
        `❌ | Make sure both sizes are between 5 and 10! Example: ${prefix}tiles size 3x7`
      );
    }
  }
  if (!input.isWeb) {
    info = await output.reply(`⚙️ Starting...`);
  }

  let {
    money: userMoney = 0,
    tileConfig,
    name = "Unregistered",
    tilesStamp = Date.now() - 10 * 60 * 1000,
    tilesRunStamp,
    inventory: iR,
  } = await money.getItem(input.senderID);
  const inventory = new Inventory(iR);
  if (inventory.has("tilesBomb")) {
    const txt = `❌ | There are bombs in your inventory, you cannot play right now!`;
    if (info) {
      await output.edit(txt, info.messageID);
    } else {
      await output.reply(txt);
    }
    return;
  }
  let isPendantUsed = false;
  limitCheck: {
    if (tilesRunStamp && Date.now() - tilesRunStamp < 10 * 60 * 1000) {
      if (inventory.has("timePendant")) {
        isPendantUsed = true;
        inventory.deleteOne("timePendant");
        break limitCheck;
      }

      const txt = `❌ | The game is still running! Please finish the game or just wait 10 minutes.`;
      if (info) {
        await output.edit(txt, info.messageID);
      } else {
        await output.reply(txt);
      }
      return;
    }
    await delay(1000);
    const elapsedTime = Date.now() - tilesStamp;
    if (elapsedTime < 10 * 60 * 1000) {
      if (inventory.has("timePendant")) {
        isPendantUsed = true;
        inventory.deleteOne("timePendant");
        break limitCheck;
      }

      const txt = `🕜 | You can use this command again in ${Math.ceil(
        (10 * 60 * 1000 - elapsedTime) / 60 / 1000
      )} minutes.`;
      if (info) {
        await output.edit(txt, info.messageID);
      } else {
        await output.reply(txt);
      }
      return;
    }
  }
  if (!tileConfig) {
    if (info) {
      await output.edit(`⚙️ Saving tileConfig (new user)...`, info.messageID);
      await delay(1000);
    }
    tileConfig = {
      bombIcon: "💣",
      coinIcon: "💰",
      tileIcon: "🟨",
      emptyIcon: "⬜",
    };
    await money.set(input.senderID, {
      tileConfig,
    });
  } else if (info) {
    await output.edit(
      `⚙️ Checking tileConfig (existing user)...`,
      info.messageID
    );
    await delay(1000);
  }

  if (info) {
    await output.edit(`🏗️ Generating board...`, info.messageID);
    await delay(1000);
  }
  const board = new Tiles({
    sizeX,
    sizeY,
    ...tileConfig,
  });
  if (input.body.includes("reveal")) {
    board.reveal();
  }
  const text = `Welcome to this game! Please reply with a number between ${
    board.range()[0]
  } and ${board.range()[1]} to choose a tile.
${
  isPendantUsed
    ? `\n❕ You have used your Time Pendant to bypass time limit.\n`
    : ``
}
Tiles:
${board.tileIcon} **Unselected**
• You can select this tile.
${board.bombIcon} **Bomb**
• Bomb ends the game.
${board.coinIcon} **Coin**
• Coin gives you a random amount of coins.
${board.emptyIcon} **EXP**
• White tiles give you random amount of exp.

${board}`;
  let xInfo = info;
  await money.set(input.senderID, {
    tilesRunStamp: Date.now(),
    inventory: Array.from(inventory),
  });

  if (info) {
    await output.edit(text, info.messageID);
  } else {
    xInfo = await output.reply(text);
  }
  input.setReply(xInfo.messageID, {
    key: commandName,
    board,
    userMoney,
    tileConfig,
    author: input.senderID,
    xID: xInfo.messageID,
    name,
    isEnd: false,
    coins: 0,
    explodes: 0,
  });
}

export let a = new Tiles({});
/**
 * @param {CommandContext & { repObj: { board: typeof a; userMoney: number; tileConfig: any; author: string; xID: string; name: string; isEnd: boolean; coins: number; explodes: number } }} ctx
 */
export async function reply({
  input,
  output,
  repObj,
  money,
  commandName,
  Inventory,
}) {
  output.setStyle(style);
  try {
    let { board, author, xID, name, isEnd, coins, explodes } = repObj;
    if (isEnd) {
      return;
    }
    if (input.senderID !== author) {
      return output.reply(`❌ | This game ain't yours.`);
    }
    let num = parseInt(input.words[0]);
    if (isNaN(num)) {
      return output.reply(
        `❌ | Please go back to the tiles and enter a valid number!`
      );
    }
    const code = board.choose(num);
    if (code === "OUT_OF_RANGE") {
      return output.reply(
        `❌ | The number ${num} is out of range! Please go back to the tiles and choose a number between ${
          board.range()[0]
        } and ${board.range()[1]}!`
      );
    }
    if (code === "ALREADY_CHOSEN") {
      return output.reply(
        `❌ | You already selected this tile! Please go back to the tiles and choose another tile!`
      );
    }
    const makeText = () => `Please **choose** a number between **${
      board.range()[0]
    }** and **${board.range()[1]}**

${board.coinIcon} **Total Coins**: ${coins}$

${board}`;

    if (code === "BOMB") {
      explodes++;
      let { inventory: iR } = await money.getCache(input.senderID);
      const inventory = new Inventory(iR);
      if (inventory.getAll().length < invLimit) {
        inventory.addOne({
          key: "tilesBomb",
          name: "Tiles Bomb",
          flavorText:
            "These are leftover bombs from the tiles game, you need to get rid of these ASAP.",
          icon: board.bombIcon,
          sellPrice: 100,
          type: "weapon",
          atk: 5,
          def: 1,
        });
        await money.set(input.senderID, {
          inventory: Array.from(inventory),
        });
      }

      if (explodes < 3) {
        const nth = explodes === 1 ? "1st" : "2nd";
        const { messageID: id } = await output.reply(`❕ ${
          board.bombIcon
        } You hit a bomb for the ${nth} time!
Hitting it for the 3rd time will explode all of them.

${makeText()}`);
        handleAgain(id);
        return;
      }
      isEnd = true;
      const oldBoard = board.toString();
      board.reveal();
      const revealBoard = board.toString();
      await money.set(input.senderID, {
        tilesStamp: Date.now(),
      });
      await money.remove(input.senderID, ["tilesRunStamp"]);
      await output.reply(`**GAME OVER**

${board.bombIcon} You hit a 3rd bomb and it exploded all around the board, but this is not the time to give up, you can always try again! 💥

❤️ Stay determined ${name}!

${board.coinIcon} **Total Coins**: ${coins}$

${oldBoard}

${revealBoard}`);
      input.delReply(xID);
      return;
    }
    if (code === "COIN") {
      const { money: userMoney } = await money.getCache(author);
      const reward = randomCoin();
      coins += reward;
      await money.set(author, {
        money: userMoney + reward,
      });
      const { messageID: id } = await output.reply(`${
        board.coinIcon
      } You hit a **coin** and got ${reward}$

${makeText()}`);
      handleAgain(id);
    } else if (code === "EMPTY") {
      //       const { messageID: id } = await output.reply(`${
      //         board.emptyIcon
      //       } You hit an **empty** tile, nothing happened.

      // ${makeText()}`);
      //       handleAgain(id);

      const userData = await money.getCache(author);
      const reward = clamp(10, Math.floor(randomCoin() / 20), 100);
      const cassEXP = new CassEXP(userData.cassEXP);
      cassEXP.expControls.raise(reward);
      await money.set(author, {
        cassEXP: cassEXP.raw(),
      });
      const { messageID: id } = await output.reply(`${
        board.emptyIcon
      } You hit an **exp tile** and got **${reward} EXP**

${makeText()}`);
      handleAgain(id);
    }
    function handleEnd() {
      if (board.isEnd()) {
        const oldBoard = board.toString();
        board.reveal();

        isEnd = true;
        output.reply(`**GAME OVER**

🎉 All **tiles** are successfully cleared!

${board.coinIcon} **Total Coins**: ${coins}$

Your souvenir:

${oldBoard}`);
      }
    }
    function handleAgain(id) {
      handleEnd();
      input.delReply(xID);
      input.setReply(id, {
        ...repObj,
        key: commandName,
        coins,
        isEnd,
        name,
        explodes,
        xID: id,
      });
    }
  } catch (error) {
    output.error(error);
  }
}
function randomCoin() {
  const coins = [
    100, 20, 10, 50, 200, 30, 200, 70, 80, 40, 200, 100, 500, 100, 69, 200, 10,
    690, 20, 2000, 8000, 10000, 60, 60, 10, 10, 1,
  ];
  return coins[Math.floor(Math.random() * coins.length)];
}
