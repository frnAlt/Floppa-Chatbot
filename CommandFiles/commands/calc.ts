import { evaluate } from "mathjs";

export const meta: CommandMeta = {
  name: "calc",
  otherNames: ["calculator"],
  author: "Kshitiz",
  version: "1.0.0",
  waitingTime: 5,
  description: "perform simple and scientific calculation ",
  category: "Utilities",
  usage: "{p}calc 20*20",
  params: [true],
  requirement: "3.0.0",
  icon: "💻",
};

export const style: CommandStyle = {
  title: "Calculator 💻",
  titleFont: "bold",
  contentFont: "none",
};

export async function entry({ input, output }: CommandContext) {
  try {
    const data = input.arguments;

    const expression = data.join(" ");

    const result = evaluateExpression(expression);

    const replyMessage = {
      body: `**Expression:**\n>> ${expression}\n\n**Evaluation:**\n= ${result}`,
    };

    await output.reply(replyMessage);
  } catch (error) {
    console.error("[ERROR]", error);
    output.error(error);
  }
}

function evaluateExpression(expression) {
  try {
    const result = evaluate(expression);
    return result;
  } catch (error) {
    console.error("[ERROR]", error);
    return "Error: Invalid expression.";
  }
}
