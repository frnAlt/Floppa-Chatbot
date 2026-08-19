export function convertDiscordEvent(discordMessage) {
  let event = {};

  if (typeof discordMessage.isCommand === "function" && discordMessage.isCommand()) {
    const args = discordMessage.options.map(option => String(option?.value));
    const body = ["/", discordMessage.commandName, ...args].join(" ");

    event = {
      type: "command",
      commandName: discordMessage.commandName,
      senderID: encodeDCID(discordMessage.user.id),
      timestamp: discordMessage.createdTimestamp,
      isDiscord: true,
      body: body,
      threadID:
        type === "GUILD_TEXT" && discordMessage.channel.parent
          ? encodeDCID(discordMessage.channel.parentId)
          : encodeDCID(discordMessage.channel.id),
      getDiscordInfo() {
        return discordMessage;
      },
    };
  } else if (typeof discordMessage.isInteraction === "function" && discordMessage.isInteraction()) {
    event = {
      type: "interaction",
      interactionID: discordMessage.id,
      senderID: encodeDCID(discordMessage.user.id),
      timestamp: discordMessage.createdTimestamp,
      isDiscord: true,
      body: "",
      threadID: encodeDCID(discordMessage.user.id),
      getDiscordInfo() {
        return discordMessage;
      },
    };
  } else {
    const {
      content,
      reactions,
      author,
      createdTimestamp,
      referencedMessage,
      attachments,
      channel,
    } = discordMessage;

    const reaction = reactions.cache.size > 0 ? reactions.cache.first() : null;
    const senderID = reaction
      ? `${encodeDCID(reaction.users.cache.first().id)}`
      : `${encodeDCID(author.id)}`;
    const userID = reaction
      ? `${encodeDCID(reaction.users.cache.first().id)}`
      : null;

    event = {
      type: reaction
        ? "message_reaction"
        : referencedMessage
          ? "message_reply"
          : "message",
      senderID: senderID,
      timestamp: createdTimestamp,
      body: reaction ? "" : content,
      userID: userID,
      messageID: reaction ? reaction.message.id : discordMessage.id,
      threadID: encodeDCID(channel.id),
      isPage: false,
      isDiscord: true,
      messageReply: referencedMessage
        ? {
            ...convertDiscordEvent(referencedMessage),
          }
        : null,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        url: attachment.url,
        proxyURL: attachment.proxyURL,
        contentType: attachment.contentType,
      })),
      isWeb: false,
      fromWebhook: discordMessage.webhookId ? true : false,
      reaction: reaction ? reaction.emoji.name : "",
      getDiscordInfo() {
        return discordMessage;
      },
    };
  }

  return event;
}
export function decodeDCID(id) {
  id = String(id);
  id = id.replace("discord:", "");
  return id;
}

export function encodeDCID(id) {
  id = String(id);
  id = `discord:${id}`;
  return id;
}
