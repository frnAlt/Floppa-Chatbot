// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "quiz",
  author: "@lianecagara",
  version: "1.0.1",
  waitingTime: 5,
  description: "Quiz game!",
  category: "Puzzle Games",
  usage: "{prefix}{name}",
  requirement: "3.0.0",
  icon: "🎉",
  cmdType: "arl_g",
  isGame: true,
};

const rewardOrig = 200;

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Quiz 🎉",
  titleFont: "bold",
  contentFont: "fancy",
};
/**
 *
 * @param {CommandContext & { repObj: { author: string; correct: number; mid: string; timestamp: number; fail: any[]; public: any }; detectID: string }} param0
 * @returns
 */
export async function reply({
  api,
  input,
  output,
  getInflationRate,
  repObj: recieve,
  money: moneyH,
  detectID,
}) {
  if (!recieve) return;
  recieve.mid = detectID;
  if (recieve.fail?.includes(input.senderID) && !input.isWeb) {
    return output.replyStyled(
      `❌ | You have failed your previous answer! You cannot answer again.`,
      style
    );
  }
  const rate = await getInflationRate();
  const reward = Math.round(rewardOrig + rewardOrig * rate);

  const curr = Date.now();
  if (recieve.author !== input.senderID && !recieve.public) {
    return output.replyStyled(
      `❌ | Please wait for the user to fail his answer before you can answer!`,
      style
    );
  }
  if (input?.words[0]?.toLowerCase().trim() === recieve.correct?.toString()) {
    api.unsendMessage(recieve.mid);
    input.delReply(recieve.mid);
    const userInfo = await moneyH.getItem(input.senderID);
    const { name } = userInfo;
    const { money = 0, quizWins = 0 } = userInfo;
    const finalReward = reward - Math.floor((curr - recieve.timestamp) / 500);
    if (finalReward <= 0) {
      return output.replyStyled(
        `❌ | Your answer is correct but you have answered too late!`,
        style
      );
    }
    await moneyH.set(input.senderID, {
      money: money + finalReward,
      quizWins: quizWins + 1,
    });
    return output.replyStyled(
      `✅ | Correct ${
        name?.split(" ")[0]
      }! You have been rewarded ${finalReward} coins!`,
      style
    );
  } else {
    //api.unsendMessage(recieve.mid);

    input.delReply(recieve.mid);
    const userInfo = await moneyH.getItem(input.senderID);
    if (!recieve.fail) {
      recieve.fail = [];
    }
    input.setReply(recieve.mid, {
      ...recieve,
      key: "quiz",
      fail: [...recieve.fail, input.senderID],
      public: true,
    });
    return output.replyStyled(
      `❌ | Wrong ${
        userInfo?.name?.split(" ")[0]
      }! Other members can now answer the same question.${
        input.isWeb ? ".. Hold up, there's no other members in the web.." : ""
      }`,
      style
    );
  }
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, prefix }) {
  if (input.arguments[0] == "guide") {
    return output.reply(`𝗢𝘃𝗲𝗿𝘃𝗶𝗲𝘄
Test your skills with our engaging quiz! Answer questions to earn rewards and showcase your knowledge.

𝗛𝗼𝘄 𝘁𝗼 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝘁𝗲:
1. Type 𝚚𝚞𝚒𝚣 to start the quiz.
2. Read the question carefully.
3. Answer by typing your response.

𝗖𝗼𝗻𝗱𝗶𝘁𝗶𝗼𝗻𝘀:
- You have 120 seconds to answer each question.
- If you fail a question, you cannot attempt it again, and the others will be able to answer it.
- Wait for others to finish before answering in group chats.

𝗥𝗲𝘄𝗮𝗿𝗱𝘀:
- Correct answers earn you coins.
- Rewards decrease if you answer late.

𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀:
- If you fail, you'll receive a fun response. No worries, keep trying!
- Trash talks add a humorous touch to the challenge.

𝗘𝘅𝗮𝗺𝗽𝗹𝗲 𝗨𝘀𝗮𝗴𝗲:
- Input: ${prefix}𝚚𝚞𝚒𝚣
- Question: 𝖶𝗁𝖺𝗍 𝗂𝗌 𝗍𝗁𝖾 𝗆𝖺𝗂𝗇 𝗂𝗇𝗀𝗋𝖾𝖽𝗂𝖾𝗇𝗍 𝗂𝗇 𝗀𝗎𝖺𝖼𝖺𝗆𝗈𝗅𝖾?

𝟭.) 𝖫𝗂𝗆𝖾
𝟮.) 𝖮𝗇𝗂𝗈𝗇
𝟯.) 𝖳𝗈𝗆𝖺𝗍𝗈
𝟰.) 𝖠𝗏𝗈𝖼𝖺𝖽𝗈

- Answer: 4

𝗦𝗰𝗼𝗿𝗶𝗻𝗴:
- Each correct answer earns you coins.
- Late answers receive reduced rewards.

𝗔𝗰𝗵𝗶𝗲𝘃𝗲𝗺𝗲𝗻𝘁𝘀:
- Track your quiz wins and coins earned in your profile.

𝗘𝗻𝗷𝗼𝘆 𝘁𝗵𝗲 𝗤𝘂𝗶𝘇 𝗮𝗻𝗱 𝗛𝗮𝗽𝗽𝘆 𝗟𝗲𝗮𝗿𝗻𝗶𝗻𝗴! 🧠🌟

---
`);
  }
  let info;
  if (!input.isWeb) {
    info = await output.reply(`Fetching...`);
  }
  const total = require("./json/quiz.json");
  const responses = total.map((i) => ({
    ...i,
    message: `${i.question}\n\n${i.options
      .map((opt, ind) => `**${ind + 1}**. ${opt}`)
      .join("\n")}`,
    correct: i.answer + 1,
  }));
  const response = responses[Math.floor(Math.random() * responses.length)];

  const str =
    response.message + `\n\n𝘠𝘰𝘶 𝘤𝘢𝘯 𝘵𝘺𝘱𝘦 𝚀𝚞𝚒𝚣 𝚐𝚞𝚒𝚍𝚎 𝘪𝘧 𝘺𝘰𝘶 𝘯𝘦𝘦𝘥 𝘩𝘦𝘭𝘱.`;

  if (info) {
    output.edit(str, info.messageID);
  } else {
    info = await output.reply(str);
  }
  input.setReply(info.messageID, {
    key: "quiz",
    author: input.senderID,
    correct: response.correct,
    mid: info.messageID,
    timestamp: Date.now(),
    fail: [],
  });
}
