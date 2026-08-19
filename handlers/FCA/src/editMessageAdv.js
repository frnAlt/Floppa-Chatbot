"use_strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  async function editMessageOriginal(
    text,
    messageID,
    callback = () => {},
    force = false,
  ) {
    //let force = false;
    let reqID = ctx.wsReqNumber + 1;
    var resolveFunc = function () {};
    var rejectFunc = function () {};
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, data) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(data);
      };
    }

    var form = {
      message_id: messageID,
      text: text,
    };

    var content = {
      app_id: "2220391788200892",
      payload: JSON.stringify({
        data_trace_id: null,
        epoch_id: parseInt(utils.generateOfflineThreadingID()),
        tasks: [
          {
            failure_count: null,
            label: "742",
            payload: JSON.stringify(form),
            queue_name: "edit_message",
            task_id: ++ctx.wsTaskNumber,
          },
        ],
        version_id: "6903494529735864",
      }),
      request_id: ++ctx.wsReqNumber,
      type: 3,
    };

    ctx.mqttClient.publish("/ls_req", JSON.stringify(content), {
      qos: 1,
      retain: false,
    });
    const handleRes = function (topic, message, _packet) {
      if (topic === "/ls_resp") {
        let jsonMsg = JSON.parse(message.toString());
        jsonMsg.payload = JSON.parse(jsonMsg.payload);
        if (jsonMsg.request_id != reqID) return;
        ctx.mqttClient.removeListener("message", handleRes);

        let msgID = jsonMsg.payload.step[1][2][2][1][2];
        let msgReplace = jsonMsg.payload.step[1][2][2][1][4];

        if (msgReplace != text && !force) {
          let err = { error: "The message is too old or not from you!" };
          log.error("editMessage", err);

          return callback(err, {
            body: msgReplace,
            messageID: msgID,
          });
        }

        return callback(undefined, {
          body: msgReplace,
          messageID: msgID,
        });
      }
    };
    ctx.mqttClient.on("message", handleRes);

    return returnPromise;
  }
  function editHelper(content, id) {
    return new Promise((r) => {
      editMessageOriginal(content, id, (_, info) => r(info), true);
    });
  }
  // Liane
  return async function editMessageAdv(...argsOr) {
    const args = [...argsOr];
    const messageID = args.shift();
    const texts = args.filter(
      (arg, index) => typeof arg === "string" && index % 2 !== 0,
    );
    const delays = args.filter(
      (arg, index) => typeof arg === "number" && index % 2 === 0,
    );
    const result = [];
    for (let i = 0; i < texts.length; i++) {
      await new Promise((r) => setTimeout(r, delays[i] || 0));
      const i = await editHelper(texts[i], messageID);
      result.push(i);
    }
    return result;
  };
};
