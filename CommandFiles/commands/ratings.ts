import { SpectralCMDHome, Config } from "../modules/spectralCMDHome";
import { limitString, UNIRedux } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "ratings",
  description: "Manage and view ratings and reviews",
  otherNames: ["rate", "review"],
  version: "1.0.1",
  usage: "{prefix}{name} <submit|update|list|view|home|delete> [args]",
  category: "Support",
  author: "@lianecagara",
  role: 0,
  noPrefix: false,
  waitingTime: 3,
  requirement: "3.0.0",
  icon: "🟩",
  noWeb: true,
};

export interface Rating {
  stars: number;
  review: string;
  uid: string;
  timestamp: number;
}

export const style: CommandStyle = {
  title: "🟩 Ratings",
  titleFont: "bold",
  contentFont: "fancy",
};

const starEmojis = [
  "🟩⬜⬜⬜⬜",
  "🟩🟩⬜⬜⬜",
  "🟩🟩🟩⬜⬜",
  "🟩🟩🟩🟩⬜",
  "🟩🟩🟩🟩🟩",
];
const ratingsKey = "ratings";

const configs: Config[] = [
  {
    key: "submit",
    description: "Submit a new rating and review",
    args: ["<1-5> <review>"],
    aliases: ["-s"],
    icon: "✍️",
    async handler({ input, output, globalDB, usersDB }, { spectralArgs }) {
      if (spectralArgs.length < 2) {
        return output.replyStyled(
          {
            body: `🚫 Please provide a rating (1-5) and review.\nExample: **${meta.name} submit 5 Great experience!**`,
          },
          style
        );
      }
      const stars = parseInt(spectralArgs[0]);
      if (isNaN(stars) || stars < 1 || stars > 5) {
        return output.replyStyled(
          {
            body: `🚫 Rating must be between 1 and 5 stars.`,
          },
          style
        );
      }
      const review = limitString(
        input.censor(spectralArgs.slice(1).join(" ")),
        500
      );
      if (!review) {
        return output.replyStyled(
          {
            body: `🚫 Review cannot be empty.`,
          },
          style
        );
      }

      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratings = ratings_ as Rating[];
      if (ratings.some((r) => r.uid === input.senderID)) {
        return output.replyStyled(
          {
            body: `⚠️ You've already rated! Use **${meta.name} update** to modify.`,
          },
          style
        );
      }

      const user = await usersDB.getCache(input.senderID);
      const name = user?.userMeta?.name ?? user?.name ?? "Unknown";

      const rating: Rating = {
        stars,
        review,
        uid: input.senderID,
        timestamp: Date.now(),
      };

      await globalDB.setItem(ratingsKey, {
        ratings: [...ratings, rating],
      });

      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Your Rating Shines!** ✨\n\n` +
            `👤 **${name}** (UID: ${input.senderID})\n` +
            `Rating: ${starEmojis[stars - 1]}\n` +
            `Review: ${review}`,
        },
        style
      );
    },
  },
  {
    key: "update",
    description: "Update your existing rating and review",
    args: ["<1-5> <review>"],
    aliases: ["-u"],
    icon: "🔄",
    async handler({ input, output, globalDB, usersDB }, { spectralArgs }) {
      if (spectralArgs.length < 2) {
        return output.replyStyled(
          {
            body: `🚫 Please provide a rating (1-5) and review.\nExample: **${meta.name} update 4 Updated review here**`,
          },
          style
        );
      }
      const stars = parseInt(spectralArgs[0]);
      if (isNaN(stars) || stars < 1 || stars > 5) {
        return output.replyStyled(
          {
            body: `🚫 Rating must be between 1 and 5 stars.`,
          },
          style
        );
      }
      const review = limitString(
        input.censor(spectralArgs.slice(1).join(" ")),
        500
      );
      if (!review) {
        return output.replyStyled(
          {
            body: `🚫 Review cannot be empty.`,
          },
          style
        );
      }

      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratings = ratings_ as Rating[];
      const userRatingIndex = ratings.findIndex(
        (r) => r.uid === input.senderID
      );

      if (userRatingIndex === -1) {
        return output.replyStyled(
          {
            body: `⚠️ No rating found. Submit one with **${meta.name} submit**.`,
          },
          style
        );
      }

      const user = await usersDB.getCache(input.senderID);
      const name = user?.userMeta?.name ?? user?.name ?? "Unknown";

      ratings[userRatingIndex] = {
        stars,
        review,
        uid: input.senderID,
        timestamp: Date.now(),
      };

      await globalDB.setItem(ratingsKey, { ratings });

      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Rating Updated!** ✨\n\n` +
            `👤 **${name}** (UID: ${input.senderID})\n` +
            `Rating: ${starEmojis[stars - 1]}\n` +
            `Review: ${review}`,
        },
        style
      );
    },
  },
  {
    key: "list",
    description: "List ratings (5 per page)",
    args: ["[page]"],
    aliases: ["-l"],
    icon: "📜",
    async handler({ input, output, globalDB, usersDB }, { spectralArgs }) {
      const page = spectralArgs[0] ? parseInt(spectralArgs[0]) : 1;
      if (isNaN(page) || page < 1) {
        return output.replyStyled(
          {
            body: `🚫 Invalid page number.\nExample: **${meta.name} list 2**`,
          },
          style
        );
      }

      const perPage = 5;
      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratingsBefore = ratings_ as Rating[];
      const ratings = [...ratingsBefore].sort(
        (a, b) =>
          (b.stars * 1_000_000_000 + `${b.review}`.length || 0) +
          Date.now() -
          b.timestamp -
          ((a.stars * 1_000_000_000 + `${a.review}`.length || 0) +
            Date.now() -
            b.timestamp)
      );

      if (!ratings.length) {
        return output.replyStyled(
          {
            body: `🟩 No ratings to show yet.`,
          },
          style
        );
      }

      const start = (page - 1) * perPage;
      const paginated = ratings.slice(start, start + perPage);
      const totalPages = Math.ceil(ratings.length / perPage);

      if (start >= ratings.length) {
        return output.replyStyled(
          {
            body: `🚫 Page ${page} doesn't exist.`,
          },
          style
        );
      }

      const ratingsText = await Promise.all(
        paginated.map(async (r) => {
          await usersDB.ensureUserInfo(r.uid);
          const user = await usersDB.getCache(r.uid);
          const name = user?.userMeta?.name ?? user?.name ?? "Unknown";
          const trimmedReview =
            r.review.length > 100
              ? input.censor(r.review.slice(0, 100) + "...")
              : input.censor(r.review);
          return `👤 **${name}** (${r.uid})\n\n${
            starEmojis[r.stars - 1]
          }\n\n💬 “${trimmedReview}”\n\n⏳ ${formatTimeSentence(
            Date.now() - r.timestamp
          )} ago.`;
        })
      ).then((texts) => texts.join(`\n${UNIRedux.standardLine}\n`));

      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Ratings (Page ${page}/${totalPages})** 📜\n\n` +
            ratingsText,
        },
        style
      );
    },
  },
  {
    key: "view",
    description: "View a specific user's full rating and review",
    args: ["[senderID]"],
    aliases: ["-v"],
    icon: "👀",
    async handler({ input, output, globalDB, usersDB }, { spectralArgs }) {
      const targetID = spectralArgs[0] || input.detectID;
      if (!targetID) {
        return output.replyStyled(
          {
            body: `🚫 Please specify a user ID or reply/mention a user.\nExample: **${meta.name} view 123456789**`,
          },
          style
        );
      }

      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratings = ratings_ as Rating[];
      const rating = ratings.find((r) => r.uid === targetID);

      if (!rating) {
        const user = await usersDB.getCache(targetID);
        const name = user?.name || "Unknown";
        return output.replyStyled(
          {
            body: `🟩 No rating found for 👤 **${name}** (UID: ${targetID}).`,
          },
          style
        );
      }

      const user = await usersDB.getCache(targetID);
      const name = user?.userMeta?.name ?? user?.name ?? "Unknown";
      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Rating Details** 👀\n\n` +
            `👤 **${name}** (UID: ${targetID})\n` +
            `Rating: ${starEmojis[rating.stars - 1]}\n` +
            `Review: ${input.censor(rating.review)}\n` +
            `Submitted: ${formatTimeSentence(Date.now() - rating.timestamp)}`,
        },
        style
      );
    },
  },
  {
    key: "home",
    description: "Show average rating and total number of ratings",
    aliases: ["-h"],
    icon: "🏠",
    async handler({ output, globalDB }, { itemList }) {
      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratings = ratings_ as Rating[];

      if (!ratings.length) {
        return output.replyStyled(
          {
            body: `🟩 No ratings to show yet. Be the first user to rate.\n${UNIRedux.standardLine}\n${itemList}`,
          },
          style
        );
      }

      const avgStars =
        ratings.reduce((sum: number, r) => sum + r.stars, 0) / ratings.length;
      const roundedAvg = Math.round(avgStars * 10) / 10;
      const starDisplay = starEmojis[Math.round(avgStars) - 1] || "🟩";

      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Ratings Overview** 🏠\n\n` +
            `${starDisplay} **${roundedAvg}**/5\n\n` +
            `**${ratings.length}** people rated.\n${UNIRedux.standardLine}\n${itemList}`,
        },
        style
      );
    },
  },
  {
    key: "delete",
    description: "Delete a rating (own or others if admin)",
    args: ["[senderID]"],
    aliases: ["-d"],
    icon: "🗑️",
    async handler({ input, output, globalDB, usersDB }, { spectralArgs }) {
      const targetID = spectralArgs[0] || input.detectID || input.senderID;
      if (!targetID) {
        return output.replyStyled(
          {
            body: `🚫 Please specify a user ID or reply/mention a user.\nExample: **${meta.name} delete 123456789**`,
          },
          style
        );
      }

      const isAdmin = input.isAdmin;
      if (targetID !== input.senderID && !isAdmin) {
        return output.replyStyled(
          {
            body: `🚫 Only admins can delete others' ratings.`,
          },
          style
        );
      }

      const { ratings: ratings_ = [] } = await globalDB.getItem(ratingsKey);
      const ratings = ratings_ as Rating[];
      const ratingIndex = ratings.findIndex((r) => r.uid === targetID);

      if (ratingIndex === -1) {
        const user = await usersDB.getCache(targetID);
        const name = user?.userMeta?.name ?? user?.name ?? "Unknown";
        return output.replyStyled(
          {
            body: `🟩 No rating found for 👤 **${name}** (UID: ${targetID}).`,
          },
          style
        );
      }

      const user = await usersDB.getCache(targetID);
      const name = user?.name || "Unknown";

      ratings.splice(ratingIndex, 1);
      await globalDB.setItem(ratingsKey, { ratings });

      output.replyStyled(
        {
          body:
            `${UNIRedux.arrow} **Rating Removed** 🗑️\n\n` +
            `👤 **${name}** (UID: ${targetID})'s rating has been deleted.`,
        },
        style
      );
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: false,
    globalCooldown: 3,
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
    defaultCategory: "Utility",
    defaultKey: "home",
  },
  configs
);

import { defineEntry } from "@cass/define";
import { formatTimeSentence } from "@cass-modules/ArielUtils";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
