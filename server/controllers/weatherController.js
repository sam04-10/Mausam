const axios = require("axios");

const API_KEY = process.env.OPENWEATHER_API_KEY;

const getWeather = async (req, res) => {
  try {
    const city = String(req.query.city || "Mumbai").trim();
    const persona = String(req.query.persona || "daily").toLowerCase();

    if (!API_KEY) {
      return res.status(500).json({
        message: "OPENWEATHER_API_KEY is missing from the server .env file.",
      });
    }

    // Get current weather
    const currentResponse = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: city,
          appid: API_KEY,
          units: "metric",
        },
        timeout: 12000,
      }
    );

    const current = currentResponse.data;
    const { lat, lon } = current.coord;

    // Get five-day forecast
    const forecastResponse = await axios.get(
      "https://api.openweathermap.org/data/2.5/forecast",
      {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: "metric",
        },
        timeout: 12000,
      }
    );

    const forecastList = forecastResponse.data.list || [];

    // Get air pollution data
    let pollution = null;

    try {
      const pollutionResponse = await axios.get(
        "https://api.openweathermap.org/data/2.5/air_pollution",
        {
          params: {
            lat,
            lon,
            appid: API_KEY,
          },
          timeout: 10000,
        }
      );

      pollution = pollutionResponse.data.list?.[0] || null;
    } catch (error) {
      console.warn("Air pollution data unavailable.");
    }

    const hourlyForecast = forecastList.slice(0, 16).map((item) => ({
      time: item.dt_txt,
      dateTime: item.dt_txt,
      temperature: item.main.temp,
      feelsLike: item.main.feels_like,
      condition: item.weather?.[0]?.main || "Unknown",
      description: item.weather?.[0]?.description || "",
      icon: item.weather?.[0]?.icon || null,
      humidity: item.main.humidity,
      windSpeed: Number((item.wind.speed * 3.6).toFixed(1)),
      windDirection: item.wind.deg ?? null,
      visibility:
        item.visibility == null ? null : item.visibility / 1000,
      rainProbability: Math.round((item.pop || 0) * 100),
      rainfall: item.rain?.["3h"] || 0,
    }));

    // Group forecast into days
    const groupedDays = {};

    forecastList.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];

      if (!groupedDays[date]) {
        groupedDays[date] = [];
      }

      groupedDays[date].push(item);
    });

    const weeklyForecast = Object.entries(groupedDays)
      .slice(0, 5)
      .map(([date, items]) => ({
        date,
        temperature: Number(
          (
            items.reduce((sum, item) => sum + item.main.temp, 0) /
            items.length
          ).toFixed(1)
        ),
        maxTemperature: Math.max(
          ...items.map((item) => item.main.temp_max)
        ),
        minTemperature: Math.min(
          ...items.map((item) => item.main.temp_min)
        ),
        condition:
          items[0]?.weather?.[0]?.main || "Unknown",
        description:
          items[0]?.weather?.[0]?.description || "",
        icon: items[0]?.weather?.[0]?.icon || null,
        rainProbability: Math.round(
          Math.max(...items.map((item) => item.pop || 0)) * 100
        ),
      }));

    const components = pollution?.components || {};
    const aqi = pollution?.main?.aqi ?? null;

    const airQuality =
      {
        1: "Good",
        2: "Fair",
        3: "Moderate",
        4: "Poor",
        5: "Very Poor",
      }[aqi] || "Unavailable";

    const temperature = current.main.temp;
    const humidity = current.main.humidity;
    const windSpeed = Number((current.wind.speed * 3.6).toFixed(1));

    const visibility =
      current.visibility == null
        ? null
        : Number((current.visibility / 1000).toFixed(1));

    const rainProbability = hourlyForecast.length
      ? Math.max(...hourlyForecast.map((item) => item.rainProbability))
      : null;

    // General recommendations
    const recommendations = [];

    if (rainProbability >= 60) {
      recommendations.push(
        "Rain is likely during the forecast period. Carry an umbrella."
      );
    }

    if (temperature >= 35) {
      recommendations.push(
        "It is hot. Drink water and avoid prolonged exposure to direct sunlight."
      );
    }

    if (aqi !== null && aqi >= 4) {
      recommendations.push(
        "Air quality is poor. Consider reducing strenuous outdoor activity."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Check the hourly forecast before planning outdoor activities."
      );
    }

    // Runner recommendations
    const runningHours = hourlyForecast.filter((item) => {
      const hour = new Date(item.dateTime.replace(" ", "T")).getHours();

      return (
        (hour >= 5 && hour <= 9) ||
        (hour >= 17 && hour <= 19)
      );
    });

    const suitableRunningHours = runningHours.filter(
      (item) =>
        item.temperature <= 30 &&
        item.rainProbability < 40 &&
        item.windSpeed < 30 &&
        item.humidity < 85 &&
        (aqi === null || aqi <= 2)
    );

    let runningAdvice;

    if (aqi !== null && aqi >= 4) {
      runningAdvice =
        "Air quality is poor. Consider an indoor workout instead of running outdoors.";
    } else if (suitableRunningHours.length > 0) {
      const bestHour = suitableRunningHours[0];

      runningAdvice =
        `A potentially suitable running time is ${new Date(
          bestHour.dateTime.replace(" ", "T")
        ).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        })}. Forecast: ${bestHour.temperature}°C with ${bestHour.rainProbability}% rain probability.`;
    } else if (runningHours.length > 0) {
      runningAdvice =
        "No upcoming morning or evening slot meets all the selected running conditions. Check the hourly forecast and consider an indoor workout.";
    } else {
      runningAdvice =
        "The available forecast does not include a suitable morning or evening slot yet. Check again later.";
    }

    // Farmer recommendations
    const agrometAdvisories = [];

    if (rainProbability >= 60) {
      agrometAdvisories.push(
        "Rain is likely in the forecast. Check local agricultural advisories before irrigation or spraying."
      );
    } else {
      agrometAdvisories.push(
        "Use local soil conditions and official agricultural advisories to plan irrigation."
      );
    }

    if (windSpeed >= 20) {
      agrometAdvisories.push(
        "Wind speeds may affect spraying. Check local conditions before applying pesticides."
      );
    }

    // Commuter recommendations
    const commuteWarnings = [];

    if (rainProbability >= 60) {
      commuteWarnings.push(
        "Rain may affect your commute. Allow extra travel time."
      );
    }

    if (visibility !== null && visibility < 2) {
      commuteWarnings.push(
        "Visibility is low. Travel carefully."
      );
    }

    // Outdoor and health recommendations
    const outdoorRecommendations = [];

    if (temperature >= 35) {
      outdoorRecommendations.push(
        "Prefer cooler hours for outdoor exercise and stay hydrated."
      );
    }

    if (humidity >= 85) {
      outdoorRecommendations.push(
        "High humidity may make exercise uncomfortable."
      );
    }

    if (aqi !== null && aqi >= 4) {
      outdoorRecommendations.push(
        "Air quality is poor. Consider exercising indoors."
      );
    }

    // Select advice for the user's requested persona
    const personaAdvice = {
      runner: {
        title: "Your Running Outlook",
        message: runningAdvice,
      },
      farmer: {
        title: "Your Farming Outlook",
        message: agrometAdvisories.join(" "),
      },
      health: {
        title: "Your Health Outlook",
        message:
          aqi !== null && aqi >= 4
            ? "Air pollution is high. Limit strenuous outdoor activity."
            : temperature >= 35
              ? "High temperatures are expected. Stay hydrated and avoid prolonged sun exposure."
              : "Review air quality, temperature and humidity before outdoor activities.",
      },
      commuter: {
        title: "Your Commute Outlook",
        message:
          commuteWarnings.join(" ") ||
          "No major weather-related commute warning was detected from the available data.",
      },
      coastal: {
        title: "Your Coastal Outlook",
        message:
          "Check official marine and coastal weather bulletins before travelling to sea. Tide, wave and cyclone data are not provided by this weather endpoint.",
      },
      daily: {
        title: "Your Daily Outlook",
        message: recommendations.join(" "),
      },
    };

    const selectedAdvice =
      personaAdvice[persona] || personaAdvice.daily;

    const response = {
      city: current.name,
      country: current.sys.country,
      coordinates: current.coord,

      temperature,
      feelsLike: current.main.feels_like,
      condition: current.weather?.[0]?.main || "Unknown",
      description: current.weather?.[0]?.description || "",
      icon: current.weather?.[0]?.icon || null,

      humidity,
      windSpeed,
      windDirection: current.wind.deg ?? null,
      visibility,

      sunrise: current.sys.sunrise,
      sunset: current.sys.sunset,
      rainfall: current.rain?.["1h"] ?? 0,
      rainProbability,

      hourlyForecast,
      weeklyForecast,

      aqi,
      airQuality,
      pollutants: {
        pm2_5: components.pm2_5 ?? null,
        pm10: components.pm10 ?? null,
        no2: components.no2 ?? null,
      },

      recommendations,
      runningAdvice,
      agrometAdvisories,
      commuteWarnings,
      outdoorRecommendations,

      personalized: {
        persona,
        title: selectedAdvice.title,
        message: selectedAdvice.message,
      },

      // Additional providers are needed for these measurements.
      uvIndex: null,
      soilMoisture: null,
      evapotranspiration: null,
      tides: null,
      waveHeight: null,
      marineAdvisories: [],
      cycloneWarnings: [],
      alerts: null,
    };

// Compatibility fields for different frontend data shapes
response.current = {
  city: response.city,
  country: response.country,
  temperature: response.temperature,
  feelsLike: response.feelsLike,
  condition: response.condition,
  description: response.description,
  icon: response.icon,
  humidity: response.humidity,
  windSpeed: response.windSpeed,
  windDirection: response.windDirection,
  visibility: response.visibility,
};

response.airPollution = {
  aqi,
  airQuality,
  components: response.pollutants,
};

response.specialist = {
  agromet: agrometAdvisories,
  running: runningAdvice,
  commute: commuteWarnings,
  outdoor: outdoorRecommendations,
};

return res.json(response);
  } catch (error) {
    console.error(
      "Weather controller error:",
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      return res.status(404).json({
        message: "City not found. Enter a valid city name.",
      });
    }

    if (error.response?.status === 401) {
      return res.status(502).json({
        message:
          "OpenWeather rejected the API key. Check OPENWEATHER_API_KEY in server .env.",
      });
    }

    return res.status(500).json({
      message: "Unable to fetch weather information.",
      error: error.response?.data?.message || error.message,
    });
  }
};

module.exports = { getWeather };
