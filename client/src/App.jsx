import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

const PERSONAS = [
  { id: "runner", name: "Runner", icon: "🏃", description: "Best running times, rain and air quality" },
  { id: "farmer", name: "Farmer", icon: "🌱", description: "Rainfall, wind and farming advice" },
  { id: "health", name: "Health Sensitive", icon: "🫁", description: "Air pollution, heat and humidity" },
  { id: "commuter", name: "Daily Commuter", icon: "🚗", description: "Rain, visibility and travel warnings" },
  { id: "coastal", name: "Coastal / Fisherman", icon: "🌊", description: "Coastal safety guidance" },
  { id: "daily", name: "Everyday Weather", icon: "🌤️", description: "General weather and daily tips" },
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("mausamToken") || "");
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("runner");
  const [city, setCity] = useState("Mumbai");
  const [cityInput, setCityInput] = useState("Mumbai");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("Today");

  const selectedPersona =
    PERSONAS.find((item) => item.id === persona) || PERSONAS[5];

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function authenticate(event) {
    event.preventDefault();
    setMessage("");

    try {
      const endpoint =
        mode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        mode === "register"
          ? { name, email, password, persona, city }
          : { email, password };

      const data = await request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newToken = data.token || data.accessToken;

      if (!newToken) {
        throw new Error(
          "Authentication succeeded but no token was returned. Check your auth route response."
        );
      }

      localStorage.setItem("mausamToken", newToken);
      setToken(newToken);

      const returnedUser = data.user || data;

      setUser(returnedUser);
      setPersona(returnedUser.persona || persona);
      setCity(returnedUser.city || city);
      setCityInput(returnedUser.city || city);
      setMessage("");

    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadProfile() {
    try {
      const data = await request("/users/profile");
      const profile = data.user || data.profile || data;

      setUser(profile);
      setPersona(profile.persona || "daily");
      setCity(profile.city || "Mumbai");
      setCityInput(profile.city || "Mumbai");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadWeather(cityName = city, personaName = persona) {
    if (!token) return;

    setLoading(true);
    setMessage("");

    try {
      const query = new URLSearchParams({
        city: cityName,
        persona: personaName,
      });

      const data = await request(`/weather?${query.toString()}`);

      setWeather(data);
      setCity(data.city || cityName);
      setCityInput(data.city || cityName);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      const data = await request("/users/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: user?.name || name,
          persona,
          city,
        }),
      });

      setUser(data.user || data.profile || data);
      setMessage("Your preferences have been saved.");

      await loadWeather(city, persona);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("mausamToken");
    setToken("");
    setUser(null);
    setWeather(null);
    setMessage("");
    setPassword("");
  }

  function searchCity(event) {
    event.preventDefault();

    const nextCity = cityInput.trim();

    if (!nextCity) return;

    setCity(nextCity);
    loadWeather(nextCity, persona);
  }

  function changePersona(event) {
    const nextPersona = event.target.value;

    setPersona(nextPersona);

    if (weather) {
      loadWeather(city, nextPersona);
    }
  }

  useEffect(() => {
    if (token) {
      loadProfile();
    }
    // Load profile when the saved login token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && user) {
      loadWeather(city, persona);
    }
    // Refresh weather when the initial profile has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const current = weather?.current || weather || {};

  const temperature =
    current.temperature ?? current.temp ?? current.main?.temp;

  const feelsLike =
    current.feelsLike ?? current.feels_like ?? current.main?.feels_like;

  const humidity =
    current.humidity ?? current.main?.humidity;

  const windSpeed =
    current.windSpeed ?? current.wind_speed;

  const visibility = current.visibility;

  const condition =
    current.description || current.condition || "Weather information";

  const airPollution =
    weather?.airPollution || {};

  const pollutants =
    weather?.pollutants || airPollution.components || {};

  const aqi =
    weather?.aqi ?? airPollution.aqi ?? null;

  const airQuality =
    weather?.airQuality || airPollution.airQuality || "Unavailable";

  const forecast =
    weather?.hourlyForecast || weather?.forecast || [];

  const weeklyForecast =
    weather?.weeklyForecast || [];

  const advice =
    weather?.personalized || {};

  const recommendations =
    weather?.recommendations || [];

  const specialist =
    weather?.specialist || {};

  const runningAdvice =
    weather?.runningAdvice || specialist.running || "";

  const personaMessage =
    advice.message ||
    (persona === "runner"
      ? runningAdvice
      : persona === "farmer"
        ? (weather?.agrometAdvisories || specialist.agromet || []).join(" ")
        : persona === "commuter"
          ? (weather?.commuteWarnings || specialist.commute || []).join(" ")
          : recommendations.join(" ")) ||
    "Check the latest forecast before planning your day.";

  function formatTime(value) {
    if (!value) return "--";

    const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDay(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function weatherIcon(icon) {
    return icon
      ? `https://openweathermap.org/img/wn/${icon}@2x.png`
      : null;
  }

  function Card({ title, children, className = "" }) {
    return (
      <section className={`card ${className}`}>
        <h3>{title}</h3>
        {children}
      </section>
    );
  }

  function renderPersonalizedWidgets() {
    if (persona === "runner") {
      return (
        <>
          <Card title="🏃 Your Running Outlook" className="highlight-card">
            <p>{personaMessage}</p>
            <div className="metric-grid">
              <div>
                <span>Temperature</span>
                <strong>{temperature ?? "--"}°C</strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>{humidity ?? "--"}%</strong>
              </div>
              <div>
                <span>Air quality</span>
                <strong>{airQuality}</strong>
              </div>
              <div>
                <span>Rain probability</span>
                <strong>
                  {weather?.rainProbability == null
                    ? "--"
                    : `${weather.rainProbability}%`}
                </strong>
              </div>
            </div>
            <p className="muted">
              Suggested times are based on the available forecast, not a guarantee
              of safe running conditions.
            </p>
          </Card>

          <Card title="🌅 Upcoming Running Hours">
            {forecast.length ? (
              <div className="forecast-row">
                {forecast.slice(0, 6).map((item, index) => (
                  <div className="forecast-item" key={`${item.time}-${index}`}>
                    <span>{formatTime(item.time || item.dateTime)}</span>
                    {weatherIcon(item.icon) && (
                      <img src={weatherIcon(item.icon)} alt="" />
                    )}
                    <strong>{item.temperature ?? "--"}°C</strong>
                    <small>
                      Rain {item.rainProbability ?? "--"}%
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p>Hourly forecast is not available.</p>
            )}
          </Card>

          <Card title="🌬️ Outdoor Conditions">
            <p>Feels like: {feelsLike ?? "--"}°C</p>
            <p>Wind: {windSpeed ?? "--"} km/h</p>
            <p>Air quality: {airQuality}</p>
            <p>
              PM2.5: {pollutants.pm2_5 ?? "--"} µg/m³
            </p>
          </Card>
        </>
      );
    }

    if (persona === "farmer") {
      const adviceList =
        weather?.agrometAdvisories || specialist.agromet || [];

      return (
        <>
          <Card title="🌱 Farming Outlook" className="highlight-card">
            <p>{personaMessage}</p>
            <div className="metric-grid">
              <div>
                <span>Rain probability</span>
                <strong>
                  {weather?.rainProbability == null
                    ? "--"
                    : `${weather.rainProbability}%`}
                </strong>
              </div>
              <div>
                <span>Wind speed</span>
                <strong>{windSpeed ?? "--"} km/h</strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>{humidity ?? "--"}%</strong>
              </div>
              <div>
                <span>Rainfall</span>
                <strong>{weather?.rainfall ?? "--"} mm</strong>
              </div>
            </div>
          </Card>

          <Card title="🚜 Agricultural Advisories">
            {adviceList.length ? (
              adviceList.map((item, index) => <p key={index}>• {item}</p>)
            ) : (
              <p>Use local soil conditions and official agricultural advice.</p>
            )}
            <p className="muted">
              Soil moisture and evapotranspiration require a specialist data
              provider and are not available from this weather feed.
            </p>
          </Card>
        </>
      );
    }

    if (persona === "health") {
      return (
        <>
          <Card title="🫁 Your Health Outlook" className="highlight-card">
            <p>{personaMessage}</p>
            <div className="metric-grid">
              <div>
                <span>Air quality</span>
                <strong>{airQuality}</strong>
              </div>
              <div>
                <span>AQI (OpenWeather scale)</span>
                <strong>{aqi ?? "--"}</strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>{humidity ?? "--"}%</strong>
              </div>
              <div>
                <span>Temperature</span>
                <strong>{temperature ?? "--"}°C</strong>
              </div>
            </div>
          </Card>

          <Card title="🧪 Air Pollution">
            <p>PM2.5: {pollutants.pm2_5 ?? "--"} µg/m³</p>
            <p>PM10: {pollutants.pm10 ?? "--"} µg/m³</p>
            <p>NO₂: {pollutants.no2 ?? "--"} µg/m³</p>
            <p className="muted">
              Pollution measurements may be unavailable. Check local official
              air-quality guidance if you have health concerns.
            </p>
          </Card>
        </>
      );
    }

    if (persona === "commuter") {
      const warnings =
        weather?.commuteWarnings || specialist.commute || [];

      return (
        <>
          <Card title="🚗 Your Commute Outlook" className="highlight-card">
            <p>{personaMessage}</p>
            <div className="metric-grid">
              <div>
                <span>Rain probability</span>
                <strong>
                  {weather?.rainProbability == null
                    ? "--"
                    : `${weather.rainProbability}%`}
                </strong>
              </div>
              <div>
                <span>Visibility</span>
                <strong>
                  {visibility == null ? "--" : `${visibility} km`}
                </strong>
              </div>
              <div>
                <span>Wind</span>
                <strong>{windSpeed ?? "--"} km/h</strong>
              </div>
              <div>
                <span>Temperature</span>
                <strong>{temperature ?? "--"}°C</strong>
              </div>
            </div>
          </Card>

          <Card title="⚠️ Travel Warnings">
            {warnings.length ? (
              warnings.map((item, index) => <p key={index}>• {item}</p>)
            ) : (
              <p>No major weather-related warning detected in the available data.</p>
            )}
          </Card>
        </>
      );
    }

    if (persona === "coastal") {
      return (
        <>
          <Card title="🌊 Coastal Outlook" className="highlight-card">
            <p>{personaMessage}</p>
            <p>
              Wind speed: {windSpeed ?? "--"} km/h
            </p>
            <p>
              Wind direction: {weather?.windDirection ?? "--"}°
            </p>
            <p className="muted">
              Tide timings, wave height and official cyclone alerts need
              additional marine data providers. Do not use this dashboard alone
              for decisions about going to sea.
            </p>
          </Card>
        </>
      );
    }

    return (
      <Card title="🌤️ Your Daily Weather Outlook" className="highlight-card">
        <p>{personaMessage}</p>
        {recommendations.map((item, index) => (
          <p key={index}>• {item}</p>
        ))}
      </Card>
    );
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">M</div>
          <h1>Mausam</h1>
          <p className="subtitle">Weather that understands your day.</p>

          <div className="auth-switch">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          <form onSubmit={authenticate}>
            {mode === "register" && (
              <>
                <label>Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />

                <label>Your city</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mumbai"
                  required
                />

                <label>What best describes you?</label>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  {PERSONAS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <button className="primary-button" type="submit">
              {mode === "register" ? "Create account" : "Login to Mausam"}
            </button>
          </form>

          {message && <p className="error-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>Mausam</h1>
            <span>Personalized weather</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="user-label">
            {user?.name || user?.email || "Welcome"}
          </span>
          <button className="secondary-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="welcome-section">
        <div>
          <p className="eyebrow">YOUR WEATHER, YOUR WAY</p>
          <h2>Hello{user?.name ? `, ${user.name}` : ""}!</h2>
          <p>Your homepage is tailored to your interests.</p>
        </div>

        <form className="city-search" onSubmit={searchCity}>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search city"
            aria-label="Search city"
          />
          <button className="primary-button" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="preferences-bar">
        <div>
          <label htmlFor="persona">Personalize your homepage</label>
          <select
            id="persona"
            value={persona}
            onChange={changePersona}
          >
            {PERSONAS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <button className="secondary-button" onClick={saveProfile}>
          Save preferences
        </button>
      </section>

      {message && (
        <div className="notice-message" role="status">
          {message}
        </div>
      )}

      <section className="hero-weather">
        <div className="hero-copy">
          <p className="eyebrow">
            {selectedPersona.icon} {selectedPersona.name.toUpperCase()} MODE
          </p>
          <h2>{city || weather?.city || "Your City"}</h2>
          <p className="condition">{condition}</p>
          <p className="feels-like">
            Feels like {feelsLike ?? "--"}°C
          </p>
        </div>

        <div className="hero-temperature">
          {weatherIcon(weather?.icon) && (
            <img src={weatherIcon(weather.icon)} alt={condition} />
          )}
          <strong>{temperature ?? "--"}°</strong>
          <span>Celsius</span>
        </div>
      </section>

      {loading && <p className="loading-message">Loading live weather...</p>}

      <section className="metric-grid main-metrics">
        <div className="metric-card">
          <span>Humidity</span>
          <strong>{humidity ?? "--"}%</strong>
        </div>
        <div className="metric-card">
          <span>Wind speed</span>
          <strong>{windSpeed ?? "--"} km/h</strong>
        </div>
        <div className="metric-card">
          <span>Visibility</span>
          <strong>{visibility == null ? "--" : `${visibility} km`}</strong>
        </div>
        <div className="metric-card">
          <span>Air quality</span>
          <strong>{airQuality}</strong>
        </div>
      </section>

      <nav className="dashboard-tabs">
        {["Today", "Forecast", "Personalized"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Today" && (
        <section className="widget-grid">
          {renderPersonalizedWidgets()}
        </section>
      )}

      {activeTab === "Forecast" && (
        <>
          <Card title="📅 Five-Day Forecast">
            <div className="forecast-row">
              {weeklyForecast.map((item) => (
                <div className="forecast-item" key={item.date}>
                  <span>{formatDay(item.date)}</span>
                  {weatherIcon(item.icon) && (
                    <img src={weatherIcon(item.icon)} alt="" />
                  )}
                  <strong>{item.temperature ?? "--"}°C</strong>
                  <small>
                    {item.minTemperature ?? "--"}° / {item.maxTemperature ?? "--"}°
                  </small>
                  <small>Rain {item.rainProbability ?? "--"}%</small>
                </div>
              ))}
            </div>
          </Card>

          <Card title="🕒 Hourly Forecast">
            <div className="forecast-row">
              {forecast.slice(0, 8).map((item, index) => (
                <div className="forecast-item" key={`${item.time}-${index}`}>
                  <span>{formatTime(item.time || item.dateTime)}</span>
                  {weatherIcon(item.icon) && (
                    <img src={weatherIcon(item.icon)} alt="" />
                  )}
                  <strong>{item.temperature ?? "--"}°C</strong>
                  <small>Rain {item.rainProbability ?? "--"}%</small>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeTab === "Personalized" && (
        <section className="widget-grid">
          <Card title={`${selectedPersona.icon} ${selectedPersona.name} Preferences`}>
            <p>{selectedPersona.description}</p>
            <p>{personaMessage}</p>
            <button className="primary-button" onClick={saveProfile}>
              Save my interests
            </button>
          </Card>

          <Card title="Weather Data Status">
            <p>City: {weather?.city || city}</p>
            <p>Air quality: {airQuality}</p>
            <p>
              Rain probability:{" "}
              {weather?.rainProbability == null
                ? "--"
                : `${weather.rainProbability}%`}
            </p>
            <p className="muted">
              Specialist agricultural and marine data are not included unless
              their providers are configured.
            </p>
          </Card>
        </section>
      )}

      <footer className="footer">
        <p>
          Mausam uses weather forecasts to provide guidance. Always follow
          official alerts for severe weather and safety-critical decisions.
        </p>
      </footer>
    </main>
  );
}

export default App;
