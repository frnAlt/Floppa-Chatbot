const { findUid } = global.utils;
const { delay } = global.utils;

const command = defineCommand({
  meta: {
    name: "adduser",
    version: "1.5.0",
    author: "@ntkhang03 | @lianecagara",
    waitingTime: 5,
    description: "Add a user to your group chat.",
    icon: "👥",
    category: "Thread",
    usage: `{prefix} [link profile | uid]`,
    fbOnly: true,
    cmdType: "fb_utl",
  },
  style: {
    title: "👥 Add User",
    titleFont: "bold",
    contentFont: "fancy",
  },
  async entry({ input, api, output, args }) {
    const success = [
      {
        type: "success",
        uids: [] as string[],
      },
      {
        type: "waitApproval",
        uids: [] as string[],
      },
    ];
    const failed = [];

    function checkErrorAndPush(messageError: string, item: string) {
      item = item.replace(
        /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)/i,
        ""
      );
      const findType = failed.find((error) => error.type == messageError);
      if (findType) findType.uids.push(item);
      else
        failed.push({
          type: messageError,
          uids: [item],
        });
    }

    const regExMatchFB =
      /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|m\.facebook)\.(?:com|me)\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-\.]+)(?:\/)?/i;
    for (const item of args) {
      let uid: string;
      let continueLoop = false;

      if (isNaN(Number(item)) && regExMatchFB.test(item)) {
        for (let i = 0; i < 10; i++) {
          try {
            uid = await findUid(item);
            break;
          } catch (err) {
            if (err.name === "SlowDown" || err.name === "CannotGetData") {
              await delay(1000);
              continue;
            } else if (
              i == 9 ||
              (err.name !== "SlowDown" && err.name !== "CannotGetData")
            ) {
              checkErrorAndPush(
                err.name == "InvalidLink"
                  ? `Please enter a valid facebook link`
                  : err.name == "CannotGetData"
                  ? `Cannot get uid of this user`
                  : err.name == "LinkNotExist"
                  ? `This profile url does not exist`
                  : err.message,
                item
              );
              continueLoop = true;
              break;
            }
          }
        }
      } else if (!isNaN(Number(item))) uid = item;
      else continue;

      if (continueLoop == true) continue;

      if (input.participantIDs.includes(uid)) {
        checkErrorAndPush(`❌ **${item}**\n  - Already in group`, item);
      } else {
        try {
          await api.addUserToGroup(uid, input.threadID);
          success[0].uids.push(uid);
        } catch (err) {
          checkErrorAndPush(
            `❌ **${item}**\n  - Bot is blocked or this user blocked strangers from adding to the group`,
            item
          );
        }
      }
    }

    const lengthUserSuccess = success[0].uids.length;
    const lengthUserWaitApproval = success[1].uids.length;
    const lengthUserError = failed.length;

    let msg = "";
    if (lengthUserSuccess)
      msg += `✅ Successfully **added ${lengthUserSuccess} member(s)** to the group\n`;
    if (lengthUserWaitApproval)
      msg += `✅ **Added ${lengthUserWaitApproval} member(s)** to the approval list\n`;
    if (lengthUserError)
      msg += `⚠️ Failed to **adding ${failed.reduce(
        (a, b) => a + b.uids.length,
        0
      )} member(s)** to the group.\n${failed.reduce(
        (a, b) => (a += `\n  ${b.type}`),
        ""
      )}`;
    await output.reply(
      msg.trimEnd() ||
        "💌 Please enter a **valid** sender ID as first argument."
    );
  },
});

export default command;
