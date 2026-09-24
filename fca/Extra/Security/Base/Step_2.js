'use strict';

let CryptoJS;
try {
    CryptoJS = require("crypto-js");
} catch (_) {}

/**
 * Encrypt the text using the CryptoJS library (or Buffer fallback) and return as a Base64 string.
 * @param Data - The data to be encrypted.
 * @returns A string of characters that represent the encrypted data.
 */
module.exports.Encrypt = function Encrypt(Data) {
    if (CryptoJS) {
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(Data));
    }
    return Buffer.from(String(Data), "utf8").toString("base64");
};

/**
 * Decrypt the data using the CryptoJS library (or Buffer fallback), and return the decrypted data as a string.
 * @param Data - The data to be decrypted.
 * @returns The decrypted data.
 */
module.exports.Decrypt = function Decrypt(Data) {
    if (CryptoJS) {
        return CryptoJS.enc.Base64.parse(Data).toString(CryptoJS.enc.Utf8);
    }
    return Buffer.from(String(Data), "base64").toString("utf8");
};
