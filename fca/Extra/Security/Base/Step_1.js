'use strict';

let CryptoJS;
try {
    CryptoJS = require("crypto-js");
} catch (_) {}

module.exports.EncryptState = function EncryptState(Data, PassWord) {
    if (CryptoJS) {
        return CryptoJS.AES.encrypt(Data, PassWord).toString();
    }
    const crypto = require("crypto");
    const key = crypto.createHash("sha256").update(PassWord).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(Data, "utf8")), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString("base64");
};

module.exports.DecryptState = function DecryptState(Data, PassWord) {
    if (CryptoJS) {
        return CryptoJS.AES.decrypt(Data, PassWord).toString(CryptoJS.enc.Utf8);
    }
    const crypto = require("crypto");
    const buf = Buffer.from(Data, "base64");
    const iv = buf.subarray(0, 16);
    const encrypted = buf.subarray(16);
    const key = crypto.createHash("sha256").update(PassWord).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};