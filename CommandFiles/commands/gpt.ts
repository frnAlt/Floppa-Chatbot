import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";
import path from "path";
import * as fs from "fs";

const cmd = easyCMD({
  name: "gpt",
  meta: {
    otherNames: ["gpt4o", "ai", "ask"],
    author: "From Haji Mix REST API, handled by Liane Cagara",
    description:
      "A versatile assistant that provides information, answers questions, and assists with a wide range of tasks.",
    icon: "🤖",
    version: "1.3.0",
    noPrefix: "both",
  },
  category: "AI",
  title: {
    content: "GPT-4O FREE 🖼️🎓",
    text_font: "bold",
    line_bottom: "default",
  },
  content: {
    content: null,
    text_font: "none",
    line_bottom: "hidden",
  },
  run(ctx) {
    return main(ctx);
  },
});

export interface ResponseType {
  user_ask: string;
  answer: string;
  images?: {
    description?: string;
    url?: string;
  }[];
}

async function main({
  output,
  args,
  commandName,
  prefix,
  input,
  cancelCooldown,
  usersDB,
  command,
}: CommandContext) {
  let ask = args.join(" ");
  await output.reaction("🟡");
  if (!ask) {
    cancelCooldown();
    await output.reaction("🔴");
    return output.reply(
      `🔎 Please provide a question for **gpt**.\n\n***Example*** ${prefix}${commandName} what is tralalero tralala?`
    );
  }
  const user = await usersDB.getUserInfo(input.sid);
  const userGame = await usersDB.getCache(input.sid);

  if (user?.name || userGame.name) {
    ask = `${user?.name || userGame.name} Info:\n\nThey have ${Number(
      userGame.money
    ).toLocaleString()} balance in the Cassidy Chatbot System, treat wealthy (> 500M) well and treat poor (< 500M) not as good.\n\n${
      user?.name || userGame.name
    } asked:\n\n${ask}`;
  }

  if (input.replier && input.replier.body) {
    ask = `${ask}\n\nUser replied with this message:\n\n${input.replier.body}`;
  }

  if (input.replier && input.replier.attachmentUrls.length > 0) {
    ask = `${ask}\n\nUser also sent these attachments:\n\n${input.replier.attachmentUrls.join(
      ", "
    )}`;
  }

  const headers: AxiosRequestConfig["headers"] = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Sec-CH-UA":
      '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    Cookie: "__stripe_mid=7cee4280-8e2d-43b6-a714-a99393dc8fb0a84de5",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  };

  output.setStyle(cmd.style);

  const res: ResponseType = await output.req(
    "https://haji-mix.up.railway.app/api/gpt4o",
    {
      uid: input.sid + "_7",
      ask,
    },
    {
      headers,
    }
  );

  const form: StrictOutputForm = {
    body: res.answer,
  };

  form.body += `\n\n***You can reply to this conversation.***`;
  const filePath = path.join(
    process.cwd(),
    "temp",
    `gpt-gen_${Date.now()}_${Math.floor(Math.random() * 1000000)}.png`
  );

  if (Array.isArray(res.images)) {
    for (const image of res.images) {
      if (typeof image.description === "string") {
        form.body = `${image.description}`;
      }
      if (typeof image.url === "string") {
        const res: AxiosResponse<ArrayBuffer> = await axios.get(image.url, {
          responseType: "arraybuffer",
        });

        const buffer = Buffer.from(res.data);

        fs.writeFileSync(filePath, buffer);
        const stream = fs.createReadStream(filePath);

        form.attachment = stream;

        stream.on("end", () => {
          fs.unlinkSync(filePath);
        });

        break;
      }
    }
  }

  await output.reaction("🟢");
  const info = await output.reply(form);
  info.atReply((rep) => {
    rep.output.setStyle(cmd.style);
    main({ ...rep, args: rep.input.words });
  });
}

export default cmd;
