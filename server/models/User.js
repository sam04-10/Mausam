const mongoose = require("mongoose");

const widgetSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: [
        "currentWeather",
        "hourlyForecast",
        "weeklyForecast",
        "aqi",
        "uvIndex",
        "humidityWind",
        "rainfall",
        "sunriseSunset",
        "recommendations",
      ],
    },
    visible: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    preferences: {
      temperatureUnit: {
        type: String,
        enum: ["Celsius", "Fahrenheit"],
        default: "Celsius",
      },

      windUnit: {
        type: String,
        enum: ["km/h", "mph"],
        default: "km/h",
      },

      theme: {
        type: String,
        enum: ["Light", "Dark"],
        default: "Light",
      },

      interest: {
        type: String,
        enum: ["General", "Farming", "Fitness", "Travel", "Commute"],
        default: "General",
      },

      savedCities: {
        type: [String],
        default: [],
      },

      widgets: {
        type: [widgetSchema],
        default: () => [
          { key: "currentWeather", visible: true, order: 1 },
          { key: "hourlyForecast", visible: true, order: 2 },
          { key: "weeklyForecast", visible: true, order: 3 },
          { key: "aqi", visible: true, order: 4 },
          { key: "uvIndex", visible: true, order: 5 },
          { key: "humidityWind", visible: true, order: 6 },
          { key: "rainfall", visible: true, order: 7 },
          { key: "sunriseSunset", visible: true, order: 8 },
          { key: "recommendations", visible: true, order: 9 },
        ],
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);