// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "shoti",
  description: "Send a random Shoti video",
  author: "0xVoid | Liane?",
  version: "1.0.0",
  usage: "{prefix}{name} [mtls_key] <bet>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["shoti_"],
  icon: "😋",
};

import { parseBet } from "@cass-modules/ArielUtils";
import { CassidyResponseStylerControl } from "@cassidy/styler";
import Shoti from "shoti";
import {
  formatTokens,
  getTokensInfo,
  updatedTokensInfo,
} from "@cass-modules/MTLSUtils";

const isT = Cassidy.config.gambleNeedsMint ?? false;
const shoti = new Shoti("$shoti-b04f8c279e");

/**
 *
 * @param {CommandContext} ctx
 */
export async function entry({
  output,
  input,
  usersDB,
  Inventory,
  cancelCooldown,
}) {
  if (input.arguments[0]) {
    const cashGames = new CassidyResponseStylerControl({
      preset: ["cash_games_new.json"],
    });
    cashGames.activateAllPresets();

    const cashField = cashGames.getField("cashField");
    const resultText = cashGames.getField("resultText");

    const userData = await usersDB.getItem(input.sid);
    const inv = new Inventory(userData.inventory);
    let hasPass = inv.has("highRollPass");

    /**
     * @type {string}
     */
    let bet;
    /**
     * @type {string}
     */
    let KEY;
    /**
     * @type {ReturnType<typeof getTokensInfo>}
     */
    let infoT;

    if (isT) {
      [KEY = "", bet = ""] = input.arguments;
      if (KEY.startsWith("mtls_")) {
        KEY = KEY.replace("mtls_", "");
      }
      if (Cassidy.config.strictGambleNeedsMint && KEY === "money") {
        cancelCooldown();
        return output.reply("⚠️ We do not allow money bets!");
      }
      if (!KEY || !isNaN(parseBet(KEY, Infinity)) || !bet?.length) {
        cancelCooldown();
        return output.reply(
          `⚠️ Wrong syntax!\n\n**Guide**: ${input.words[0]} <mtls_key> <bet>\n\nYou can check your **collectibles** or visit **MTLS** to mint one!\nMTLS Key should have no "mtls_" prefix.`
        );
      }
      infoT = getTokensInfo(KEY, userData);
    } else {
      [bet] = input.arguments;
      if (!bet?.length) {
        cancelCooldown();
        return output.reply(
          `⚠️ Wrong syntax!\n\n**Guide**: ${input.words[0]} <bet>`
        );
      }
      infoT = getTokensInfo("money", userData);
    }

    const betAmount = parseBet(bet, infoT.amount);

    if (isNaN(betAmount) || betAmount <= 0) {
      cancelCooldown();
      return output.reply("⚠️ Invalid Bet");
    }

    if (betAmount > infoT.amount) {
      cancelCooldown();
      return output.reply(
        `⚠️ You do not have enough ${formatTokens(
          infoT,
          betAmount
        )}. You only had ${formatTokens(infoT, infoT.amount)}`
      );
    }

    if (!hasPass && betAmount > global.Cassidy.highRoll) {
      cancelCooldown();
      return output.reply(
        `You need a **HighRoll Pass** 🃏 to place bets over ${global.Cassidy.highRoll}$`
      );
    }

    const isWin = Math.random() < 0.1;
    let mod = 0;

    let text = "";

    if (isWin) {
      mod += +betAmount;

      cashField.applyTemplate({
        cash: formatTokens(infoT, Math.abs(mod)),
      });

      resultText.changeContent("You won:");

      text = `😋 ***SARAP*** ni gurl! You won ${formatTokens(
        infoT,
        Math.abs(mod)
      )}.`;
    } else {
      mod += -betAmount;

      cashField.applyTemplate({
        cash: formatTokens(infoT, Math.abs(mod)),
      });

      resultText.changeContent("You lost:");

      text = `😝 ***ASIM*** ni gurl! You lost ${formatTokens(
        infoT,
        Math.abs(mod)
      )}.`;
    }

    if (isNaN(mod)) {
      return output.wentWrong();
    }

    await usersDB.setItem(input.sid, {
      ...updatedTokensInfo(infoT, infoT.amount + mod),
    });

    const newInfo = getTokensInfo(
      infoT.refKey,
      await usersDB.getCache(input.sid)
    );
    text += ` Your new balance is ${formatTokens(infoT, newInfo.amount)}`;

    return output.replyStyled(text, {
      ...cashGames.getFields(),
    });
  }
  const info = await output.reply("🔎 Fetching...");
  try {
    const data = await shoti.getShoti({ type: "video" });
    if ("error" in data) {
      return info.editSelf("❌ Cannot fetch.");
    }
    info.editSelf("📥 Downloading...");

    const message =
      `**Country**: ${data.region ?? "N/A"}\n` +
      `**Instagram**: ${data.user.instagram ?? "N/A"}\n` +
      `**Nickname**: ${data.user.nickname ?? "N/A"}\n` +
      `**Signature**: ${data.user.signature ?? "N/A"}\n` +
      `**Twitter**: ${data.user.twitter ?? "N/A"}\n` +
      `**Username**: ${data.user.username ?? "N/A"}`;

    await output.attach(message, data.content, {
      title: "😋 Shoti",
      titleFont: "bold",
      contentFont: "fancy",
    });
    info.unsendSelf();
  } catch (err) {
    return info.editSelf(
      `❌ Failed to fetch Shoti video: ${err.message || err}`
    );
  }
}
