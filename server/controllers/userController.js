const User = require("../models/User");

const ALLOWED_INTERESTS = [
  "General",
  "Farming",
  "Fitness",
  "Travel",
  "Commute",
];

const ALLOWED_WIDGETS = [
  "currentWeather",
  "hourlyForecast",
  "weeklyForecast",
  "aqi",
  "uvIndex",
  "humidityWind",
  "rainfall",
  "sunriseSunset",
  "recommendations",
];

// Get profile and preferences
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({ message: "Unable to fetch profile" });
  }
};

// Update name and preferences
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      temperatureUnit,
      windUnit,
      theme,
      interest,
      savedCities,
      widgets,
    } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      user.name = name.trim();
    }

    if (temperatureUnit !== undefined) {
      if (!["Celsius", "Fahrenheit"].includes(temperatureUnit)) {
        return res.status(400).json({
          message: "Choose Celsius or Fahrenheit",
        });
      }

      user.preferences.temperatureUnit = temperatureUnit;
    }

    if (windUnit !== undefined) {
      if (!["km/h", "mph"].includes(windUnit)) {
        return res.status(400).json({
          message: "Choose km/h or mph",
        });
      }

      user.preferences.windUnit = windUnit;
    }

    if (theme !== undefined) {
      if (!["Light", "Dark"].includes(theme)) {
        return res.status(400).json({
          message: "Choose Light or Dark theme",
        });
      }

      user.preferences.theme = theme;
    }

    if (interest !== undefined) {
      if (!ALLOWED_INTERESTS.includes(interest)) {
        return res.status(400).json({
          message: "Choose a valid interest",
        });
      }

      user.preferences.interest = interest;
    }

    if (savedCities !== undefined) {
      if (
        !Array.isArray(savedCities) ||
        !savedCities.every(
          (city) => typeof city === "string" && city.trim().length > 0
        )
      ) {
        return res.status(400).json({
          message: "Saved cities must be a list of city names",
        });
      }

      user.preferences.savedCities = [
        ...new Set(savedCities.map((city) => city.trim())),
      ];
    }

    if (widgets !== undefined) {
      if (
        !Array.isArray(widgets) ||
        widgets.some(
          (widget) =>
            !widget ||
            typeof widget.key !== "string" ||
            !ALLOWED_WIDGETS.includes(widget.key) ||
            typeof widget.visible !== "boolean" ||
            !Number.isInteger(widget.order) ||
            widget.order < 1
        ) ||
        new Set(widgets.map((widget) => widget.key)).size !== widgets.length ||
        new Set(widgets.map((widget) => widget.order)).size !== widgets.length
      ) {
        return res.status(400).json({
          message: "Invalid widget settings",
        });
      }

      user.preferences.widgets = widgets.map((widget) => ({
        key: widget.key,
        visible: widget.visible,
        order: widget.order,
      }));
    }

    await user.save();

    res.json({
      message: "Profile and preferences updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};