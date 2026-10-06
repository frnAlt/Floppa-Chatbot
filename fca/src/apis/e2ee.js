"use strict";

const e2ee = require('../security/e2ee');

module.exports = function (defaultFuncs, api, ctx) {
  return {
    enable() { e2ee.enable(ctx); },
    disable() { e2ee.disable(ctx); },
    isEnabled() { return e2ee.isEnabled(ctx); },
    getPublicKey() { return e2ee.getPublicKey(ctx); },
    setPeerKey(threadID, peerPublicKeyB64) { e2ee.setPeerKey(ctx, threadID, peerPublicKeyB64); },
    clearPeerKey(threadID) { e2ee.clearPeerKey(ctx, threadID); },
    hasPeer(threadID) { return e2ee.hasPeer(ctx, threadID); },
    encrypt(threadID, text) { return e2ee.encrypt(ctx, threadID, text); },
    decrypt(threadID, armored) { return e2ee.decrypt(ctx, threadID, armored); }
  };
}
