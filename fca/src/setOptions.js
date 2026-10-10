"use strict";

const utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
    return function setOptions(options, callback) {
        let resolveFunc = function () {};
        let rejectFunc = function () {};
        const returnPromise = new Promise(function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback) {
            callback = function (err, res) {
                if (err) return rejectFunc(err);
                resolveFunc(res);
            };
        }

        if (utils.getType(options) !== "Object") {
            const err = new Error("setOptions: options must be an object");
            callback(err);
            return returnPromise;
        }

        try {
            Object.assign(ctx.globalOptions, options);
            callback(null, ctx.globalOptions);
        } catch (e) {
            callback(e);
        }

        return returnPromise;
    };
};
