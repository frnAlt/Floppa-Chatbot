import { UNISpectra } from "@cassidy/unispectra";
import axios from "axios";

export default defineCommand({
  meta: {
    name: "pair",
    otherNames: ["pairing"],
    author: "Monsterwith and Liane Cagara",
    version: "1.1.0",
    description: "pair with random people 😗",
    usage: "{prefix}{name} [quoted]",
    category: "Fun",
    noPrefix: false,
    role: 0,
    icon: "💘",
    waitingTime: 20,
  },
  style: {
    title: "💘 Pair",
    contentFont: "fancy",
    titleFont: "bold",
  },

  async entry({ input, output, usersDB, args }) {
    const uidI = input.senderID;
    await usersDB.ensureUserInfo(uidI);
    const user1 = await usersDB.getItem(uidI);
    const avatarUrl1 = user1.userMeta?.image;
    if (!avatarUrl1) {
      return output.reply("❌ This command does not work to you!");
    }
    const name1 = user1.userMeta?.name ?? user1.name ?? "Unregistered";
    const members = input.participantIDs ?? [];

    if (members.length === 0) {
      return output.reply("There are no members in the group ☹💕😢");
    }

    const eligibleMembers = members.filter(
      (member) => member !== uidI && member !== input.senderID
    );
    if (eligibleMembers.length === 0) {
      return output.reply(
        "There are no male/female members in the group ☹💕😢"
      );
    }

    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const randomMember = eligibleMembers[randomIndex];
    await usersDB.ensureUserInfo(randomMember);
    const user2 = await usersDB.getItem(randomMember);
    const name2 = user2.userMeta?.name ?? user2.name ?? "Unregistered";
    const avatarUrl2 = user2.userMeta?.image;

    const randomNumber1 = Math.floor(Math.random() * 36) + 65;
    const randomNumber2 = Math.floor(Math.random() * 36) + 65;
    let img1: any, img2: any;

    let makeQ = async (url: string, name: string, quote: string) => {
      if (args[0] !== "quoted") {
        return global.utils.getStreamFromURL(url);
      }
      const res = await axios.get("https://api.popcat.xyz/quote", {
        params: {
          image: url,
          font: "Poppins-Bold",
          name,
          text: quote,
        },
        responseType: "stream",
      });
      return res.data;
    };
    const text1 = `I love you ${name2}!`;
    const text2 = `I love you ${name1}!`;
    try {
      img1 = await makeQ(avatarUrl1, name1, text1);
    } catch (error) {
      await usersDB.saveUserInfo(uidI);
      try {
        img1 = await makeQ(
          (
            await usersDB.getItem(uidI)
          ).userMeta?.image,
          name1,
          text1
        );
      } catch (error) {}
    }
    try {
      img2 = await makeQ(avatarUrl2, name2, text2);
    } catch (error) {
      await usersDB.saveUserInfo(randomMember);
      try {
        img2 = await makeQ(
          (
            await usersDB.getItem(randomMember)
          ).userMeta?.image,
          name2,
          text2
        );
      } catch (error) {}
    }

    return output.reply({
      body: `${UNISpectra.arrow} Everyone congratulates the new husband and wife:
❤ ***${name1}*** 
        💕 
❤ ***${name2}*** 

**Love percentage**: ${randomNumber1}% 🤭
**Compatibility ratio**: "${randomNumber2}% 💕

Congratulations 💝`,
      ...(input.isWeb ? {} : { attachment: [img1, img2].filter(Boolean) }),
    });
  },
});
