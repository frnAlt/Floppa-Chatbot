// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "uid",
  description: "Get your UserID",
  author: "@lianecagara",
  version: "1.0.1",
  usage: "{prefix}{name}",
  category: "User",
  permissions: [0],
  noPrefix: "both",
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["gameid"],
  icon: "👤",
  noLevelUI: true,
};

import { defineEntry } from "@cass/define";

export const entry = defineEntry(async ({ input, output }) => {
  const { findUid, delay } = global.utils;
  let arg = input.arguments[0];
  let ID = input.detectID ?? input.senderID;
  let errS = "";
  const regExMatchFB =
    /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-\.]+)(?:\/)?/i;
  if (arg && regExMatchFB.test(arg)) {
    for (let i = 0; i < 10; i++) {
      try {
        ID = await findUid(arg);
      } catch (err) {
        if (err.name == "SlowDown" || err.name == "CannotGetData") {
          await delay(1000);
        } else if (
          i == 9 ||
          (err.name != "SlowDown" && err.name != "CannotGetData")
        ) {
          errS =
            err.name == "InvalidLink"
              ? `Please enter a **valid** facebook link`
              : err.name == "CannotGetData"
              ? `**Cannot get** uid of this user`
              : err.name == "LinkNotExist"
              ? `This profile url **does not** exist`
              : err.message;
          break;
        }
      }
    }
  }
  if (errS?.length > 0) {
    return output.reply(`❌ ${errS}`);
  }
  return output.reply(`${ID}`);
});
