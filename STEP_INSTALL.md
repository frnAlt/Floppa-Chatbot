## **STEP INSTALL FLOPPA-CHATBOT**
> Installation guide for Floppa-Chatbot on PC (Windows, MacOS, Linux), VPS, and Cloud hosting platforms (Replit, Render, etc.).
> **Developer:** Gtajisan (Farhan Muh Tasim)

---

<h1 align="center"><b>QUICK START GUIDE</b></h1>

### 1. Clone the Repository
```bash
git clone https://github.com/frnAlt/Floppa-Chatbot.git
cd Floppa-Chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Cookie / Account
* Download `Cookie Editor` extension on Chrome or Kiwi Browser.
* Log into your Facebook account and export cookies as JSON format.
* Open `account.json` (or `account.txt`) in the root folder and paste your exported JSON cookie array into it.

### 4. Start Floppa-Chatbot
```bash
npm start
```

### 5. Running on GitHub Actions (Optional 24/7 Cloud Runner)
* Go to repository **Actions** tab ➔ **Goat / Floppa Bot Runner** ➔ **Run workflow**.
* Paste your Facebook cookie array or string into the `Facebook Cookie / Appstate` field.
* Click **Run workflow** to run the bot on GitHub Actions runner.

---

<h1 align="center"><b>INTEGRATED FCA ENGINE</b></h1>

Floppa-Chatbot comes pre-packaged with its own native FCA API (`fca/` directory in repository), eliminating external API dependency issues.

Developed by **Gtajisan (Farhan Muh Tasim)**.
