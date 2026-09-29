"use strict";

const utils = require('../utils');
let lsRequest;
try {
  lsRequest = require('../utils/lsRequest');
} catch (_) {}

module.exports = (defaultFuncs, api, ctx) => {
  return async function forwardMessage(messageID, threadIDs, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = (err, result) => {
        if (err) return rejectFunc(err);
        resolveFunc(result);
      };
    }

    try {
      if (!Array.isArray(threadIDs)) {
        threadIDs = [threadIDs];
      }

      // 1. Try Lightspeed MQTT task 46 forwarding if MQTT is connected
      if (ctx.mqttClient && ctx.mqttClient.connected && lsRequest && typeof lsRequest.publishLsRequestWithAck === "function") {
        try {
          if (typeof ctx.wsReqNumber !== "number") ctx.wsReqNumber = 0;
          if (typeof ctx.wsTaskNumber !== "number") ctx.wsTaskNumber = 0;

          for (const tid of threadIDs) {
            const requestId = ++ctx.wsReqNumber;
            const taskId = ++ctx.wsTaskNumber;
            const otid = utils.generateOfflineThreadingID ? utils.generateOfflineThreadingID() : String(Date.now());
            const content = {
              app_id: "772021112871879",
              payload: JSON.stringify({
                epoch_id: otid,
                tasks: [
                  {
                    failure_count: null,
                    label: "46",
                    payload: JSON.stringify({
                      thread_id: String(tid),
                      otid,
                      source: 65544,
                      send_type: 5,
                      sync_group: 1,
                      mark_thread_read: 0,
                      forwarded_msg_id: messageID,
                      strip_forwarded_msg_caption: 0,
                      initiating_source: 1
                    }),
                    queue_name: String(tid),
                    task_id: taskId
                  }
                ],
                version_id: "8768858626531631"
              }),
              request_id: requestId,
              type: 3
            };

            await lsRequest.publishLsRequestWithAck({
              client: ctx.mqttClient,
              requestId,
              content,
              timeoutMs: 8000,
              extract: () => ({ success: true })
            });
          }

          callback(null, { success: true, forwardedTo: threadIDs });
          return returnPromise;
        } catch (mqttErr) {
          // Fall back to Mercury HTTP endpoint
        }
      }

      // 2. Mercury HTTP fallback
      const form = {
        message_id: messageID
      };
      
      threadIDs.forEach(id => {
        form[`recipient_ids[${id}]`] = id;
      });

      const res = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/forward_message.php",
        ctx.jar,
        form
      ).then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (res && res.error) {
        throw new Error(res.error_msg || res.errorSummary || String(res.error));
      }

      callback(null, { success: true, forwardedTo: threadIDs });
    } catch (err) {
      utils.error("forwardMessage", err);
      callback(err);
    }

    return returnPromise;
  };
};
