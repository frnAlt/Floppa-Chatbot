---
name: floppa-command-development
description: Comprehensive guide for authoring, testing, and debugging commands in Floppa-Chatbot. Covers config schema, onStart/onReply/onReaction/onChat lifecycles, user/thread DB controllers, canvas graphics generation, and cooldown handling.
---

# Floppa Command Development Skill

This skill provides step-by-step instructions, standards, and best practices for creating and maintaining commands in Floppa-Chatbot.

## Command Architecture Overview

Floppa-Chatbot commands are modular JavaScript/TypeScript files located in `scripts/cmds/`. Each module exports an object with `config` metadata and lifecycle handler functions.

```javascript
module.exports = {
  config: {
    name: "commandname",
    aliases: ["alias1", "alias2"],
    version: "1.0.0",
    author: "frnAlt",
    countDown: 5, // Cooldown in seconds
    role: 0,      // 0: All users, 1: Group Admin, 2: Bot Admin
    shortDescription: {
      en: "Short description of the command"
    },
    longDescription: {
      en: "Detailed description and usage instructions"
    },
    category: "category_name",
    guide: {
      en: "{pn} <required_arg> [optional_arg]"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
    // Primary execution entry point
  },

  onReply: async function ({ api, event, Reply, message, usersData, threadsData, getLang }) {
    // Reply listener triggered when a user replies to a bot message registered via global.GoatBot.onReply
  },

  onReaction: async function ({ api, event, Reaction, message, usersData, threadsData, getLang }) {
    // Reaction listener triggered when a user reacts to a message registered via global.GoatBot.onReaction
  },

  onChat: async function ({ api, event, message, usersData, threadsData, getLang }) {
    // Passive chat listener executed on every message received in threads
  }
};
```

## Role Permissions Reference
* `role: 0` - Available to all chat members.
* `role: 1` - Thread/Group Administrators only.
* `role: 2` - Bot Administrators configured in `config.json` (`adminBot`).

## Sending Attachments & Media
Always use `global.utils.getStreamFromURL(url)` to stream media directly without leaving orphan cache files on disk:

```javascript
const stream = await global.utils.getStreamFromURL(imageUrl);
message.reply({
  body: "Here is your generated image:",
  attachment: stream
});
```

## Best Practices
1. **Author Name**: Use `frnAlt` or `Gtajisan (Farhan Muh Tasim)` for author field.
2. **Error Handling**: Wrap external API and network requests in `try...catch` blocks with clear user-facing error messages.
3. **Interactive Reply Tracking**: Register reply listeners with `global.GoatBot.onReply.set(info.messageID, { commandName, author: event.senderID, ...data })`.
