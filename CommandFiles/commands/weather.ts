import { SpectralCMDHome, Config } from "@cass-modules/spectralCMDHome";
import { limitString, UNIRedux } from "@cassidy/unispectra";
import axios from "axios";
import moment from "moment-timezone";
import { defineEntry } from "@cass/define";

interface NominatimLocation {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    country: string;
    city?: string;
    town?: string;
  };
}

interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  weathercode: number;
  relative_humidity_2m?: number;
  windspeed_10m?: number;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_min: number[];
  temperature_2m_max: number[];
  weathercode: number[];
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
  current_units?: {
    time: string;
    temperature_2m: string;
    apparent_temperature: string;
    relative_humidity_2m?: string;
    windspeed_10m?: string;
  };
  daily_units?: {
    time: string;
    temperature_2m_min: string;
    temperature_2m_max: string;
  };
}

const OPEN_METEO_CONFIG = {
  BASE_URL: "https://api.open-meteo.com/v1/forecast",
  TIMEZONE: "UTC",
  WEATHER_CODES: {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  },
};

const NOMINATIM_CONFIG = {
  BASE_URL: "https://nominatim.openstreetmap.org/search",
  SEARCH_LIMIT: 5,
};

export const meta: CommandMeta = {
  name: "weather",
  author: "MrKimstersDev | Liane",
  description:
    "Retrieves current and forecast weather data using Open-Meteo API (no key required). Use 'search' to list matching cities first.",
  version: "1.4.0",
  supported: "^4.0.0",
  otherNames: ["wx"],
  usage: "{prefix}{name} [search|current|forecast] [location]",
  category: "Media",
  role: 0,
  noPrefix: false,
  waitingTime: 2,
  requirement: "4.0.0",
  icon: "🌤️",
  noWeb: true,
};

export const style: CommandStyle = {
  title: "🌤️ Weather Report",
  titleFont: "bold",
  contentFont: "fancy",
};

const configs: Config[] = [
  {
    key: "search",
    description:
      "Search for matching locations/cities (shows a list to choose from)",
    args: ["[location]"],
    aliases: ["-s"],
    icon: "🔍",
    async handler({ input, output, prefix }, { spectralArgs, key }) {
      const locationQuery = spectralArgs[0];

      if (!locationQuery) {
        return output.reply(
          `❌ Please provide a location to search. Usage: ${prefix}${meta.name} ${key} [location]`
        );
      }

      try {
        const locResponse = await axios.get(NOMINATIM_CONFIG.BASE_URL, {
          params: {
            q: locationQuery,
            format: "json",
            limit: NOMINATIM_CONFIG.SEARCH_LIMIT,
            addressdetails: 1,
          },
          headers: { "User-Agent": "CassidyAstral/1.0" },
        });

        const locations: NominatimLocation[] = locResponse.data;
        if (!locations.length) {
          return output.reply(
            `❌ No locations found for "${locationQuery}". Try a different spelling or more details (e.g., "London UK").`
          );
        }

        const canv = new CanvCass(CanvCass.preW, CanvCass.preH);
        await canv.drawBackground();

        const container = CanvCass.createRect({
          centerY: canv.centerY,
          centerX: canv.centerX,
          height: canv.height / 1.5,
          width: canv.width,
        });

        canv.drawBox({
          rect: container,
          fill: "rgba(0, 0, 0, 0.5)",
        });

        const lines = CanvCass.lineYs(
          container.height,
          locations.length + 2,
          container.top
        );
        const d = lines[1] - lines[0];
        const margin = 80;
        const ymargin = 20;
        const itemHeight = d * 0.9;

        canv.drawText(`🔍 Search Results for "${locationQuery}"`, {
          fontType: "cbold",
          size: 45,
          x: container.left + margin,
          y: lines[0] + itemHeight / 2,
          vAlign: "middle",
          align: "left",
          fill: "white",
        });

        locations.forEach((loc, index) => {
          const yBase = lines[1 + index] + itemHeight / 2;
          const city = loc.address.city || loc.address.town || "Unknown";
          const country = loc.address.country;
          const fullName = limitString(`${city}, ${country}`, 40);

          canv.drawText(`${index + 1}. ${fullName}`, {
            fontType: "cbold",
            size: 40,
            x: container.left + margin,
            y: yBase,
            vAlign: "middle",
            align: "left",
            fill: "rgba(255, 255, 255, 0.9)",
          });
        });

        canv.drawText(
          `Reply with number + "current" or "forecast" to get weather`,
          {
            fontType: "cbold",
            size: 30,
            x: canv.centerX,
            y: container.bottom - ymargin,
            vAlign: "top",
            align: "center",
            fill: "rgba(255, 255, 255, 0.7)",
          }
        );

        canv.drawText(`🗺️`, {
          fontType: "cbold",
          size: 70,
          x: canv.right - 90,
          y: container.top + 80,
          align: "center",
          fill: "rgba(0, 255, 255, 0.8)",
        });

        const locationList = locations
          .map((loc, index) => {
            const city = loc.address.city || loc.address.town || "Unknown";
            const country = loc.address.country;
            return `${index + 1}. ${city}, ${country}`;
          })
          .join("\n");

        const body =
          `${UNIRedux.arrow} **Search Results for "${locationQuery}"** 🔍\n\n` +
          `${locationList}\n\n` +
          `**Next:** Reply with [number] current or [number] forecast (e.g., "1 current") to get weather for that location.\n` +
          `Or use: ${input.prefix}${meta.name} current [full city name]\n\n` +
          `🚂 **Astral Express Network**`;

        const messageInfo = await output.reply({
          body,
          attachment: await canv.toStream(),
        });

        input.setReply(messageInfo.messageID, {
          key: "weather",
          id: input.senderID,
          results: locations,
          mode: "search",
        });

        return;
      } catch (error: any) {
        console.error(
          "Location Search Error:",
          error.response?.data || error.message
        );
        return output.error(`❌ Failed to search locations. Try again later.`);
      }
    },
  },
  {
    key: "current",
    description:
      "Get current weather conditions for a location (searches first, interactive if multiple)",
    args: ["[location]"],
    aliases: ["-c", "now"],
    icon: "☀️",
    async handler({ input, output }, { spectralArgs, key }) {
      const locationQuery = spectralArgs[0];

      if (!locationQuery) {
        return output.reply(
          `❌ Please provide a location. Usage: ${input.prefix}${meta.name} ${key} [location]`
        );
      }

      try {
        const locResponse = await axios.get(NOMINATIM_CONFIG.BASE_URL, {
          params: {
            q: locationQuery,
            format: "json",
            limit: NOMINATIM_CONFIG.SEARCH_LIMIT,
            addressdetails: 1,
          },
          headers: { "User-Agent": "CassidyAstral/1.0" },
        });

        const locations: NominatimLocation[] = locResponse.data;
        if (!locations.length) {
          return output.reply(
            `❌ No location found for "${locationQuery}". Try a more specific name.`
          );
        }

        if (locations.length === 1) {
          const selectedLocation = locations[0];
          const lat = parseFloat(selectedLocation.lat);
          const lon = parseFloat(selectedLocation.lon);
          const city =
            selectedLocation.address.city ||
            selectedLocation.address.town ||
            "Unknown";
          const country = selectedLocation.address.country;
          const fullName = `${city}, ${country}`;

          const weatherResponse = await axios.get(OPEN_METEO_CONFIG.BASE_URL, {
            params: {
              latitude: lat,
              longitude: lon,
              current:
                "temperature_2m,apparent_temperature,weathercode,relative_humidity_2m,windspeed_10m",
              timezone: OPEN_METEO_CONFIG.TIMEZONE,
            },
          });

          const weatherData: OpenMeteoResponse = weatherResponse.data;
          if (!weatherData.current) {
            return output.reply(
              `❌ No current weather data available for ${fullName}.`
            );
          }

          const current = weatherData.current;
          const temp = current.temperature_2m;
          const feelsLike = current.apparent_temperature;
          const weatherCode = current.weathercode;
          const weatherText =
            OPEN_METEO_CONFIG.WEATHER_CODES[weatherCode] ||
            "Unknown conditions";
          const humidity = current.relative_humidity_2m || 0;
          const windSpeed = current.windspeed_10m || 0;
          const obsTime = moment(current.time)
            .tz(OPEN_METEO_CONFIG.TIMEZONE)
            .format("YYYY-MM-DD HH:mm:ss");

          const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.7);
          await canv.drawBackground();

          const container = CanvCass.createRect({
            centerY: canv.centerY,
            centerX: canv.centerX,
            height: canv.height / 1.5,
            width: canv.width,
          });

          canv.drawBox({
            rect: container,
            fill: "rgba(0, 0, 0, 0.5)",
          });

          const lines = CanvCass.lineYs(container.height, 4);
          const d = lines[1] - lines[0];

          const margin = 100;
          const ymargin = 20;

          canv.drawText(`🌤️ ${fullName}`, {
            fontType: "cbold",
            size: 50,
            x: container.left + margin,
            y: container.top + ymargin,
            vAlign: "bottom",
            align: "left",
            fill: "white",
          });

          canv.drawText(`${temp}°C`, {
            fontType: "cbold",
            size: 120,
            x: canv.right - margin,
            y: lines[2] + d / 2,
            vAlign: "middle",
            align: "right",
            fill: "white",
          });

          canv.drawText(`Feels like: ${feelsLike}°C`, {
            fontType: "cbold",
            size: 40,
            x: canv.centerX,
            y: lines[1] + d / 2 + 50,
            vAlign: "top",
            align: "center",
            fill: "rgba(255, 255, 255, 0.8)",
          });

          canv.drawText(`${weatherText}`, {
            fontType: "cbold",
            size: 45,
            x: container.left + margin,
            y: lines[2] + d / 2,
            vAlign: "middle",
            align: "left",
            fill: "rgba(255, 255, 255, 0.9)",
          });

          canv.drawText(`Humidity: ${humidity}% | Wind: ${windSpeed} km/h`, {
            fontType: "cbold",
            size: 35,
            x: container.left + margin,
            y: lines[3] + d / 2,
            vAlign: "middle",
            align: "left",
            fill: "rgba(255, 255, 255, 0.7)",
          });

          canv.drawText(`Observed: ${obsTime}`, {
            fontType: "cbold",
            size: 30,
            x: container.right - margin,
            y: container.bottom - ymargin,
            vAlign: "top",
            align: "right",
            fill: "rgba(255, 255, 255, 0.6)",
          });

          canv.drawText(`☀️`, {
            fontType: "cbold",
            size: 80,
            x: canv.right - 100,
            y: container.top + 100,
            align: "center",
            fill: "rgba(255, 255, 0, 0.8)",
          });

          const body =
            `${UNIRedux.arrow} **Current Weather in ${fullName}** ☀️\n\n` +
            `🌡️ **Temperature:** ${temp}°C (Feels like: ${feelsLike}°C)\n` +
            `☁️ **Conditions:** ${weatherText}\n` +
            `💧 **Humidity:** ${humidity}%\n` +
            `💨 **Wind:** ${windSpeed} km/h\n` +
            `📅 **Observed:** ${obsTime}\n\n` +
            `🚂 **Astral Express Network**`;

          return output.reply({
            body,
            attachment: await canv.toStream(),
          });
        }

        const canv = new CanvCass(CanvCass.preW, CanvCass.preH);
        await canv.drawBackground();

        const container = CanvCass.createRect({
          centerY: canv.centerY,
          centerX: canv.centerX,
          height: canv.height / 1.5,
          width: canv.width,
        });

        canv.drawBox({
          rect: container,
          fill: "rgba(0, 0, 0, 0.5)",
        });

        const lines = CanvCass.lineYs(container.height, locations.length + 2);
        const d = lines[1] - lines[0];
        const margin = 80;
        const ymargin = 20;
        const itemHeight = d * 0.9;

        canv.drawText(
          `🔍 Matches for "${locationQuery}" - Pick one for Current Weather`,
          {
            fontType: "cbold",
            size: 45,
            x: container.left + margin,
            y: lines[0] + itemHeight / 2,
            vAlign: "middle",
            align: "left",
            fill: "white",
          }
        );

        locations.forEach((loc, index) => {
          const yBase = lines[1 + index] + itemHeight / 2;
          const city = loc.address.city || loc.address.town || "Unknown";
          const country = loc.address.country;
          const fullName = limitString(`${city}, ${country}`, 40);

          canv.drawText(`${index + 1}. ${fullName}`, {
            fontType: "cbold",
            size: 40,
            x: container.left + margin,
            y: yBase,
            vAlign: "middle",
            align: "left",
            fill: "rgba(255, 255, 255, 0.9)",
          });
        });

        canv.drawText(`Reply with the number to select (e.g., "1")`, {
          fontType: "cbold",
          size: 30,
          x: canv.centerX,
          y: container.bottom - ymargin,
          vAlign: "top",
          align: "center",
          fill: "rgba(255, 255, 255, 0.7)",
        });

        canv.drawText(`☀️`, {
          fontType: "cbold",
          size: 70,
          x: canv.right - 90,
          y: container.top + 80,
          align: "center",
          fill: "rgba(255, 255, 0, 0.8)",
        });

        const locationList = locations
          .map((loc, index) => {
            const city = loc.address.city || loc.address.town || "Unknown";
            const country = loc.address.country;
            return `${index + 1}. ${city}, ${country}`;
          })
          .join("\n");

        const body =
          `${UNIRedux.arrow} **Location Matches for "${locationQuery}"** 🔍\n\n` +
          `${locationList}\n\n` +
          `**Next:** Reply with the number (e.g., "1") to get current weather for that location.\n\n` +
          `🚂 **Astral Express Network**`;

        const messageInfo = await output.reply({
          body,
          attachment: await canv.toStream(),
        });

        input.setReply(messageInfo.messageID, {
          key: "weather",
          id: input.senderID,
          results: locations,
          mode: "current",
        });
      } catch (error: any) {
        console.error(
          "Weather API Error:",
          error.response?.data || error.message
        );
        return output.error(
          `❌ Failed to fetch locations or weather. Try again later.`
        );
      }
    },
  },
  {
    key: "forecast",
    description:
      "Get 5-day weather forecast for a location (searches first, interactive if multiple)",
    args: ["[location]"],
    aliases: ["-f", "5day"],
    icon: "📅",
    async handler({ input, output }, { spectralArgs, key }) {
      const locationQuery = spectralArgs[0];

      if (!locationQuery) {
        return output.reply(
          `❌ Please provide a location. Usage: ${input.prefix}${meta.name} ${key} [location]`
        );
      }

      try {
        const locResponse = await axios.get(NOMINATIM_CONFIG.BASE_URL, {
          params: {
            q: locationQuery,
            format: "json",
            limit: NOMINATIM_CONFIG.SEARCH_LIMIT,
            addressdetails: 1,
          },
          headers: { "User-Agent": "CassidyAstral/1.0" },
        });

        const locations: NominatimLocation[] = locResponse.data;
        if (!locations.length) {
          return output.reply(
            `❌ No location found for "${locationQuery}". Try a more specific name.`
          );
        }

        if (locations.length === 1) {
          const selectedLocation = locations[0];
          const lat = parseFloat(selectedLocation.lat);
          const lon = parseFloat(selectedLocation.lon);
          const city =
            selectedLocation.address.city ||
            selectedLocation.address.town ||
            "Unknown";
          const country = selectedLocation.address.country;
          const fullName = `${city}, ${country}`;

          const forecastResponse = await axios.get(OPEN_METEO_CONFIG.BASE_URL, {
            params: {
              latitude: lat,
              longitude: lon,
              daily: "weathercode,temperature_2m_min,temperature_2m_max",
              timezone: OPEN_METEO_CONFIG.TIMEZONE,
              forecast_days: 5,
            },
          });

          const forecastData: OpenMeteoResponse = forecastResponse.data;
          const daily = forecastData.daily;
          if (!daily || !daily.time.length) {
            return output.reply(
              `❌ No forecast data available for ${fullName}.`
            );
          }

          const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.2);
          await canv.drawBackground();

          const container = CanvCass.createRect({
            centerY: canv.centerY,
            centerX: canv.centerX,
            height: canv.height / 1.5,
            width: canv.width,
          });

          canv.drawBox({
            rect: container,
            fill: "rgba(0, 0, 0, 0.5)",
          });

          const lines = CanvCass.lineYs(container.height, 6);
          const d = lines[1] - lines[0];
          const margin = 80;
          const ymargin = 20;
          const dayHeight = d * 0.8;

          canv.drawText(`📅 5-Day Forecast: ${fullName}`, {
            fontType: "cbold",
            size: 50,
            x: container.left + margin,
            y: lines[0] + dayHeight / 2,
            vAlign: "middle",
            align: "left",
            fill: "white",
          });

          daily.time.forEach((date, index) => {
            const yBase = lines[1 + index] + dayHeight / 2;
            const dayDate = moment(date).format("MMM DD");
            const minTemp = daily.temperature_2m_min[index];
            const maxTemp = daily.temperature_2m_max[index];
            const code = daily.weathercode[index];
            const dayPhrase =
              OPEN_METEO_CONFIG.WEATHER_CODES[code] || "Unknown";

            canv.drawText(`${dayDate}`, {
              fontType: "cbold",
              size: 40,
              x: container.left + margin,
              y: yBase,
              vAlign: "middle",
              align: "left",
              fill: "rgba(255, 255, 255, 0.9)",
            });

            canv.drawText(`${minTemp}° / ${maxTemp}°C`, {
              fontType: "cbold",
              size: 45,
              x: canv.centerX,
              y: yBase,
              vAlign: "middle",
              align: "center",
              fill: "white",
            });

            canv.drawText(limitString(dayPhrase, 25), {
              fontType: "cbold",
              size: 35,
              x: container.right - margin,
              y: yBase,
              vAlign: "middle",
              align: "right",
              fill: "rgba(255, 255, 255, 0.8)",
            });
          });

          canv.drawText(`Powered by Open-Meteo`, {
            fontType: "cbold",
            size: 25,
            x: canv.centerX,
            y: container.bottom - ymargin,
            vAlign: "top",
            align: "center",
            fill: "rgba(255, 255, 255, 0.6)",
          });

          canv.drawText(`☀️`, {
            fontType: "cbold",
            size: 60,
            x: canv.right - 80,
            y: container.top + 80,
            align: "center",
            fill: "rgba(255, 255, 0, 0.6)",
          });

          const forecastList = daily.time
            .map((date, index) => {
              const dayDate = moment(date).format("MMM DD");
              const minTemp = daily.temperature_2m_min[index];
              const maxTemp = daily.temperature_2m_max[index];
              const code = daily.weathercode[index];
              const dayPhrase =
                OPEN_METEO_CONFIG.WEATHER_CODES[code] || "Unknown";
              return `${dayDate}: ${minTemp}°C / ${maxTemp}°C - ${limitString(
                dayPhrase,
                30
              )}`;
            })
            .join("\n");

          const body =
            `${UNIRedux.arrow} **5-Day Forecast for ${fullName}** 📅\n\n` +
            `${forecastList}\n\n` +
            `🚂 **Astral Express Network**`;

          return output.reply({
            body,
            attachment: await canv.toStream(),
          });
        }

        const canv = new CanvCass(CanvCass.preW, CanvCass.preH);
        await canv.drawBackground();

        const container = CanvCass.createRect({
          centerY: canv.centerY,
          centerX: canv.centerX,
          height: canv.height / 1.5,
          width: canv.width,
        });

        canv.drawBox({
          rect: container,
          fill: "rgba(0, 0, 0, 0.5)",
        });

        const lines = CanvCass.lineYs(container.height, locations.length + 2);
        const d = lines[1] - lines[0];
        const margin = 80;
        const ymargin = 20;
        const itemHeight = d * 0.9;

        canv.drawText(
          `🔍 Matches for "${locationQuery}" - Pick one for 5-Day Forecast`,
          {
            fontType: "cbold",
            size: 45,
            x: container.left + margin,
            y: lines[0] + itemHeight / 2,
            vAlign: "middle",
            align: "left",
            fill: "white",
          }
        );

        locations.forEach((loc, index) => {
          const yBase = lines[1 + index] + itemHeight / 2;
          const city = loc.address.city || loc.address.town || "Unknown";
          const country = loc.address.country;
          const fullName = limitString(`${city}, ${country}`, 40);

          canv.drawText(`${index + 1}. ${fullName}`, {
            fontType: "cbold",
            size: 40,
            x: container.left + margin,
            y: yBase,
            vAlign: "middle",
            align: "left",
            fill: "rgba(255, 255, 255, 0.9)",
          });
        });

        canv.drawText(`Reply with the number to select (e.g., "1")`, {
          fontType: "cbold",
          size: 30,
          x: canv.centerX,
          y: container.bottom - ymargin,
          vAlign: "top",
          align: "center",
          fill: "rgba(255, 255, 255, 0.7)",
        });

        canv.drawText(`📅`, {
          fontType: "cbold",
          size: 70,
          x: canv.right - 90,
          y: container.top + 80,
          align: "center",
          fill: "rgba(255, 165, 0, 0.8)",
        });

        const locationList = locations
          .map((loc, index) => {
            const city = loc.address.city || loc.address.town || "Unknown";
            const country = loc.address.country;
            return `${index + 1}. ${city}, ${country}`;
          })
          .join("\n");

        const body =
          `${UNIRedux.arrow} **Location Matches for "${locationQuery}"** 🔍\n\n` +
          `${locationList}\n\n` +
          `**Next:** Reply with the number (e.g., "1") to get 5-day forecast for that location.\n\n` +
          `🚂 **Astral Express Network**`;

        const messageInfo = await output.reply({
          body,
          attachment: await canv.toStream(),
        });

        input.setReply(messageInfo.messageID, {
          key: "weather",
          id: input.senderID,
          results: locations,
          mode: "forecast",
        });

        return;
      } catch (error: any) {
        console.error(
          "Weather API Error:",
          error.response?.data || error.message
        );
        return output.error(
          `❌ Failed to fetch locations or weather. Try again later.`
        );
      }
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: true,
    globalCooldown: 3,
    errorHandler: (error: any, ctx: any) => {
      ctx.output.error(error);
    },
    defaultCategory: "Utility",
  },
  configs
);

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});

export async function reply({ input, output, repObj, detectID }: any) {
  const { id, results, mode } = repObj;

  if (input.senderID !== id || !results) {
    return;
  }

  let subMode = mode;
  let selectionInput = input.body.trim();

  if (mode === "search") {
    const parts = selectionInput.split(/\s+/);
    if (parts.length >= 2) {
      const numPart = parts[0];
      const commandPart = parts[1].toLowerCase();
      selectionInput = numPart;
      subMode = commandPart === "current" ? "current" : "forecast";
    } else {
      await output.react("🔢");
      return output.reply(
        "❌ For search, reply with 'number current' or 'number forecast' (e.g., '1 current')."
      );
    }
  }

  const selection = parseInt(selectionInput);
  if (isNaN(selection) || selection < 1 || selection > results.length) {
    await output.react("🔢");
    return output.reply(
      `❌ Please select a number between 1 and ${results.length}.`
    );
  }

  const selectedLocation: NominatimLocation = results[selection - 1];
  if (!selectedLocation) {
    await output.react("😕");
    return output.reply(`❌ Invalid selection.`);
  }

  input.delReply(String(detectID));

  const lat = parseFloat(selectedLocation.lat);
  const lon = parseFloat(selectedLocation.lon);
  const city =
    selectedLocation.address.city || selectedLocation.address.town || "Unknown";
  const country = selectedLocation.address.country;
  const fullName = `${city}, ${country}`;

  try {
    let body = "";
    let attachment = null;

    if (subMode === "current") {
      await output.react("☀️");
      await output.reply(`🌤️ Fetching current weather for ${fullName}...`);

      const weatherResponse = await axios.get(OPEN_METEO_CONFIG.BASE_URL, {
        params: {
          latitude: lat,
          longitude: lon,
          current:
            "temperature_2m,apparent_temperature,weathercode,relative_humidity_2m,windspeed_10m",
          timezone: OPEN_METEO_CONFIG.TIMEZONE,
        },
      });

      const weatherData: OpenMeteoResponse = weatherResponse.data;
      if (!weatherData.current) {
        await output.react("😕");
        return output.reply(
          `❌ No current weather data available for ${fullName}.`
        );
      }

      const current = weatherData.current;
      const temp = current.temperature_2m;
      const feelsLike = current.apparent_temperature;
      const weatherCode = current.weathercode;
      const weatherText =
        OPEN_METEO_CONFIG.WEATHER_CODES[weatherCode] || "Unknown conditions";
      const humidity = current.relative_humidity_2m || 0;
      const windSpeed = current.windspeed_10m || 0;
      const obsTime = moment(current.time)
        .tz(OPEN_METEO_CONFIG.TIMEZONE)
        .format("YYYY-MM-DD HH:mm:ss");

      const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.7);
      await canv.drawBackground();

      const container = CanvCass.createRect({
        centerY: canv.centerY,
        centerX: canv.centerX,
        height: canv.height / 1.5,
        width: canv.width,
      });

      canv.drawBox({
        rect: container,
        fill: "rgba(0, 0, 0, 0.5)",
      });

      const lines = CanvCass.lineYs(container.height, 4);
      const d = lines[1] - lines[0];

      const margin = 100;
      const ymargin = 20;

      canv.drawText(`🌤️ ${fullName}`, {
        fontType: "cbold",
        size: 50,
        x: container.left + margin,
        y: container.top + ymargin,
        vAlign: "bottom",
        align: "left",
        fill: "white",
      });

      canv.drawText(`${temp}°C`, {
        fontType: "cbold",
        size: 90,
        x: canv.right - 100,
        y: lines[2] + d / 2,
        vAlign: "middle",
        align: "right",
        fill: "white",
      });

      canv.drawText(`Feels like: ${feelsLike}°C`, {
        fontType: "cbold",
        size: 40,
        x: canv.centerX,
        y: lines[1] + d / 2 + 50,
        vAlign: "top",
        align: "center",
        fill: "rgba(255, 255, 255, 0.8)",
      });

      canv.drawText(`${weatherText}`, {
        fontType: "cbold",
        size: 45,
        x: container.left + margin,
        y: lines[2] + d / 2,
        vAlign: "middle",
        align: "left",
        fill: "rgba(255, 255, 255, 0.9)",
      });

      canv.drawText(`Humidity: ${humidity}% | Wind: ${windSpeed} km/h`, {
        fontType: "cbold",
        size: 35,
        x: container.left + margin,
        y: lines[3] + d / 2,
        vAlign: "middle",
        align: "left",
        fill: "rgba(255, 255, 255, 0.7)",
      });

      canv.drawText(`Observed: ${obsTime}`, {
        fontType: "cbold",
        size: 30,
        x: container.right - margin,
        y: container.bottom - ymargin,
        vAlign: "top",
        align: "right",
        fill: "rgba(255, 255, 255, 0.6)",
      });

      canv.drawText(`☀️`, {
        fontType: "cbold",
        size: 80,
        x: canv.right - 100,
        y: container.top + 100,
        align: "center",
        fill: "rgba(255, 255, 0, 0.8)",
      });

      attachment = await canv.toStream();

      body =
        `${UNIRedux.arrow} **Current Weather in ${fullName}** ☀️\n\n` +
        `🌡️ **Temperature:** ${temp}°C (Feels like: ${feelsLike}°C)\n` +
        `☁️ **Conditions:** ${weatherText}\n` +
        `💧 **Humidity:** ${humidity}%\n` +
        `💨 **Wind:** ${windSpeed} km/h\n` +
        `📅 **Observed:** ${obsTime}\n\n` +
        `🚂 **Astral Express Network**`;
    } else if (subMode === "forecast") {
      await output.react("📅");
      await output.reply(`📅 Fetching 5-day forecast for ${fullName}...`);

      const forecastResponse = await axios.get(OPEN_METEO_CONFIG.BASE_URL, {
        params: {
          latitude: lat,
          longitude: lon,
          daily: "weathercode,temperature_2m_min,temperature_2m_max",
          timezone: OPEN_METEO_CONFIG.TIMEZONE,
          forecast_days: 5,
        },
      });

      const forecastData: OpenMeteoResponse = forecastResponse.data;
      const daily = forecastData.daily;
      if (!daily || !daily.time.length) {
        await output.react("😕");
        return output.reply(`❌ No forecast data available for ${fullName}.`);
      }

      const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.2);
      await canv.drawBackground();

      const container = CanvCass.createRect({
        centerY: canv.centerY,
        centerX: canv.centerX,
        height: canv.height / 1.5,
        width: canv.width,
      });

      canv.drawBox({
        rect: container,
        fill: "rgba(0, 0, 0, 0.5)",
      });

      const lines = CanvCass.lineYs(container.height, 6);
      const d = lines[1] - lines[0];
      const margin = 80;
      const ymargin = 20;
      const dayHeight = d * 0.8;

      canv.drawText(`📅 5-Day Forecast: ${fullName}`, {
        fontType: "cbold",
        size: 50,
        x: container.left + margin,
        y: lines[0] + dayHeight / 2,
        vAlign: "middle",
        align: "left",
        fill: "white",
      });

      daily.time.forEach((date, index) => {
        const yBase = lines[1 + index] + dayHeight / 2;
        const dayDate = moment(date).format("MMM DD");
        const minTemp = daily.temperature_2m_min[index];
        const maxTemp = daily.temperature_2m_max[index];
        const code = daily.weathercode[index];
        const dayPhrase = OPEN_METEO_CONFIG.WEATHER_CODES[code] || "Unknown";

        canv.drawText(`${dayDate}`, {
          fontType: "cbold",
          size: 40,
          x: container.left + margin,
          y: yBase,
          vAlign: "middle",
          align: "left",
          fill: "rgba(255, 255, 255, 0.9)",
        });

        canv.drawText(`${minTemp}° / ${maxTemp}°C`, {
          fontType: "cbold",
          size: 45,
          x: canv.centerX,
          y: yBase,
          vAlign: "middle",
          align: "center",
          fill: "white",
        });

        canv.drawText(limitString(dayPhrase, 25), {
          fontType: "cbold",
          size: 35,
          x: container.right - margin,
          y: yBase,
          vAlign: "middle",
          align: "right",
          fill: "rgba(255, 255, 255, 0.8)",
        });
      });

      canv.drawText(`Powered by Open-Meteo`, {
        fontType: "cbold",
        size: 25,
        x: canv.centerX,
        y: container.bottom - ymargin,
        vAlign: "top",
        align: "center",
        fill: "rgba(255, 255, 255, 0.6)",
      });

      canv.drawText(`☀️`, {
        fontType: "cbold",
        size: 60,
        x: canv.right - 80,
        y: container.top + 80,
        align: "center",
        fill: "rgba(255, 255, 0, 0.6)",
      });

      attachment = await canv.toStream();

      const forecastList = daily.time
        .map((date, index) => {
          const dayDate = moment(date).format("MMM DD");
          const minTemp = daily.temperature_2m_min[index];
          const maxTemp = daily.temperature_2m_max[index];
          const code = daily.weathercode[index];
          const dayPhrase = OPEN_METEO_CONFIG.WEATHER_CODES[code] || "Unknown";
          return `${dayDate}: ${minTemp}°C / ${maxTemp}°C - ${limitString(
            dayPhrase,
            30
          )}`;
        })
        .join("\n");

      body =
        `${UNIRedux.arrow} **5-Day Forecast for ${fullName}** 📅\n\n` +
        `${forecastList}\n\n` +
        `🚂 **Astral Express Network**`;
    }

    await output.reply({
      body,
      attachment,
    });
    await output.react("✅");
  } catch (error: any) {
    console.error(
      "Error processing weather:",
      error.message,
      error.response?.status,
      error.response?.data
    );
    await output.react("😕");
    return output.error(
      `❌ Failed to fetch ${subMode}. Error: ${error.message}`
    );
  }
}
