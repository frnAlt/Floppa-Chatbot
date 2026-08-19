// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "wordgame",
  author: "frnAlt",
  version: "1.0.0",
  waitingTime: 5,
  description: "Word guessing game!",
  category: "Puzzle Games",
  usage: "{prefix}{name}",
  requirement: "3.0.0",
  icon: "🧩",
  cmdType: "arl_g",
  isGame: true,
};

const initialReward = 400;
const minReward = 50;
const penaltyPerSecond = 5;

export const style = {
  title: "Word Game 🧩",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext & { repObj: any; detectID: any }} param0
 * @returns
 */
export async function reply({
  api,
  input,
  output,
  repObj: receive,
  money: moneyH,
  detectID,
}) {
  if (!receive) return;
  receive.mid = detectID;

  const curr = Date.now();
  const elapsedSeconds = Math.floor((curr - receive.timestamp) / 1000);
  const currentReward = Math.max(
    initialReward - elapsedSeconds * penaltyPerSecond,
    minReward
  );

  if (input?.words[0]?.toLowerCase().trim() === receive.word) {
    api.unsendMessage(receive.mid);
    input.delReply(receive.mid);
    const userInfo = await moneyH.getCache(input.senderID);
    const { money = 0, wordGameWins = 0, name, wordGameStole = 0 } = userInfo;
    if (input.senderID !== receive.author) {
      await moneyH.set(input.senderID, {
        money: money + currentReward,
        wordGameWins: wordGameWins + 1,
        wordGameStole: wordGameStole + 1,
      });
      await moneyH.set(receive.author, {
        lastWordGame: null,
      });
    } else {
      await moneyH.set(receive.author, {
        money: money + currentReward,
        wordGameWins: wordGameWins + 1,
        lastWordGame: null,
      });
    }

    return output.replyStyled(
      `✅ | Correct ${
        name?.split(" ")[0]
      }! You have been rewarded ${currentReward} coins!`,
      style
    );
  } else {
    const userInfo = await moneyH.getCache(input.senderID);
    return output.replyStyled(
      `❌ | Wrong ${userInfo?.name?.split(" ")[0]}! Try again.`,
      style
    );
  }
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, prefix, money: moneyH }) {
  if (input.arguments[0] == "guide") {
    return output.reply(`𝗢𝘃𝗲𝗿𝘃𝗶𝗲𝘄
Test your vocabulary skills with our engaging word game! Unscramble the shuffled word to earn rewards.

𝗛𝗼𝘄 𝘁𝗼 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝘁𝗲:
1. Type 𝚠𝚘𝚛𝚍𝚐𝚊𝚖𝚎 to start the game.
2. Unscramble the given word.
3. Answer by typing your response.

𝗖𝗼𝗻𝗱𝗶𝘁𝗶𝗼𝗻𝘀:
- You can guess the word multiple times until you get it right.
- Rewards decrease over time.

𝗥𝗲𝘄𝗮𝗿𝗱𝘀:
- Correct answers earn you coins.
- Rewards decrease if you answer late.

𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀:
- If you guess wrong, you'll receive a fun response. Keep trying!
- Trash talks add a humorous touch to the challenge.

𝗘𝘅𝗮𝗺𝗽𝗹𝗲 𝗨𝘀𝗮𝗴𝗲:
- Input: ${prefix}𝚠𝚘𝚛𝚍𝚐𝚊𝚖𝚎
- Word: 𝖱𝖾𝖵𝗈𝗋𝗅

- Answer: lover

𝗦𝗰𝗼𝗿𝗶𝗻𝗴:
- Each correct answer earns you coins.
- Late answers receive reduced rewards.

𝗔𝗰𝗵𝗶𝗲𝘃𝗲𝗺𝗲𝗻𝘁𝘀:
- Track your word game wins and coins earned in your profile.

𝗘𝗻𝗷𝗼𝘆 𝘁𝗵𝗲 𝗪𝗼𝗿𝗱 𝗚𝗮𝗺𝗲 𝗮𝗻𝗱 𝗛𝗮𝘃𝗲 𝗙𝘂𝗻! 🧠🌟

---
`);
  }
  let { lastWordGame } = await moneyH.getItem(input.senderID);
  lastWordGame ??= {
    word: null,
    timeStamp: null,
    correct: null,
  };
  let info;
  if (!input.isWeb) {
    info = await output.reply(`Fetching...`);
  }
  let shuffledWord = lastWordGame?.word;
  if (!shuffledWord || input.property["refresh"]) {
    const allItems = require("./json/words.json");
    const item = allItems[Math.floor(Math.random() * allItems.length)];

    shuffledWord = shuffleWord(item);
    (lastWordGame.word = shuffledWord), (lastWordGame.timeStamp = Date.now());
    lastWordGame.correct = item;
  }

  const str = `🧩 Unscramble the word: [font=typewriter]${shuffledWord}[:font=typewriter]\n\nYou can type 'wordgame guide' if you need help.`;

  if (info) {
    output.edit(str, info.messageID);
  } else {
    info = await output.reply(str);
  }
  await moneyH.set(input.senderID, {
    lastWordGame,
  });
  input.setReply(info.messageID, {
    key: "wordgame",
    author: input.senderID,
    word: lastWordGame.correct,
    mid: info.messageID,
    timestamp: lastWordGame.timeStamp,
  });
}

/**
 * @param {string} word
 */
function shuffleWord(word) {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}
