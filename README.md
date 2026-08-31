<div align="center">

<img src="assets/banner.svg" width="100%" alt="Floppa-Chatbot Animated Banner">

<br>

<img src="assets/floppa-logo.jpg" width="130" height="130" style="border-radius: 50%; box-shadow: 0 0 25px rgba(0, 242, 254, 0.6);" alt="Floppa Logo">

# 🐱 FLOPPA-CHATBOT

**Next-Generation 24/7 Facebook Messenger & Business DM Bot Engine**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Developers](https://img.shields.io/badge/Developers-frnAlt%20%26%20Gtajisan-ff69b4?style=for-the-badge)](https://github.com/frnAlt)
[![FCA](https://img.shields.io/badge/FCA%20Engine-Metachat%20Native%20V5-00f2fe?style=for-the-badge)](https://github.com/frnAlt/Floppa-Chatbot)
[![Commands](https://img.shields.io/badge/Commands-350%2B%20Loaded-brightgreen?style=for-the-badge)](#-featured-commands)

</div>

---

## 🌟 Base Architecture & Heritage

**Floppa-Chatbot** is built upon the solid foundation of the **Goat Bot V2** base engine, completely modernized, optimized, and upgraded with:

- ⚡ **Rebuilt Core Engine (`Floppa.js`)**: Memory leak prevention, aggressive V8 garbage collection management, and high-concurrency event loops.
- 📦 **Native FCA API (`fca/`)**: Bundled directly into `@floppa/fca-native`, ensuring continuous 24/7 operation without external dependency failures.
- 🧠 **Centralized 11+ LLM AI Core (`system/ai-core.js`)**: Multi-LLM provider routing (`openai`, `gemini`, `claude`, `deepseek`, `ollama`, `groq`, `moonshot`, `glm`, `qwen`, `oneapi`, `sillytavern`) with automatic public API fallbacks.
- 🛠️ **Unified Functions Suite (`func/`)**: High-performance system telemetry (`systemStats`), cache cleanup (`cacheManager`), AI prompt helpers (`aiHelper`), and message batching.
- 📱 **Mobile Agent Persona**: Simulates native Android Messenger mobile traffic for maximum account safety on personal & Facebook Business accounts.

### 👤 Developers & Maintainers
- **Developers:** **frnAlt & Gtajisan (Farhan Muh Tasim)**
- **Repository:** [https://github.com/frnAlt/Floppa-Chatbot](https://github.com/frnAlt/Floppa-Chatbot)

---

## 🤖 11+ Supported AI Model Services

Floppa-Chatbot includes built-in support for **11+ AI providers**, complete with official API key handling and seamless public URL fallbacks:

1. **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o1-mini`)
2. **Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`)
3. **Anthropic Claude** (`claude-3-5-sonnet`, `claude-3-haiku`, `claude-3-opus`)
4. **DeepSeek AI** (`deepseek-chat`, `deepseek-r1`, `deepseek-v3`)
5. **Local Ollama** (`llama3`, `llama3.1`, `qwen2.5`, `deepseek-r1`, `mistral`)
6. **Groq Cloud** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
7. **Moonshot AI / Kimi** (`moonshot-v1-8k`, `moonshot-v1-32k`)
8. **Zhipu GLM** (`glm-4`, `glm-4-flash`)
9. **Alibaba Qwen** (`qwen-max`, `qwen-plus`, `qwen-turbo`)
10. **OneAPI / OpenAI Compatible Aggregators** (`custom-gpt-4o`, `custom-claude`)
11. **SillyTavern / Local RP Endpoints** (`character-eval`)

---

## 🔥 Featured Commands (200+ Loaded)

- 🎨 **/image** (`/dalle`, `/imagine`): Generates high-definition AI digital art from text prompts.
- 🖼️ **/edit** (`/filter`, `/transform`): Applies AI transformations to replied photos or prompt.
- 🔍 **/upscale** (`/4k`, `/hd`): Enhances image quality to 4K resolution.
- ✂️ **/removebg** (`/nobg`, `/rbg`): Removes backgrounds and exports transparent PNGs.
- 🧠 **/ai** (`/ask`, `/agent`, `/gpt`): Chat with Agentic AI Core (Tool Use, RAG, Multi-LLM routing).
- 📖 **/quran** (`/alquran`): Read Al-Quran verses, Bengali translations, and listen to Alafasy audio recitations.
- 🐙 **/github** (`/gh`): Search GitHub users and repository statistics.
- 👥 **/friendlist** (`/fl`): FCA Friend List manager with enhanced search, pagination, and unfriending.
- ⌨️ **/typing**: FCA typing indicator controller (`on`/`off`/`duration`).
- 🎨 **/metatheme**: Messenger thread color theme switcher.
- 🟢 **/activestatus**: Toggle online active presence on Facebook Messenger.
- 🎵 **/shazam**: Identify songs from replied audio or video attachments.

---

## 📁 Repository Structure

```
Floppa-Chatbot/
├── assets/                # Visual media assets (Floppa Banner, Logo & Previews)
├── fca/                   # Native Built-in FCA API Engine (@floppa/fca-native)
├── bot/                   # Core bot handlers, login & multi-account manager
├── dashboard/             # Live Control Dashboard & Real-Time Log Server
├── database/              # SQLite / MongoDB controllers
├── func/                  # System utilities, telemetry, cache manager & AI helper
│   ├── aiHelper.js
│   ├── cacheManager.js
│   ├── systemStats.js
│   └── index.js
├── system/                # Centralized AI Core Engine & AstrBot Integration
│   └── ai-core.js
├── languages/             # i18n support (English & Vietnamese)
├── scripts/
│   ├── cmds/              # 200+ Command modules
│   └── events/            # Event handling scripts
├── account.txt            # Facebook Session Cookies / Credentials
├── config.json            # Main Bot Configuration
├── Floppa.js              # Rebuilt Core Engine Runner
├── utils.js               # Global Utilities & Helpers
├── index.js               # Application Entry Point
└── package.json           # Project Dependencies & Metadata
```

---

## ⚡ Quick Start & Setup Guide

### 1. Requirements
- **Node.js**: `v20.0.0` or higher
- **npm**: `v7.0.0` or higher

### 2. Installation
```bash
git clone https://github.com/frnAlt/Floppa-Chatbot.git
cd Floppa-Chatbot
npm install
```

### 3. Account Cookie Configuration
Export your Facebook account cookies using a browser extension into JSON format, and save into `account.txt`:

```json
[
  {
    "key": "c_user",
    "value": "YOUR_USER_ID",
    "domain": "facebook.com",
    "path": "/"
  },
  {
    "key": "xs",
    "value": "YOUR_XS_COOKIE",
    "domain": "facebook.com",
    "path": "/"
  }
]
```

### 4. Run Floppa-Chatbot
```bash
npm start
```

### 5. Access Live Web Dashboard
Open your browser and navigate to `http://localhost:5000` to view live system metrics, active threads, and real-time Messenger chat logs.

---

## 📜 License

This project is licensed under the **MIT License**.

Built upon **Goat Bot V2** base architecture. Developed & maintained by **frnAlt & Gtajisan (Farhan Muh Tasim)**.
