// @ts-check

// const pageObject = {
//   object: "page",
//   entry: [
//     {
//       time: ,
//       id: "",
//       messaging: [
//         {
//           sender: { id: "" },
//           recipient: { id: "" },
//           timestamp: 1741508398163,
//           message: {
//             mid: "m_Tg9sZpJJW81uLfqDuEoWF5Q8lp_O9nzvFABhZGXb2gWfkSbAf6mMX1XOWYH9bU4bLMqPvAYPhLU8D-0XQokvqw",
//             text: "+",
//           },
//         },
//       ],
//     },
//   ],
// };
// {
//   "object": "page",
//   "entry": [
//     {
//       "time": 1741510345762,
//       "id": "516746941531643",
//       "messaging": [
//         {
//           "sender": {
//             "id": "29089347883997073"
//           },
//           "recipient": {
//             "id": "516746941531643"
//           },
//           "timestamp": 1741510337765,
//           "message": {
//             "mid": "m_ldDGcj2W5w5Mct2FRtOZ9FAFXFMEf7sh9Xp86Eu1Y6D7u7FNsU4_nd722UMJzQ8JDA2TFNqppL9tSW1F9l_g2w",
//             "text": "+"
//           }
//         }
//       ]
//     }
//   ]
// }

export interface IncomingEvent {
  object: string;
  entry: Entry[];
}

export interface Entry {
  time: number;
  timestamp: number;
  id: string;
  messaging: Messaging[];
}

export interface Messaging {
  sender: Sender;
  recipient: Recipient;
  timestamp: number;
  message: Message;
  postback: Postback;
  reaction: { mid: string; action: string; emoji: string };
}

export interface Postback {
  title: string;
  payload: string;
  mid: string;
}

export interface Sender {
  id: string;
}

export interface Recipient {
  id: string;
}

export interface Message {
  mid: string;
  text: string;
  reply_to?: ReplyTo;
}

export interface ReplyTo {
  mid: string;
}

export function convertEvent(indivEntry: Entry) {
  const pageEvent = indivEntry;
  const messaging = pageEvent?.messaging || [];

  const firstMessaging = messaging[0];
  const reaction = firstMessaging?.reaction || null;
  const postback = firstMessaging?.postback || null;

  const event = {
    pageObject: indivEntry,
    type: reaction
      ? "message_reaction"
      : firstMessaging?.message?.reply_to
      ? "message_reply"
      : postback
      ? "message_postback"
      : "message",
    senderID: reaction
      ? firstMessaging?.recipient?.id || ""
      : firstMessaging?.sender?.id || "",
    timestamp: pageEvent?.time || pageEvent?.timestamp || null,
    body: reaction ? "" : firstMessaging?.message?.text || "",
    userID: reaction ? firstMessaging?.sender?.id || null : null,
    messageID: reaction
      ? reaction?.mid || ""
      : firstMessaging?.message?.mid || "",
    isPage: true,
    ...(firstMessaging?.message?.reply_to
      ? {
          messageReply: {
            messageID: firstMessaging?.message?.reply_to?.mid || "",
            body: "",
          },
        }
      : {}),
    isWeb: false,
    fromWebhook: true,
    reaction: reaction?.action === "react" ? reaction?.emoji || "" : "",
    threadID: "",
    postback,
  };
  event.threadID = event.senderID;

  return event;
}
// this thing is also made by Liane Cagara for the sake of consistent structure
