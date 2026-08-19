import {
  convertDiscordEvent,
  encodeDCID,
  decodeDCID,
} from "./convertDiscordEvent.js";

export class DiscordAPI {
  constructor(message, client) {
    this.message = message;
    this.client = client;
  }
  getDiscordClient() {
    return this.client;
  }
  getDiscordMessageObj() {
    return this.message;
  }

  async sendMessage(form, threadID, callback) {
    threadID = decodeDCID(threadID);
    return new Promise(async (resolve, reject) => {
      try {
        const channel = this.client.channels.cache.get(threadID);

        if (!channel || !channel.isTextBased()) {
          throw new Error("Invalid threadID or channel is not text-based.");
        }

        const options = {
          content: form,
        };

        const sentMessage = convertDiscordEvent(await channel.send(options));
        if (callback) callback(null, sentMessage);
        resolve(sentMessage);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }

  async setMessageReaction(emoji, messageID, callback) {
    messageID = decodeDCID(messageID);
    return new Promise(async (resolve, reject) => {
      try {
        const message = this.message.channel.messages.cache.get(messageID);

        if (!message) {
          throw new Error("Message not found.");
        }

        const reaction = convertEvent(await message.react(emoji));
        if (callback) callback(null, reaction);
        resolve(reaction);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }

  async unsendMessage(messageID, callback) {
    messageID = decodeDCID(messageID);
    return new Promise(async (resolve, reject) => {
      try {
        const message = this.message.channel.messages.cache.get(messageID);

        if (!message) {
          throw new Error("Message not found.");
        }

        const deletedMessage = convertEvent(await message.delete());
        if (callback) callback(null, deletedMessage);
        resolve(deletedMessage);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }

  async editMessage(newText, messageID, callback) {
    messageID = decodeDCID(messageID);
    return new Promise(async (resolve, reject) => {
      try {
        const message = this.message.channel.messages.cache.get(messageID);

        if (!message) {
          throw new Error("Message not found.");
        }

        const editedMessage = await message.edit(newText);
        if (callback) callback(null, editedMessage);
        resolve(editedMessage);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }

  async addUserToGroup(userID, threadID, callback) {
    userID = decodeDCID(userID);
    threadID = decodeDCID(threadID);
    return new Promise(async (resolve, reject) => {
      try {
        const channel = this.client.channels.cache.get(threadID);

        if (!channel || !channel.isThread()) {
          throw new Error("Invalid threadID or channel is not a thread.");
        }

        const member = await channel.guild.members.fetch(userID);

        if (!member) {
          throw new Error("User not found.");
        }

        await channel.members.add(member);
        if (callback) callback(null, member);
        resolve(member);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }

  async removeUserFromGroup(userID, threadID, callback) {
    userID = decodeDCID(userID);
    threadID = decodeDCID(threadID);

    return new Promise(async (resolve, reject) => {
      try {
        const channel = this.client.channels.cache.get(threadID);

        if (!channel || !channel.isThread()) {
          throw new Error("Invalid threadID or channel is not a thread.");
        }

        const member = await channel.guild.members.fetch(userID);

        if (!member) {
          throw new Error("User not found.");
        }

        await channel.members.remove(member);
        if (callback) callback(null, member);
        resolve(member);
      } catch (error) {
        if (callback) callback(error, null);
        reject(error);
      }
    });
  }
  async getUserInfo(senderID) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!Array.isArray(senderID)) {
          senderID = [senderID];
        }
        senderID = senderID.map(decodeDCID);

        const userInfo = {};

        for (const id of senderID) {
          const user = await this.client.users.fetch(
            id.replace("discord:", ""),
          );
          userInfo[encodeDCID(senderID)] = {
            name: user.username,
            vanity: user.discriminator,
            thumbSrc: user.avatarURL(),
            gender: user.avatar.startsWith("a_") ? 2 : 1,
            alternateName: user.tag,
            isDiscord: true,
            discordInfo: {
              id: user.id,
              username: user.username,
              discriminator: user.discriminator,
              avatar: user.avatar,
              avatarURL: user.avatarURL(),
              bot: user.bot,
              system: user.system,
              createdAt: user.createdAt,
              flags: user.flags,
              locale: user.locale,
              lastMessageID: user.lastMessageID,
              presence: user.presence,
              clientStatus: user.clientStatus,
            },
          };
        }

        resolve(userInfo);
      } catch (error) {
        reject(error);
      }
    });
  }
  async getCurrentUserID() {
    const user = await this.client.user;
    return user.id;
  }
}
