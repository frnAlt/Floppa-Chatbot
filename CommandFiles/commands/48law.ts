const command = defineCommand({
  meta: {
    name: "48law",
    description: "Git sam portiit law ofp pawer sir!",
    version: "1.0.0",
    usage: "{prefix}48law <number>",
    category: "Media",
    author: "Aljur pogoy",
    role: 0,
    noPrefix: false,
    waitingTime: 0,
    requirement: "1.0.0",
    icon: "📜",
  },
  style: {
    title: "48 Laws of Power 📜",
    titleFont: "bold",
    contentFont: "fancy",
    lineDeco: "altar",
    topLine: "double",
  },
  async entry({ output, args }) {
    const number = args[0] || "1";
    try {
      const { title, law: content } = await output.req(
        "https://haji-mix.up.railway.app/api/law",
        { number }
      );
      output.reply(`📜 **${title}**\n\n${content}`);
    } catch (error) {
      output.error(error);
      console.error(error);
    }
  },
});

export default command;
