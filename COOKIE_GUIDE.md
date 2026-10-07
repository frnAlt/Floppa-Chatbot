# 🛡️ Safe Cookie Login & Mobile Agent Guide — Floppa-Chatbot

This guide explains how to safely authenticate, manage, and protect your Facebook account / Business Page account when running **Floppa-Chatbot** 24/7 using the built-in **Mobile Agent Cookie System**.

---

## 🌟 Why Use Mobile Agent Cookie Authentication?

Traditional desktop sessions trigger Facebook security checkpoints when run on servers (Replit, Render, VPS, AWS) due to IP and device fingerprint discrepancies. 

**Floppa-Chatbot** uses a stealthy **Mobile Android 14 User-Agent** and **mbasic endpoints** that bypass aggressive desktop security checks:

- 📱 **Mobile Chrome Persona**: `Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 ...`
- 🥷 **Stealth Mode**: Automated rate-limiting (`maxRequestsPerMinute: 50`) and randomized request delays.
- 📥 **Business Account DM Safe**: Full 24/7 support for 1-on-1 Messenger DMs and Page Inboxes without account locks.

---

## 🔑 How to Export & Format Facebook Cookies

### Method 1: Using "Cookie-Editor" Extension (Recommended)

1. Install **Cookie-Editor** on Chrome / Firefox / Kiwi Browser.
2. Open [https://www.facebook.com](https://www.facebook.com) and log into your bot's Facebook account.
3. Open **Cookie-Editor** extension and click **Export** ➔ **Export as JSON**.
4. Create or open `account.json` (or `account.txt`) in your Floppa-Chatbot root folder.
5. Paste the copied JSON array into `account.json` (or `account.txt`) and save:

```json
[
  {
    "domain": ".facebook.com",
    "expirationDate": 1785061262,
    "hostOnly": false,
    "httpOnly": true,
    "name": "c_user",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "YOUR_FB_USER_ID"
  },
  {
    "domain": ".facebook.com",
    "expirationDate": 1785061262,
    "hostOnly": false,
    "httpOnly": true,
    "name": "xs",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "storeId": "0",
    "value": "YOUR_XS_COOKIE"
  }
]
```

---

### Method 2: Raw Cookie String Format

If you prefer raw cookie headers, Floppa-Chatbot automatically parses raw cookie strings:

```text
datr=xxx; sb=xxx; c_user=1000xxxxxxxxx; xs=xxxxxxxxxxxx; fr=xxxxxxxxxxxx;
```

---

## 🔄 Multi-Account Support

Floppa-Chatbot supports seamless multi-account management:

- `account.json` (or `account.txt`) ➔ Primary account
- `account2.json` (or `account2.txt`) ➔ Secondary backup account
- `account3.json` (or `account3.txt`) ➔ Business DM account

If an account cookie expires or triggers a checkpoint, Floppa-Chatbot automatically switches to the next healthy account without dropping ongoing bot operations!

---

## 🚀 Running via GitHub Actions Runner

You can deploy and run Floppa-Chatbot directly using GitHub Actions runners without keeping your local machine on:

1. In your GitHub repository, navigate to **Actions** ➔ **Goat / Floppa Bot Runner**.
2. Click **Run workflow**.
3. Under **Facebook Cookie / Appstate**, paste your exported JSON cookie array, raw cookie string (`c_user=...; xs=...`), or base64-encoded cookie.
4. *(Optional)* If using a secondary backup account, paste its cookie into the **Secondary Cookie / Appstate** field.
5. Click the green **Run workflow** button.

> [!NOTE]
> The runner automatically masks your cookie lines (`::add-mask::`) so your credentials will not be leaked or exposed in the GitHub Actions console logs. If no cookie is provided in the input, the runner gracefully falls back to repository secrets (`FB_STATE`, `ACCOUNT_TXT`) or the committed `account.json` / `account.txt`.

---

## ⚠️ Essential Rules to Avoid Account Checkpoints / Locks

1. **NEVER LOG OUT**: Do NOT click "Log Out" on the browser where you exported cookies. Logging out immediately invalidates the `xs` cookie. Simply close the browser tab.
2. **Use 2-Factor Authentication (2FA)**: Enable 2FA on the Facebook account and save the 2FA secret key into `config.json` under `fastConfig.twoFactorSecret` for automatic re-login.
3. **Avoid Changing Password**: Changing your Facebook password invalidates all active session cookies.
4. **Use Stealth Mode**: Ensure `stealthMode: true` and `persona: "mobile"` remain enabled in `config.json`.
