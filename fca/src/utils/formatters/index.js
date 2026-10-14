"use strict";

const stream = require("stream");
const formatID = require('./value/formatID');
const formatDate = require('./value/formatDate');
const formatCookie = require('./value/formatCookie');
const { _formatAttachment, formatAttachment } = require('./data/formatAttachment');
const { formatDeltaMessage, formatDeltaEvent, formatDeltaReadReceipt, getAdminTextMessageType } = require('./data/formatDelta');

function isReadableStream(obj) {
    return obj instanceof stream.Stream && typeof obj._read == "function" && typeof obj._readableState == "object";
}

function decodeClientPayload(payload) {
    if (!payload) return null;
    try {
        if (typeof payload === "object" && !Buffer.isBuffer(payload) && !Array.isArray(payload) && !(payload instanceof Uint8Array)) {
            return payload;
        }
        let str;
        if (typeof payload === "string") {
            const trimmed = payload.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                str = payload;
            } else {
                try {
                    str = Buffer.from(payload, "base64").toString("utf8");
                } catch (_) {
                    str = payload;
                }
            }
        } else if (Buffer.isBuffer(payload)) {
            str = payload.toString("utf8");
        } else if (payload instanceof Uint8Array || Array.isArray(payload)) {
            str = Buffer.from(payload).toString("utf8");
        } else {
            str = String(payload);
        }
        return JSON.parse(str);
    } catch (_) {
        try {
            if (Array.isArray(payload) || payload instanceof Uint8Array) {
                let out = "";
                for (let i = 0; i < payload.length; i++) {
                    out += String.fromCharCode(payload[i]);
                }
                return JSON.parse(out);
            }
        } catch (_) {}
        return null;
    }
}

function formatMessage(m) {
    const originalMessage = m.message ? m.message : m;
    const obj = {
        type: "message",
        senderName: originalMessage.sender_name,
        senderID: formatID(originalMessage.sender_fbid.toString()),
        participantNames: originalMessage.group_thread_info?.participant_names || [originalMessage.sender_name.split(" ")[0]],
        participantIDs: originalMessage.group_thread_info?.participant_ids.map(v => formatID(v.toString())) || [formatID(originalMessage.sender_fbid)],
        body: originalMessage.body || "",
        threadID: formatID((originalMessage.thread_fbid || originalMessage.other_user_fbid).toString()),
        threadName: originalMessage.group_thread_info?.name || originalMessage.sender_name,
        location: originalMessage.coordinates || null,
        messageID: originalMessage.mid?.toString() || originalMessage.message_id,
        attachments: formatAttachment(originalMessage.attachments, originalMessage.attachmentIds, originalMessage.attachment_map, originalMessage.share_map),
        timestamp: originalMessage.timestamp,
        tags: originalMessage.tags,
        reactions: originalMessage.reactions || [],
        isUnread: originalMessage.is_unread
    };
    if (m.type === "pages_messaging") obj.pageID = m.realtime_viewer_fbid.toString();
    obj.isGroup = obj.participantIDs.length > 2;
    return obj;
}

function formatEvent(m) {
    const originalMessage = m.message ? m.message : m;
    let logMessageType = originalMessage.log_message_type;
    let logMessageData;
    if (logMessageType === "log:generic-admin-text") {
        logMessageData = originalMessage.log_message_data.untypedData;
        logMessageType = getAdminTextMessageType(originalMessage.log_message_data.message_type);
    } else {
        logMessageData = originalMessage.log_message_data;
    }
    return {
        ...formatMessage(originalMessage),
        type: "event",
        logMessageType,
        logMessageData,
        logMessageBody: originalMessage.log_message_body
    };
}

function formatHistoryMessage(m) {
    return m.action_type === "ma-type:log-message" ? formatEvent(m) : formatMessage(m);
}

function formatTyp(event) {
    return {
        isTyping: !!event.st,
        from: event.from.toString(),
        threadID: formatID((event.to || event.thread_fbid || event.from).toString()),
        fromMobile: event.hasOwnProperty("from_mobile") ? event.from_mobile : true,
        userID: (event.realtime_viewer_fbid || event.from).toString(),
        type: "typ"
    };
}

function formatReadReceipt(event) {
    return {
        reader: event.reader.toString(),
        time: event.time,
        threadID: formatID((event.thread_fbid || event.reader).toString()),
        type: "read_receipt"
    };
}

function formatRead(event) {
    return {
        threadID: formatID(((event.chat_ids && event.chat_ids[0]) || (event.thread_fbids && event.thread_fbids[0])).toString()),
        time: event.timestamp,
        type: "read"
    };
}

function formatThread(data) {
    return {
        threadID: formatID(data.thread_fbid.toString()),
        participants: data.participants.map(p => formatID(p)),
        participantIDs: data.participants.map(p => formatID(p)),
        name: data.name,
        nicknames: data.custom_nickname,
        snippet: data.snippet,
        snippetSender: formatID((data.snippet_sender || "").toString()),
        unreadCount: data.unread_count,
        messageCount: data.message_count,
        imageSrc: data.image_src,
        timestamp: data.timestamp,
        muteUntil: data.mute_until,
        isGroup: data.thread_type === 2,
        isArchived: data.is_archived,
        canReply: data.can_reply,
        lastMessageTimestamp: data.last_message_timestamp,
        lastReadTimestamp: data.last_read_timestamp,
        emoji: data.custom_like_icon,
        color: data.custom_color,
        adminIDs: data.admin_ids,
        threadType: data.thread_type
    };
}

function formatPresence(presence, userID) {
    return {
        type: "presence",
        timestamp: presence.la * 1000,
        userID: userID,
        statuses: presence.a
    };
}

function formatProxyPresence(presence, userID) {
    if (presence.lat === undefined || presence.p === undefined) return null;
    return {
        type: "presence",
        timestamp: presence.lat * 1000,
        userID: userID,
        statuses: presence.p
    };
}

module.exports = {
    isReadableStream,
    formatID,
    formatDate,
    formatCookie,
    parseUniversalCookies: formatCookie.parseUniversalCookies,
    formatAttachment,
    _formatAttachment,
    formatDeltaMessage,
    formatMessage,
    formatEvent,
    formatHistoryMessage,
    getAdminTextMessageType,
    formatDeltaEvent,
    formatTyp,
    formatDeltaReadReceipt,
    formatReadReceipt,
    formatRead,
    formatThread,
    formatProxyPresence,
    formatPresence,
    decodeClientPayload,
};