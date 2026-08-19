// @ts-check

import { CassMenu } from "@cass-interact";

// This is a command template!
// Make a new file, copy+paste, and modify!

const cassMenu = new CassMenu();

cassMenu.description("reward", "Claim a random reward.");

cassMenu.option(
  "reward",
  async ({ print, reaction, edit, atReply, userName, getMoney, setMoney }) => {
    const money = await getMoney();
    const reward = 5;

    print(`Hello ${userName}! You got $${reward}!`);
    reaction("💗");

    await setMoney(money + reward);

    await edit("5 seconds later!", 5000);

    atReply(({ print }) => {
      print("Thanks for replying!");
    });
  },
);

cassMenu.description("uwu", "Idk, just say uwu too.");

cassMenu.option("uwu", async ({ reaction, reply }) => {
  reaction("😅");
  reply("UwU too!");
});

export default easyCMD({
  name: "hello",
  description: "Greets a user.",
  title: "💗 Greetings",
  icon: "💗",
  category: "Fun",
  async run({ runContextual }) {
    await runContextual(cassMenu);
  },
});


