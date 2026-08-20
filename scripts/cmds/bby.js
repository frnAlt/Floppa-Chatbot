const axios = require('axios');

const BASE_API_URL = "https://baby-apisx.vercel.app";
const TRIGGER_WORDS = ["baby", "bby", "bot", "jan", "babu", "janu"];

async function sendAttachmentReply(api, event, attachments) {
  try {
    const attType = attachments[0]?.type;
    let endpoint = null;
    if (attType === "sticker") endpoint = "sticker";
    else if (attType === "photo" || attType === "animated_image") endpoint = "picture";
    if (!endpoint) return false;

    const res = await axios.get(`${BASE_API_URL}/baby/${endpoint}?senderID=${event.senderID}`);
    const replyText = res.data?.reply;
    if (!replyText) return false;

    await api.sendMessage(replyText, event.threadID, (error, info) => {
      if (info?.messageID) {
        global.GoatBot?.onReply?.set(info.messageID, {
          commandName: "bby",
          type: "reply",
          messageID: info.messageID,
          author: event.senderID
        });
      }
    }, event.messageID);
    return true;
  } catch (err) {
    console.error("[BBY] Error handling attachment reply:", err.message);
    return false;
  }
}

module.exports = {
  config: {
    name: "bby",
    aliases: ["baby", "bbe", "babe"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 0,
    role: 0,
    description: {
      vi: "Trò chuyện với Baby AI SimSimi (học tập & phản hồi thông minh)",
      en: "Chat with Baby AI (SimSimi chatbot with learning & media support)"
    },
    category: "chat",
    guide: {
      en: "{pn} <message> - Chat with Baby\n" +
          "{pn} teach <message> - <reply1>, <reply2>... - Teach new replies\n" +
          "{pn} teach sticker - <reply1>, <reply2>... - Teach replies for stickers\n" +
          "{pn} teach picture - <reply1>, <reply2>... - Teach replies for photos\n" +
          "{pn} teach react <message> - <react1>, <react2>... - Teach reaction replies\n" +
          "{pn} teach amar <message> - <introReply> - Teach intro replies\n" +
          "{pn} edit <message> - <oldReply> - <newReply> - Edit an existing reply\n" +
          "{pn} remove <message> - Delete all replies for a message\n" +
          "{pn} rm <message> - <index> - Delete a specific reply index\n" +
          "{pn} msg <message> - View replies for a message\n" +
          "{pn} list - View teach statistics\n" +
          "{pn} list all [limit] - View top teachers leaderboard"
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const input = args.join(" ").trim();
    const lowerInput = input.toLowerCase();
    const uid = event.senderID;
    const threadID = event.threadID;

    try {
      if (!args[0]) {
        if (event.attachments && event.attachments.length > 0) {
          const handled = await sendAttachmentReply(api, event, event.attachments);
          if (handled) return;
        }
        const greetings = [
          "Hello! How can I help you today?",
          "Hey! I'm here. What's up?",
          "Hi! Ask me anything or chat with me.",
          "Hello! Type anything to start chatting."
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        return message.reply(randomGreeting);
      }

      if (args[0].toLowerCase() === 'list') {
        if (args[1]?.toLowerCase() === 'all') {
          const res = await axios.get(`${BASE_API_URL}/baby?list=all`);
          const data = res.data;
          const limit = parseInt(args[2], 10) || 100;
          const teacherList = data?.teacher?.teacherList || [];
          const limited = teacherList.slice(0, limit);

          const teachers = await Promise.all(
            limited.map(async (item) => {
              const userID = Object.keys(item)[0];
              const teachCount = item[userID];
              let name = "Not found";
              try {
                name = (await usersData.getName(userID)) || (await usersData.get(userID))?.name || userID;
              } catch {
                name = userID;
              }
              return { name, teachCount };
            })
          );

          teachers.sort((a, b) => b.teachCount - a.teachCount);
          const output = teachers.map((t, i) => `${i + 1}. ${t.name}: ${t.teachCount}`).join('\n');
          return message.reply(`👑 | Baby AI Top Teachers Leaderboard\nTotal Taught: ${data.length || 0}\n\n${output || "No teachers found."}`);
        } else {
          const res = await axios.get(`${BASE_API_URL}/baby?list=all`);
          const data = res.data;
          return message.reply(`📊 Baby AI Statistics:\n• Total Taught: ${data.length || 0}\n• Total Responses: ${data.responseLength || 0}\n• Total Teachers: ${data.totalTeachers || data.teacher?.teacherList?.length || 0}`);
        }
      }

      if (args[0].toLowerCase() === 'remove') {
        const query = input.replace(/^remove\s+/i, "").trim();
        if (!query) return message.reply("❌ | Please specify the message you want to remove.");
        const res = await axios.get(`${BASE_API_URL}/baby?remove=${encodeURIComponent(query)}&senderID=${uid}`);
        return message.reply(res.data?.message || "Removed successfully.");
      }

      if (args[0].toLowerCase() === 'rm') {
        const remaining = input.replace(/^rm\s+/i, "").trim();
        if (!remaining) return message.reply("❌ | Invalid format! Use: {pn} rm [YourMessage] - [indexNumber]");
        if (remaining.includes('-')) {
          const [query, idx] = remaining.split(/\s*-\s*/);
          const res = await axios.get(`${BASE_API_URL}/baby?remove=${encodeURIComponent(query.trim())}&index=${encodeURIComponent(idx.trim())}`);
          return message.reply(res.data?.message || "Removed successfully.");
        } else {
          const res = await axios.get(`${BASE_API_URL}/baby?remove=${encodeURIComponent(remaining)}&senderID=${uid}`);
          return message.reply(res.data?.message || "Removed successfully.");
        }
      }

      if (args[0].toLowerCase() === 'msg') {
        const targetWord = input.replace(/^msg\s+/i, "").trim();
        if (!targetWord) return message.reply("❌ | Please specify a message to inspect.");
        const res = await axios.get(`${BASE_API_URL}/baby?list=${encodeURIComponent(targetWord)}`);
        const count = res.data?.data || res.data?.replies?.length || 0;
        const replies = res.data?.replies;
        let responseMsg = `💬 Message: "${targetWord}"\nTotal Replies: ${count}`;
        if (Array.isArray(replies) && replies.length > 0) {
          responseMsg += `\n\nSample Replies:\n${replies.slice(0, 10).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
        }
        return message.reply(responseMsg);
      }

      if (args[0].toLowerCase() === 'edit') {
        const parts = input.replace(/^edit\s+/i, "").split(/\s*-\s*/);
        const editKey = parts[0]?.trim();
        const oldReply = parts[1]?.trim();
        const newReply = parts[2]?.trim();
        if (!editKey || !oldReply || !newReply) {
          return message.reply("❌ | Invalid format! Use: edit [YourMessage] - [OldReply] - [NewReply]");
        }
        const res = await axios.get(`${BASE_API_URL}/baby?edit=${encodeURIComponent(editKey)}&oldReply=${encodeURIComponent(oldReply)}&replace=${encodeURIComponent(newReply)}&senderID=${uid}`);
        return message.reply(res.data?.message || "Reply updated successfully.");
      }

      if (args[0].toLowerCase() === 'teach') {
        const sub = args[1]?.toLowerCase();
        if (sub === 'sticker') {
          const command = input.replace(/^teach\s+sticker\s*/i, "").replace(/^-\s*/, "").trim();
          if (!command) return message.reply("❌ | Invalid format! Use: teach sticker - [Reply1], [Reply2]...");
          const res = await axios.get(`${BASE_API_URL}/baby/sticker?teach=1&reply=${encodeURIComponent(command)}&senderID=${uid}`);
          return message.reply(`✅ ${res.data?.message || "Sticker reply added successfully!"}`);
        }

        if (sub === 'picture') {
          const command = input.replace(/^teach\s+picture\s*/i, "").replace(/^-\s*/, "").trim();
          if (!command) return message.reply("❌ | Invalid format! Use: teach picture - [Reply1], [Reply2]...");
          const res = await axios.get(`${BASE_API_URL}/baby/picture?teach=1&reply=${encodeURIComponent(command)}&senderID=${uid}`);
          return message.reply(`✅ ${res.data?.message || "Picture reply added successfully!"}`);
        }

        if (sub === 'amar') {
          const remaining = input.replace(/^teach\s+amar\s+/i, "").trim();
          const [key, reply] = remaining.split(/\s*-\s*/);
          if (!key || !reply || reply.length < 1) return message.reply("❌ | Invalid format! Use: teach amar [YourMessage] - [Reply]");
          const res = await axios.get(`${BASE_API_URL}/baby?teach=${encodeURIComponent(key.trim())}&senderID=${uid}&reply=${encodeURIComponent(reply.trim())}&key=intro`);
          return message.reply(`✅ ${res.data?.message || "Intro reply added successfully!"}`);
        }

        if (sub === 'react') {
          const remaining = input.replace(/^teach\s+react\s+/i, "").trim();
          const [key, reacts] = remaining.split(/\s*-\s*/);
          if (!key || !reacts || reacts.length < 1) return message.reply("❌ | Invalid format! Use: teach react [YourMessage] - [react1], [react2]...");
          const res = await axios.get(`${BASE_API_URL}/baby?teach=${encodeURIComponent(key.trim())}&react=${encodeURIComponent(reacts.trim())}`);
          return message.reply(`✅ ${res.data?.message || "Reaction replies added successfully!"}`);
        }

        // Standard teach
        const remaining = input.replace(/^teach\s+/i, "").trim();
        const [key, reply] = remaining.split(/\s*-\s*/);
        if (!key || !reply || reply.trim().length < 1) {
          return message.reply("❌ | Invalid format! Use: teach [YourMessage] - [Reply1], [Reply2]...");
        }

        const res = await axios.get(`${BASE_API_URL}/baby?teach=${encodeURIComponent(key.trim())}&reply=${encodeURIComponent(reply.trim())}&senderID=${uid}&threadID=${threadID}`);
        let teacherName = "Unknown";
        try {
          teacherName = (await usersData.get(uid))?.name || (await usersData.getName(uid)) || "Unknown";
        } catch {
          teacherName = "Unknown";
        }

        return message.reply(`✅ Replies added: ${res.data?.message || "Success"}\nTeacher: ${teacherName}\nTeachs: ${res.data?.teachs || 1}`);
      }

      const introQueries = ["amar name ki", "amr nam ki", "amar nam ki", "amr name ki", "whats my name", "what's my name"];
      if (introQueries.some(q => lowerInput.includes(q))) {
        const res = await axios.get(`${BASE_API_URL}/baby?text=amar name ki&senderID=${uid}&key=intro`);
        return message.reply(res.data?.reply || "I don't know your name yet!");
      }

      const res = await axios.get(`${BASE_API_URL}/baby?text=${encodeURIComponent(input)}&senderID=${uid}&threadID=${threadID}&font=1`);
      const replyText = res.data?.reply || "I didn't understand that.";

      return message.reply(replyText, (error, info) => {
        if (info?.messageID) {
          global.GoatBot?.onReply?.set(info.messageID, {
            commandName: module.exports.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID
          });
        }
      });
    } catch (err) {
      console.error("[BBY Error]:", err);
      return message.reply(`❌ An error occurred: ${err.message}`);
    }
  },

  onReply: async function ({ api, event, message }) {
    if (event.senderID === api.getCurrentUserID()) return;

    try {
      if (event.attachments && event.attachments.length > 0) {
        const handled = await sendAttachmentReply(api, event, event.attachments);
        if (handled) return;
      }

      const bodyText = event.body?.trim();
      if (!bodyText) return;

      const res = await axios.get(`${BASE_API_URL}/baby?text=${encodeURIComponent(bodyText)}&senderID=${event.senderID}&threadID=${event.threadID}&font=1`);
      const replyText = res.data?.reply;
      if (!replyText) return;

      return message.reply(replyText, (error, info) => {
        if (info?.messageID) {
          global.GoatBot?.onReply?.set(info.messageID, {
            commandName: module.exports.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID
          });
        }
      });
    } catch (err) {
      console.error("[BBY onReply Error]:", err);
      return message.reply(`❌ Error: ${err.message}`);
    }
  },

  onChat: async function ({ api, event, message }) {
    if (event.senderID === api.getCurrentUserID()) return;

    try {
      const body = (event.body || "").trim();
      if (!body) return;

      const match = body.match(new RegExp(`^(${TRIGGER_WORDS.join("|")})(?:\\s+(.*)|$)`, "i"));
      if (!match) return;

      const query = match[2]?.trim();

      if (event.attachments && event.attachments.length > 0 && !query) {
        const handled = await sendAttachmentReply(api, event, event.attachments);
        if (handled) return;
      }

      if (!query) {
        const randomReplies = [
          "Hello! How can I help you?",
          "Yes, I'm here! What's on your mind?",
          "Hi there! Ask me anything or chat with me.",
          "What's up? Ready to chat!",
          "Hello! How are you doing today?"
        ];
        const chosen = randomReplies[Math.floor(Math.random() * randomReplies.length)];
        return message.reply(chosen, (error, info) => {
          if (info?.messageID) {
            global.GoatBot?.onReply?.set(info.messageID, {
              commandName: module.exports.config.name,
              type: "reply",
              messageID: info.messageID,
              author: event.senderID
            });
          }
        });
      }

      const res = await axios.get(`${BASE_API_URL}/baby?text=${encodeURIComponent(query)}&senderID=${event.senderID}&threadID=${event.threadID}&font=1`);
      const replyText = res.data?.reply;
      if (!replyText) return;

      return message.reply(replyText, (error, info) => {
        if (info?.messageID) {
          global.GoatBot?.onReply?.set(info.messageID, {
            commandName: module.exports.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID
          });
        }
      });
    } catch (err) {
      console.error("[BBY onChat Error]:", err);
      return message.reply(`❌ Error: ${err.message}`);
    }
  }
};
