// @ts-check
import fs from "fs";
import stringSimilarity from "string-similarity";
import { translate } from "@vitalets/google-translate-api";
import { clamp, UNISpectra } from "@cassidy/unispectra";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "familyfeud",
  author: "@lianecagara",
  version: "2.0.0",
  waitingTime: 5,
  description: "Family Feud style game!",
  category: "Puzzle Games",
  usage: "{prefix}{name}",
  otherNames: ["ff", "feud"],
  requirement: "3.0.0",
  icon: "🔎",
  cmdType: "arl_g",
  isGame: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: {
    content: `🔎 ${UNISpectra.wrapEmoji("Family Feud")} 🔍`,
    text_font: "bold",
    line_bottom: "default",
  },
  contentFont: "fancy",
};

function getRandomQuestion() {
  const data = JSON.parse(
    fs.readFileSync(__dirname + "/json/familyfeud.json", "utf8")
  );
  const index = Math.floor(Math.random() * data.length);
  return data[index];
}

function generateTable(answers) {
  let table = "\n🔍 **Family Feud Answers** 🔍\n\n";
  const total = answers
    .filter((answer) => answer.guessed)
    .reduce((total, answer) => total + answer.points, 0);
  table += `***Total*** [ **${total}** ]\n\n`;
  table += "Answers:\n";
  answers.forEach((answer) => {
    if (answer.guessed) {
      table += `✅ ${answer.answer} - ${answer.points} points\n`;
    } else {
      table += `❓ ${answer.answer.length} letters\n`;
    }
  });

  return table;
}
/**
 *
 * @param {CommandContext & { repObj: Record<string, any>}} ctx
 */
export async function reply({
  input,
  output,
  getInflationRate,
  repObj: receive,
  money: moneyH,
  detectID,
  Collectibles,
  CassEXP,
}) {
  const rate = await getInflationRate();
  try {
    if (typeof receive !== "object" || !receive) return;
    receive.mid = detectID;
    if (input.senderID !== receive.author) {
      return output.reply(`❌ This is not your game!`);
    }

    let userAnswer = input.words.join(" ").trim().toLowerCase();

    let userData = await moneyH.getItem(input.senderID);

    const cassEXP = new CassEXP(userData.cassEXP);
    let lastFeudGame = userData.lastFeudGame;
    let money = userData.money || 0;
    let name = userData.name;
    let strikes = userData.strikes || 0;

    let { question, answers } = lastFeudGame;
    const collectibles = new Collectibles(userData.collectibles ?? []);

    answers = answers.map((i, j) => {
      i.index = j;
      return i;
    });

    const matches = answers.map((answer, index) => ({
      ...answer,
      similarity: stringSimilarity.compareTwoStrings(
        answer.answer.toLowerCase(),
        userAnswer
      ),
      index: index,
    }));
    matches.sort((a, b) => b.similarity - a.similarity);

    let correctAnswer = matches[0].similarity > 0.7 ? matches[0] : null;

    if (!correctAnswer) {
      try {
        const translated = await translate(userAnswer, { to: "en" });
        userAnswer = translated.text.toLowerCase();

        correctAnswer = answers.find(
          (answer) =>
            stringSimilarity.compareTwoStrings(
              answer.answer.toLowerCase(),
              userAnswer
            ) > 0.7
        );
      } catch (error) {
        console.error("Translation error:", error);
      }
    }

    if (correctAnswer && !answers[correctAnswer.index]?.guessed) {
      const inflatedPts = Math.floor(
        correctAnswer.points + correctAnswer.points * rate
      );
      money += inflatedPts;
      answers[correctAnswer.index].guessed = true;

      const allGuessed = answers.every((answer) => answer.guessed);

      if (allGuessed) {
        collectibles.raise("feudTickets", answers.length);
        cassEXP.expControls.raise(20);
        await moneyH.setItem(input.senderID, {
          ...userData,
          cassEXP: cassEXP.raw(),
          collectibles: Array.from(collectibles),
          lastFeudGame: null,
          strikes: 0,
          ffStamp: Date.now(),
        });
        input.delReply(String(detectID));
        const allPoints = answers.reduce(
          (total, answer) => total + answer.points,
          0
        );

        return output.reply(
          `🏆 | Well done ${
            name?.split(" ")[0]
          }! You've guessed all answers and earned **${allPoints} points** that's added to your balance!\nYou also won 20 EXP! And 🎫 **${
            answers.length
          }**.\n\n${generateTable(answers)}`
        );
      } else {
        const replyMessage = `✅ | Correct ${name?.split(" ")[0]}! "${
          correctAnswer.answer
        }" was worth **${inflatedPts} points** that was added to your balance!\n\nKeep guessing! (Reply more!)\n\nQuestion: ${question}\n\n${generateTable(
          answers
        )}`;
        const xp = clamp(1, correctAnswer.points / 20, 10);
        cassEXP.expControls.raise(xp);
        await moneyH.set(input.senderID, {
          ...userData,
          money,
          cassEXP: cassEXP.raw(),
          lastFeudGame: {
            ...lastFeudGame,
            answers,
          },
          strikes,
          ffStamp: Date.now(),
        });

        const newReply = await output.reply(replyMessage);
        input.delReply(String(detectID));

        input.setReply(newReply.messageID, {
          key: "familyfeud",
          author: input.senderID,
          mid: newReply.messageID,
        });
      }
    } else {
      strikes += 1;

      if (strikes >= 10) {
        await moneyH.set(input.senderID, {
          ...userData,
          money,
          lastFeudGame: null,
          strikes: 0,
          ffStamp: Date.now(),
        });
        input.delReply(String(detectID));

        return output.reply(
          `[ ${"❌ ".repeat(strikes).trim()} ]\n\nSorry ${
            name?.split(" ")[0]
          }, you've received ten strikes! Better luck next time.`
        );
      } else {
        await moneyH.set(input.senderID, {
          ...userData,
          money,
          lastFeudGame: {
            ...lastFeudGame,
          },
          strikes,
          ffStamp: Date.now(),
        });
        const replyMessage = `[ ${"❌ "
          .repeat(strikes)
          .trim()} ]\n\nSorry, but the survey says "${userAnswer}" is not the correct answer. Please try again! (Reply more!)\n\nQuestion: ${question}\n\n${generateTable(
          answers
        )}`;

        const newReply = await output.reply(replyMessage);
        input.delReply(String(detectID));

        input.setReply(newReply.messageID, {
          key: "familyfeud",
          author: input.senderID,
          mid: newReply.messageID,
        });
      }
    }
  } catch (error) {
    output.error(error);
  }
}

/**
 *
 * @param {CommandContext} ctx
 */
export async function entry({
  input,
  output,
  prefix,
  money: moneyH,
  Inventory,
}) {
  if (input.arguments[0] == "guide") {
    return output.reply(`**Overview**
Test your knowledge and try to guess the most popular answers in our Family Feud game!

**How to Participate**:
1. Type ${prefix}familyfeud to start the game.
2. Guess the most popular answers to the survey question.
3. Answer by typing your response.

**Conditions**:
- You can guess multiple times until you get it right or receive three strikes.
- Points are awarded based on the popularity of the answer.

**Rewards**:
- Correct answers earn you points.

**Special Messages**:
- If you guess wrong, you'll receive a fun response. Keep trying!
- Humorous responses add to the fun of the game.

**Example Usage**:
- Input: ${prefix}familyfeud
- Question: Name something you bring to a picnic.

- Answer: food

**Scoring**:
- Each correct answer earns you points based on its popularity.
- Three strikes and the game ends.

**Achievements**:
- Track your Family Feud wins and points earned in your profile.

**Enjoy the family feud game and have fun!**! 👪🌟

---
`);
  }

  let {
    lastFeudGame,
    name,
    ffRunStamp,
    ffStamp = Date.now() - 10 * 60 * 1000,
    inventory: inv = [],
  } = await moneyH.getItem(input.senderID);
  const inventory = new Inventory(inv);
  limitCheck: {
    if (ffRunStamp && Date.now() - ffRunStamp < 10 * 60 * 1000) {
      if (inventory.has("timePendant")) {
        inventory.deleteOne("timePendant");
        break limitCheck;
      }

      const txt = `❌ | The game is still running! Please finish the game or just wait 10 minutes.`;

      await output.reply(txt);
      return;
    }
    const elapsedTime = Date.now() - ffStamp;
    if (elapsedTime < 10 * 60 * 1000) {
      if (inventory.has("timePendant")) {
        inventory.deleteOne("timePendant");
        break limitCheck;
      }

      const txt = `🕜 | You can use this command again in ${Math.ceil(
        (10 * 60 * 1000 - elapsedTime) / 60 / 1000
      )} minutes.`;

      await output.reply(txt);
      return;
    }
  }
  await moneyH.setItem(input.senderID, {
    ffRunStamp: Date.now(),
    inventory: inventory.raw(),
  });
  if (!name) {
    return output.reply(
      `❌ | Please use the command ${prefix}identity-setname first.`
    );
  }
  if (!lastFeudGame || input.property["refresh"]) {
    lastFeudGame = getRandomQuestion();
    lastFeudGame.answers = lastFeudGame.answers.map((answer) => ({
      ...answer,
      guessed: false,
    }));
    lastFeudGame.timeStamp = Date.now();
    await moneyH.setItem(input.senderID, {
      lastFeudGame,
    });
  }

  const str = `👪 Question: **${
    lastFeudGame.question
  }**\n\nType your answer below (reply). You can type '${prefix}familyfeud guide' if you need help.\n${generateTable(
    lastFeudGame.answers
  )}`;

  const info = await output.reply(str);
  input.setReply(info.messageID, {
    key: "familyfeud",
    author: input.senderID,
    mid: info.messageID,
  });
}
