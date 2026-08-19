const axios = require('axios');

module.exports = {
  config: {
    name: "edit",
    aliases: ["filter", "nbpro", "nanobanana", "nanobanana-pro", "transform"],
    version: "2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    description: {
      vi: "Chỉnh sửa hoặc biến đổi hình ảnh AI (Nano-Banana Pro / Image-to-Image)",
      en: "Applies AI transformations to replied photos or generates images from text"
    },
    category: "ai-image",
    guide: {
      vi: "{pn} <mô tả/phong cách> | Reply một bức ảnh",
      en: "{pn} <style/prompt> | reply to an image"
    }
  },

  onStart: async function ({ message, event, args }) {
    let prompt = args.join(" ");
    
    // Extract image URL from message reply or direct attachments or URL arg
    let imgUrl = null;
    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
      const att = event.messageReply.attachments.find(a => a.type === "photo" || a.type === "image");
      if (att && att.url) imgUrl = att.url;
    } else if (event.attachments && event.attachments.length > 0) {
      const att = event.attachments.find(a => a.type === "photo" || a.type === "image");
      if (att && att.url) imgUrl = att.url;
    } else if (args.length > 0 && args[0].startsWith("http")) {
      imgUrl = args[0];
      prompt = args.slice(1).join(" ");
    }

    if (!imgUrl && !prompt) {
      return message.reply("🖼️ Please provide a prompt or reply to an image with a style/prompt.\nExample: Reply to a photo with /edit cybernetic aesthetic");
    }

    message.reaction("⏳", event.messageID);

    try {
      let finalStream = null;

      if (imgUrl) {
        // Image-to-Image Transformation
        const stylePrompt = prompt || "masterpiece high resolution aesthetic transformation";
        try {
          // Attempt Nano-Banana Pro Edit endpoint first
          const eres = await axios.get(`https://tawsif.is-a.dev/gemini/nano-banana-pro-edit?prompt=${encodeURIComponent(stylePrompt)}&urls=${encodeURIComponent(JSON.stringify([imgUrl]))}`, { timeout: 35000 });
          if (eres.data && eres.data.imageUrl) {
            finalStream = await global.utils.getStreamFromURL(eres.data.imageUrl, 'edit.png');
          }
        } catch (e) {
          // Fallback to Pollinations img2img
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(stylePrompt)}?image=${encodeURIComponent(imgUrl)}&width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
          finalStream = await global.utils.getStreamFromURL(pollinationsUrl, 'edit.png');
        }
      } else {
        // Text-to-Image Generation
        let ratio = prompt.split("--ar=")[1] || prompt.split("--ar ")[1] || '1:1';
        try {
          const gres = await axios.get(`https://tawsif.is-a.dev/gemini/nano-banana-pro-gen?prompt=${encodeURIComponent(prompt)}&ratio=${ratio}`, { timeout: 35000 });
          if (gres.data && gres.data.imageUrl) {
            finalStream = await global.utils.getStreamFromURL(gres.data.imageUrl, 'gen.png');
          }
        } catch (e) {
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
          finalStream = await global.utils.getStreamFromURL(pollinationsUrl, 'gen.png');
        }
      }

      if (!finalStream) {
        throw new Error("Could not process image stream.");
      }

      message.reaction("✅", event.messageID);
      await message.reply({
        body: imgUrl ? `✨ AI Transformation Applied!` : `✅ Generated Image`,
        attachment: finalStream
      });

    } catch (err) {
      message.reaction("❌", event.messageID);
      return message.reply(`❌ Failed to edit/transform image: ${err.message}`);
    }
  }
};