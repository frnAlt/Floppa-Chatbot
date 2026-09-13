const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ffmpeg = require("@ffmpeg-installer/ffmpeg");
const fluent = require("fluent-ffmpeg");
fluent.setFfmpegPath(ffmpeg.path);

// ─── 1. Anime Characters Map (VITS / Moe-TTS Engine) ──────────────────────────
const ANIME_MODELS = {
  // Naruto
  naruto: { name: "Naruto Uzumaki", speaker: "うずまきナルト（竹内順子）（NARUTO -ナルト-）", series: "Naruto" },
  sasuke: { name: "Sasuke Uchiha", speaker: "うちはサスケ（杉山紀彰）（NARUTO -ナルト-）", series: "Naruto" },
  itachi: { name: "Itachi Uchiha", speaker: "うちはイタチ（石川英郎）（NARUTO -ナルト-）", series: "Naruto" },
  kakashi: { name: "Kakashi Hatake", speaker: "はたけカカシ（井上和彦）（NARUTO -ナルト-）", series: "Naruto" },
  madara: { name: "Madara Uchiha", speaker: "うちはマダラ（Neil Kaplan）（NARUTO -ナルト-）", series: "Naruto" },
  boruto: { name: "Boruto Uzumaki", speaker: "うずまきボルト（三瓶由布子）（NARUTO -ナルト-）", series: "Naruto" },
  shikamaru: { name: "Shikamaru Nara", speaker: "奈良シカマル（森久保祥太郎）（NARUTO -ナルト-）", series: "Naruto" },
  gaara: { name: "Gaara", speaker: "我愛羅（Liam O'Brien）（NARUTO -ナルト-）", series: "Naruto" },

  // Dragon Ball
  goku: { name: "Son Goku", speaker: "孫悟空（野沢雅子）（ドラゴンボール）", series: "Dragon Ball" },
  vegeta: { name: "Vegeta", speaker: "ベジータ（堀川りょう）（ドラゴンボール）", series: "Dragon Ball" },

  // One Piece
  luffy: { name: "Monkey D. Luffy", speaker: "モンキー・D・ルフィ（田中真弓）（ONE PIECE）", series: "One Piece" },
  zoro: { name: "Roronoa Zoro", speaker: "ロロノア・ゾロ（中井和哉）（ONE PIECE）", series: "One Piece" },
  sanji: { name: "Sanji", speaker: "サンジ（平田広明）（ONE PIECE）", series: "One Piece" },
  nami: { name: "Nami", speaker: "ナミ（岡村明美）（ONE PIECE）", series: "One Piece" },
  chopper: { name: "Tony Tony Chopper", speaker: "トニートニー・チョッパー（大谷育江）（ONE PIECE）", series: "One Piece" },

  // Attack on Titan
  eren: { name: "Eren Yeager", speaker: "エレン・イェーガー（梶裕貴）（進撃の巨人）", series: "Attack on Titan" },
  mikasa: { name: "Mikasa Ackerman", speaker: "ミカサ・アッカーマン（石川由依）（進撃の巨人）", series: "Attack on Titan" },
  levi: { name: "Levi Ackerman", speaker: "リヴァイ（神谷浩史）（進撃の巨人）", series: "Attack on Titan" },
  armin: { name: "Armin Arlert", speaker: "アルミン・アルレルト（井上麻里奈）（進撃の巨人）", series: "Attack on Titan" },

  // Demon Slayer
  tanjiro: { name: "Tanjiro Kamado", speaker: "竈門炭治郎（花江夏樹）（鬼滅の刃）", series: "Demon Slayer" },
  nezuko: { name: "Nezuko Kamado", speaker: "竈門禰豆子（鬼頭明里）（鬼滅の刃）", series: "Demon Slayer" },
  zenitsu: { name: "Zenitsu Agatsuma", speaker: "我妻善逸（下野紘）（鬼滅の刃）", series: "Demon Slayer" },
  shinobu: { name: "Shinobu Kocho", speaker: "胡蝶しのぶ（早見沙織）（鬼滅の刃）", series: "Demon Slayer" },
  rengoku: { name: "Kyojuro Rengoku", speaker: "煉獄杏寿郎（日野聡）（鬼滅の刃）", series: "Demon Slayer" },

  // My Hero Academia
  deku: { name: "Izuku Midoriya (Deku)", speaker: "緑谷出久（山下大輝）（僕のヒーローアカデミア）", series: "My Hero Academia" },
  bakugo: { name: "Katsuki Bakugo", speaker: "爆豪勝己（岡本信彦）（僕のヒーローアカデミア）", series: "My Hero Academia" },
  todoroki: { name: "Shoto Todoroki", speaker: "轟焦凍（梶裕貴）（僕のヒーローアカデミア）", series: "My Hero Academia" },
  allmight: { name: "All Might", speaker: "オールマイト（三宅健太）（僕のヒーローアカデミア）", series: "My Hero Academia" },

  // Jujutsu Kaisen
  sukuna: { name: "Ryomen Sukuna", speaker: "両面宿儺（諏訪部順一）（呪術廻戦）", series: "Jujutsu Kaisen" },

  // Re:Zero & KonoSuba
  rem: { name: "Rem", speaker: "レム（水瀬いのり）（Re:ゼロから始める異世界生活）", series: "Re:Zero" },
  emilia: { name: "Emilia", speaker: "エミリア（高橋李依）（Re:ゼロから始める異世界生活）", series: "Re:Zero" },
  megumin: { name: "Megumin", speaker: "めぐみん（高橋李依）（この素晴らしい世界に祝福を！）", series: "KonoSuba" },
  aqua: { name: "Aqua", speaker: "アクア（雨宮天）（この素晴らしい世界に祝福を！）", series: "KonoSuba" },
  kazuma: { name: "Kazuma Satou", speaker: "カズマ（福島潤）（この素晴らしい世界に祝福を！）", series: "KonoSuba" },

  // Famous Anime Icons
  miku: { name: "Hatsune Miku", speaker: "初音ミク（初音ミク）（あはれ！名作くん）", series: "Vocaloid" },
  anya: { name: "Anya Forger", speaker: "アーニャ・フォージャー（種﨑敦美）（SPY×FAMILY）", series: "Spy x Family" },
  saber: { name: "Saber", speaker: "セイバー（Kari Wahlgren）（Fateシリーズ）", series: "Fate" },
  killua: { name: "Killua Zoldyck", speaker: "キルア＝ゾルディック（三橋加奈子）（HUNTER×HUNTER）", series: "Hunter x Hunter" },
  saitama: { name: "Saitama", speaker: "サイタマ（古川慎）（ワンパンマン）", series: "One Punch Man" },
  light: { name: "Light Yagami", speaker: "夜神月（宮野真守）（DEATH NOTE）", series: "Death Note" },
  pikachu: { name: "Pikachu", speaker: "ピカチュウ（大谷育江）（ポケットモンスター）", series: "Pokemon" },
  shinchan: { name: "Shinnosuke", speaker: "野原しんのすけ（矢島晶子）（クレヨンしんちゃん）", series: "Shin-chan" }
};

// ─── 2. Pop Culture & Character Models Map (TikTok Voice Engine) ─────────────
const TIKTOK_MODELS = {
  ghostface: { name: "Ghostface", code: "en_us_ghostface", series: "Scream" },
  scream: { name: "Ghostface", code: "en_us_ghostface", series: "Scream" },
  chewbacca: { name: "Chewbacca", code: "en_us_chewbacca", series: "Star Wars" },
  chewie: { name: "Chewbacca", code: "en_us_chewbacca", series: "Star Wars" },
  c3po: { name: "C-3PO", code: "en_us_c3po", series: "Star Wars" },
  stitch: { name: "Stitch", code: "en_us_stitch", series: "Lilo & Stitch" },
  stormtrooper: { name: "Stormtrooper", code: "en_us_stormtrooper", series: "Star Wars" },
  rocket: { name: "Rocket Raccoon", code: "en_us_rocket", series: "Marvel" },
  pirate: { name: "Pirate", code: "en_male_pirate", series: "Pirates" },
  santa: { name: "Santa Claus", code: "en_male_santa", series: "Holiday" },
  butler: { name: "British Butler", code: "en_male_ukbutler", series: "Persona" },
  wacky: { name: "Wacky Cartoon", code: "en_male_funny", series: "Cartoon" },
  funny: { name: "Wacky Cartoon", code: "en_male_funny", series: "Cartoon" },
  grandma: { name: "Grandma", code: "en_female_grandma", series: "Persona" },
  betty: { name: "Betty", code: "en_female_betty", series: "Persona" },
  kawaii: { name: "Kawaii Anime Girl", code: "jp_005", series: "Anime" },
  animegirl: { name: "Kawaii Anime Girl", code: "jp_005", series: "Anime" },
  animemale: { name: "Anime Male", code: "jp_006", series: "Anime" },
  sing_deep: { name: "Deep Singer", code: "en_male_sing_deep_jingle", series: "Melodic" },
  warm: { name: "Warm Musical", code: "en_female_ht_f08_wonderful_world", series: "Melodic" },
  alto: { name: "Glorious Alto", code: "en_female_ht_f08_glorious", series: "Melodic" },
  scientist: { name: "Scientist", code: "en_us_009", series: "Persona" },
  professor: { name: "Professor", code: "en_us_007", series: "Persona" }
};

// ─── 3. Helper Functions ──────────────────────────────────────────────────────
function findModel(rawKey) {
  if (!rawKey) return null;
  const k = rawKey.toLowerCase().trim().replace(/[-_]/g, "");
  if (["normal", "default", "google", "off", "reset"].includes(k)) {
    return { kind: "normal", name: "Default Normal Voice" };
  }
  for (const [key, val] of Object.entries(ANIME_MODELS)) {
    if (key.replace(/[-_]/g, "") === k) {
      return { kind: "anime", key, ...val };
    }
  }
  for (const [key, val] of Object.entries(TIKTOK_MODELS)) {
    if (key.replace(/[-_]/g, "") === k) {
      return { kind: "tiktok", key, ...val };
    }
  }
  return null;
}

async function safeReact(api, event, emoji) {
  const isReactOff = Boolean(
    global.GoatBot?.reactOff ??
    global.FloppaBot?.reactOff ??
    global.GoatBot?.config?.reactOff ??
    global.FloppaBot?.config?.reactOff
  );
  if (isReactOff || !api?.setMessageReaction) return;
  try {
    await new Promise(resolve => {
      api.setMessageReaction(emoji, event.messageID, () => resolve(), true);
    });
  } catch (_) {}
}

// Generates MP3 Buffer using TikTok TTS Worker
async function getTikTokAudioBuffer(text, voiceCode) {
  const resp = await axios.post("https://tiktok-tts.weilnet.workers.dev/api/generation", {
    text: text.slice(0, 300),
    voice: voiceCode
  }, {
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    timeout: 12000
  });

  if (resp.data?.success && resp.data?.data) {
    return Buffer.from(resp.data.data, "base64");
  }
  throw new Error("TikTok TTS returned unsuccessful response");
}

// Generates MP3 Buffer using Anime VITS Model & Converts WAV to MP3
async function getAnimeAudioBuffer(text, speakerFull, cacheDir) {
  const postData = { data: [text.slice(0, 200), speakerFull, 1.0, false] };
  const callRes = await axios.post("https://skytnt-moe-tts.hf.space/call/tts_fn_12", postData, {
    headers: { "Content-Type": "application/json" },
    timeout: 12000
  });

  const eventId = callRes.data?.event_id;
  if (!eventId) throw new Error("No event_id returned from anime TTS service");

  const sseRes = await axios.get(`https://skytnt-moe-tts.hf.space/call/tts_fn_12/${eventId}`, {
    responseType: "stream",
    timeout: 25000
  });

  const wavUrl = await new Promise((resolve, reject) => {
    let raw = "";
    let resolved = false;

    sseRes.data.on("data", chunk => {
      raw += chunk.toString();
      const lines = raw.split("\n");
      raw = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (Array.isArray(parsed) && parsed[1]?.url) {
              resolved = true;
              sseRes.data.destroy();
              const url = parsed[1].url.replace(/\/cal(?:l)?\/file=/, "/file=");
              resolve(url);
              return;
            }
          } catch (_) {}
        }
      }
    });

    sseRes.data.on("end", () => {
      if (!resolved) reject(new Error("Anime TTS stream closed without audio URL"));
    });
    sseRes.data.on("error", (err) => {
      if (!resolved) reject(err);
    });
  });

  // Download WAV file and convert to MP3 via ffmpeg
  const tempWav = path.join(cacheDir, `anime_${Date.now()}_${Math.floor(Math.random() * 10000)}.wav`);
  const tempMp3 = path.join(cacheDir, `anime_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`);

  try {
    const wavStream = await axios.get(wavUrl, { responseType: "stream", timeout: 15000 });
    const writer = fs.createWriteStream(tempWav);
    wavStream.data.pipe(writer);
    await new Promise((res, rej) => {
      writer.on("finish", res);
      writer.on("error", rej);
    });

    await new Promise((resolve, reject) => {
      fluent(tempWav)
        .toFormat("mp3")
        .on("end", resolve)
        .on("error", reject)
        .save(tempMp3);
    });

    const mp3Buf = await fs.readFile(tempMp3);
    return mp3Buf;
  } finally {
    fs.remove(tempWav).catch(() => {});
    fs.remove(tempMp3).catch(() => {});
  }
}

// Generates Normal Speech MP3 Buffer (Google TTS / SayV2 / TikTok fallback)
async function getNormalSpeechBuffer(text, lang = "en") {
  // 1. Single chunk Google TTS (for text <= 200 chars)
  if (text.length <= 200) {
    try {
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const res = await axios.get(gUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        responseType: "arraybuffer",
        timeout: 10000
      });
      if (res.status === 200 && res.data?.length > 0) {
        return Buffer.from(res.data);
      }
    } catch (_) {}

    // Fallback: Toshiro Say V2 API
    try {
      const v2Url = `https://toshiro-api-editz6t9.vercel.app/api/tools/sayv2?text=${encodeURIComponent(text)}`;
      const v2Res = await axios.get(v2Url, { responseType: "arraybuffer", timeout: 10000 });
      if (v2Res.status === 200 && v2Res.data?.length > 0) {
        return Buffer.from(v2Res.data);
      }
    } catch (_) {}

    // Fallback: TikTok normal US English
    try {
      return await getTikTokAudioBuffer(text, "en_us_001");
    } catch (_) {}
  }

  // 2. Multi-chunk Google TTS (for long text > 200 chars)
  const chunkSize = 150;
  const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [text];
  const buffers = [];

  for (const chunk of chunks) {
    try {
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const res = await axios.get(gUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        responseType: "arraybuffer",
        timeout: 10000
      });
      if (res.status === 200 && res.data?.length > 0) {
        buffers.push(Buffer.from(res.data));
        continue;
      }
    } catch (_) {}

    // If a chunk fails, try Toshiro Say V2
    try {
      const v2Url = `https://toshiro-api-editz6t9.vercel.app/api/tools/sayv2?text=${encodeURIComponent(chunk)}`;
      const v2Res = await axios.get(v2Url, { responseType: "arraybuffer", timeout: 10000 });
      if (v2Res.status === 200 && v2Res.data?.length > 0) {
        buffers.push(Buffer.from(v2Res.data));
      }
    } catch (_) {}
  }

  if (buffers.length > 0) {
    return Buffer.concat(buffers);
  }

  throw new Error("Unable to synthesize speech audio from any provider");
}

module.exports = {
  config: {
    name: "say",
    aliases: ["tts", "speak", "voice"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 3,
    role: 0,
    category: "tts",
    description: "Convert text to speech with normal voice or famous anime and character voices.",
    guide: {
      en: "{pn} <text> — speaks in normal voice (or your switched character)\n" +
          "{pn} <text> | <lang> — speaks in normal voice with language code (e.g. !say hi | bn)\n" +
          "{pn} model <character> <text> — speaks with famous anime/character voice\n" +
          "{pn} <character> <text> — quick shortcut to speak with character\n" +
          "{pn} model <character> — switch your default voice to that character\n" +
          "{pn} model reset — reset your default voice back to normal\n" +
          "{pn} model list — view directory of all available anime & character models"
    }
  },

  onStart: async function ({ api, args, message, event, usersData }) {
    const prefix = global.GoatBot?.config?.prefix || "!";
    const firstArg = (args[0] || "").toLowerCase();
    const secondArg = (args[1] || "").toLowerCase();

    // ─── Subcommand: Model Directory & List ──────────────────────────────────
    if (
      ["list", "models", "characters"].includes(firstArg) ||
      (["model", "voice"].includes(firstArg) && ["list", "all", "ls", "help"].includes(secondArg))
    ) {
      const animeList = Object.entries(ANIME_MODELS)
        .map(([k, v]) => `• ${k} (${v.name})`)
        .join("\n");

      const tiktokList = [
        "• ghostface (Scream)",
        "• stitch (Lilo & Stitch)",
        "• chewbacca, c3po, stormtrooper (Star Wars)",
        "• rocket (Guardians of the Galaxy)",
        "• pirate (Pirate)",
        "• santa (Santa Claus)",
        "• butler (British Butler)",
        "• wacky (Cartoon)",
        "• grandma, betty (Persona)",
        "• kawaii, animemale (Japanese Anime)",
        "• sing_deep, warm, alto (Melodic & Songs)",
        "• scientist, professor (Academics)"
      ].join("\n");

      const listMsg =
        `🎙️ AVAILABLE VOICE MODELS\n\n` +
        `🌟 Famous Anime Characters:\n${animeList}\n\n` +
        `🎭 Pop-Culture & Character Voices:\n${tiktokList}\n\n` +
        `💡 How to use:\n` +
        `1. Direct voice: ${prefix}say model naruto Dattebayo!\n` +
        `2. Quick shortcut: ${prefix}say ghostface Hello Sidney\n` +
        `3. Switch your voice: ${prefix}say model naruto\n` +
        `4. Normal default: ${prefix}say hello how are you\n` +
        `5. Reset voice: ${prefix}say model reset`;

      return message.reply(listMsg);
    }

    // ─── Subcommand: Reset Default Voice ─────────────────────────────────────
    if (
      ["reset", "normal", "default"].includes(firstArg) ||
      (["model", "voice"].includes(firstArg) && ["reset", "normal", "default", "off"].includes(secondArg))
    ) {
      if (usersData && typeof usersData.set === "function") {
        await usersData.set(event.senderID, null, "data.say_voice").catch(() => {});
      }
      await safeReact(api, event, "👍");
      return message.reply("👍 Your voice model has been reset to default normal voice.");
    }

    // ─── Subcommand: Switch / Set Default Voice ──────────────────────────────
    // e.g. !say model naruto (without additional text prompt)
    if (
      ["model", "voice"].includes(firstArg) &&
      secondArg &&
      args.length === 2 &&
      event.type !== "message_reply"
    ) {
      const targetModel = findModel(secondArg);
      if (!targetModel) {
        return message.reply(
          `⚠️ Unknown model "${args[1]}". Use "${prefix}say model list" to see all available voices.`
        );
      }

      if (targetModel.kind === "normal") {
        if (usersData && typeof usersData.set === "function") {
          await usersData.set(event.senderID, null, "data.say_voice").catch(() => {});
        }
        await safeReact(api, event, "👍");
        return message.reply("👍 Voice switched to Default Normal Voice.");
      }

      const modelKey = targetModel.key || secondArg;
      if (usersData && typeof usersData.set === "function") {
        await usersData.set(event.senderID, modelKey, "data.say_voice").catch(() => {});
      }
      await safeReact(api, event, "👍");
      return message.reply(
        `👍 Voice switched to ${targetModel.name}!\n\nNow whenever you type "${prefix}say <text>", your voice will use this model.\n(Use "${prefix}say model reset" to switch back to normal).`
      );
    }

    // ─── Parse Speaking Request & Prompt ────────────────────────────────────
    let text = "";
    let lang = "en";
    let requestedModel = null;

    // Check if the user has a saved voice in database
    let savedVoiceKey = null;
    if (usersData && typeof usersData.get === "function") {
      try {
        savedVoiceKey = await usersData.get(event.senderID, "data.say_voice");
      } catch (_) {}
    }

    // A. User replied to a message
    if (event.type === "message_reply") {
      text = event.messageReply?.body || "";

      if (["model", "voice"].includes(firstArg) && secondArg) {
        requestedModel = findModel(secondArg);
      } else if (firstArg) {
        requestedModel = findModel(firstArg);
      }

      // If user also supplied text in the reply command, append or use it
      const inlineText = ["model", "voice"].includes(firstArg) ? args.slice(2).join(" ").trim() : (requestedModel ? args.slice(1).join(" ").trim() : args.join(" ").trim());
      if (inlineText) {
        text = inlineText;
      }
    } else {
      // B. Normal message
      if (["model", "voice"].includes(firstArg) && secondArg) {
        requestedModel = findModel(secondArg);
        text = args.slice(2).join(" ").trim();
      } else if (firstArg && findModel(firstArg) && args.length > 1) {
        // Quick shortcut: !say naruto believe it! or !say ghostface hello
        requestedModel = findModel(firstArg);
        text = args.slice(1).join(" ").trim();
      } else {
        // Default say syntax: !say <text> or !say <text> | <lang>
        const fullInput = args.join(" ").trim();
        if (fullInput.includes("|")) {
          const parts = fullInput.split("|").map(s => s.trim());
          text = parts[0];
          lang = parts[1] || "en";
        } else {
          text = fullInput;
        }
      }
    }

    // If no inline model was requested, check saved voice
    if (!requestedModel && savedVoiceKey) {
      requestedModel = findModel(savedVoiceKey);
    }

    // Validate prompt text
    if (!text) {
      return message.reply(
        `🗣️ Say / Voice TTS Engine\n\n` +
        `• Default Voice: ${prefix}say <text>\n` +
        `• Language Code: ${prefix}say <text> | <lang_code> (e.g. !say hi | bn)\n` +
        `• Character Voice: ${prefix}say model <character> <text>\n` +
        `• Switch Voice: ${prefix}say model <character>\n` +
        `• Reset Voice: ${prefix}say model reset\n` +
        `• Model Directory: ${prefix}say model list\n\n` +
        `💡 Example: ${prefix}say model naruto Dattebayo!`
      );
    }

    // Send processing reaction
    await safeReact(api, event, "🗣️");

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let mp3Buffer = null;

    try {
      // ─── 1. Anime Model Synthesis ──────────────────────────────────────────
      if (requestedModel && requestedModel.kind === "anime") {
        try {
          mp3Buffer = await getAnimeAudioBuffer(text, requestedModel.speaker, cacheDir);
        } catch (animeErr) {
          console.warn(`[SAY] Anime TTS (${requestedModel.key}) failed: ${animeErr.message}, falling back to alternative...`);
          // Fallback A: TikTok anime voice
          try {
            mp3Buffer = await getTikTokAudioBuffer(text, "jp_005");
          } catch (_) {
            // Fallback B: Normal speech
            mp3Buffer = await getNormalSpeechBuffer(text, lang);
          }
        }
      }
      // ─── 2. TikTok Character Model Synthesis ───────────────────────────────
      else if (requestedModel && requestedModel.kind === "tiktok") {
        try {
          mp3Buffer = await getTikTokAudioBuffer(text, requestedModel.code);
        } catch (ttErr) {
          console.warn(`[SAY] TikTok TTS (${requestedModel.key}) failed: ${ttErr.message}, falling back to normal speech...`);
          mp3Buffer = await getNormalSpeechBuffer(text, lang);
        }
      }
      // ─── 3. Default Normal Speech ──────────────────────────────────────────
      else {
        mp3Buffer = await getNormalSpeechBuffer(text, lang);
      }

      if (!mp3Buffer || mp3Buffer.length === 0) {
        throw new Error("Generated audio buffer is empty.");
      }

      // Write MP3 buffer to temporary file for streaming attachment
      const tempPath = path.join(cacheDir, `say_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`);
      await fs.writeFile(tempPath, mp3Buffer);

      const audioStream = fs.createReadStream(tempPath);
      audioStream.on("end", () => fs.remove(tempPath).catch(() => {}));
      audioStream.on("error", () => fs.remove(tempPath).catch(() => {}));
      setTimeout(() => fs.remove(tempPath).catch(() => {}), 60000);

      // React with success emoji (👍)
      await safeReact(api, event, "👍");

      // Reply with ONLY the mp3 audio attachment (NO text body)
      await message.reply({
        attachment: audioStream
      });
    } catch (err) {
      console.error("[SAY COMMAND ERROR]:", err);
      await safeReact(api, event, "👎");
      return message.reply("Failed to generate speech audio. Please try again later.");
    }
  }
};