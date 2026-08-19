const WebSocket = require("ws");
const axios = require("axios");

const defaultUrl = `https://talkersph.replit.app/`;

class ChatBot {
    #ws;
    #botName;
    #messageListener;
    #dataUrl;

    constructor() {
        this.#ws = null;
        this.#botName = null;
        this.#messageListener = null;
    }

    async init(botName, url) {
        this.args = [botName, url];
        try {
            this.#botName = botName;
            const i = (url || defaultUrl) + "/ws-url";
            const response = await axios.get(i);
            const data = response.data;
            this.#dataUrl = data.url;
            this.#connectWebSocket(data.url);
            console.log(`Connected to ${this.#dataUrl} as ${botName}`);
        } catch {}
    }

    #connectWebSocket(url) {
        this.#ws = new WebSocket(url);

        this.#ws.onopen = () => {
            this.#sendLogin(this.#botName);
        };

        this.#ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "message") {
                const sender = String(data.username).trim();
                const messageBody = data.text;
                const eventObject = {
                    sender,
                    body: messageBody,
                    botName: this.#botName,
                };
                this.#handleMessage(eventObject);
            }
        };

        this.#ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.#ws.onclose = () => {
            console.warn("WebSocket connection closed, restarting");
            this.init(this.args);
        };
    }

    #sendLogin(username) {
        this.#ws.send(JSON.stringify({ type: "login", username }));
    }

    #handleMessage(event) {
        if (this.#messageListener) {
            this.#messageListener(event);
        }
    }

    listen(callback) {
        this.#messageListener = callback;
    }
    sendMessage(message) {
        if (this.#ws && message.trim() !== "") {
            const trimmedMessage = message.trim();
            this.#ws.send(
                JSON.stringify({ type: "message", text: trimmedMessage }),
            );
            console.log(`Sent response:`, {
                sender: this.#botName,
                body: trimmedMessage,
            });
        }
    }
}

module.exports = ChatBot;
