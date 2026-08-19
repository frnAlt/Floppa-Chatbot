import { BackgroundTaskFB } from "@cass-modules/BackgroundTask";
import { GDBrowserAPI } from "@cass-modules/GDBrowserAPI";
import { fetchThumbnail, Quality } from "@cass-modules/GDLevelThumbnail";
import { SpectralCMDHome } from "@cassidy/spectral-home";
import { abbreviateNumber, UNISpectra } from "@cassidy/unispectra";
import { Datum } from "cassidy-styler";

interface LevelTrackerCache {
  likes?: number;
  recognizedComments?: string[];
  name?: string;
  author?: string;
  downloads?: number;
}

const levelTracker = new BackgroundTaskFB<Map<string, LevelTrackerCache>>({
  taskID: "GD_Level_Tracker",
  intervalMS: 30 * 1000,
  onStart(task) {
    task.state = new Map<string, LevelTrackerCache>();
  },
  async onTask({ output, threadsDB }, task) {
    const allThreads = await threadsDB.getAllCache();

    for (const [threadID, threadData] of Object.entries(allThreads)) {
      const trackedLevels = (threadData.gdLevelTracks ?? []) as string[];
      for (const levelID of trackedLevels) {
        try {
          const level = await GDBrowserAPI.level(levelID);
          const cache = task.state.get(levelID);

          const likeEmoji = (level.likes || 0) >= 0 ? "👍" : "👎";
          const likeDelta = cache ? level.likes! - cache.likes! : 0;
          const likeDeltaStr =
            likeDelta === 0 ? "" : ` (${likeDelta > 0 ? "+" : ""}${likeDelta})`;

          const downloadDelta =
            cache && cache.downloads !== undefined
              ? level.downloads! - cache.downloads
              : 0;
          const downloadDeltaStr =
            downloadDelta === 0
              ? ""
              : ` (${downloadDelta > 0 ? "+" : ""}${downloadDelta})`;

          const comments = await GDBrowserAPI.comments(level.id, { page: 0 });
          const recognized = cache?.recognizedComments ?? [];
          const newComments = comments.filter(
            (c) => !recognized.includes(c.content)
          );
          const newCommentsList = newComments
            .slice(0, 16)
            .map(
              (c) =>
                `👤 **${c.username}**${
                  c.percent ? `  %${c.percent}` : ""
                } ${"🪙".repeat(c.coins || 0)}\n${
                  c.content
                }\n(${c.date.toFonted("fancy_italic")})`
            );

          const notify =
            cache !== undefined && (likeDelta !== 0 || newComments.length > 0);

          let message = `**${level.name}** (#${level.id})\n${
            UNISpectra.arrow
          } By **${level.author}**\n📥 ${abbreviateNumber(
            level.downloads || 0
          )}${downloadDeltaStr}\n${likeEmoji} ${abbreviateNumber(
            level.likes || 0
          )}${likeDeltaStr}`;

          let headers: string[] = [];
          if (likeDelta !== 0) headers.push("New Likes!");
          if (newCommentsList.length) headers.push(`New Comments!`);

          if (headers.length) {
            message = `🔔 **${headers.join(" & ")}**\n\n${message}`;
            if (newCommentsList.length) {
              message += `\n\n💬 New Comments:\n${
                UNISpectra.standardLine
              }\n${newCommentsList.join(`\n${UNISpectra.standardLine}\n`)}`;
            }
          }

          task.state.set(levelID, {
            likes: level.likes,
            downloads: level.downloads,
            recognizedComments: comments.slice(0, 16).map((c) => c.content),
            name: level.name,
            author: level.author,
          });

          if (notify) {
            output.sendStyled(
              { useWebMode: true, body: message },
              gdcmd.style,
              "wss"
            );
            output.sendStyled(message, gdcmd.style, threadID);
          }

          await utils.delay(5000);
        } catch (err) {
          console.error(`Failed to fetch level ${levelID}:`, err);
        }
      }
    }
  },
});

const gdcmd = defineCommand({
  meta: {
    name: "gd",
    otherNames: ["dash", "geometrydash", "gdbrowser"],
    category: "Media",
    description: "Anything related to GDBrowser.",
    version: "1.1.6",
    icon: "🛠️",
    author: "@lianecagara",
  },
  style: {
    title: "🛠️ GDBrowser",
    titleFont: "bold",
    contentFont: "none",
  },
  async entry(ctx) {
    return gdoptions.runInContext(ctx);
  },
  bgTasks: [levelTracker],
});
const gdoptions = new SpectralCMDHome({ isHypen: false }, [
  {
    key: "search",
    description: "Search Top 5 GD Level, same algo as GD.",
    aliases: ["s"],
    args: ["<level_name>", "|", "[page_num]"],
    async handler(
      { output, input, prefix, commandName },
      { spectralArgs, execOther }
    ) {
      try {
        let [name, page_n] = input.splitBody("|", spectralArgs.join(" "));
        page_n ||= "1";
        const page = parseInt(page_n) || 1;
        if (!name) {
          return output.reply(
            `🔎 Please enter a level name or level ID as next arguments. (Same algo as original search bar in GD), Only shows 5 results per page. You can specify page by using | \n\n**Example**: ${prefix}${commandName} search Nock Em | 3`
          );
        }
        await output.reaction("⏳");
        const levels = await GDBrowserAPI.search(name, {
          page: page - 1,
        });
        if (levels.length === 1) {
          const targ = levels.at(0);
          return execOther({
            key: "view",
            spectralArgsNew: [targ.id],
            io: {
              input,
              output,
            },
          });
        }
        const getLikeEmo = (likes: number) => (likes < 0 ? `👎` : `👍`);
        const mapped = [
          `🔎 **5 Results** (Page **${page}**)`,
          ...levels.map(
            (level, ind) =>
              `**${ind + 1}**. **${level.name}** (#${level.id})\n${
                UNISpectra.arrow
              } By ${level.author}\n**${level.difficulty?.toUpperCase()}**${
                level.featured ? ` ✨ **${level.stars || 1}**` : ""
              } ${"🪙".repeat(level.coins || 0)}\n🕒 ${
                level.length
              } | 📥 ${abbreviateNumber(level.downloads || 0)} | ${getLikeEmo(
                level.likes || 0
              )} ${abbreviateNumber(level.likes || 0)}\n🎵 ***${
                level.songName
              }***\n${UNISpectra.arrowFromT} ***By ${level.songAuthor}***`
          ),
          `✅ Reply with a **number** between **1** to **5** to view the level information.`,
        ].join(`\n${UNISpectra.standardLine}\n`);
        const res = await output.reply({
          body: mapped.length === 1 ? "No Results." : mapped,
        });
        res.atReply(async (ctxRep) => {
          const { input: input2, output: output2 } = ctxRep;
          output2.setStyle(gdcmd.style);
          const targnum = parseInt(input2.text[0]);
          if (isNaN(targnum)) {
            return output2.reply("⚠️ Invalid number.");
          }
          const targ = levels.find((_, j) => j + 1 === targnum);
          if (!targ) {
            return output2.reply(
              `⚠️ Reply with a **number** between **1** to **5**`
            );
          }
          return execOther({
            key: "view",
            spectralArgsNew: [targ.id],
            io: {
              input: input2,
              output: output2,
            },
          });
        });
        await output.reaction("✅");
      } catch (error) {
        return output.reply("No Results.");
      }
    },
  },
  {
    key: "view",
    description: "View all info about a GD Level using a Level ID",
    aliases: ["v"],
    args: ["<level_ID>"],
    async handler({ output }, { spectralArgs }) {
      try {
        const ID = spectralArgs[0];
        if (!ID) {
          return output.reply(`🔎 Please enter a level ID.`);
        }
        await output.reaction("⏳");
        const level = await GDBrowserAPI.level(ID);
        const getLikeEmo = (likes: number) => (likes < 0 ? `👎` : `👍`);
        const thumb = await fetchThumbnail(Number(level.id), Quality.High);
        const mapped = `**${level.name}** (#${level.id})\n${
          UNISpectra.arrow
        } By ${level.author}\n\n${
          level.description || "(No Description Provided)"
        }\n\n🕒 **${level.length}**\n📥 **(${abbreviateNumber(
          level.downloads || 0
        )})** ${(level.downloads || 0).toLocaleString()}\n${getLikeEmo(
          level.likes || 0
        )} **(${abbreviateNumber(level.likes || 0)})** ${(
          level.likes || 0
        ).toLocaleString()}\n**${level.difficulty?.toUpperCase()}** ${
          level.featured
            ? `✨ **${level.stars || 1}** ${"🪙".repeat(level.coins || 0)}`
            : ""
        }\n${UNISpectra.standardLine}\n🎵 ***${level.songName}*** (#${
          level.songID
        })\n${UNISpectra.arrowFromT} ***By ${level.songAuthor}***\n${
          UNISpectra.standardLine
        }\n(To view comments, reply with a page **number** like 1)`;

        const res = await output.reply({
          body: mapped,
          attachment: thumb,
        });
        const onRep = async (repCtx: CommandContext) => {
          const { input, output } = repCtx;
          output.setStyle(gdcmd.style);
          const page = parseInt(input.text[0]);
          if (isNaN(page)) {
            return output.reply("⚠️ Invalid number.");
          }
          try {
            const comments = await GDBrowserAPI.comments(level.id, {
              page: page - 1,
            });
            if (!comments.length) {
              throw 69;
            }
            const commentsStr = [
              `💬 **${level.name}** (Page **${page}**)\n${UNISpectra.arrow} By ${level.author}`,
              ...comments.map(
                (c) =>
                  `👤 **${c.username}**${
                    c.percent ? `  %${c.percent}` : ""
                  } ${"🪙".repeat(c.coins || 0)}\n${
                    c.content
                  }\n(${c.date.toFonted("fancy_italic")})`
              ),
            ].join(`\n${UNISpectra.standardLine}\n`);
            const ress = await output.reply(commentsStr);
            ress.atReply(onRep);
          } catch (error) {
            return output.reply("No Results.");
          }
        };
        res.atReply(onRep);
        await output.reaction("✅");
      } catch (error) {
        return output.reply("No Results.");
      }
    },
  },
  {
    key: "daily",
    description: "View the daily level.",
    async handler({ output, input }, { execOther }) {
      try {
        const id = await GDBrowserAPI.getLevelIDFromPage(
          GDBrowserAPI.mainUrl + "/daily"
        );
        if (id === null) throw 69;
        return execOther({
          key: "view",
          spectralArgsNew: [id],
          io: {
            input,
            output,
          },
        });
      } catch (error) {
        return output.reply("No Results.");
      }
    },
  },
  {
    key: "weekly",
    description: "View the weekly level.",
    async handler({ output, input }, { execOther }) {
      try {
        const id = await GDBrowserAPI.getLevelIDFromPage(
          GDBrowserAPI.mainUrl + "/weekly"
        );
        if (id === null) throw 69;
        return execOther({
          key: "view",
          spectralArgsNew: [id],
          io: {
            input,
            output,
          },
        });
      } catch (error) {
        return output.reply("No Results.");
      }
    },
  },
  {
    key: "event",
    description: "View the event level.",
    async handler({ output, input }, { execOther }) {
      try {
        const id = await GDBrowserAPI.getLevelIDFromPage(
          GDBrowserAPI.mainUrl + "/event"
        );
        if (id === null) throw 69;
        return execOther({
          key: "view",
          spectralArgsNew: [id],
          io: {
            input,
            output,
          },
        });
      } catch (error) {
        return output.reply("No Results.");
      }
    },
  },
  {
    key: "track",
    description: "Provide a level ID(s) to track (enable notifications).",
    args: ["<...level_ids>"],
    async handler({ threadsDB, output, input }, { spectralArgs }) {
      const ids = [...spectralArgs].filter(Boolean);
      if (ids.length === 0) {
        return output.reply(
          `❌ You must provide **at least one level ID as an argument** to track. Notifications will be sent when changes occur.`
        );
      }
      const thread = await threadsDB.getItem(input.threadID);
      let gdLevelTracks: string[] = thread.gdLevelTracks ?? [];
      gdLevelTracks.push(...ids);
      gdLevelTracks = Datum.toUniqueArray(gdLevelTracks);

      await threadsDB.setItem(input.threadID, {
        gdLevelTracks,
      });
      return output.reply(
        `✅ Tracking enabled for the following level(s) in this thread:\n${gdLevelTracks.join(
          ", "
        )}\n\nYou will now receive notifications in this thread whenever these levels change.`
      );
    },
  },
  {
    key: "untrack",
    description: "Remove one or more level IDs from tracking in this thread.",
    args: ["<...level_ids>"],
    async handler({ threadsDB, output, input }, { spectralArgs }) {
      const ids = [...spectralArgs].filter(Boolean);
      if (ids.length === 0) {
        return output.reply(
          `❌ You must provide **at least one level ID as an argument** to untrack. Notifications will no longer be sent for removed levels.`
        );
      }

      const thread = await threadsDB.getItem(input.threadID);
      let gdLevelTracks: string[] = thread.gdLevelTracks ?? [];

      const removed = ids.filter((id) => gdLevelTracks.includes(id));
      gdLevelTracks = gdLevelTracks.filter((id) => !removed.includes(id));

      gdLevelTracks = Datum.toUniqueArray(gdLevelTracks);

      await threadsDB.setItem(input.threadID, { gdLevelTracks });

      if (removed.length === 0) {
        return output.reply(
          `⚠️ None of the provided level ID(s) were being tracked in this thread.`
        );
      }

      return output.reply(
        `✅ Stopped tracking the following level(s) in this thread:\n${removed.join(
          ", "
        )}\n\nYou will no longer receive notifications for these levels.`
      );
    },
  },
  {
    key: "tracked",
    description: "List all level IDs currently being tracked in this thread.",
    async handler({ threadsDB, output, input }) {
      const thread = await threadsDB.getItem(input.threadID);
      let gdLevelTracks: string[] = thread.gdLevelTracks ?? [];

      gdLevelTracks = Datum.toUniqueArray(gdLevelTracks);

      if (gdLevelTracks.length === 0) {
        return output.reply(
          `ℹ️ No levels are currently being tracked in this thread.`
        );
      }

      return output.reply(
        `📋 Currently **tracked level(s)** in this thread:\n${gdLevelTracks.join(
          "\n"
        )}\n\nNotifications will be sent here **whenever these levels change.**`
      );
    },
  },
]);

export default gdcmd;
