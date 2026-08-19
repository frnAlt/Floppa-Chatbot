export default easyCMD({
  name: "report",
  description: "Reports a message to bot admins.",
  title: "📝 Report to Admin",
  category: "Support",
  contentFont: "fancy",
  icon: "📝",
  meta: {
    cooldown: 120,
    otherNames: ["re"],
    usage: "report <message>",
    fbOnly: true,
    author: "@lianecagara",
  },
  async run({ output, args, userName, input, cancelCooldown }) {
    const message = args.join(" ");
    if (!message) {
      cancelCooldown();
      return output.send("⚠️ Please provide a message to report.");
    }
    const time = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    for (const id of Cassidy.config.ADMINBOT) {
      await output.sendStyled(
        `**Report from ${userName}**:\n\n${message}\n\n🔍 ***User ID***: ${input.sid}\n🔍 ***Thread ID***: ${input.tid}\n📅 ***Time***: ${time}`,
        {
          title: "‼️ Admin Report",
        },
        id
      );
    }
    output.reply("✅ Your report has been sent to the admins.");
    output.reaction("✅");
  },
});
