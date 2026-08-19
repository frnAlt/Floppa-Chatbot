import { SpectralCMDHome, Config } from "@cassidy/spectral-home";
import { defineEntry } from "@cass/define";
import { formatTime, UNISpectra } from "@cassidy/unispectra";
import { formatCash, parseBet } from "@cass-modules/ArielUtils";
import { FontSystem } from "cassidy-styler";
import { Collectibles } from "@cass-modules/InventoryEnhanced";
import {
  convertMintToCll,
  formatMint,
  isInvalidAm,
  MintItem,
  MintManager,
} from "@cass-modules/MTLSUtils";

export const meta: CommandMeta = {
  name: "mtls",
  description: "Minting Token and Lending Service. (Rework 3.6.0)",
  author: "@lianecagara",
  version: "4.2.0",
  category: "Finance",
  role: 0,
  noPrefix: false,
  waitingTime: 1,
  requirement: "3.0.0",
  icon: "🪙",
  isGame: true,
};

export const style: CommandStyle = {
  title: {
    content: `${UNISpectra.charm} MTLS V4 🪙`,
    line_bottom: "default",
    text_font: "double_struck",
  },
  content: {
    text_font: "fancy",
    line_bottom_inside_altar: "default",
    content: null,
  },
  footer: {
    content: "Made with 🤍 by **Liane Cagara**",
    text_font: "fancy",
  },
};

const configs: Config[] = [
  {
    key: "lend",
    description: "Lend money and retrieve it later with potential interest.",
    args: ["<amount>"],
    aliases: ["-le"],
    icon: "📤",
    async handler({ usersDB, input, output }, { spectralArgs }) {
      const userData = await usersDB.getItem(input.sid);
      const amount = parseBet(spectralArgs[0], userData.money);

      if (isInvalidAm(amount, userData.money)) {
        return output.reply(
          `📋 | The amount (first argument) must be a **valid numerical**, not lower than **1**, and **not higher** than your **balance.** (${formatCash(
            userData.money,
            true
          )})`
        );
      }

      const newLend = amount;
      const newBal = Number(userData.money - newLend);

      const lendAmount = Number(userData.lendAmount ?? 0);

      if (isNaN(lendAmount) || isNaN(newLend) || isNaN(newBal)) {
        console.log({
          lendAmount,
          newBal,
          newLend,
        });
        return output.wentWrong();
      }

      if (lendAmount > 0 && userData.lendTimestamp) {
        return output.reply(
          `📋 | You cannot lend right now. You already have a **valid lend** of ${formatCash(
            lendAmount,
            true
          )}, please **retrieve** it first!`
        );
      }

      await usersDB.setItem(input.sid, {
        lendAmount: newLend,
        money: newBal,
        lendTimestamp: Date.now(),
      });

      return output.reply(
        `💌 | Successfully lent ${formatCash(
          amount,
          true
        )}\n\nYour new **balance** is: ${formatCash(newBal, true)}`
      );
    },
  },
  {
    key: "retrieve",
    description: "Retrieve lent amount and view earned interest.",
    aliases: ["-re"],
    args: ["[force]"],
    icon: "📥",
    async handler(
      { usersDB, input, output, getInflationRate },
      { spectralArgs }
    ) {
      const userData = await usersDB.getItem(input.sid);
      const otherMoney = usersDB.extractMoney(userData);
      const isForce = spectralArgs[0]?.toLowerCase() === "force";

      const lendAmount = Number(userData.lendAmount ?? 0);

      if (!userData.lendTimestamp) {
        return output.reply("❕ | No **active** lend to retrieve.");
      }

      const now = Date.now();

      const durationInSeconds = Math.max(
        (now - userData.lendTimestamp) / 1000 - 60 * 60 * 1000,
        0
      );
      const inflationRate = await getInflationRate();

      const interestNoInflation =
        lendAmount * (0.001 / 365) * durationInSeconds;

      const interest = Math.floor(
        Math.max(
          0,
          interestNoInflation - interestNoInflation * (inflationRate / 1000)
        )
      );

      const cap = Math.floor(otherMoney.total * 0.5);

      const interestCapped = Math.min(interest, cap);
      const totalAmount = Math.floor(lendAmount + interestCapped);

      const newBal = Number(userData.money + totalAmount);

      if (isNaN(lendAmount) || isNaN(newBal) || isNaN(totalAmount)) {
        console.log({
          lendAmount,
          newBal,
          totalAmount,
          interestCapped,
          inflationRate,
          interestNoInflation,
          otherMoney,
          cap,
          interest,
          bal: userData.money,
        });
        return output.wentWrong();
      }

      if (interestCapped < 1 && !isForce) {
        return output.reply(
          `📋 | You **cannot retrieve** this lent amount because the **capped interest** is too **LOW** (${formatCash(
            interestCapped,
            true
          )}). You would **not earn** anything. Please wait or add a **force** argument.`
        );
      }

      await usersDB.setItem(input.sid, {
        money: newBal,
        lendTimestamp: null,
        lendAmount: 0,
      });

      return output.reply(
        `🎉 | Successfully retrieved ${formatCash(
          totalAmount,
          true
        )}$. (***GAIN*** = ${formatCash(
          interestCapped,
          true
        )})\n\nYour new balance is: ${formatCash(newBal, true)}`
      );
    },
  },
  {
    key: "send",
    description: "Transfer money to another user at no cost.",
    args: ["<name|uid> <amount>"],
    aliases: ["-tr", "-se", "transfer"],
    icon: "💸",
    async handler({ usersDB, input, output, Inventory }, { spectralArgs }) {
      const userData = await usersDB.getItem(input.sid);
      const targTest = spectralArgs[0];
      const inventory = new Inventory(userData.inventory);

      let recipient: UserData;

      if ((await usersDB.exists(targTest)) && targTest !== "undefined") {
        recipient = await usersDB.getCache(targTest);
      }

      if (!recipient && targTest !== "Unregistered") {
        recipient = await usersDB.queryItem({ "value.name": targTest });
      }

      if (
        !recipient ||
        (recipient?.name !== targTest && recipient?.userID !== targTest)
      ) {
        return output.reply(
          `❕ | Recipient **not found**. Ensure you are providing the correct user's **name** or user's **ID** as a first argument.`
        );
      }

      if (recipient.userID === input.sid) {
        return output.reply(`❕ | You cannot send money **to yourself**!`);
      }

      const amount = parseBet(spectralArgs[1], userData.money);

      if (isInvalidAm(amount, userData.money)) {
        return output.reply(
          `📋 | The amount (second argument) must be a **valid numerical**, not lower than **1**, and **not higher** than your **balance.** (${formatCash(
            userData.money,
            true
          )})`
        );
      }

      const newBal = Number(userData.money - amount);
      const reciBal = Number(recipient.money + amount);

      if (
        reciBal < recipient.money ||
        isNaN(reciBal) ||
        isNaN(newBal) ||
        isNaN(amount)
      ) {
        console.log({
          reciBal,
          recipientBal: recipient.money,
          bal: userData.money,
          newBal,
          amount,
        });
        return output.wentWrong();
      }

      await usersDB.setItem(input.sid, {
        money: newBal,
      });
      await usersDB.setItem(recipient.userID, {
        money: reciBal,
      });

      return output.reply(
        `💥 | Successfully used **0** 🌑 to send ${formatCash(
          amount,
          true
        )}$ to **${
          recipient.name ?? "Unregistered"
        }**\n\nRemaining **Shadow Coins**: ${formatCash(
          inventory.getAmount("shadowCoin"),
          "🌑",
          true
        )}`
      );
    },
  },
  {
    key: "inspect",
    description: "View financial details of a user by name or ID",
    args: ["<name|uid> <amount>"],
    aliases: ["-ins"],
    icon: "🔍",
    async handler({ usersDB, output }, { spectralArgs }) {
      const targTest = spectralArgs[0];

      let recipient: UserData;

      if ((await usersDB.exists(targTest)) && targTest !== "undefined") {
        recipient = await usersDB.getCache(targTest);
      }

      if (!recipient && targTest !== "Unregistered") {
        recipient = await usersDB.queryItem({ "value.name": targTest });
      }

      if (
        !recipient ||
        (recipient?.name !== targTest && recipient?.userID !== targTest)
      ) {
        return output.reply(
          `❕ | Target **not found**. Ensure you are providing the correct user's **name** or user's **ID** as a first argument.`
        );
      }

      const texts = [
        `👤 | **Name**: ${recipient.name}`,
        `🪙 | **Balance**: ${formatCash(recipient.money, true)}`,
        `🎲 | **User ID**: ${recipient.userID}`,
        `📤 | **Lent Amount**: ${formatCash(recipient.lendAmount ?? 0, true)}`,
        `⏳ | **Lent Since**: ${
          recipient.lendTimestamp
            ? `${formatTime(Date.now() - recipient.lendTimestamp)}`
            : "No active lend."
        }`,
      ];
      return output.replyStyled(texts.join("\n"), {
        ...style,
        content: {
          text_font: "none",
          line_bottom: "none",
        },
      });
    },
  },
  {
    key: "create",
    description: "Create a new token with custom icon, name, and ID",
    args: ["<icon>", " | ", "<name>", " | ", "<id>"],
    aliases: ["-cr"],
    icon: "🪙",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs, key }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const [icon = "", name = "", id = ""] = input.splitArgs(
        "|",
        spectralArgs
      );

      if (icon.length < 1 || name.length < 5 || id.length < 5) {
        return output.reply(
          `💌 | **SYNTAX**:\n${input.words[0]} ${input.arguments[0]} ${key} <icon> | <name> | <id>\n\n⚠️ | Icon must be **non-empty**, name and ID must be **5+ characters**.`
        );
      }

      const mint: MintItem = {
        asset: 0,
        icon,
        id,
        name,
        author: input.sid,
        creationDate: Date.now(),
        copies: 1,
      };

      const result = mintManager.createMint(input.sid, mint);
      if (!result.success) {
        if (result.error === "Mint limit reached") {
          return output.reply(
            `📋 | Cannot create mint: You have reached the limit of **${MintManager.MINT_LIMIT}** mints.`
          );
        }
        if (result.error === "Mint already exists" && result.existingMint) {
          return output.reply(
            `📋 | Mint already exists!\n\n${await formatMint(
              result.existingMint,
              usersDB
            )}`
          );
        }
        return output.wentWrong();
      }

      await mintManager.saveBy(globalDB);
      return output.reply(
        `🪙 | Successfully created!\n\n${await formatMint(mint, usersDB)}`
      );
    },
  },
  {
    key: "list",
    description: "Display all tokens you've created",
    aliases: ["-li"],
    icon: "📜",
    async handler({ usersDB, output, input, globalDB }, {}) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userMints = mintManager.getUserMints(input.sid);
      const mapped = (
        await Promise.all(
          userMints.map(async (i) => `${await formatMint(i, usersDB)}`)
        )
      ).join("\n\n");

      return output.reply(
        `📜 | **YOUR MINTS**:\n\n${mapped || "No mints found."}`
      );
    },
  },
  {
    key: "delete",
    description: "Permanently delete a token and its reproduction capability",
    aliases: ["-del"],
    icon: "🗑️",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const id = spectralArgs[0] ?? "";

      if (!id) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      const deletedMint = mintManager.deleteMint(input.sid, id);
      if (!deletedMint) {
        return output.reply(`📋 | No **mint** found with ID: ${id}.`);
      }

      await mintManager.saveBy(globalDB);
      return output.reply(
        `🗑️ | **DELETED**\n\n${await formatMint(deletedMint, usersDB)}`
      );
    },
  },
  {
    key: "mint",
    description: "Create additional token copies by token ID",
    args: ["<tokenid>", "<amount>"],
    aliases: ["-mt"],
    icon: "🪙",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userData = await usersDB.getItem(input.sid);
      const tokenId = spectralArgs[0] ?? "";
      const amount = parseBet(spectralArgs[1], userData.money);

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      if (isInvalidAm(amount, Infinity)) {
        return output.reply(
          `📋 | The amount must be a **valid number**, not less than **1**.`
        );
      }

      const mint = mintManager
        .getUserMints(input.sid)
        .find((i) => i.id === tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      const newCopies = (mint.copies || 1) + amount;
      const updatedMint: MintItem = { ...mint, copies: newCopies };

      const success = mintManager.updateMint(input.sid, updatedMint);
      if (!success) {
        return output.wentWrong();
      }

      const cll = new Collectibles(userData.collectibles ?? []);
      const KEY = `mtls_${tokenId}`;
      const converted = convertMintToCll(updatedMint);

      if (!cll.has(KEY)) {
        cll.register(KEY, converted);
      }
      cll.raise(KEY, amount);

      await usersDB.setItem(input.sid, {
        collectibles: Array.from(cll),
      });
      await mintManager.saveBy(globalDB);

      return output.reply(
        `🪙 | Minted **${amount}** copies of **${mint.name}** [${
          mint.id
        }].\nTotal copies: **${newCopies}**\n\n${await formatMint(
          updatedMint,
          usersDB
        )}`
      );
    },
  },
  {
    key: "fund",
    description: "Add backing asset to a token without creating copies.",
    args: ["<tokenid>", "<amount>"],
    aliases: ["-fu"],
    icon: "💰",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userData = await usersDB.getItem(input.sid);
      const tokenId = spectralArgs[0] ?? "";
      const amount = parseBet(spectralArgs[1], userData.money);

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      if (isInvalidAm(amount, userData.money)) {
        return output.reply(
          `📋 | The amount must be a **valid number**, not less than **1**, and not more than your **balance** (${formatCash(
            userData.money,
            true
          )}).`
        );
      }

      const mint = mintManager
        .getUserMints(input.sid)
        .find((i) => i.id === tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      const newAsset = (mint.asset ?? 0) + amount;
      const newBal = userData.money - amount;
      const updatedMint: MintItem = { ...mint, asset: newAsset };

      const success = mintManager.updateMint(input.sid, updatedMint);
      if (!success) {
        return output.wentWrong();
      }

      await usersDB.setItem(input.sid, { money: newBal });
      await mintManager.saveBy(globalDB);

      return output.reply(
        `💰 | Added ${formatCash(amount, true)} to **${mint.name}** [${
          mint.id
        }].\nNew asset value: ${formatCash(
          newAsset,
          true
        )}\nNew balance: ${formatCash(newBal, true)}\n\n${await formatMint(
          updatedMint,
          usersDB
        )}`
      );
    },
  },
  {
    key: "burn",
    description: "Remove token copies while keeping at least one.",
    args: ["<tokenid>", "<amount>"],
    aliases: ["-sur"],
    icon: "🗑️",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userData = await usersDB.getItem(input.sid);
      const tokenId = spectralArgs[0] ?? "";
      const amount = parseBet(spectralArgs[1], userData.money);

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      if (isInvalidAm(amount, Infinity)) {
        return output.reply(
          `📋 | The amount must be a **valid number**, not less than **1**.`
        );
      }

      const mint = mintManager
        .getUserMints(input.sid)
        .find((i) => i.id === tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      const cll = new Collectibles(userData.collectibles ?? []);
      const KEY = `mtls_${tokenId}`;
      if (!cll.has(KEY)) {
        return output.reply(
          `📋 | You have no collectibles for **${mint.name}** [${tokenId}].`
        );
      }

      if (!cll.hasAmount(KEY, amount)) {
        return output.reply(
          `📋 | Not enough collectibles for **${
            mint.name
          }** [${tokenId}]. You have ${cll.getAmount(KEY)}.`
        );
      }

      const currentCopies = mint.copies || 1;
      const newCopies = Math.max(1, currentCopies - amount);
      const actualSurrendered = currentCopies - newCopies;

      if (actualSurrendered <= 0) {
        return output.reply(
          `📋 | Cannot surrender **${amount}** copies. At least **1** copy must remain (current: ${currentCopies}).`
        );
      }

      const updatedMint: MintItem = { ...mint, copies: newCopies };
      const success = mintManager.updateMint(input.sid, updatedMint);
      if (!success) {
        return output.wentWrong();
      }

      cll.raise(KEY, -actualSurrendered);
      await usersDB.setItem(input.sid, {
        collectibles: Array.from(cll),
      });
      await mintManager.saveBy(globalDB);

      return output.reply(
        `🗑️ | Surrendered **${actualSurrendered}** copies of **${
          mint.name
        }** [${
          mint.id
        }].\nRemaining copies: **${newCopies}**\n\n${await formatMint(
          updatedMint,
          usersDB
        )}`
      );
    },
  },
  {
    key: "top",
    description: "Show top 10 tokens by copies and asset value",
    aliases: ["-tp"],
    icon: "🏆",
    async handler({ output, globalDB, usersDB }, {}) {
      const mintManager = await MintManager.fromDB(globalDB);
      const sortedByCopies = mintManager.getTopMints("copies");
      const sortedByAsset = mintManager.getTopMints("asset");

      if (sortedByCopies.length === 0) {
        return output.reply(`📋 | No mints found across all users.`);
      }

      const formatTopList = async (
        list: { author: string; mintItem: MintItem }[],
        _key: string
      ) => {
        return (
          await Promise.all(
            list.map(async (item, index) => {
              const mint = item.mintItem;
              return `${index + 1}. ${await formatMint(mint, usersDB)}`;
            })
          )
        ).join("\n\n");
      };

      const topCopiesText = await formatTopList(sortedByCopies, "Copies");
      const topAssetText = await formatTopList(sortedByAsset, "Asset");

      return output.reply(
        `🏆 | **Top 10 Tokens by Copies**\n${topCopiesText}\n\n🏆 | **Top 10 Tokens by Asset**\n${topAssetText}`
      );
    },
  },
  {
    key: "mintify",
    description: "Convert money to tokens, increasing copies and asset value.",
    args: ["<tokenid>", "<amount>"],
    aliases: ["-mtf"],
    icon: "🔄",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userData = await usersDB.getItem(input.sid);
      const tokenId = spectralArgs[0] ?? "";
      const amount = parseBet(spectralArgs[1], Infinity);

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      if (isInvalidAm(amount, Infinity)) {
        return output.reply(
          `📋 | The first argument must be an **ID**. The amount (second argument) must be a **valid number**, not less than **1**.`
        );
      }

      const mint = mintManager.getMintById(tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      const cll = new Collectibles(userData.collectibles ?? []);
      const KEY = `mtls_${tokenId}`;
      const converted = convertMintToCll(mint);

      if (!cll.has(KEY)) {
        cll.register(KEY, converted);
      }

      const totalAssetIncrease =
        mint.asset * ((mint.copies + amount) / mint.copies - 1);
      const currentAsset = mint.asset + totalAssetIncrease;
      const currentCopies = mint.copies + amount;

      const newBal = userData.money - Math.floor(totalAssetIncrease);

      if (newBal < 0) {
        return output.reply(
          `📋 | You do not have **enough balance** to pay ${formatCash(
            Math.floor(totalAssetIncrease),
            true
          )}`
        );
      }

      const updatedMint: MintItem = {
        ...mint,
        copies: currentCopies,
        asset: currentAsset,
      };

      const success = mintManager.updateMint(mint.author, updatedMint);
      if (!success) {
        return output.wentWrong();
      }

      cll.raise(KEY, amount);
      await usersDB.setItem(input.sid, {
        money: newBal,
        collectibles: Array.from(cll),
      });
      await mintManager.saveBy(globalDB);

      return output.reply(
        `🔄 | Converted ${formatCash(
          Math.floor(totalAssetIncrease),
          true
        )} to **${amount}** copies of **${mint.name}** [${
          mint.id
        }].\nNew balance: ${formatCash(newBal, true)}\n\n${await formatMint(
          updatedMint,
          usersDB
        )}`
      );
    },
  },
  {
    key: "cashify",
    description: "Convert tokens to money, reducing copies and asset value.",
    args: ["<tokenid>", "<amount>"],
    aliases: ["-chf"],
    icon: "💸",
    async handler({ usersDB, output, input, globalDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const userData = await usersDB.getItem(input.sid);
      const tokenId = spectralArgs[0] ?? "";
      const amount = parseBet(spectralArgs[1], Infinity);

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      if (isInvalidAm(amount, Infinity)) {
        return output.reply(
          `📋 | The first argument must be an **ID**. The amount (second argument) must be a **valid number**, not less than **1**.`
        );
      }

      const mint = mintManager.getMintById(tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      const cll = new Collectibles(userData.collectibles ?? []);
      const KEY = `mtls_${tokenId}`;
      if (!cll.has(KEY)) {
        return output.reply(
          `📋 | You have no collectibles for **${mint.name}** [${tokenId}].`
        );
      }

      if (!cll.hasAmount(KEY, amount)) {
        return output.reply(
          `📋 | Not enough collectibles for **${
            mint.name
          }** [${tokenId}]. You have ${cll.getAmount(KEY)}.`
        );
      }

      const currentCopies = mint.copies || 1;
      const newCopies = Math.max(1, currentCopies - amount);
      const actualConverted = currentCopies - newCopies;

      if (actualConverted <= 0) {
        return output.reply(
          `📋 | Cannot convert **${amount}** copies. At least **1** copy must remain (current: ${currentCopies}).`
        );
      }

      const totalAssetDecrease =
        mint.asset * (1 - (mint.copies - actualConverted) / mint.copies);
      const currentAsset = mint.asset - totalAssetDecrease;

      const convertedMoney = Math.floor(totalAssetDecrease);
      const newBal = userData.money + convertedMoney;

      const updatedMint: MintItem = {
        ...mint,
        copies: newCopies,
        asset: Math.max(0, currentAsset),
      };
      const success = mintManager.updateMint(mint.author, updatedMint);
      if (!success) {
        return output.wentWrong();
      }

      cll.raise(KEY, -actualConverted);
      await usersDB.setItem(input.sid, {
        money: newBal,
        collectibles: Array.from(cll),
      });
      await mintManager.saveBy(globalDB);

      return output.reply(
        `💸 | Converted **${actualConverted}** copies of **${mint.name}** [${
          mint.id
        }] to ${formatCash(
          convertedMoney,
          true
        )}.\nRemaining copies: **${newCopies}**\nNew balance: ${formatCash(
          newBal,
          true
        )}\n\n${await formatMint(updatedMint, usersDB)}`
      );
    },
  },
  {
    key: "check",
    description: "Display details of any mint by ID.",
    args: ["<tokenid>"],
    aliases: ["-chk"],
    icon: "🔍",
    async handler({ output, globalDB, usersDB }, { spectralArgs }) {
      const mintManager = await MintManager.fromDB(globalDB);
      const tokenId = spectralArgs[0] ?? "";

      if (!tokenId) {
        return output.reply(`📋 | Please provide a valid **token ID**.`);
      }

      const mint = mintManager.getMintById(tokenId);
      if (!mint) {
        return output.reply(`📋 | No **mint** found with ID: ${tokenId}.`);
      }

      return output.reply(
        `🔍 | **Mint Details**\n\n${await formatMint(mint, usersDB)}`
      );
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: false,
    async home({ output, input, usersDB }, { itemList }) {
      const cache = await usersDB.getCache(input.sid);
      return output.reply(
        `💌 | Hello **${cache.name}**! Welcome to ${FontSystem.applyFonts(
          "MTLS",
          "double_struck"
        )} (Minting Token and Lending Service). Please use one of our **services**:\n\n${itemList}\n\n📤 | **Lent Amount**: ${formatCash(
          cache.lendAmount ?? 0,
          true
        )}\n⏳ | **Lent Since**: ${
          cache.lendTimestamp
            ? `${formatTime(Date.now() - cache.lendTimestamp)}`
            : "No active lend."
        }`
      );
    },
  },
  configs
);

export const entry = defineEntry((ctx) => home.runInContext(ctx));
