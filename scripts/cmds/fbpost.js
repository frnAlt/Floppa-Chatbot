const axios = require("axios");

module.exports = {
  config: {
    name: "fbpost",
    aliases: ["fbprank", "fakepost", "fakefb", "fbstatus", "fakechatfb", "fblog"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Create realistic Facebook fake post / prank canvas",
      vi: "Tạo ảnh bài đăng Facebook giả lập / prank canvas siêu thực"
    },
    longDescription: {
      en: "Generate 100% accurate Facebook canvas post with custom author, verified badge, likes, comments, shares, commenter details, and dark/light mode. Includes built-in prank presets (hack, login, selling, etc.).",
      vi: "Tạo bài viết Facebook giả lập cực chuẩn với người đăng, tích xanh, lượt like, bình luận, chia sẻ và các mẫu prank (hack tài khoản, login lạ, rao bán nick)."
    },
    category: "canvas",
    guide: {
      en: "   {pn} <content>: Create post with your name and avatar"
        + "\n   {pn} @mention <content>: Create post as mentioned user"
        + "\n   {pn} <content> | <comment> | <commenter name>: Custom post with comment"
        + "\n   {pn} hack @mention: Prank account compromised alert"
        + "\n   {pn} login @mention: Prank unauthorized foreign login alert"
        + "\n   {pn} selling @mention: Prank selling account"
        + "\n   (Flags: --theme dark/light, --verified, --likes 10K, --comments 500, --shares 120, --image <url>)",
      vi: "   {pn} <nội dung>: Tạo bài đăng với tên và avatar của bạn"
        + "\n   {pn} @tag <nội dung>: Tạo bài đăng của người được tag"
        + "\n   {pn} <nội dung> | <bình luận> | <tên người cmt>: Tuỳ biến bài đăng kèm bình luận"
        + "\n   {pn} hack @tag: Prank cảnh báo nick bị hack"
        + "\n   {pn} login @tag: Prank cảnh báo đăng nhập lạ"
        + "\n   (Các cờ: --theme dark/light, --verified, --likes 10K, --comments 500, --shares 120, --image <link>)"
    }
  },

  onStart: async function ({ api, event, message, args, usersData }) {
    try {
      if (api?.setMessageReaction) {
        api.setMessageReaction("⏳", event.messageID, () => {}, true);
      }

      let rawText = args.join(" ").trim();
      const mentions = event.mentions || {};
      const mentionUids = Object.keys(mentions);

      let authorUid = null;
      let authorName = null;
      let commenterUid = null;
      let commenterName = null;
      let postImage = null;

      // 1. Resolve attachments from reply or current message
      if (event.messageReply?.attachments?.length > 0) {
        const att = event.messageReply.attachments[0];
        let u = att.url || att.previewUrl || att.largePreviewUrl;
        if (!u && att.ID && api?.resolvePhotoUrl) {
          try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
        }
        if (u) postImage = u;
      }
      if (!postImage && event.attachments?.length > 0) {
        const att = event.attachments[0];
        let u = att.url || att.previewUrl || att.largePreviewUrl;
        if (!u && att.ID && api?.resolvePhotoUrl) {
          try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
        }
        if (u) postImage = u;
      }

      // 2. Identify author and commenter based on mentions or reply
      if (mentionUids.length >= 2) {
        authorUid = mentionUids[0];
        authorName = mentions[authorUid]?.replace(/^@/, "").trim();
        commenterUid = mentionUids[1];
        commenterName = mentions[commenterUid]?.replace(/^@/, "").trim();
      } else if (mentionUids.length === 1) {
        authorUid = mentionUids[0];
        authorName = mentions[authorUid]?.replace(/^@/, "").trim();
        if (event.messageReply) {
          const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
          if (rUid && rUid !== authorUid) {
            commenterUid = String(rUid);
          }
        }
      } else if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
        if (rUid) {
          authorUid = String(rUid);
        }
      }

      if (!authorUid) {
        authorUid = String(event.senderID);
      }

      // If user replied to a message and provided no arguments, use the replied text
      if (!rawText && event.messageReply?.body) {
        rawText = event.messageReply.body.trim();
      }

      // Strip mention tags from raw text
      if (mentionUids.length > 0) {
        for (const mId of mentionUids) {
          const mName = mentions[mId];
          if (mName) {
            const esc = mName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            rawText = rawText.replace(new RegExp(`@?${esc}`, "gi"), " ").trim();
          }
        }
      }

      // 3. Flags parsing (--theme, --verified, --likes, --comments, --shares, --image, --time, etc.)
      let theme = "dark";
      let isVerified = "false";
      let customLikes = null;
      let customComments = null;
      let customShares = null;
      let customTime = null;
      let cVerified = "false";
      let cTime = "15m";
      let cText = null;

      if (/\b--(dark|light)\b/i.test(rawText)) {
        const m = rawText.match(/\b--(dark|light)\b/i);
        theme = m[1].toLowerCase();
        rawText = rawText.replace(m[0], " ").trim();
      } else if (/--theme\s+(dark|light)/i.test(rawText)) {
        const m = rawText.match(/--theme\s+(dark|light)/i);
        theme = m[1].toLowerCase();
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/\b--(verified|badge|-v)\b/i.test(rawText)) {
        isVerified = "true";
        rawText = rawText.replace(/\b--(verified|badge|-v)\b/gi, " ").trim();
      }

      if (/--likes?\s+([^\s]+)/i.test(rawText)) {
        const m = rawText.match(/--likes?\s+([^\s]+)/i);
        customLikes = m[1];
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--comments?\s+([^\s]+)/i.test(rawText)) {
        const m = rawText.match(/--comments?\s+([^\s]+)/i);
        customComments = m[1];
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--shares?\s+([^\s]+)/i.test(rawText)) {
        const m = rawText.match(/--shares?\s+([^\s]+)/i);
        customShares = m[1];
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--time\s+([^\s]+)/i.test(rawText)) {
        const m = rawText.match(/--time\s+([^\s]+)/i);
        customTime = m[1];
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--image\s+(https?:\/\/[^\s]+)/i.test(rawText)) {
        const m = rawText.match(/--image\s+(https?:\/\/[^\s]+)/i);
        postImage = m[1];
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--cverified\b/i.test(rawText)) {
        cVerified = "true";
        rawText = rawText.replace(/--cverified\b/gi, " ").trim();
      }

      if (/--cname\s+([^|\-]+)/i.test(rawText)) {
        const m = rawText.match(/--cname\s+([^|\-]+)/i);
        commenterName = m[1].trim();
        rawText = rawText.replace(m[0], " ").trim();
      }

      if (/--ctext\s+([^|\-]+)/i.test(rawText)) {
        const m = rawText.match(/--ctext\s+([^|\-]+)/i);
        cText = m[1].trim();
        rawText = rawText.replace(m[0], " ").trim();
      }

      // 4. Check for Prank Presets
      let mainText = rawText;
      const lower = rawText.toLowerCase().trim();

      if (lower.startsWith("hack") || lower === "hacked") {
        mainText = "🚨 CRITICAL SECURITY ALERT: My Facebook account has just been compromised! Unauthorized token dump and IP takeover detected from Russian Federation. Do NOT send money or open any suspicious links from this account! 💀🔓💻";
        isVerified = "false";
        cText = "Meta Security Division: Suspicious unauthorized login blocked. We have locked this session for your protection.";
        commenterName = "Meta Security Operations";
        cVerified = "true";
        customLikes = customLikes || "5.9K";
        customComments = customComments || "1.4K";
        customShares = customShares || "832";
        customTime = customTime || "12m";
      } else if (lower.startsWith("login")) {
        mainText = "🔐 Security Warning: A new device just logged into your Facebook account from Pyongyang, North Korea (Device: Windows XP 64-bit, Chrome 49.0). If you did not perform this login, review your security settings immediately. 🛰️⚠️";
        cText = "Facebook Security: Unauthorized remote shell terminated. Please confirm identity.";
        commenterName = "Facebook Protect";
        cVerified = "true";
        customLikes = customLikes || "3.2K";
        customComments = customComments || "491";
        customShares = customShares || "204";
        customTime = customTime || "28m";
      } else if (lower.startsWith("selling") || lower.startsWith("sell")) {
        mainText = "Due to urgent financial needs, I am putting this Facebook account up for sale! Active 2018 account with 5,000 friends. Highest bidder takes it! First come, first served. Serious buyers DM only! 💸💰🛒";
        cText = "Bro are you serious right now?? Check your WhatsApp! 😂💀";
        commenterName = commenterName || "Mark Zuckerberg";
        customLikes = customLikes || "420";
        customComments = customComments || "88";
        customShares = customShares || "19";
        customTime = customTime || "45m";
      } else if (lower.startsWith("love") || lower.startsWith("marry")) {
        mainText = "I never thought I would find someone so special in this lifetime. Officially off the market and happiest person alive! ❤️💍✨";
        cText = "Congratulations! Wishing both of you a wonderful future together! 💕🥰";
        commenterName = commenterName || "Cupid Official";
        customLikes = customLikes || "2.1K";
        customComments = customComments || "310";
        customShares = customShares || "42";
        customTime = customTime || "1h";
      }

      // 5. Pipe delimiter syntax support: <post text> | <comment text> | <commenter name>
      if (mainText.includes("|")) {
        const parts = mainText.split("|").map(s => s.trim());
        if (parts[0]) mainText = parts[0];
        if (parts[1] && !cText) cText = parts[1];
        if (parts[2] && !commenterName) commenterName = parts[2];
      }

      if (!mainText) {
        mainText = "Testing 100% accurate Facebook canvas prank post! Everything works flawlessly! 🚀🔥✨";
      }

      // 6. Resolve Names & Avatars
      if (!authorName) {
        authorName = (await usersData.getName(authorUid).catch(() => null)) || `User ${authorUid}`;
      }

      const authorAvatar = global.utils?.getAvatarUrl
        ? global.utils.getAvatarUrl(authorUid)
        : (await usersData.getAvatarUrl(authorUid).catch(() => null)) || `https://graph.facebook.com/${authorUid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      let commenterAvatar = null;
      if (commenterUid) {
        if (!commenterName) {
          commenterName = (await usersData.getName(commenterUid).catch(() => null)) || `User ${commenterUid}`;
        }
        commenterAvatar = global.utils?.getAvatarUrl
          ? global.utils.getAvatarUrl(commenterUid)
          : (await usersData.getAvatarUrl(commenterUid).catch(() => null)) || `https://graph.facebook.com/${commenterUid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      } else if (commenterName) {
        commenterAvatar = "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";
      }

      // Realistic metrics defaults
      const randomLikes = customLikes || `${(Math.floor(Math.random() * 80) / 10 + 1.2).toFixed(1)}K`;
      const randomComments = customComments || `${Math.floor(Math.random() * 400) + 25}`;
      const randomShares = customShares || `${Math.floor(Math.random() * 95) + 5}`;
      const postTime = customTime || `${Math.floor(Math.random() * 5) + 1}h`;

      // 7. Build Query Parameters for Toshiro Canvas FBPost API
      const params = {
        text: mainText,
        name: authorName,
        avatar: authorAvatar,
        verified: isVerified,
        time: postTime,
        likes: randomLikes,
        comments: randomComments,
        shares: randomShares,
        theme: theme
      };

      if (postImage) {
        params.image = postImage;
      }

      if (cText) {
        params.c_text = cText;
        params.c_name = commenterName || "Facebook Friend";
        params.c_time = cTime;
        params.c_verified = cVerified;
        params.c_avatar = commenterAvatar || "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";
      }

      const qs = new URLSearchParams(params).toString();
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/fbpost?${qs}`;

      const stream = await global.utils.getStreamFromURL(apiUrl, `fbpost_${authorUid}.png`, { timeout: 30000 });

      await message.reply({
        attachment: stream
      });

      if (api?.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("[FBPOST ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate Facebook post canvas: ${err.message || err}`);
    }
  }
};
