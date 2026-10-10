"use strict";

const utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
  return function getUserInfo(id, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = (err, data) => {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    if (utils.getType(id) !== "Array") {
      id = [id];
    }
    const form = {};
    id.forEach((v, i) => {
      form[`ids[${i}]`] = v;
    });

    defaultFuncs
      .post("https://www.facebook.com/chat/user_info/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (resData?.error && resData?.error !== 3252001) throw resData;
        const retObj = {};
        const profiles = resData?.payload?.profiles;
        if (profiles && typeof profiles === "object") {
          for (const prop in profiles) {
            if (Object.prototype.hasOwnProperty.call(profiles, prop)) {
              const innerObj = profiles[prop];
              retObj[prop] = {
                name: innerObj.name || "Facebook User",
                firstName: innerObj.firstName || "Facebook",
                vanity: innerObj.vanity || prop,
                thumbSrc: innerObj.thumbSrc || "https://i.imgur.com/xPiHPW9.jpeg",
                profileUrl: innerObj.uri || `https://www.facebook.com/profile.php?id=${prop}`,
                gender: innerObj.gender,
                type: innerObj.type || "user",
                isFriend: innerObj.is_friend,
                isBirthday: !!innerObj.is_birthday,
                searchTokens: innerObj.searchTokens,
                alternateName: innerObj.alternateName
              };
            }
          }
        }
        for (const prop of id) {
          if (!retObj[prop]) {
            retObj[prop] = {
              name: "Facebook User",
              firstName: "Facebook",
              vanity: String(prop),
              thumbSrc: "https://i.imgur.com/xPiHPW9.jpeg",
              profileUrl: `https://www.facebook.com/profile.php?id=${prop}`,
              gender: 0,
              type: "user",
              isFriend: false,
              isBirthday: false,
              searchTokens: ["User", "Facebook"],
              alternateName: ""
            };
          }
        }
        return callback(null, retObj);
      })
      .catch((err) => {
        const retObj = {};
        for (const prop of id) {
          retObj[prop] = {
            name: "Facebook User",
            firstName: "Facebook",
            vanity: String(prop),
            thumbSrc: "https://i.imgur.com/xPiHPW9.jpeg",
            profileUrl: `https://www.facebook.com/profile.php?id=${prop}`,
            gender: 0,
            type: "user",
            isFriend: false,
            isBirthday: false,
            searchTokens: ["User", "Facebook"],
            alternateName: ""
          };
        }
        return callback(null, retObj);
      });

    return returnPromise;
  };
};