"use strict";

const utils = require('../utils');


function parseDelta(defaultFuncs, api, ctx, globalCallback, v) {
  const rawDelta = v?.delta?.deltaNewMessage?.message || v?.delta?.deltaNewMessage || v?.delta;
  const isNewMessage = (v?.delta && (v.delta.class == "NewMessage" || v.delta.deltaNewMessage || (v.delta.messageMetadata && !v.delta.class && v.delta.class !== "ForcedFetch")));

  if (isNewMessage) {
    if (ctx.globalOptions.pageID && v.queue && ctx.globalOptions.pageID != v.queue) return;
    const normV = { delta: rawDelta, queue: v.queue };
    (function resolveAttachmentUrl(i) {
      if (!rawDelta.attachments || i == rawDelta.attachments.length || utils.getType(rawDelta.attachments) !== "Array") {
        var fmtMsg;
        try {
          fmtMsg = utils.formatDeltaMessage(normV, ctx);
        } catch (err) {
          utils.warn("parseDelta:formatDeltaMessage", err?.message || err);
          return;
        }
        if (fmtMsg) {
            if (fmtMsg.threadID && typeof fmtMsg.isGroup === "boolean") {
                if (!ctx.threadTypeCache) ctx.threadTypeCache = Object.create(null);
                ctx.threadTypeCache[fmtMsg.threadID.toString()] = fmtMsg.isGroup;
            }
            utils.log("NewMessage", `Received message [${fmtMsg.threadID}] ${fmtMsg.senderID} -> "${fmtMsg.body || '[Attachment]'}"`);
            if (ctx.globalOptions.autoMarkDelivery) {
                api.markAsDelivered(fmtMsg.threadID, fmtMsg.messageID);
            }
            if (!ctx.globalOptions.selfListen && String(fmtMsg.senderID) === String(ctx.userID || ctx.i_userID)) {
                return;
            }
            return globalCallback(null, fmtMsg);
        }
      } else {
         var attachment = rawDelta.attachments[i];
         if (attachment && attachment.mercury && attachment.mercury.attach_type == "photo") {
           let hasResolved = false;
           const photoTimeout = setTimeout(() => {
             if (!hasResolved) {
               hasResolved = true;
               resolveAttachmentUrl(i + 1);
             }
           }, 2000);
           try {
             api.resolvePhotoUrl(attachment.fbid, (err, url) => {
               clearTimeout(photoTimeout);
               if (!hasResolved) {
                 hasResolved = true;
                 if (!err && attachment.mercury) {
                   if (!attachment.mercury.metadata) attachment.mercury.metadata = {};
                   attachment.mercury.metadata.url = url;
                 }
                 return resolveAttachmentUrl(i + 1);
               }
             });
           } catch (_) {
             clearTimeout(photoTimeout);
             if (!hasResolved) {
               hasResolved = true;
               return resolveAttachmentUrl(i + 1);
             }
           }
         } else {
            return resolveAttachmentUrl(i + 1);
         }
      }
    })(0);
    return;
  }

  const isClientPayload = v?.delta && (v.delta.class === "ClientPayload" || v.delta.type === "ClientPayload" || (v.delta.payload && !v.delta.class));
  if (isClientPayload) {
    var clientPayload = utils.decodeClientPayload(v.delta.payload || v.delta);
    if (clientPayload && clientPayload.deltas) {
      for (var i in clientPayload.deltas) {
        var delta = clientPayload.deltas[i];

        if (delta.deltaMessageReaction && !!ctx.globalOptions.listenEvents) {
            const rxThreadKey = delta.deltaMessageReaction.threadKey || {};
            const rxSender = (delta.deltaMessageReaction.senderId && delta.deltaMessageReaction.senderId != 0 ? delta.deltaMessageReaction.senderId : delta.deltaMessageReaction.userId).toString();
            const rxOtherID = rxThreadKey.otherUserFbId && String(rxThreadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? rxThreadKey.otherUserFbId : rxSender;
            const rxThreadID = (rxThreadKey.threadFbId || rxOtherID || rxSender || "").toString();

            const reactionEvent = {
              type: "message_reaction",
              threadID: rxThreadID,
              messageID: delta.deltaMessageReaction.messageId,
              reaction: delta.deltaMessageReaction.reaction,
              senderID: rxSender,
              userID: (delta.deltaMessageReaction.userId || delta.deltaMessageReaction.senderId).toString()
            };

            if (!ctx.globalOptions.selfListen && String(reactionEvent.senderID) === String(ctx.userID || ctx.i_userID)) {
              continue;
            }

            globalCallback(null, reactionEvent);
            continue;
        } else if (delta.deltaRecallMessageData && !!ctx.globalOptions.listenEvents) {
            const rcThreadKey = delta.deltaRecallMessageData.threadKey || {};
            const rcSender = (delta.deltaRecallMessageData.senderID || "").toString();
            const rcOtherID = rcThreadKey.otherUserFbId && String(rcThreadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? rcThreadKey.otherUserFbId : rcSender;
            const rcThreadID = (rcThreadKey.threadFbId || rcOtherID || rcSender || "").toString();

            globalCallback(null, {
              type: "message_unsend",
              threadID: rcThreadID,
              messageID: delta.deltaRecallMessageData.messageID,
              senderID: rcSender,
              deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
              timestamp: delta.deltaRecallMessageData.timestamp
            });
            continue;
        } else if (delta.deltaRemoveMessage && !!ctx.globalOptions.listenEvents) {
            const rmThreadKey = delta.deltaRemoveMessage.threadKey || {};
            const rmSender = (ctx.userID || ctx.i_userID || "").toString();
            const rmOtherID = rmThreadKey.otherUserFbId && String(rmThreadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? rmThreadKey.otherUserFbId : rmSender;
            const rmThreadID = (rmThreadKey.threadFbId || rmOtherID || rmSender || "").toString();

            globalCallback(null, {
              type: "message_self_delete",
              threadID: rmThreadID,
              messageID: Array.isArray(delta.deltaRemoveMessage.messageIds) ? (delta.deltaRemoveMessage.messageIds[0] || "") : delta.deltaRemoveMessage.messageIds,
              senderID: rmSender,
              deletionTimestamp: delta.deltaRemoveMessage.deletionTimestamp,
              timestamp: delta.deltaRemoveMessage.timestamp
            });
            continue;
        } else if (delta.deltaMessageReply) {
          var mdata = delta.deltaMessageReply.message?.data?.prng ? JSON.parse(delta.deltaMessageReply.message.data.prng) : [];
          var mentions = {};
          if (mdata) {
            mdata.forEach(m => mentions[m.i] = (delta.deltaMessageReply.message.body || "").substring(m.o, m.o + m.l));
          }

          var rMsgMeta = delta.deltaMessageReply.message?.messageMetadata || {};
          var rThreadKey = rMsgMeta.threadKey || {};
          var rSenderID = (rMsgMeta.actorFbId || "").toString();
          var rOtherID = rThreadKey.otherUserFbId && String(rThreadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? rThreadKey.otherUserFbId : rSenderID;
          var rThreadID = (rThreadKey.threadFbId || rOtherID || rSenderID || "").toString();

          var replyBody = delta.deltaMessageReply.message?.body || "";
          var callbackToReturn = {
            type: "message_reply",
            threadID: rThreadID,
            messageID: rMsgMeta.messageId || "",
            senderID: rSenderID,
            attachments: (delta.deltaMessageReply.message.attachments || []).map(att => {
              if (att && att.mercuryJSON && typeof att.mercuryJSON === "string") {
                try {
                  var mercury = JSON.parse(att.mercuryJSON);
                  Object.assign(att, mercury);
                } catch (_) {}
              }
              try {
                return utils._formatAttachment(att);
              } catch (ex) {
                return { ...att, url: att?.url || att?.preview_url || att?.large_preview_url || null, error: ex, type: "unknown" };
              }
            }),
            args: replyBody.trim().split(/\s+/),
            body: replyBody,
            isGroup: !!rThreadKey.threadFbId,
            mentions: mentions,
            timestamp: rMsgMeta.timestamp,
            participantIDs: (delta.deltaMessageReply.message.participants || []).map(e => e.toString()),
            isE2EE: Boolean(
              (rMsgMeta.messageId && String(rMsgMeta.messageId).startsWith("ee.mid")) ||
              (delta.deltaMessageReply.message.attachments && Array.isArray(delta.deltaMessageReply.message.attachments) && delta.deltaMessageReply.message.attachments.some(a => a.isUnrecognized || (a.id && String(a.id).startsWith("ee.mid")) || (a.ID && String(a.ID).startsWith("ee.mid")) || a.description === "Unsupported shared content."))
            )
          };
          if (delta.deltaMessageReply.repliedToMessage) {
            var rmentions = {};
            var rmdata = delta.deltaMessageReply.repliedToMessage?.data?.prng ? JSON.parse(delta.deltaMessageReply.repliedToMessage.data.prng) : [];
            if (rmdata) {
                rmdata.forEach(m => rmentions[m.i] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(m.o, m.o + m.l));
            }

            var repMsgMeta = delta.deltaMessageReply.repliedToMessage?.messageMetadata || {};
            var repThreadKey = repMsgMeta.threadKey || {};
            var repSenderID = (repMsgMeta.actorFbId || "").toString();
            var repOtherID = repThreadKey.otherUserFbId && String(repThreadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? repThreadKey.otherUserFbId : repSenderID;
            var repThreadID = (repThreadKey.threadFbId || repOtherID || repSenderID || "").toString();

            callbackToReturn.messageReply = {
              threadID: repThreadID,
              messageID: repMsgMeta.messageId || "",
              senderID: repSenderID,
              attachments: (delta.deltaMessageReply.repliedToMessage.attachments || []).map(att => {
                 if (att && att.mercuryJSON && typeof att.mercuryJSON === "string") {
                   try {
                     var mercury = JSON.parse(att.mercuryJSON);
                     Object.assign(att, mercury);
                   } catch (_) {}
                 }
                 try {
                   return utils._formatAttachment(att);
                 } catch (ex) {
                   return { ...att, url: att?.url || att?.preview_url || att?.large_preview_url || null, error: ex, type: "unknown" };
                 }
              }),
              body: delta.deltaMessageReply.repliedToMessage.body || "",
              isGroup: !!repThreadKey.threadFbId,
              mentions: rmentions,
              timestamp: repMsgMeta.timestamp,
              participantIDs: (delta.deltaMessageReply.repliedToMessage.participants || []).map(e => e.toString())
            };
          }
          if (callbackToReturn.threadID && typeof callbackToReturn.isGroup === "boolean") {
            if (!ctx.threadTypeCache) ctx.threadTypeCache = Object.create(null);
            ctx.threadTypeCache[callbackToReturn.threadID.toString()] = callbackToReturn.isGroup;
          }
          if (ctx.globalOptions.autoMarkDelivery) api.markAsDelivered(callbackToReturn.threadID, callbackToReturn.messageID);
          if (!ctx.globalOptions.selfListen && String(callbackToReturn.senderID) === String(ctx.userID || ctx.i_userID)) continue;
          utils.log("ClientPayload:Reply", `Received message reply [${callbackToReturn.threadID}] ${callbackToReturn.senderID} -> "${callbackToReturn.body || '[Attachment]'}"`);
          globalCallback(null, callbackToReturn);
          continue;
        } else if (delta.deltaNewMessage) {
          const rawMsg = delta.deltaNewMessage.message || delta.deltaNewMessage;
          let mdata = [];
          try {
            if (rawMsg.data?.prng) mdata = JSON.parse(rawMsg.data.prng);
          } catch (_) {
            mdata = [];
          }
          if (!Array.isArray(mdata)) mdata = [];
          const mentions = {};
          mdata.forEach(m => mentions[m.i] = (rawMsg.body || "").substring(m.o, m.o + m.l));
          const msgMeta = rawMsg.messageMetadata || {};
          const threadKey = msgMeta.threadKey || {};
          const senderID = (msgMeta.actorFbId || "").toString();
          const isGroup = !!threadKey.threadFbId;
          const otherID = threadKey.otherUserFbId && String(threadKey.otherUserFbId) !== String(ctx.userID || ctx.i_userID) ? threadKey.otherUserFbId : senderID;
          const threadID = (threadKey.threadFbId || otherID || senderID || "").toString();
          const msgBody = rawMsg.body || "";

          const callbackToReturn = {
            type: "message",
            threadID: threadID,
            messageID: msgMeta.messageId || "",
            senderID: senderID,
            attachments: (rawMsg.attachments || []).map(att => {
              if (att && att.mercuryJSON && typeof att.mercuryJSON === "string") {
                try {
                  const mercury = JSON.parse(att.mercuryJSON);
                  Object.assign(att, mercury);
                } catch (_) {}
              }
              try {
                return utils._formatAttachment(att);
              } catch (ex) {
                return { ...att, url: att?.url || att?.preview_url || att?.large_preview_url || null, error: ex, type: "unknown" };
              }
            }),
            args: msgBody.trim().split(/\s+/),
            body: msgBody,
            isGroup: isGroup,
            mentions: mentions,
            timestamp: parseInt(msgMeta.timestamp || Date.now()),
            participantIDs: (rawMsg.participants || []).map(e => e.toString()),
            isE2EE: Boolean(
              (msgMeta.messageId && String(msgMeta.messageId).startsWith("ee.mid")) ||
              (rawMsg.attachments && Array.isArray(rawMsg.attachments) && rawMsg.attachments.some(a => a.isUnrecognized || (a.id && String(a.id).startsWith("ee.mid")) || (a.ID && String(a.ID).startsWith("ee.mid")) || a.description === "Unsupported shared content."))
            )
          };

          if (callbackToReturn.threadID && typeof callbackToReturn.isGroup === "boolean") {
            if (!ctx.threadTypeCache) ctx.threadTypeCache = Object.create(null);
            ctx.threadTypeCache[callbackToReturn.threadID.toString()] = callbackToReturn.isGroup;
          }
          if (ctx.globalOptions.autoMarkDelivery) api.markAsDelivered(callbackToReturn.threadID, callbackToReturn.messageID);
          if (!ctx.globalOptions.selfListen && String(callbackToReturn.senderID) === String(ctx.userID || ctx.i_userID)) continue;
          utils.log("ClientPayload:NewMessage", `Received message [${callbackToReturn.threadID}] ${callbackToReturn.senderID} -> "${callbackToReturn.body || '[Attachment]'}"`);
          globalCallback(null, callbackToReturn);
          continue;
        }
      }
      return;
    }
  }

  if (v.delta.class !== "ForcedFetch" && !ctx.globalOptions.listenEvents) return;
  switch (v.delta.class) {
    case "ReadReceipt":
      var fmtMsg;
      try {
        fmtMsg = utils.formatDeltaReadReceipt(v.delta);
      } catch (err) {
        return;
      }
      if (fmtMsg) globalCallback(null, fmtMsg);
      break;
    case "AdminTextMessage":
      switch (v.delta.type) {
        case "instant_game_dynamic_custom_update":
        case "accept_pending_thread":
        case "confirm_friend_request":
        case "shared_album_delete":
        case "shared_album_addition":
        case "pin_messages_v2":
        case "unpin_messages_v2":
        case "change_thread_theme":
        case "change_thread_nickname":
        case "change_thread_icon":
        case "change_thread_quick_reaction":
        case "change_thread_admins":
        case "group_poll":
        case "joinable_group_link_mode_change":
        case "magic_words":
        case "change_thread_approval_mode":
        case "messenger_call_log":
        case "participant_joined_group_call":
        case "rtc_call_log":
        case "update_vote":
          var fmtEvent;
          try {
            fmtEvent = utils.formatDeltaEvent(v.delta);
          } catch (err) {
            return;
          }
          if (fmtEvent) globalCallback(null, fmtEvent);
          break;
      }
      break;
    case "ThreadName":
    case "ParticipantsAddedToGroupThread":
    case "ParticipantLeftGroupThread":
      var fmtEvent2;
      try {
        fmtEvent2 = utils.formatDeltaEvent(v.delta);
      } catch (err) {
        return;
      }
      if (!ctx.globalOptions.selfListenEvent && fmtEvent2 && fmtEvent2.author && String(fmtEvent2.author) === String(ctx.userID || ctx.i_userID)) return;
      if (!ctx.loggedIn) return;
      if (fmtEvent2) globalCallback(null, fmtEvent2);
      break;
    case "ForcedFetch":
      if (!v.delta.threadKey) return;
      var mid = v.delta.messageId;
      var tid = v.delta.threadKey.threadFbId || v.delta.threadKey.otherUserFbId;
      if (mid && tid) {
        var form = {
          av: ctx.globalOptions.pageID || ctx.userID || ctx.i_userID,
          queries: JSON.stringify({
            o0: {
              doc_id: "2848441488556444",
              query_params: {
                thread_and_message_id: {
                  thread_id: tid.toString(),
                  message_id: mid
                }
              }
            }
          })
        };
        defaultFuncs.post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(resData => {
            const raw = Array.isArray(resData) ? (resData[0] || {}) : (resData || {});
            const lastItem = Array.isArray(resData) ? resData[resData.length - 1] : raw;
            if (lastItem && lastItem.error_results > 0) {
              const errors = raw.o0?.errors || raw.errors;
              if (errors) throw errors;
            }
            const fetchData = raw.o0?.data?.message || raw.data?.message || raw.message;
            if (utils.getType(fetchData) === "Object") {
              switch (fetchData.__typename) {
                case "ThreadImageMessage": {
                  if (!ctx.globalOptions.selfListen && fetchData.message_sender && fetchData.message_sender.id.toString() === ctx.userID) return;
                  if (!ctx.loggedIn) return;
                  var imgMeta = fetchData.image_with_metadata;
                  var imgEvent = {
                    type: "event",
                    threadID: utils.formatID(tid.toString()),
                    messageID: fetchData.message_id,
                    logMessageType: "log:thread-image",
                    logMessageData: imgMeta ? {
                      attachmentID: imgMeta.legacy_attachment_id,
                      width: imgMeta.original_dimensions?.x,
                      height: imgMeta.original_dimensions?.y,
                      url: imgMeta.preview?.uri
                    } : null,
                    logMessageBody: fetchData.snippet,
                    timestamp: parseInt(fetchData.timestamp_precise),
                    author: fetchData.message_sender ? fetchData.message_sender.id : null
                  };
                  globalCallback(null, imgEvent);
                  break;
                }
                case "ThreadNameMessage": {
                  if (!ctx.globalOptions.selfListen && fetchData.message_sender && fetchData.message_sender.id.toString() === ctx.userID) return;
                  if (!ctx.loggedIn) return;
                  var nameEvent = {
                    type: "event",
                    threadID: utils.formatID(tid.toString()),
                    messageID: fetchData.message_id,
                    logMessageType: "log:thread-name",
                    logMessageData: { name: fetchData.thread_name },
                    logMessageBody: fetchData.snippet,
                    timestamp: parseInt(fetchData.timestamp_precise),
                    author: fetchData.message_sender ? fetchData.message_sender.id : null
                  };
                  globalCallback(null, nameEvent);
                  break;
                }
                case "UserMessage": {
                  if (!ctx.globalOptions.selfListen && fetchData.message_sender && fetchData.message_sender.id.toString() === ctx.userID) return;
                  if (!ctx.loggedIn) return;

                  var attachments = [];
                  if (fetchData.blob_attachments && fetchData.blob_attachments.length > 0) {
                    fetchData.blob_attachments.forEach(att => {
                      try {
                        attachments.push(utils._formatAttachment(att));
                      } catch (ex) {
                        attachments.push({
                          type: "unknown",
                          error: ex.message || ex,
                          rawAttachment: att
                        });
                      }
                    });
                  } else if (fetchData.extensible_attachment && Object.keys(fetchData.extensible_attachment).length > 0) {
                    try {
                      attachments.push(utils._formatAttachment({ extensible_attachment: fetchData.extensible_attachment }));
                    } catch (ex) {
                      var storyAtt = fetchData.extensible_attachment.story_attachment || {};
                      attachments.push({
                        type: "share",
                        ID: fetchData.extensible_attachment.legacy_attachment_id,
                        url: storyAtt.url,
                        title: storyAtt.title_with_entities ? storyAtt.title_with_entities.text : null,
                        description: storyAtt.description ? storyAtt.description.text : null,
                        source: storyAtt.source ? (storyAtt.source.text || storyAtt.source) : null,
                        image: storyAtt.media && storyAtt.media.image ? storyAtt.media.image.uri : null,
                        width: storyAtt.media && storyAtt.media.image ? storyAtt.media.image.width : null,
                        height: storyAtt.media && storyAtt.media.image ? storyAtt.media.image.height : null,
                        playable: storyAtt.media ? (storyAtt.media.is_playable || false) : false,
                        duration: storyAtt.media ? (storyAtt.media.playable_duration_in_ms || 0) : 0,
                        playableUrl: storyAtt.media && storyAtt.media.playable_url ? storyAtt.media.playable_url : null,
                        subattachments: fetchData.extensible_attachment.subattachments,
                        properties: storyAtt.properties || {}
                      });
                    }
                  } else if (fetchData.sticker) {
                    attachments.push({
                      type: "sticker",
                      ID: fetchData.sticker.id,
                      url: fetchData.sticker.url,
                      packID: fetchData.sticker.pack ? fetchData.sticker.pack.id : null,
                      width: fetchData.sticker.width,
                      height: fetchData.sticker.height
                    });
                  }

                  var mentions = {};
                  if (fetchData.message && fetchData.message.ranges) {
                    fetchData.message.ranges.forEach(mention => {
                      if (mention.entity && mention.entity.id && fetchData.message.text) {
                        mentions[mention.entity.id] = fetchData.message.text.substring(
                          mention.offset,
                          mention.offset + mention.length
                        );
                      }
                    });
                  }

                  var event = {
                    type: "message",
                    senderID: utils.formatID(fetchData.message_sender ? fetchData.message_sender.id : ""),
                    body: (fetchData.message && fetchData.message.text) || "",
                    threadID: utils.formatID(tid.toString()),
                    messageID: fetchData.message_id,
                    attachments: attachments,
                    mentions: mentions,
                    timestamp: parseInt(fetchData.timestamp_precise),
                    isGroup: !!v.delta.threadKey.threadFbId
                  };

                  if (fetchData.replied_to_message && fetchData.replied_to_message.message) {
                    var rep = fetchData.replied_to_message.message;
                    var repMentions = {};
                    if (rep.message && rep.message.ranges) {
                      rep.message.ranges.forEach(mention => {
                        if (mention.entity && mention.entity.id && rep.message.text) {
                          repMentions[mention.entity.id] = rep.message.text.substring(mention.offset, mention.offset + mention.length);
                        }
                      });
                    }
                    var repAttachments = [];
                    if (rep.blob_attachments && rep.blob_attachments.length > 0) {
                      rep.blob_attachments.forEach(att => {
                        try {
                          repAttachments.push(utils._formatAttachment(att));
                        } catch (ex) {
                          repAttachments.push({ type: "unknown", error: ex.message || ex, rawAttachment: att });
                        }
                      });
                    }
                    event.type = "message_reply";
                    event.messageReply = {
                      threadID: utils.formatID(tid.toString()),
                      messageID: rep.message_id,
                      senderID: utils.formatID(rep.message_sender ? rep.message_sender.id : ""),
                      attachments: repAttachments,
                      body: (rep.message && rep.message.text) || "",
                      isGroup: !!v.delta.threadKey.threadFbId,
                      mentions: repMentions,
                      timestamp: parseInt(rep.timestamp_precise || 0)
                    };
                  }

                  if (event.threadID && typeof event.isGroup === "boolean") {
                    if (!ctx.threadTypeCache) ctx.threadTypeCache = Object.create(null);
                    ctx.threadTypeCache[event.threadID.toString()] = event.isGroup;
                  }

                  if (ctx.globalOptions.autoMarkDelivery) {
                    api.markAsDelivered(event.threadID, event.messageID);
                  }

                  globalCallback(null, event);
                  break;
                }
                default:
                  break;
              }
            }
          })
          .catch(err => {
            utils.warn("parseDelta:ForcedFetch", err?.message || err);
          });
      }
      break;
  }
}

module.exports = {
    parseDelta
};
