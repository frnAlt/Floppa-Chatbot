const axios = require("axios");

/**
 * Core zAI & Multi-Model API Helper Service
 * Integrated from zaiis2api gateway (https://github.com/frnAlt/zaiis2api)
 * Supports Nano Banana, Nano Banana Pro, Gemini 3 Pro Preview, GPT-4o, AI Photo, etc.
 */

const DEFAULT_GATEWAY_URL = process.env.ZAI_GATEWAY_URL || "https://zai.is/api/v1";

const SUPPORTED_MODELS = {
  "nano-banana": {
    id: "nano-banana",
    name: "Nano Banana",
    aliases: ["nanobanana", "nb", "banana"],
    category: "AI Text & Image",
    provider: "zAI / Gemini",
    description: "Fast, versatile AI model for lightweight text generation & image synthesis."
  },
  "nano-banana-pro": {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    aliases: ["nanobananapro", "nbpro", "banana-pro"],
    category: "AI Text & Image",
    provider: "zAI / Gemini Pro",
    description: "High-performance AI model for complex text reasoning & high-resolution image editing."
  },
  "gemini-3-pro-preview": {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    aliases: ["gemini3pro", "gemini3", "g3pro", "gemini-3-pro"],
    category: "Advanced Multimodal AI",
    provider: "Google / zAI Gateway",
    description: "Next-generation reasoning & multimodal AI model with enhanced vision capabilities."
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    aliases: ["gpt4o", "4o"],
    category: "AI Chat & Vision",
    provider: "OpenAI",
    description: "Omni-capable model for text & visual understanding."
  },
  "ai-photo": {
    id: "ai-photo",
    name: "AI Photo",
    aliases: ["aiphoto", "aip"],
    category: "AI Image",
    provider: "Flux / zAI",
    description: "High-quality photographic image generation model."
  },
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    aliases: ["claude", "sonnet"],
    category: "AI Chat",
    provider: "Anthropic",
    description: "State-of-the-art intelligent reasoning model."
  },
  "sora-2": {
    id: "sora-2",
    name: "Sora 2",
    aliases: ["sora2", "sora"],
    category: "AI Video/Media",
    provider: "OpenAI",
    description: "Generative video & media AI model."
  }
};

/**
 * Fetch list of all supported models
 */
async function getModels() {
  try {
    const res = await axios.get(`${DEFAULT_GATEWAY_URL}/models`, { timeout: 10000 });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
  } catch (err) {
    // Return predefined fallback list
  }

  return Object.values(SUPPORTED_MODELS).map(m => ({
    id: m.id,
    object: "model",
    created: Date.now(),
    owned_by: m.provider
  }));
}

/**
 * Unified Chat Completion API (OpenAI compatible payload)
 */
async function chatCompletion({ model = "gemini-3-pro-preview", prompt, messages = [], imageUrl = null, userToken = null }) {
  const modelId = SUPPORTED_MODELS[model]?.id || model;

  let chatMessages = [...messages];
  if (prompt) {
    if (imageUrl) {
      chatMessages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      chatMessages.push({ role: "user", content: prompt });
    }
  }

  const payload = {
    model: modelId,
    messages: chatMessages,
    stream: false
  };

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Floppa-Chatbot/1.5.35 (zAI Gateway Client)"
  };

  if (userToken) {
    headers["Authorization"] = `Bearer ${userToken}`;
  }

  // Gateway POST attempt
  try {
    const response = await axios.post(`${DEFAULT_GATEWAY_URL}/chat/completions`, payload, {
      headers,
      timeout: 120000
    });

    if (response.data?.choices?.[0]?.message?.content) {
      return {
        success: true,
        model: modelId,
        content: response.data.choices[0].message.content,
        raw: response.data
      };
    }
  } catch (err) {
    // Try fallback public endpoints if gateway is offline
    const fallbackRes = await tryFallbackEndpoints({ model: modelId, prompt, messages: chatMessages, imageUrl });
    if (fallbackRes) return fallbackRes;

    throw new Error(err.response?.data?.error?.message || err.message || "Failed to communicate with AI model.");
  }

  return { success: false, content: "No response output received from model." };
}

/**
 * Fallback text/chat endpoints
 */
async function tryFallbackEndpoints({ model, prompt, messages, imageUrl }) {
  const textPrompt = prompt || messages[messages.length - 1]?.content || "";

  try {
    const res = await axios.get("https://metakexbyneokex.vercel.app/chat", {
      params: {
        message: `[Model: ${model}] ${textPrompt}`,
        new_conversation: "true",
        ...(imageUrl ? { img_url: imageUrl } : {})
      },
      timeout: 45000
    });

    if (res.data?.success && res.data?.message) {
      return {
        success: true,
        model,
        content: res.data.message,
        image_urls: res.data.image_urls || []
      };
    }
  } catch (e) {}

  return null;
}

/**
 * Unified Image Generation & Image Editing API logic
 * Handles Nano Banana, Nano Banana Pro, Gemini 3 Pro, GPT-4o, AI Photo models
 */
async function generateOrEditImage({ prompt, model = "nano-banana-pro", imageUrls = [], ratio = "1:1" }) {
  const isEdit = Array.isArray(imageUrls) && imageUrls.length > 0;

  // 1. Try Tawsif Nano Banana Pro API
  if (isEdit) {
    try {
      const res = await axios.get(`https://tawsif.is-a.dev/gemini/nano-banana-pro-edit`, {
        params: {
          prompt,
          urls: JSON.stringify(imageUrls)
        },
        timeout: 60000
      });
      if (res.data?.imageUrl) {
        return { success: true, imageUrl: res.data.imageUrl, provider: "Nano Banana Pro Edit" };
      }
    } catch (e) {}

    // Fallback: images2gpt img2img
    try {
      const res = await axios.post(`https://images2gpt-api.onrender.com/api/img2img`, {
        prompt: prompt || "Edit this image",
        image_url: imageUrls[0],
        resolution: "1K",
        aspect_ratio: ratio
      }, { timeout: 60000 });
      if (res.data?.success && res.data?.images?.[0]) {
        return { success: true, imageUrl: res.data.images[0], provider: "GPT-2 Image Edit" };
      }
    } catch (e) {}
  } else {
    // Generation
    try {
      const res = await axios.get(`https://tawsif.is-a.dev/gemini/nano-banana-pro-gen`, {
        params: { prompt, ratio },
        timeout: 60000
      });
      if (res.data?.imageUrl) {
        return { success: true, imageUrl: res.data.imageUrl, provider: "Nano Banana Pro Gen" };
      }
    } catch (e) {}

    // Fallback: fluxcdibai
    try {
      const res = await axios.get(`https://fluxcdibai-1.onrender.com/generate`, {
        params: { prompt, model: model === "ai-photo" ? "ai photo" : "4o" },
        timeout: 60000
      });
      const url = res.data?.data?.imageResponseVo?.url;
      if (url) {
        return { success: true, imageUrl: url, provider: "Flux 4o/AI Photo" };
      }
    } catch (e) {}

    // Fallback: images2gpt generate
    try {
      const res = await axios.post(`https://images2gpt-api.onrender.com/api/generate`, {
        prompt,
        resolution: "1K",
        aspect_ratio: ratio
      }, { timeout: 60000 });
      if (res.data?.success && res.data?.images?.[0]) {
        return { success: true, imageUrl: res.data.images[0], provider: "GPT-2 Image Gen" };
      }
    } catch (e) {}

    // Fallback: neokex-img-api
    try {
      const res = await axios.get(`https://neokex-img-api.vercel.app/generate?prompt=${encodeURIComponent(prompt)}&m=imagen4`, {
        timeout: 45000
      });
      if (res.data?.imageUrl || res.config?.url) {
        return { success: true, imageUrl: `https://neokex-img-api.vercel.app/generate?prompt=${encodeURIComponent(prompt)}&m=imagen4`, provider: "Imagen4" };
      }
    } catch (e) {}
  }

  throw new Error("All image generation and editing API providers failed.");
}

module.exports = {
  SUPPORTED_MODELS,
  getModels,
  chatCompletion,
  generateOrEditImage
};
