// @ts-check
import { join } from "node:path";
import request from "request";

import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  unlink,
  ReadStream,
} from "fs";
import { randomUUID } from "node:crypto";
import { base64ToStream, streamToBase64 } from "../../webSystem";
import { writeFileSync } from "node:fs";

const tempPath = (/** @type {string[]} */ ...x) =>
  join(process.cwd(), "temp", ...x);

if (!existsSync(tempPath())) {
  mkdirSync(tempPath(), { recursive: true });
}

export class TempFile {
  /**
   * @param {string | undefined} filename
   */
  constructor(filename = undefined) {
    this._filename = filename || this.generateFilename();
    this.path = tempPath(this._filename);
  }

  get filename() {
    return this._filename;
  }

  set filename(val) {
    this._filename = val;
    this.path = tempPath(this._filename);
  }

  /**
   * Generates a random filename (UUID-based).
   * @returns {string} - Random filename with extension `.tmp`.
   */
  generateFilename() {
    return `${randomUUID()}.tmp`;
  }

  /**
   * Returns the current filename.
   * @returns {string} - Filename.
   */
  getFilename() {
    return this.filename;
  }

  /**
   * Save any readable stream to disk.
   * @param {any} stream - Any readable stream (e.g. Axios, HTTP, Buffer)
   * @returns {Promise<void>}
   */
  saveOld(stream) {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(this.path);
      stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      stream.on("error", reject);
    });
  }
  /**
   * Save any readable stream to disk.
   * @param {any} stream - Any readable stream (e.g. Axios, HTTP, Buffer)
   * @returns {Promise<void>}
   */
  async save(stream) {
    console.log("converting to base 64...");
    const base64_ = await streamToBase64(stream);
    console.log("converting to buffer...");
    const buffer = Buffer.from(base64_, "base64");
    console.log("writing to file....");
    writeFileSync(this.path, new Uint8Array(buffer));
    console.log("file done");
  }

  /**
   * Return a readable file stream.
   * @returns {ReadStream}
   */
  getStream() {
    return createReadStream(this.path);
  }

  /**
   * Delete the file from disk.
   * @returns {Promise<void>}
   */
  delete() {
    return new Promise((resolve, reject) => {
      unlink(this.path, (err) => {
        if (err && err.code !== "ENOENT") return reject(err);
        resolve();
      });
    });
  }

  /**
   * Check if file exists.
   * @returns {boolean}
   */
  exists() {
    return existsSync(this.path);
  }
}

// Author: Liane Cagara, do not own :) its from v20.0 graph api docs
export class APIPage {
  constructor(pageAccessToken) {
    this.token = pageAccessToken;
    this.num_edit = 0;
  }

  /**
   * @param {{ body: any; attachment: Record<string, any>; } | string} content
   * @param {string} senderID
   * @param {((arg0: Error, arg1: { timestamp: string; messageID: any; senderID: any; }) => void)?} [callback]
   */
  async sendMessage(content, senderID, callback) {
    let body;
    let url = null;
    let type = null;
    const { fileTypeFromBuffer } = await global.fileTypePromise;
    if (typeof content === "string") {
      body = { text: content, attachment: undefined };
    } else {
      body = { text: content.body, attachment: undefined };
      if (
        typeof content.attachment === "object" &&
        !Array.isArray(content.attachment) &&
        !content.attachment.pipe &&
        !content.attachment.on &&
        !content.attachment.readable &&
        !content.attachment.read &&
        !content.attachment.pause &&
        !content.attachment.destroy
      ) {
        body.attachment = content.attachment;
      } else if (content?.attachment?.pipe) {
        const temp = new TempFile();
        const base64_ = await streamToBase64(content.attachment);
        const buffer = Buffer.from(base64_, "base64");
        // @ts-ignore
        const ctype = await fileTypeFromBuffer(buffer);
        let format = ctype?.ext;

        const newStream = base64ToStream(base64_);

        temp.filename = temp.filename.replace("tmp", format);

        await temp.save(newStream);
        url = `${
          global.Cassidy.config.knownURL
        }/api/temp?id=${encodeURIComponent(temp.getFilename())}`;
        let _type = ctype?.mime;
        const [__type] = String(_type).split("/");
        type = __type;
      }
    }

    let text = body.text;

    if (url) {
      body.attachment = {
        type,
        payload: {
          url,
          is_reusable: true,
        },
      };
    }
    if (
      !body.text ||
      body.text === "" ||
      String(body.text).trim() === "" ||
      body.text === "undefined"
    ) {
      delete body.text;
    }
    if (body.attachment) {
      delete body.text;
    }
    if (body.text) {
      body.text = String(body.text).slice(0, 2000);
    }

    const conf = {
      url: "https://graph.facebook.com/v20.0/me/messages",
      qs: { access_token: this.token },
      method: "POST",
      json: {
        recipient: { id: senderID },
        message: body,
      },
    };
    console.log(JSON.stringify(conf.json, null, 2));

    const conf2 = {
      url: "https://graph.facebook.com/v20.0/me/messages",
      qs: { access_token: this.token },
      method: "POST",
      json: {
        recipient: { id: senderID },
        message: { text },
      },
    };
    if (!body.text && text) {
      await new Promise((r) => {
        request(conf, (error) => {
          if (error) {
            console.error(error);
          }
          r();
        });
      });
    }

    const promise = new Promise((resolve, reject) => {
      request(conf2, (error, _, responseBodyX) => {
        console.log(responseBodyX);
        const responseBody = {
          timestamp: Date.now().toString(),
          messageID: responseBodyX.message_id,
          senderID: responseBodyX.recipient_id,
        };

        if (error) {
          if (callback) callback(error, null);
          reject(error);
        } else if (responseBody.error) {
          const err = new Error(responseBody.error.message);
          if (callback) callback(err, null);
          reject(err);
        } else {
          if (callback) callback(null, responseBody);
          resolve(responseBody);
        }
      });
    });

    return promise;
  }

  editMessage = null;

  getMessage(messageID, callback) {
    const promise = new Promise((resolve, reject) => {
      request(
        {
          url: `https://graph.facebook.com/v20.0/${messageID}`,
          qs: { access_token: this.token },
          method: "GET",
        },
        (error, _, responseBody) => {
          if (error) {
            if (callback) callback(error, null);
            reject(error);
          } else if (responseBody.error) {
            const err = new Error(responseBody.error.message);
            if (callback) callback(err, null);
            reject(err);
          } else {
            const data = JSON.parse(responseBody);
            if (callback) callback(null, data);
            resolve(data);
          }
        }
      );
    });

    return promise;
  }

  sendTemplateMessage(templatePayload, senderID, callback) {
    const body = { attachment: { type: "template", payload: templatePayload } };

    const promise = new Promise((resolve, reject) => {
      request(
        {
          url: "https://graph.facebook.com/v20.0/me/messages",
          qs: { access_token: this.token },
          method: "POST",
          json: {
            recipient: { id: senderID },
            message: body,
          },
        },
        (error, _, responseBody) => {
          if (error) {
            if (callback) callback(error, null);
            reject(error);
          } else if (responseBody.error) {
            const err = new Error(responseBody.error.message);
            if (callback) callback(err, null);
            reject(err);
          } else {
            if (callback) callback(null, responseBody);
            resolve(responseBody);
          }
        }
      );
    });

    return promise;
  }

  setMessageReaction(reaction, messageID, callback) {
    const promise = new Promise((resolve, reject) => {
      request(
        {
          url: `https://graph.facebook.com/v20.0/${messageID}/reactions`,
          qs: { access_token: this.token },
          method: "POST",
          json: { reaction_type: reaction },
        },
        (error, _, responseBody) => {
          if (error) {
            if (callback) callback(error, null);
            reject(error);
          } else if (responseBody.error) {
            const err = new Error(responseBody.error.message);
            if (callback) callback(err, null);
            reject(err);
          } else {
            if (callback) callback(null, responseBody);
            resolve(responseBody);
          }
        }
      );
    });

    return promise;
  }
}
