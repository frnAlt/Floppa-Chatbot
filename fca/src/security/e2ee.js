const crypto = require('crypto');

function b64(buf) {
  return Buffer.from(buf).toString('base64');
}
function b64d(str) {
  return Buffer.from(str, 'base64');
}
function ensure(ctx) {
  if (!ctx.e2ee) {
    ctx.e2ee = { enabled: false, bot: null, peers: Object.create(null) };
  }
  return ctx.e2ee;
}
function genBot(ctx) {
  const e = ensure(ctx);
  if (!e.bot) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
    e.bot = {
      publicKey: publicKey.export({ type: 'spki', format: 'der' }),
      privateKey: privateKey.export({ type: 'pkcs8', format: 'der' })
    };
  }
}
function enable(ctx) {
  const e = ensure(ctx);
  genBot(ctx);
  e.enabled = true;
}
function disable(ctx) {
  const e = ensure(ctx);
  e.enabled = false;
}
function getPublicKey(ctx) {
  genBot(ctx);
  return b64(ensure(ctx).bot.publicKey);
}
function setPeerKey(ctx, threadID, peerPublicKeyB64) {
  const e = ensure(ctx);
  e.peers[String(threadID)] = peerPublicKeyB64;
}
function clearPeerKey(ctx, threadID) {
  const e = ensure(ctx);
  delete e.peers[String(threadID)];
}
function hasPeer(ctx, threadID) {
  const e = ensure(ctx);
  return !!e.peers[String(threadID)];
}
function isEnabled(ctx) {
  const e = ensure(ctx);
  return !!e.enabled;
}
function deriveKey(ctx, threadID) {
  const e = ensure(ctx);
  if (!e.bot || !e.peers[String(threadID)]) {
    throw new Error('missing_keys');
  }
  const priv = crypto.createPrivateKey({ key: e.bot.privateKey, format: 'der', type: 'pkcs8' });
  const pub = crypto.createPublicKey({ key: b64d(e.peers[String(threadID)]), format: 'der', type: 'spki' });
  const shared = crypto.diffieHellman({ privateKey: priv, publicKey: pub });
  const salt = Buffer.from(String(threadID));
  return crypto.hkdfSync('sha256', shared, salt, Buffer.from('neokex-e2ee-v1'), 32);
}
function encrypt(ctx, threadID, plaintext) {
  const key = deriveKey(ctx, threadID);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(String(plaintext))), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = {
    v: 1,
    alg: 'X25519+HKDF+AES-256-GCM',
    n: b64(iv),
    t: b64(tag),
    c: b64(ct)
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return '.NKX-E2EE|' + body;
}
function decrypt(ctx, threadID, armored) {
  const s = String(armored || '');
  if (!s.startsWith('.NKX-E2EE|')) return null;
  const raw = s.slice('.NKX-E2EE|'.length);
  let payload;
  try { payload = JSON.parse(Buffer.from(raw, 'base64').toString()); } catch (_) { return null; }
  if (!payload || payload.v !== 1) return null;
  const key = deriveKey(ctx, threadID);
  const iv = b64d(payload.n);
  const tag = b64d(payload.t);
  const ct = b64d(payload.c);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString();
}

module.exports = {
  ensure,
  enable,
  disable,
  isEnabled,
  getPublicKey,
  setPeerKey,
  clearPeerKey,
  hasPeer,
  encrypt,
  decrypt
};
