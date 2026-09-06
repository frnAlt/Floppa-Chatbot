function parseGender(gender) {
  if (gender === 2 || gender === "MALE" || gender === "male") return "Male";
  if (gender === 1 || gender === "FEMALE" || gender === "female") return "Female";
  return "Not Specified";
}

module.exports = {
  config: {
    name: "spy",
    aliases: ["userinfo", "whois", "lookup", "spyuser"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Detailed profile and user intelligence"
    },
    longDescription: {
      en: "Inspect deep profile details, Facebook metadata, group statistics, and bot economy balance of any user."
    },
    category: "info",
    guide: {
      en: "{pn} [@mention | reply | <uid>]"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, threadsData }) {
    try {
      let uid;

      if (event.type === "message_reply" && event.messageReply?.senderID) {
        uid = String(event.messageReply.senderID);
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        uid = String(Object.keys(event.mentions)[0]);
      } else if (args[0] && /^\d+$/.test(args[0])) {
        uid = String(args[0]);
      } else if (args[0]) {
        const cleanArg = args[0].replace(/^@/, "").trim();
        try {
          if (typeof api.getUserID === "function") {
            const matches = await api.getUserID(cleanArg);
            if (Array.isArray(matches) && matches.length > 0) {
              uid = String(matches[0].userID);
            }
          }
        } catch (_) {}
        if (!uid) {
          uid = String(args[0]);
        }
      } else {
        uid = String(event.senderID);
      }

      const [userData, fbData] = await Promise.all([
        usersData.get(uid).catch(() => null),
        (typeof api.getUserInfo === "function" ? api.getUserInfo(uid).catch(() => null) : null)
      ]);

      const fb = fbData?.[uid] || {};

      if (!userData && !fb.name) {
        return message.reply("Could not retrieve profile data for the requested user.");
      }

      const name = userData?.name || fb.name || "Unknown User";
      const vanity = fb.vanity || userData?.vanity || null;
      const username = vanity ? `@${vanity}` : "None";
      const gender = parseGender(userData?.gender ?? fb.gender);
      const profileUrl = `https://facebook.com/${vanity || uid}`;
      const isBotFriend = typeof fb.isFriend === "boolean"
        ? (fb.isFriend ? "Yes" : "No")
        : (userData?.isBotFriend ? "Yes" : "No");

      // Bot Standing & Economy
      const config = global.GoatBot?.config || {};
      const adminBot = Array.isArray(config.adminBot) ? config.adminBot.map(String) : [];
      const devUsers = Array.isArray(config.devUsers) ? config.devUsers.map(String) : [];
      const premiumUsers = Array.isArray(config.premiumUsers) ? config.premiumUsers.map(String) : [];

      let userRole = "Regular Member";
      if (devUsers.includes(uid)) userRole = "Developer";
      else if (adminBot.includes(uid)) userRole = "Bot Administrator";
      else if (premiumUsers.includes(uid)) userRole = "Premium Member";

      const balance = Number(userData?.money || 0).toLocaleString();
      const exp = Number(userData?.exp || 0).toLocaleString();
      const level = Math.floor(Math.sqrt((userData?.exp || 0) / 100)) + 1;

      // Group context
      let inCurrentGroup = "No";
      let groupAdmin = "No";
      let groupNickname = "None";
      let groupMsgCount = 0;

      if (event.isGroup && event.threadID) {
        const thread = await threadsData.get(event.threadID).catch(() => null);
        if (thread) {
          const member = thread.members?.find(m => String(m.userID) === uid);
          if (member) {
            inCurrentGroup = "Yes";
            groupNickname = member.nickname || "None";
            groupMsgCount = Number(member.count || 0).toLocaleString();
          }

          const isAdmin = Array.isArray(thread.adminIDs) && thread.adminIDs.some(a => {
            const adminId = typeof a === "object" ? String(a.id || a.userID) : String(a);
            return adminId === uid;
          });
          if (isAdmin) groupAdmin = "Yes";
        }
      }

      // Profile avatar stream
      let avatarStream = null;
      const avatarUrl = (await usersData.getAvatarUrl(uid).catch(() => null)) ||
        fb.profilePicUrl ||
        `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const getStreamFromURL = global.utils?.getStreamFromURL;
      if (avatarUrl && typeof getStreamFromURL === "function") {
        try {
          avatarStream = await getStreamFromURL(avatarUrl);
        } catch (_) {}
      }

      let infoText =
`USER INTELLIGENCE REPORT

Profile Information
• Name: ${name}
• UID: ${uid}
• Username: ${username}
• Gender: ${gender}
• Profile Link: ${profileUrl}
• Bot Friend: ${isBotFriend}

Bot Standing
• Role: ${userRole}
• Balance: $${balance}
• Level: ${level} (${exp} EXP)`;

      if (event.isGroup) {
        infoText += `\n\nGroup Statistics\n• In This Group: ${inCurrentGroup}\n• Group Admin: ${groupAdmin}\n• Group Nickname: ${groupNickname}\n• Total Messages: ${groupMsgCount}`;
      }

      return message.reply({
        body: infoText,
        attachment: avatarStream || undefined
      });
    } catch (err) {
      console.error("[SPY] Error inspecting user:", err);
      return message.reply("An error occurred while inspecting user data.");
    }
  }
};
