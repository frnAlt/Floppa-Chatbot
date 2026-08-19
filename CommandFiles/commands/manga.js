// @ts-check
import { UNISpectra } from "@cassidy/unispectra";
import moment from "moment-timezone";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "manga",
  description: "Search and read manga chapters",
  author: "MrkimstersDev",
  version: "1.0.0",
  usage: "{prefix}{name} <manga title>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["mng"],
  icon: "📖",
  noLevelUI: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Astral • Manga Reader 🌌",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    noQuery:
      "Please provide a manga title to search for!\nExample: {prefix}manga One Piece",
    noResults: "No manga found with that title!",
    error: "Error fetching manga data: %1",
    invalidSelection: "Please select a valid number between 1 and 20!",
    chapterPrompt:
      "Reply with a chapter number to read (e.g., '1' for Chapter 1)\nOr use 'next'/'prev' to change pages",
    noChapters: "No chapters available for this manga!",
    invalidChapter: "Please select a valid chapter number!",
    invalidPageCommand: "Use 'next' or 'prev' to change pages!",
  },
};

/**
 *
 * @param {string} query
 * @returns {Promise<any[]>}
 */
async function fetchMangaData(query) {
  const apiUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(
    query
  )}&limit=20`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  // @ts-ignore
  return data.data || [];
}

/**
 *
 * @param {string} mangaId
 * @returns
 */
async function fetchChapterList(mangaId) {
  let allChapters = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const apiUrl = `https://api.mangadex.org/chapter?manga=${mangaId}&limit=${limit}&offset=${offset}&translatedLanguage[]=en`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    // @ts-ignore
    const chapters = data.data || [];
    allChapters = allChapters.concat(chapters);

    if (chapters.length < limit) break;
    offset += limit;
  }

  allChapters.sort((a, b) => {
    const aNum = parseFloat(a.attributes.chapter || "0");
    const bNum = parseFloat(b.attributes.chapter || "0");
    return aNum - bNum;
  });

  return allChapters;
}

async function fetchChapterPages(chapterId) {
  try {
    const apiUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch chapter pages");
    /**
     * @type {any}
     */
    const data = await response.json();
    const baseUrl = data.baseUrl;
    const chapterHash = data.chapter.hash;
    const pages = data.chapter.data.map(
      (page) => `${baseUrl}/data/${chapterHash}/${page}`
    );
    return pages;
  } catch (error) {
    throw new Error(`Failed to fetch chapter pages: ${error.message}`);
  }
}

function formatMangaList(results) {
  const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
  const list = results
    .slice(0, 20)
    .map((manga, index) => {
      const title =
        manga.attributes.title.en || Object.values(manga.attributes.title)[0];
      const status = manga.attributes.status;
      return ` • ${index + 1}. ${title} (${status})`;
    })
    .join("\n");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} Manga Search Results
${list}
${UNISpectra.standardLine}
${UNISpectra.charm} Reply with a number (1-20) to select
${UNISpectra.charm} CassidyAstral-Midnight 🌃 ${UNISpectra.charm}
[ Transmission from Astral Command ]`;
}

function formatChapterList(manga, chapters, page = 0) {
  const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
  const title =
    manga.attributes.title.en || Object.values(manga.attributes.title)[0];
  const perPage = 10;
  const start = page * perPage;
  const end = start + perPage;
  const totalPages = Math.ceil(chapters.length / perPage);

  const chapterList = chapters
    .slice(start, end)
    .map(
      (chapter, index) =>
        ` • ${start + index + 1}. Chapter ${
          chapter.attributes.chapter || "N/A"
        }`
    )
    .join("\n");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} Manga: ${title}
${chapterList}
${UNISpectra.standardLine}
Page ${page + 1}/${totalPages}
${langs.en.chapterPrompt}
${UNISpectra.charm} CassidyAstral-Midnight 🌃 ${UNISpectra.charm}
[ Transmission from Astral Command ]`;
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, commandName, langParser }) {
  const getLang = langParser.createGetLang(langs);
  try {
    const message = input.body.split(" ").slice(1).join(" ").trim();
    if (!message) {
      return output.reply(getLang("noQuery"));
    }

    const mangas = await fetchMangaData(message);
    if (!mangas.length) {
      return output.reply(getLang("noResults"));
    }

    const results = mangas.slice(0, 20);
    const messageInfo = await output.reply(formatMangaList(results));

    input.setReply(messageInfo.messageID, {
      key: commandName,
      id: input.senderID,
      results,
      stage: "selectManga",
    });
  } catch (error) {
    output.reply(getLang("error", error.message));
  }
}

/**
 *
 * @param {CommandContext & { repObj: { id: string; results: any, stage: any; manga: any, chapters: any; page: number; key: string } }} param0
 * @returns
 */
export async function reply({ input, output, repObj, detectID, langParser }) {
  const { id, results, stage, manga, chapters, page = 0 } = repObj;
  const getLang = langParser.createGetLang(langs);

  if (input.senderID !== id) {
    return;
  }

  if (stage === "selectManga") {
    const selection = parseInt(input.body);
    if (isNaN(selection) || selection < 1 || selection > 20) {
      return output.reply(getLang("invalidSelection"));
    }

    const selectedManga = results[selection - 1];
    if (!selectedManga) {
      return output.reply(getLang("invalidSelection"));
    }

    try {
      const chapters = await fetchChapterList(selectedManga.id);
      if (!chapters.length) {
        return output.reply(getLang("noChapters"));
      }

      const messageInfo = await output.reply(
        formatChapterList(selectedManga, chapters, 0)
      );
      input.setReply(messageInfo.messageID, {
        key: repObj.key,
        id: input.senderID,
        manga: selectedManga,
        chapters,
        stage: "selectChapter",
        page: 0,
      });
    } catch (error) {
      output.reply(getLang("error", error.message));
    }
  } else if (stage === "selectChapter") {
    const inputLower = input.body.toLowerCase();

    if (inputLower === "next" || inputLower === "prev") {
      const perPage = 10;
      const totalPages = Math.ceil(chapters.length / perPage);
      let newPage = page;

      if (inputLower === "next" && page < totalPages - 1) {
        newPage = page + 1;
      } else if (inputLower === "prev" && page > 0) {
        newPage = page - 1;
      } else {
        return output.reply(getLang("invalidPageCommand"));
      }

      const messageInfo = await output.reply(
        formatChapterList(manga, chapters, newPage)
      );
      input.setReply(messageInfo.messageID, {
        key: repObj.key,
        id: input.senderID,
        manga,
        chapters,
        stage: "selectChapter",
        page: newPage,
      });
      return;
    }

    const chapterSelection = parseInt(input.body);
    const totalChapters = chapters.length;

    if (
      isNaN(chapterSelection) ||
      chapterSelection < 1 ||
      chapterSelection > totalChapters
    ) {
      return output.reply(getLang("invalidChapter"));
    }

    const selectedChapter = chapters[chapterSelection - 1];
    try {
      const pageUrls = await fetchChapterPages(selectedChapter.id);
      if (!pageUrls.length) {
        return output.reply("No pages available for this chapter!");
      }

      const timestamp = moment()
        .tz("Asia/Manila")
        .format("MMMM D, YYYY h:mm A");
      const title =
        manga.attributes.title.en || Object.values(manga.attributes.title)[0];
      const replyText = `${UNISpectra.charm} 𝖳𝖾𝗆𝗉𝗈𝗋𝖺𝗅 𝖢𝗈𝗈𝗋𝖽𝗂𝗇𝖺𝗍𝖾𝗌
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} 𝖬𝖺𝗇𝗀𝖺: ${title}
 • 📖 Chapter ${selectedChapter.attributes.chapter || "N/A"}
 • 📄 Pages: ${pageUrls.length}
${UNISpectra.standardLine}
${UNISpectra.charm} 𝖢𝖺𝗌𝗌𝗂𝖽𝗒𝖠𝗌𝗍𝗋𝖺𝗅-𝖬𝗂𝖽𝗇𝗂𝗀𝗁𝗍 🌃 ${UNISpectra.charm}`;

      const attachments = await Promise.all(
        pageUrls.map((url) => global.utils.getStreamFromURL(url))
      );

      input.delReply(String(detectID));

      const messageInfo = await output.reply({
        body: replyText,
        attachment: attachments,
      });

      input.setReply(messageInfo.messageID, {
        key: repObj.key,
        id: input.senderID,
        manga,
        chapters,
        stage: "selectChapter",
        page,
      });
    } catch (error) {
      output.reply(getLang("error", error.message));
    }
  }
}
