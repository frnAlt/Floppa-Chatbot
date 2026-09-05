const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const client = axios.create({ timeout: 5000 });
const baseApiUrl = () => "https://baby-apisx.vercel.app";

// ─── Persona & Memory Store ──────────────────────────────────────────────────
const MEMORY_FILE = path.join(__dirname, "cache/bby_memory.json");
fs.ensureFileSync(MEMORY_FILE);
let bbyMemory = {};
try {
    bbyMemory = fs.readJsonSync(MEMORY_FILE);
} catch (_) {
    bbyMemory = {};
}

function saveMemory() {
    try {
        fs.writeJsonSync(MEMORY_FILE, bbyMemory, { spaces: 2 });
    } catch (_) {}
}

function getUserMemory(uid) {
    if (!bbyMemory[uid]) {
        bbyMemory[uid] = {
            acts: [],             // recent user actions/statements
            topics: [],           // discussed topics
            favoriteWords: {},    // word/slang frequencies
            favoriteEmojis: {},   // emoji frequencies
            recentContext: [],    // last 10 conversation turns
            parody: true,         // whether parody/tone mirroring is active
            updatedAt: Date.now()
        };
    }
    return bbyMemory[uid];
}

function recordUserAct(uid, text) {
    if (!text || typeof text !== "string") return;
    const mem = getUserMemory(uid);

    // 1. Learn Emojis
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojis = text.match(emojiRegex);
    if (emojis) {
        for (const em of emojis) {
            mem.favoriteEmojis[em] = (mem.favoriteEmojis[em] || 0) + 1;
        }
    }

    // 2. Learn User Slang & Recurring Words
    const words = text.toLowerCase().split(/\s+/);
    const ignoreList = ["the", "this", "that", "with", "from", "have", "what", "where", "when", "your", "baby", "bby"];
    for (const w of words) {
        const clean = w.replace(/[^a-zA-Z0-9]/g, "");
        if (clean.length >= 2 && !ignoreList.includes(clean)) {
            mem.favoriteWords[clean] = (mem.favoriteWords[clean] || 0) + 1;
        }
    }

    // 3. Record Recent Acts
    mem.acts.push(text);
    if (mem.acts.length > 15) mem.acts.shift();

    // 4. Record User Context
    mem.recentContext.push({ role: "user", text, time: Date.now() });
    if (mem.recentContext.length > 12) mem.recentContext.shift();

    mem.updatedAt = Date.now();
    saveMemory();
}

function applyToneParody(uid, rawReply) {
    if (!rawReply || typeof rawReply !== "string") return rawReply;
    const mem = getUserMemory(uid);
    if (!mem.parody) return rawReply;

    let reply = rawReply;

    // 1. Identify User's Favorite Emojis
    const topEmojis = Object.entries(mem.favoriteEmojis || {})
        .sort((a, b) => b[1] - a[1])
        .map(([em]) => em);

    // 2. Identify User's Favorite Words / Slang
    const topWords = Object.entries(mem.favoriteWords || {})
        .sort((a, b) => b[1] - a[1])
        .filter(([w, count]) => count >= 2 && ["bro", "bruh", "lol", "lmao", "fr", "tbh", "kire", "bhai", "vai", "omg", "haha", "xd", "yar"].includes(w))
        .map(([w]) => w);

    // 3. Mirror lowercase style if user writes mostly lowercase
    const recentActs = mem.acts || [];
    const isMostlyLower = recentActs.length > 0 && recentActs.slice(-3).every(a => a === a.toLowerCase());
    if (isMostlyLower && Math.random() < 0.5) {
        reply = reply.toLowerCase();
    }

    // 4. Mirror user's top slang (30% probability)
    if (topWords.length > 0 && Math.random() < 0.35) {
        const slang = topWords[0];
        if (!reply.toLowerCase().includes(slang)) {
            if (["bro", "bruh", "bhai", "vai", "kire"].includes(slang)) {
                reply = `${slang} ${reply}`;
            } else {
                reply = `${reply} ${slang}`;
            }
        }
    }

    // 5. Mirror user's favorite emoji (40% probability)
    if (topEmojis.length > 0 && Math.random() < 0.4) {
        const favEmoji = topEmojis[0];
        if (!reply.includes(favEmoji)) {
            reply = `${reply} ${favEmoji}`;
        }
    }

    // Record Bby context
    mem.recentContext.push({ role: "bby", text: reply, time: Date.now() });
    if (mem.recentContext.length > 12) mem.recentContext.shift();
    saveMemory();

    return reply;
}

module.exports.config = {
    name: "bby",
    aliases: ["baby", "bbe", "babe"],
    version: "7.0.0",
    author: "frnAlt",
    countDown: 0,
    role: 0,
    description: "Adaptive AI companion with user act memory and tone parodying",
    category: "chat",
    guide: {
        en: "{pn} [message] - Chat with adaptive AI\n"
            + "{pn} memory / profile - View memorized user acts and tone profile\n"
            + "{pn} parody [on | off] - Toggle tone parody mirroring\n"
            + "{pn} reset / clear - Wipe conversational memory\n"
            + "teach [msg] - [reply1], [reply2]... - Teach new responses\n"
            + "edit [msg] - [oldReply] - [newReply] - Edit learned response\n"
            + "remove [msg] - Delete learned responses\n"
            + "list / all - Show total taught responses"
    }
};

const nix = ["baby", "bby", "jan", "babu", "janu"];

async function sendAttachmentReply(api, event, attachments) {
    const attType = attachments[0]?.type;
    let endpoint = null;
    if (attType === "sticker") endpoint = "sticker";
    else if (attType === "photo" || attType === "animated_image") endpoint = "picture";
    if (!endpoint) return false;

    let a = "😊";
    try {
        const res = await client.get(`${baseApiUrl()}/baby/${endpoint}?senderID=${event.senderID}`);
        a = res.data?.reply || "😊";
    } catch (_) {}

    await api.sendMessage(a, event.threadID, (error, info) => {
        if (!info) return;
        global.GoatBot.onReply.set(info.messageID, {
            commandName: "bby",
            type: "reply",
            messageID: info.messageID,
            author: event.senderID
        });
    }, event.messageID);
    return true;
}

module.exports.onStart = async ({
    api,
    event,
    args,
    usersData
}) => {
    const link = `${baseApiUrl()}/baby`;
    const input = args.join(" ");
    const inputLower = input.toLowerCase();
    const uid = String(event.senderID);

    try {
        if (!args[0]) {
            if (event.attachments && event.attachments.length > 0) {
                const handled = await sendAttachmentReply(api, event, event.attachments);
                if (handled) return;
            }
            const ran = ["Hello! How can I help you? ✨", "Yes, I'm here! What's on your mind? 😊", "Hey there! Type !bby [message] to chat!", "I'm listening! ✨"];
            return api.sendMessage(ran[Math.floor(Math.random() * ran.length)], event.threadID, event.messageID);
        }

        // ── Subcommand: Memory / Profile ──
        if (args[0] === 'memory' || args[0] === 'profile') {
            const mem = getUserMemory(uid);
            const userName = await usersData.getName(uid).catch(() => "You");
            const topEmojis = Object.keys(mem.favoriteEmojis || {}).slice(0, 5).join(" ") || "None yet";
            const topWords = Object.entries(mem.favoriteWords || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([w]) => w)
                .join(", ") || "None yet";
            const actsCount = mem.acts?.length || 0;

            const profileMsg = `🧠 ═══ BBY USER MEMORY PROFILE ═══\n`
                + `👤 User: ${userName} (${uid})\n`
                + `🎭 Parody Mirroring: ${mem.parody ? "ON ✅" : "OFF ❌"}\n`
                + `✨ Favorite Emojis: ${topEmojis}\n`
                + `💬 Catchphrases / Slang: ${topWords}\n`
                + `📜 Memorized Acts: ${actsCount} interaction(s)\n`
                + `──────────────────────────\n`
                + `💡 Use "!bby parody on/off" to toggle tone mirroring or "!bby reset" to clear memory.`;
            return api.sendMessage(profileMsg, event.threadID, event.messageID);
        }

        // ── Subcommand: Parody Toggle ──
        if (args[0] === 'parody') {
            const mem = getUserMemory(uid);
            if (args[1] === 'off') {
                mem.parody = false;
                saveMemory();
                return api.sendMessage("❌ Tone parody mirroring is now turned OFF.", event.threadID, event.messageID);
            } else {
                mem.parody = true;
                saveMemory();
                return api.sendMessage("✅ Tone parody mirroring is now turned ON. Bby will match your tone and acts!", event.threadID, event.messageID);
            }
        }

        // ── Subcommand: Reset / Clear Memory ──
        if (args[0] === 'reset' || args[0] === 'clear') {
            delete bbyMemory[uid];
            saveMemory();
            return api.sendMessage("🧹 Successfully cleared your conversation acts and tone memory.", event.threadID, event.messageID);
        }

        // ── Subcommand: Teach / Edit / Remove / List endpoints ──
        if (args[0] === 'remove') {
            const fina = inputLower.replace("remove ", "");
            const dat = (await client.get(`${link}?remove=${encodeURIComponent(fina)}&senderID=${uid}`)).data.message;
            return api.sendMessage(dat, event.threadID, event.messageID);
        }

        if (args[0] === 'rm' && inputLower.includes('-')) {
            const [fi, f] = inputLower.replace("rm ", "").split(/\s*-\s*/);
            const da = (await client.get(`${link}?remove=${encodeURIComponent(fi)}&index=${encodeURIComponent(f)}`)).data.message;
            return api.sendMessage(da, event.threadID, event.messageID);
        }

        if (args[0] === 'list') {
            if (args[1] === 'all') {
                const data = (await client.get(`${link}?list=all`)).data;
                const limit = parseInt(args[2]) || 100;
                const limited = data?.teacher?.teacherList?.slice(0, limit) || [];
                const teachers = await Promise.all(limited.map(async (item) => {
                    const number = Object.keys(item)[0];
                    const value = item[number];
                    const name = await usersData.getName(number).catch(() => number) || "Not found";
                    return { name, value };
                }));
                teachers.sort((a, b) => b.value - a.value);
                const output = teachers.map((t, i) => `${i + 1}/ ${t.name}: ${t.value}`).join('\n');
                return api.sendMessage(`Total Teach = ${data.length}\n👑 | List of Teachers of baby\n${output}`, event.threadID, event.messageID);
            } else {
                const d = (await client.get(`${link}?list=all`)).data;
                return api.sendMessage(`❇️ | Total Teach = ${d.length || "api off"}\n♻️ | Total Response = ${d.responseLength || "api off"}`, event.threadID, event.messageID);
            }
        }

        if (args[0] === 'msg') {
            const fuk = inputLower.replace("msg ", "");
            const d = (await client.get(`${link}?list=${encodeURIComponent(fuk)}`)).data.data;
            return api.sendMessage(`Message ${fuk} = ${d}`, event.threadID, event.messageID);
        }

        if (args[0] === 'edit') {
            const parts = inputLower.replace("edit ", "").split(/\s*-\s*/);
            const editKey = parts[0]?.trim();
            const oldReply = parts[1]?.trim();
            const newReply = parts[2]?.trim();
            if (!editKey || !oldReply || !newReply) {
                return api.sendMessage('❌ | Invalid format! Use: edit [YourMessage] - [OldReply] - [NewReply]', event.threadID, event.messageID);
            }
            const dA = (await client.get(`${link}?edit=${encodeURIComponent(editKey)}&oldReply=${encodeURIComponent(oldReply)}&replace=${encodeURIComponent(newReply)}&senderID=${uid}`)).data.message;
            return api.sendMessage(`${dA}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'sticker') {
            const cmd = inputLower.replace("teach sticker ", "").replace(/^-\s*/, "").trim();
            if (!cmd || cmd.length < 1) return api.sendMessage('❌ | Invalid format! Use: teach sticker - [Reply1], [Reply2]...', event.threadID, event.messageID);
            const tex = (await client.get(`${baseApiUrl()}/baby/sticker?teach=1&reply=${encodeURIComponent(cmd)}&senderID=${uid}`)).data.message;
            return api.sendMessage(`✅ ${tex}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'picture') {
            const cmd = inputLower.replace("teach picture ", "").replace(/^-\s*/, "").trim();
            if (!cmd || cmd.length < 1) return api.sendMessage('❌ | Invalid format! Use: teach picture - [Reply1], [Reply2]...', event.threadID, event.messageID);
            const tex = (await client.get(`${baseApiUrl()}/baby/picture?teach=1&reply=${encodeURIComponent(cmd)}&senderID=${uid}`)).data.message;
            return api.sendMessage(`✅ ${tex}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && !['amar', 'react', 'sticker', 'picture'].includes(args[1])) {
            const [comd, cmd] = inputLower.split(/\s*-\s*/);
            const finalTeach = comd?.replace("teach ", "")?.trim();
            if (!cmd || cmd.length < 2) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            const re = await client.get(`${link}?teach=${encodeURIComponent(finalTeach)}&reply=${encodeURIComponent(cmd)}&senderID=${uid}&threadID=${event.threadID}`);
            const tex = re.data.message;
            let teacherName = await usersData.getName(uid).catch(() => "Unknown");
            return api.sendMessage(`✅ Replies added ${tex}\nTeacher: ${teacherName}\nTeachs: ${re.data.teachs}`, event.threadID, event.messageID);
        }

        // ── Normal Conversation with Memory & Tone Mirroring ──
        recordUserAct(uid, input);

        let rawResponse = null;
        try {
            const res = await client.get(`${link}?text=${encodeURIComponent(inputLower)}&senderID=${uid}&threadID=${event.threadID}&font=1`);
            rawResponse = res.data?.reply;
        } catch (_) {
            const fallbacks = [
                "I'm here! Tell me more about that 😊",
                "Haha really? That's interesting! ✨",
                "Hmm, what do you think? 😉"
            ];
            rawResponse = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        if (!rawResponse) rawResponse = "😊";
        const finalReply = applyToneParody(uid, rawResponse);

        api.sendMessage(finalReply, event.threadID, (error, info) => {
            if (!info) return;
            global.GoatBot.onReply.set(info.messageID, {
                commandName: module.exports.config.name,
                type: "reply",
                messageID: info.messageID,
                author: event.senderID
            });
        }, event.messageID);

    } catch (e) {
        console.error("[BBY ERROR]:", e);
        api.sendMessage("❌ Error while processing message.", event.threadID, (err, info) => {
            if (!err && info?.messageID) setTimeout(() => api.unsendMessage(info.messageID).catch(() => {}), 8000);
        }, event.messageID);
    }
};

module.exports.onReply = async ({
    api,
    event,
    Reply
}) => {
    if ([api.getCurrentUserID()].includes(event.senderID)) return;
    if (Reply.author && String(event.senderID) !== String(Reply.author)) return;

    try {
        const body = event.body ? event.body.trim() : "";
        if (!body || /^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(body)) return;

        if (typeof Reply.delete === "function") Reply.delete();

        if (event.type === "message_reply") {
            const uid = String(event.senderID);
            if (event.attachments && event.attachments.length > 0) {
                const handled = await sendAttachmentReply(api, event, event.attachments);
                if (handled) return;
            }

            recordUserAct(uid, body);

            let rawReply = null;
            try {
                const res = await client.get(`${baseApiUrl()}/baby?text=${encodeURIComponent(body.toLowerCase())}&senderID=${event.senderID}&threadID=${event.threadID}&font=1`);
                rawReply = res.data?.reply;
            } catch (_) {
                const fallbacks = ["I'm listening! Tell me more 😊", "Haha really? 😉", "What do you think we should do next?"];
                rawReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            }
            if (!rawReply) rawReply = "😊";

            const finalReply = applyToneParody(uid, rawReply);
            await api.sendMessage(finalReply, event.threadID, null, event.messageID);
        }
    } catch (err) {
        return api.sendMessage(`❌ Error: ${err.message}`, event.threadID, (e, info) => {
            if (!e && info?.messageID) setTimeout(() => api.unsendMessage(info.messageID).catch(() => {}), 8000);
        }, event.messageID);
    }
};

module.exports.onChat = async ({
    api,
    event,
    message
}) => {
    try {
        const body = event.body ? event.body.trim() : "";
        if (!body || /^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(body)) return;

        const bodyLower = body.toLowerCase();
        const hasTrigger = nix.some(t => bodyLower === t || bodyLower.startsWith(t + " ") || bodyLower.startsWith(t + ","));

        if (!hasTrigger) return;
        const uid = String(event.senderID);

        if (event.attachments && event.attachments.length > 0) {
            const handled = await sendAttachmentReply(api, event, event.attachments);
            if (handled) return;
        }

        const cleanText = body.replace(/^\S+\s*/, "").trim();
        if (!cleanText) {
            const randomReplies = ["Hello!", "Yes, I'm here! ✨", "What's up? 😊", "How can I help you?"];
            return await api.sendMessage(randomReplies[Math.floor(Math.random() * randomReplies.length)], event.threadID, null, event.messageID);
        }

        recordUserAct(uid, cleanText);

        let rawReply = null;
        try {
            const res = await client.get(`${baseApiUrl()}/baby?text=${encodeURIComponent(cleanText.toLowerCase())}&senderID=${event.senderID}&threadID=${event.threadID}&font=1`);
            rawReply = res.data?.reply;
        } catch (_) {
            const quickReplies = ["Yes? I'm here! 😊", "Hey there! How's everything going? ✨", "Tell me more!", "Aww, yes? 🥰"];
            rawReply = quickReplies[Math.floor(Math.random() * quickReplies.length)];
        }
        if (!rawReply) rawReply = "Hello! 😊";

        const finalReply = applyToneParody(uid, rawReply);
        return await api.sendMessage(finalReply, event.threadID, null, event.messageID);

    } catch (err) {
        return api.sendMessage(`❌ Error: ${err.message}`, event.threadID, (e, info) => {
            if (!e && info?.messageID) setTimeout(() => api.unsendMessage(info.messageID).catch(() => {}), 8000);
        }, event.messageID);
    }
};
