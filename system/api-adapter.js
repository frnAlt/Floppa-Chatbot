/**
 * FCA to TCA API Adapter Layer
 * 
 * Provides backwards compatibility for Facebook Chat API (FCA) command logic
 * by translating incoming Telegram update context objects into classic FCA event 
 * structures and proxying outgoing API calls to the Telegram Bot API (TCA).
 * 
 * @module system/api-adapter
 * @author NTKhang & Modded for Telegram by frnAlt & Gtajisan
 */

const { InputFile } = require("grammy");
const fs = require("fs-extra");
const path = require("path");
const log = require("../logger/log.js");

/**
 * Detects the media type (video, audio, photo, document) of an attachment input.
 * 
 * @param {any} attachmentInput - Stream, path string, URL, or payload object
 * @returns {string} "video" | "audio" | "photo" | "document"
 */
function detectMediaType(attachmentInput) {
        if (!attachmentInput) return "document";

        if (typeof attachmentInput === "object" && attachmentInput !== null) {
                if (attachmentInput.type === "video" || attachmentInput.type === "audio" || attachmentInput.type === "photo") {
                        return attachmentInput.type;
                }
        }

        const targetStr = (typeof attachmentInput === "string" ? attachmentInput : (attachmentInput.path || "")).toLowerCase();

        if (/\.(mp4|mov|mkv|webm|avi|flv)$/i.test(targetStr)) {
                return "video";
        }
        if (/\.(mp3|m4a|wav|ogg|aac|flac|opus)$/i.test(targetStr)) {
                return "audio";
        }
        if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(targetStr)) {
                return "photo";
        }

        return "photo"; // Default fallback for images/attachments
}

/**
 * Creates a stream-based or URL-based InputFile for grammY media methods.
 * Ensures streams are used for file paths to minimize memory consumption.
 * 
 * @param {string|Buffer|Stream} mediaInput - Input file path, URL, buffer, or readable stream
 * @returns {InputFile|null}
 */
function createInputFile(mediaInput) {
        if (!mediaInput) return null;

        if (typeof mediaInput === "string") {
                if (mediaInput.startsWith("http://") || mediaInput.startsWith("https://")) {
                        return new InputFile({ url: mediaInput });
                }
                if (fs.existsSync(mediaInput)) {
                        return new InputFile(fs.createReadStream(mediaInput));
                }
                return new InputFile(mediaInput);
        }

        if (Buffer.isBuffer(mediaInput) || typeof mediaInput.pipe === "function") {
                return new InputFile(mediaInput);
        }

        return new InputFile(mediaInput);
}

/**
 * Constructs an FCA-compliant API wrapper object over the Telegram Bot API.
 * 
 * @param {import("grammy").Context} ctx - grammY update context
 * @returns {Object} FCA api wrapper
 */
function createFcaApiWrapper(ctx) {
        const botApi = ctx.api;

        return {
                /**
                 * Send message wrapper supporting string messages, caption objects, and attachments.
                 * Supports Photo, Video, Audio/Voice, and Document formats like GoatBot V2.
                 * 
                 * @param {string|Object} msg - Text string or payload object containing body/attachment
                 * @param {string|number} threadID - Target Telegram chat/channel ID
                 * @param {Function} [callback] - Optional completion callback (err, info)
                 * @param {number|string} [replyToMessageID] - Optional message ID to reply to
                 */
                sendMessage: async function (msg, threadID, callback, replyToMessageID) {
                        const targetThread = (threadID || ctx.chat?.id)?.toString();
                        const cb = typeof callback === "function" ? callback : (typeof replyToMessageID === "function" ? replyToMessageID : null);
                        const replyId = (typeof replyToMessageID === "number" || typeof replyToMessageID === "string") ? replyToMessageID : undefined;

                        try {
                                let sentMsgInfo = null;

                                if (typeof msg === "string" || typeof msg === "number") {
                                        const res = await botApi.sendMessage(targetThread, msg.toString(), {
                                                reply_to_message_id: replyId,
                                                parse_mode: "HTML"
                                        }).catch(() => botApi.sendMessage(targetThread, msg.toString(), { reply_to_message_id: replyId }));

                                        sentMsgInfo = { messageID: res.message_id, threadID: targetThread, timestamp: res.date * 1000 };
                                } else if (typeof msg === "object" && msg !== null) {
                                        const text = msg.body || msg.text || "";
                                        const attachments = msg.attachment ? (Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment]) : [];

                                        if (attachments.length > 0) {
                                                for (const att of attachments) {
                                                        const inputFile = createInputFile(att);
                                                        const mediaType = detectMediaType(att);
                                                        let res = null;

                                                        if (mediaType === "video") {
                                                                res = await botApi.sendVideo(targetThread, inputFile, {
                                                                        caption: text,
                                                                        reply_to_message_id: replyId,
                                                                        parse_mode: "HTML"
                                                                }).catch(async () => {
                                                                        return await botApi.sendDocument(targetThread, inputFile, {
                                                                                caption: text,
                                                                                reply_to_message_id: replyId
                                                                        });
                                                                });
                                                        } else if (mediaType === "audio") {
                                                                res = await botApi.sendAudio(targetThread, inputFile, {
                                                                        caption: text,
                                                                        reply_to_message_id: replyId,
                                                                        parse_mode: "HTML"
                                                                }).catch(async () => {
                                                                        return await botApi.sendVoice(targetThread, inputFile, {
                                                                                caption: text,
                                                                                reply_to_message_id: replyId
                                                                        });
                                                                }).catch(async () => {
                                                                        return await botApi.sendDocument(targetThread, inputFile, {
                                                                                caption: text,
                                                                                reply_to_message_id: replyId
                                                                        });
                                                                });
                                                        } else if (mediaType === "photo") {
                                                                res = await botApi.sendPhoto(targetThread, inputFile, {
                                                                        caption: text,
                                                                        reply_to_message_id: replyId,
                                                                        parse_mode: "HTML"
                                                                }).catch(async () => {
                                                                        return await botApi.sendDocument(targetThread, inputFile, {
                                                                                caption: text,
                                                                                reply_to_message_id: replyId
                                                                        });
                                                                });
                                                        } else {
                                                                res = await botApi.sendDocument(targetThread, inputFile, {
                                                                        caption: text,
                                                                        reply_to_message_id: replyId,
                                                                        parse_mode: "HTML"
                                                                }).catch(async () => {
                                                                        return await botApi.sendPhoto(targetThread, inputFile, {
                                                                                caption: text,
                                                                                reply_to_message_id: replyId
                                                                        });
                                                                });
                                                        }
                                                        sentMsgInfo = { messageID: res.message_id, threadID: targetThread, timestamp: res.date * 1000 };
                                                }
                                        } else if (text) {
                                                const res = await botApi.sendMessage(targetThread, text, { reply_to_message_id: replyId, parse_mode: "HTML" })
                                                        .catch(() => botApi.sendMessage(targetThread, text, { reply_to_message_id: replyId }));
                                                sentMsgInfo = { messageID: res.message_id, threadID: targetThread, timestamp: res.date * 1000 };
                                        }
                                }

                                if (cb) cb(null, sentMsgInfo);
                                return sentMsgInfo;
                        } catch (err) {
                                log.error("FCA_API_SEND", `Failed sending message to ${targetThread}: ${err.message}`);
                                if (cb) cb(err, null);
                                throw err;
                        }
                },

                /**
                 * Deletes a message by ID.
                 */
                unsendMessage: async function (messageID, callback) {
                        try {
                                const targetID = messageID || ctx.message?.message_id;
                                await botApi.deleteMessage(ctx.chat.id, targetID);
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                },

                /**
                 * Sets an emoji reaction on a target message.
                 */
                setMessageReaction: async function (emoji, messageID, threadID, force, callback) {
                        try {
                                const targetMsg = messageID || ctx.message?.message_id;
                                const targetThread = threadID || ctx.chat?.id;
                                if (botApi.setMessageReaction) {
                                        await botApi.setMessageReaction(targetThread, targetMsg, [{ type: "emoji", emoji }]);
                                }
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                },

                /**
                 * Fetches user details including name, username, and profile picture avatar.
                 */
                getUserInfo: async function (userID, callback) {
                        try {
                                const targetUser = Array.isArray(userID) ? userID[0] : userID;
                                const chat = await botApi.getChat(targetUser);

                                let avatarUrl = "";
                                try {
                                        if (botApi.getUserProfilePhotos) {
                                                const photos = await botApi.getUserProfilePhotos(targetUser, { limit: 1 });
                                                if (photos && photos.total_count > 0 && photos.photos[0]?.length > 0) {
                                                        const fileId = photos.photos[0][photos.photos[0].length - 1].file_id;
                                                        const file = await botApi.getFile(fileId);
                                                        avatarUrl = `https://api.telegram.org/file/bot${botApi.token}/${file.file_path}`;
                                                }
                                        }
                                } catch (e) {}

                                const name = `${chat.first_name || ""} ${chat.last_name || ""}`.trim() || chat.username || "User";
                                const result = {
                                        [targetUser]: {
                                                name,
                                                firstName: chat.first_name || "",
                                                lastName: chat.last_name || "",
                                                username: chat.username || "",
                                                profileUrl: chat.username ? `https://t.me/${chat.username}` : "",
                                                avatar: avatarUrl || `https://api.dicebear.com/7.x/bottts/png?seed=${targetUser}`,
                                                thumbUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/png?seed=${targetUser}`
                                        }
                                };
                                if (typeof callback === "function") callback(null, result);
                                return result;
                        } catch (err) {
                                if (typeof callback === "function") callback(err, null);
                                return {};
                        }
                },

                /**
                 * Fetches thread metadata for a chat ID.
                 */
                getThreadInfo: async function (threadID, callback) {
                        try {
                                const targetThread = threadID || ctx.chat?.id;
                                const chat = await botApi.getChat(targetThread);
                                const result = {
                                        threadID: chat.id.toString(),
                                        threadName: chat.title || chat.first_name || "Chat",
                                        isGroup: chat.type === "group" || chat.type === "supergroup",
                                        userInfo: []
                                };
                                if (typeof callback === "function") callback(null, result);
                                return result;
                        } catch (err) {
                                if (typeof callback === "function") callback(err, null);
                                return {};
                        }
                },

                /**
                 * Returns current bot user ID.
                 */
                getCurrentUserID: function () {
                        return (global.GoatBot.botID || ctx.me?.id)?.toString();
                },

                /**
                 * Bans and unbans a group member to kick them.
                 */
                kickParticipant: async function (userID, threadID, callback) {
                        try {
                                const targetThread = threadID || ctx.chat?.id;
                                await botApi.banChatMember(targetThread, userID);
                                await botApi.unbanChatMember(targetThread, userID);
                                if (typeof callback === "function") callback(null);
                        } catch (err) {
                                if (typeof callback === "function") callback(err);
                        }
                }
        };
}

/**
 * Constructs an FCA event object from a Telegram update context.
 * 
 * @param {import("grammy").Context} ctx - grammY context
 * @returns {Object} FCA event object
 */
function createFcaEventObject(ctx) {
        const msg = ctx.message || ctx.editedMessage || {};
        const from = ctx.from || msg.from || {};
        const chat = ctx.chat || msg.chat || {};

        const event = {
                type: msg.reply_to_message ? "message_reply" : "message",
                threadID: chat.id?.toString() || "",
                senderID: from.id?.toString() || "",
                body: msg.text || msg.caption || "",
                messageID: msg.message_id,
                isGroup: chat.type === "group" || chat.type === "supergroup",
                attachments: [],
                telegramCtx: ctx
        };

        if (msg.photo) {
                const largestPhoto = msg.photo[msg.photo.length - 1];
                event.attachments.push({ type: "photo", url: largestPhoto.file_id, file_id: largestPhoto.file_id });
        } else if (msg.document) {
                event.attachments.push({ type: "file", url: msg.document.file_id, filename: msg.document.file_name });
        }

        if (msg.reply_to_message) {
                const replyMsg = msg.reply_to_message;
                event.messageReply = {
                        messageID: replyMsg.message_id,
                        senderID: replyMsg.from?.id?.toString() || "",
                        body: replyMsg.text || replyMsg.caption || "",
                        attachments: replyMsg.photo ? [{ type: "photo", file_id: replyMsg.photo[replyMsg.photo.length - 1].file_id }] : []
                };
        }

        return event;
}

module.exports = { createFcaApiWrapper, createFcaEventObject, createInputFile };
