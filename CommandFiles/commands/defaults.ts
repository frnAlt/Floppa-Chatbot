import { handleDefaultCommand } from "@cassidy/unispectra";

export default easyCMD({
  name: "defaults",
  description: "Changes your default command.",
  category: "System",
  extra: {
    style: { title: Cassidy.logo, contentFont: "fancy" },
  },
  icon: "✅",
  async run({ print, multiCommands, args, ctx }) {
    const commandName = args[0];
    if (!commandName) {
      return print(
        "🔎 Please specify an alias or command name as **first argument.**"
      );
    }
    const foundCommands = multiCommands.get(commandName);
    return handleDefaultCommand(ctx, foundCommands, commandName);
  },
});
