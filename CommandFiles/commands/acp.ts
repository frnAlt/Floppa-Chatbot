import { UNISpectra } from "@cassidy/unispectra";
import moment from "moment-timezone";

interface ListRequest {
  node: {
    name: string;
    id: string;
    url: string;
  };
  time: number;
}

interface ReplyObj {
  messageID: string;
  listRequest: ListRequest[];
  author: string;
  unsendTimeout: NodeJS.Timeout;
}

const command = defineCommand({
  meta: {
    name: "accept",
    otherNames: ["acp"],
    version: "2.0.0",
    author: "JV Barcenas | Liane Cagara",
    role: 1.5,
    description: "Accepts friend requests.",
    category: "Elevated",
    allowModerators: true,
    requirement: "3.0.0",
    noPrefix: false,
    icon: "💗",
    fbOnly: true,
    cmdType: "fb_utl",
  },
  style: {
    title: "👤 Accept Users",
    titleFont: "bold",
    contentFont: "fancy",
    topLine: "thin",
  },
  async entry({ event, api, output, input }) {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name:
        "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({ input: { scale: 3 } }),
    };
    const listRequest: ListRequest[] = JSON.parse(
      await api.httpPost("https://www.facebook.com/api/graphql/", form)
    ).data.viewer.friending_possibilities.edges;
    let msg = "";
    let i = 0;
    for (const user of listRequest) {
      i++;
      msg +=
        `\n${i}. 👤 **${user.node.name}**` +
        `\n🪪 **ID**: ${user.node.id}` +
        `\n🌏 **Url**: ${user.node.url.replace("www.facebook", "fb")}` +
        `\n⏳ **Time**: ${moment(user.time * 1009)
          .tz("Asia/Manila")
          .format("DD/MM/YYYY HH:mm:ss")}\n`;
    }
    const info = await output.reply(
      `${msg}\n${UNISpectra.arrowFromT} 💌 Please reply to this message with content: **<add | del> <comparison | or "all">** to take action.`
    );
    const rep: ReplyObj = {
      listRequest,
      author: event.senderID,
      unsendTimeout: setTimeout(() => {
        api.unsendMessage(info.messageID);
      }, 60 * 1000),
      messageID: info.messageID,
    };

    input.setReply(info.messageID, {
      ...rep,
      async callback({ output, input, api }) {
        const repObj = rep;
        const { author, listRequest, messageID } = repObj;
        if (author !== input.sid) return;
        const args = input.words;

        clearTimeout(repObj.unsendTimeout);
        const form = {
          av: api.getCurrentUserID(),
          fb_api_caller_class: "RelayModern",
          variables: {
            input: {
              source: "friends_tab",
              actor_id: api.getCurrentUserID(),
              client_mutation_id: Math.round(Math.random() * 19).toString(),
              friend_requester_id: null,
            },
            scale: 3,
            refresh_num: 0,
          },
          fb_api_req_friendly_name: null,
          doc_id: null,
        };

        const success = [];
        const failed = [];

        if (args[0] === "add") {
          form.fb_api_req_friendly_name =
            "FriendingCometFriendRequestConfirmMutation";
          form.doc_id = "3147613905362928";
        } else if (args[0] === "del") {
          form.fb_api_req_friendly_name =
            "FriendingCometFriendRequestDeleteMutation";
          form.doc_id = "4108254489275063";
        } else {
          return output.replyStyled(
            '🔎 Please reply with **<add | del > <target number | or "all">**',
            command.style
          );
        }

        let targetIDs = args.slice(1);

        if (args[1] === "all") {
          targetIDs = [];
          const lengthList = listRequest.length;
          for (let i = 1; i <= lengthList; i++)
            targetIDs.push(i as unknown as string);
        }

        const newTargetIDs = [];
        const promiseFriends = [];

        for (const stt of targetIDs) {
          const u = listRequest[parseInt(stt) - 1];
          if (!u) {
            failed.push(`Can't find stt ${stt} in the list`);
            continue;
          }
          form.variables.input.friend_requester_id = u.node.id;
          // @ts-ignore
          form.variables = JSON.stringify(form.variables);
          newTargetIDs.push(u);
          promiseFriends.push(
            api.httpPost("https://www.facebook.com/api/graphql/", form)
          );
          // @ts-ignore
          form.variables = JSON.parse(form.variables);
        }

        const lengthTarget = newTargetIDs.length;
        for (let i = 0; i < lengthTarget; i++) {
          try {
            const friendRequest = await promiseFriends[i];
            if (JSON.parse(friendRequest).errors) {
              failed.push(newTargetIDs[i].node.name);
            } else {
              success.push(newTargetIDs[i].node.name);
            }
          } catch (e) {
            failed.push(newTargetIDs[i].node.name);
          }
        }

        if (success.length > 0) {
          output.replyStyled(
            `${UNISpectra.arrowFromT} ✅ The ${
              args[0] === "add" ? "friend request" : "friend request deletion"
            } **has been processed for** **${
              success.length
            }** people:\n\n${success
              .map((i, j) => `${j + 1}. **${i}**`)
              .join("\n")}${
              failed.length > 0
                ? `\n${UNISpectra.arrowFromT} ❌ The following ${
                    failed.length
                  } people encountered **errors**: ${failed.join("\n")}`
                : ""
            }`,
            command.style
          );
        } else {
          output.unsend(messageID);
          return output.replyStyled(
            "💌 **Invalid response**: Please go back and provide a **valid** response.",
            command.style
          );
        }

        output.unsend(messageID);
      },
    });
  },
});

export default command;
