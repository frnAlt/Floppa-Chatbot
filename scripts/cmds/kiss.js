const axios = require("axios");

let createCanvas, loadImage;
try {
  ({ createCanvas, loadImage } = require("@napi-rs/canvas"));
} catch (_) {
  try {
    ({ createCanvas, loadImage } = require("canvas"));
  } catch (e) {}
}

const fs = require("fs");

const path = require("path");

const FormData = require("form-data");

async function getStreamFromURL(url) {

  const res = await axios.get(url, { responseType: "stream" });

  return res.data;

}

// === جزء API الفيديو ===

async function getBalance() {

  const pack = generateRandomId();

  await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, {

    headers: {

      "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)",

      "glam-user-id": pack,

      "user_id": pack,

      "glam-local-date": new Date().toISOString(),

    },

  });

  return pack;

}

async function uploadFile(pack, stream, prompt, duration) {

  const form = new FormData();

  form.append("package_id", pack);

  form.append("media_file", stream);

  form.append("media_type", "image");

  form.append("template_id", "community_img2vid");

  form.append("template_category", "20_coins_dur");

  form.append("frames", JSON.stringify([{

    prompt,

    custom_prompt: prompt,

    start: 0,

    end: 0,

    timings_units: "frames",

    media_type: "image",

    style_id: "chained_falai_img2video",

    rate_modifiers: { duration: duration.toString() + "s" },

  }]));

  const res = await axios.post("https://android.getglam.app/v2/magic_video", form, {

    headers: { ...form.getHeaders(), "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)" },

  });

  return res.data.event_id;

}

async function getStatus(taskID, pack) {

  while (true) {

    const res = await axios.get("https://android.getglam.app/v2/magic_video", {

      params: { package_id: pack, event_id: taskID },

      headers: { "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)" },

    });

    if (res.data.status === "READY") return [res.data];

    await new Promise(r => setTimeout(r, 2000));

  }

}

function generateRandomId(len = 16) {

  const chars = "abcdef0123456789";

  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

}

async function imgToVideo(prompt, filePath, duration = 5) {

  const pack = await getBalance();

  const task = await uploadFile(pack, fs.createReadStream(filePath), prompt, duration);

  return await getStatus(task, pack);

}

// === دالة تجيب لينك البروفايل من usersData أو fallback ===

async function getAvatar(uid, usersData) {

  let url = null;

  try {

    url = await usersData.getAvatarUrl(uid);

  } catch (e) {}

  if (!url) {

    url = `https://graph.facebook.com/${uid}/picture?width=512&height=512`;

  }

  return url;

}

// === دمج صورتين في صورة واحدة (تحضير للفيديو) ===

async function mergeAvatars(url1, url2) {

  const img1 = await loadImage(url1);

  const img2 = await loadImage(url2);

  const size = 512;

  const canvas = createCanvas(size * 2, size);

  const ctx = canvas.getContext("2d");

  ctx.drawImage(img1, 0, 0, size, size);

  ctx.drawImage(img2, size, 0, size, size);

  const cacheDir = path.join(__dirname, "cache");

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  const filePath = path.join(cacheDir, `kiss_${Date.now()}.png`);

  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

  return filePath;

}

// === الكوماند ===

module.exports = {
  config: {
    name: "kiss",
    aliases: ["بوسة"],
    version: "1.0.0",
    author: "Hina",
    role: 0,
    category: "fun",
    description: "😘 Send kiss interaction video with the person you reply to",
    guide: {
      en: "{p}kiss (reply to a message)",
      ar: "بوسة (بالرد على شخص)"
    }
  },

  onStart: async function (ctx) {
    const { event, message, usersData } = ctx;
    const sh = ctx.sh || message;
    const targetUID = event.messageReply?.senderID || (event.mentions && Object.keys(event.mentions)[0]);
    if (!targetUID) {
      return (sh.reply || message.reply)("❌ لازم ترد على رسالة الشخص اللي عايز تبوسه 😘 / Please reply to the user's message.");
    }
    const uid1 = event.senderID;
    const uid2 = targetUID;
    const url1 = await getAvatar(uid1, usersData);
    const url2 = await getAvatar(uid2, usersData);
    const prompt = "two people kissing each other, romantic, realistic style";

    if (sh.react) await sh.react("⏳");
    else if (message?.reaction) await message.reaction("⏳");

    try {
      const mergedPath = await mergeAvatars(url1, url2);
      const result = await imgToVideo(prompt, mergedPath);
      if (sh.react) await sh.react("✅");
      else if (message?.reaction) await message.reaction("✅");

      const name1 = (await usersData?.getName?.(uid1)) || "Someone";
      const name2 = (await usersData?.getName?.(uid2)) || "Someone";

      await (sh.reply || message.reply)({
        body: `😘 | ${name1} kisses ${name2}`,
        attachment: await getStreamFromURL(result[0].video_url)
      });
      if (fs.existsSync(mergedPath)) fs.unlinkSync(mergedPath);
    } catch (err) {
      console.error("kiss error:", err);
      (sh.reply || message.reply)("❌ حصل خطأ أثناء إنشاء فيديو البوسة / Error creating kiss animation.");
    }
  },

  onType: function (ctx) {
    return this.onStart(ctx);
  }
};