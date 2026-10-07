"use strict";

const utils = Object.assign({}, require('../utils'), require('./utils'));

module.exports = function (defaultFuncs, api, ctx) {
  return async function setMessageReaction(reaction, messageID, callback, extra) {
    let threadID = null;
    let actualCallback = callback;
    if (typeof callback === "string" && !isNaN(callback)) {
      threadID = callback;
      actualCallback = typeof extra === "function" ? extra : undefined;
    } else if (typeof extra === "string" && !isNaN(extra)) {
      threadID = extra;
    }

    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!actualCallback) {
      actualCallback = (err, data) => {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    } else {
      const _userCb = actualCallback;
      actualCallback = (err, data) => {
        if (err) { _userCb(err); return rejectFunc(err); }
        _userCb(null, data);
        resolveFunc(data);
      };
    }

    try {
      if (reaction === undefined || reaction === null) {
        throw new Error("Please enter a valid emoji.");
      }

      if (reaction === "✅") reaction = "👍";
      else if (reaction === "❌") reaction = "👎";

      // 1. Try MQTT reaction first if threadID is available and MQTT is connected (sub-50ms delivery)
      if (threadID && ctx.mqttClient && ctx.mqttClient.connected && typeof api.setMessageReactionMqtt === "function") {
        try {
          const mqttRes = await api.setMessageReactionMqtt(reaction, messageID, threadID);
          actualCallback(null, mqttRes);
          return returnPromise;
        } catch (_) {}
      }

      const action = reaction === "" ? "REMOVE_REACTION" : "ADD_REACTION";

      const defData = await defaultFuncs.postFormData(
        "https://www.facebook.com/webgraphql/mutation/",
        ctx.jar,
        {},
        {
          doc_id: "1491398900900362",
          variables: JSON.stringify({
            data: {
              client_mutation_id: ctx.clientMutationId++,
              actor_id: ctx.userID,
              action,
              message_id: messageID,
              reaction
            }
          }),
          dpr: 1
        }
      );

      const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(defData);
      if (!resData) {
        throw new Error("setMessageReaction returned empty object.");
      }

      actualCallback(null, { success: true, action, messageID });
    } catch (err) {
      utils.error("setMessageReaction", err);
      actualCallback(err instanceof Error ? err : new Error(String(err)));
    }

    return returnPromise;
  };
};
