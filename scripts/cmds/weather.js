const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

let createCanvas;
try {
  ({ createCanvas } = require("@napi-rs/canvas"));
} catch (_) {
  try {
    ({ createCanvas } = require("canvas"));
  } catch (e) {
    createCanvas = null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function generateWeatherCard(data, outputPath) {
  if (!createCanvas) return false;

  const width = 900;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const desc = (data.description || "").trim().toLowerCase();

  // Dynamic Background Gradient depending on condition
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (desc.includes("rain") || desc.includes("storm") || desc.includes("drizzle") || desc.includes("thunder")) {
    bgGrad.addColorStop(0, "#0f2027");
    bgGrad.addColorStop(0.5, "#203a43");
    bgGrad.addColorStop(1, "#2c5364");
  } else if (desc.includes("cloud") || desc.includes("overcast") || desc.includes("fog") || desc.includes("mist")) {
    bgGrad.addColorStop(0, "#141e30");
    bgGrad.addColorStop(0.6, "#243b55");
    bgGrad.addColorStop(1, "#1f2937");
  } else if (desc.includes("sun") || desc.includes("clear")) {
    bgGrad.addColorStop(0, "#1e3c72");
    bgGrad.addColorStop(0.5, "#2a5298");
    bgGrad.addColorStop(1, "#f39c12");
  } else if (desc.includes("snow") || desc.includes("ice") || desc.includes("blizzard")) {
    bgGrad.addColorStop(0, "#2c3e50");
    bgGrad.addColorStop(0.6, "#3498db");
    bgGrad.addColorStop(1, "#bdc3c7");
  } else {
    bgGrad.addColorStop(0, "#0b0f19");
    bgGrad.addColorStop(0.6, "#1e293b");
    bgGrad.addColorStop(1, "#0f172a");
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Modern Glassmorphism Card Container
  roundRect(ctx, 35, 30, 830, 440, 24);
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.stroke();

  // City & Country Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px sans-serif";
  let locationText = `${data.city || "Unknown"}`;
  if (data.country) locationText += `, ${data.country}`;
  if (locationText.length > 30) locationText = locationText.substring(0, 28) + "...";
  ctx.fillText(locationText, 65, 88);

  // Subtitle
  ctx.fillStyle = "#94A3B8";
  ctx.font = "600 13px sans-serif";
  ctx.fillText("LIVE WEATHER REPORT", 65, 115);

  // Status badge (top right)
  roundRect(ctx, 700, 55, 130, 36, 18);
  ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
  ctx.fill();
  ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
  ctx.stroke();
  ctx.fillStyle = "#22C55E";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("● CURRENT", 725, 78);

  // Divider line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(65, 138);
  ctx.lineTo(835, 138);
  ctx.stroke();

  // Main Temperature display (°C)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 84px sans-serif";
  const tempText = `${data.temp_c ?? 0}°C`;
  ctx.fillText(tempText, 65, 235);

  // Secondary info next to temperature
  const tempWidth = ctx.measureText(tempText).width;
  const colX = 65 + tempWidth + 30;

  // Condition Text
  const rawDesc = (data.description || "N/A").trim();
  let displayDesc = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
  if (displayDesc.length > 22) displayDesc = displayDesc.substring(0, 20) + "...";
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "#38BDF8";
  ctx.fillText(displayDesc, colX, 185);

  // Feels like & Fahrenheit
  ctx.font = "500 16px sans-serif";
  ctx.fillStyle = "#CBD5E1";
  ctx.fillText(`Feels like: ${data.feels_like_c ?? data.temp_c}°C   |   ${data.temp_f ?? 0}°F`, colX, 218);

  // 4 Bottom Metric Cards
  const stats = [
    { label: "HUMIDITY", val: `${data.humidity ?? 0}%` },
    { label: "WIND SPEED", val: `${data.wind_kmph ?? 0} km/h` },
    { label: "VISIBILITY", val: `${data.visibility ?? 0} km` },
    { label: "OPERATOR", val: data.operator || "Toshiro Editz" }
  ];

  const cardW = 182;
  const cardH = 95;
  const startX = 65;
  const startY = 275;
  const gap = 16;

  stats.forEach((s, idx) => {
    const x = startX + idx * (cardW + gap);
    roundRect(ctx, x, startY, cardW, cardH, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 11px sans-serif";
    ctx.fillText(s.label, x + 16, startY + 30);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 18px sans-serif";
    let valText = String(s.val);
    if (valText.length > 15) valText = valText.substring(0, 13) + "...";
    ctx.fillText(valText, x + 16, startY + 65);
  });

  // Footer Watermark
  ctx.fillStyle = "#64748B";
  ctx.font = "500 12px sans-serif";
  ctx.fillText(`Floppa Weather Engine • Operator: ${data.operator || "Toshiro Editz"}`, 65, 435);

  await fs.ensureDir(path.dirname(outputPath));
  const buf = canvas.toBuffer("image/png");
  await fs.writeFile(outputPath, buf);
  return true;
}

module.exports = {
  config: {
    name: "weather",
    aliases: ["wt", "thoitiet"],
    version: "2.0.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "View current weather with a Canvas card",
      vi: "Xem thời tiết với card ảnh Canvas"
    },
    longDescription: {
      en: "Check real-time weather information and forecast details rendered on a custom Canvas card."
    },
    category: "tools",
    guide: {
      en: "{pn} <city name> (e.g. {pn} Dhaka or {pn} London)",
      vi: "{pn} <tên thành phố> (ví dụ {pn} Hanoi hoặc {pn} Tokyo)"
    }
  },

  langs: {
    en: {
      syntaxError: "❌ Please enter a city or location name!\nExample: {pn} Dhaka",
      notFound: "❌ Could not find weather details for \"%1\". Please verify the location name and try again.",
      error: "❌ Failed to fetch weather data: %1"
    },
    vi: {
      syntaxError: "❌ Vui lòng nhập tên thành phố hoặc địa điểm!\nVí dụ: {pn} Hanoi",
      notFound: "❌ Không thể tìm thấy thông tin thời tiết cho \"%1\". Vui lòng kiểm tra lại.",
      error: "❌ Lỗi khi lấy dữ liệu thời tiết: %1"
    }
  },

  onStart: async function ({ args, message, event, api, getLang }) {
    const query = args.join(" ").trim();
    if (!query) {
      return message.reply(getLang ? getLang("syntaxError") : "❌ Please enter a city or location name!\nExample: {pn} Dhaka");
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/tools/weather?city=${encodeURIComponent(query)}`;
      const res = await axios.get(apiUrl, { timeout: 25000 });
      const data = res.data;

      if (!data || data.success === false) {
        if (api && api.setMessageReaction) {
          api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
        return message.reply(getLang ? getLang("notFound", query) : `❌ Could not find weather details for "${query}".`);
      }

      const replyText = `🌤️ Weather Report: ${data.city || query}${data.country ? `, ${data.country}` : ""}\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `• Condition: ${(data.description || "N/A").trim()}\n` +
        `• Temperature: ${data.temp_c ?? "N/A"}°C (${data.temp_f ?? "N/A"}°F)\n` +
        `• Feels Like: ${data.feels_like_c ?? data.temp_c ?? "N/A"}°C\n` +
        `• Humidity: ${data.humidity ?? "N/A"}%\n` +
        `• Wind: ${data.wind_kmph ?? "N/A"} km/h\n` +
        `• Visibility: ${data.visibility ?? "N/A"} km\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `⚡ Operator: ${data.operator || "Toshiro Editz"}`;

      const tempDir = path.join(__dirname, "cache");
      const tempPath = path.join(tempDir, `weather_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);

      let cardGenerated = false;
      try {
        cardGenerated = await generateWeatherCard(data, tempPath);
      } catch (canvasErr) {
        console.error("[WEATHER] Canvas render error:", canvasErr);
      }

      if (api && api.setMessageReaction) {
        api.setMessageReaction("🌤️", event.messageID, () => {}, true);
      }

      if (cardGenerated && fs.existsSync(tempPath)) {
        const stream = fs.createReadStream(tempPath);
        stream.on("close", () => {
          fs.unlink(tempPath, () => {});
        });
        return message.reply({
          body: replyText,
          attachment: stream
        });
      } else {
        return message.reply(replyText);
      }

    } catch (err) {
      console.error("[WEATHER] API Error:", err?.response?.data || err.message);
      if (api && api.setMessageReaction) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
      }
      return message.reply(getLang ? getLang("notFound", query) : `❌ Could not find weather details for "${query}".`);
    }
  }
};