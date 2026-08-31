---
name: multi-llm-integration
description: Standard procedure for integrating, configuring, and extending LLM AI providers in Floppa-Chatbot. Covers routing across OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Ollama, Groq, Moonshot, GLM, Qwen, and custom OpenAI-compatible endpoints.
---

# Multi-LLM AI Core Integration Skill

This skill explains how to configure, use, and extend the 11+ LLM provider core in Floppa-Chatbot (`system/ai-core.js`).

## Supported AI Providers

Floppa AI Core supports unified multi-provider routing:
1. **Google Gemini** (`gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`)
2. **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o1`, `o1-mini`)
3. **Anthropic Claude** (`claude-3-5-sonnet`, `claude-3-haiku`)
4. **DeepSeek AI** (`deepseek-chat`, `deepseek-r1`)
5. **Groq Cloud** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
6. **Local Ollama** (`llama3.1`, `qwen2.5`, `deepseek-r1`)
7. **Moonshot AI / Kimi** (`moonshot-v1-8k`)
8. **Zhipu GLM** (`glm-4`, `glm-4-flash`)
9. **Alibaba Qwen** (`qwen-max`, `qwen-plus`)
10. **OneAPI / Custom Aggregators**
11. **SillyTavern / Character Endpoints**

## Adding a Custom LLM Provider
To add a new provider, extend the provider router in `system/ai-core.js`:

```javascript
case "myprovider": {
  const response = await axios.post("https://api.myprovider.com/v1/chat/completions", {
    model: options.model || "default-model",
    messages: promptMessages,
    temperature: options.temperature || 0.7
  }, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });
  return response.data.choices[0].message.content;
}
```

## Public API Fallbacks
When official API keys are not configured in `config.json`, the AI core automatically routes queries to resilient public reverse proxies to ensure uninterrupted service for users.
