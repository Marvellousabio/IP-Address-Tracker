/* -------------- CONFIG -------------- */
const WEATHER_KEY = "cc8d4ddf081794f9f3775d929f80b51d"; // your OpenWeatherMap key

/* -------------- ELEMENTS -------------- */
const ipEl = document.getElementById("ip");
const locationEl = document.getElementById("location");
const timezoneEl = document.getElementById("timezone");
const ispEl = document.getElementById("isp");
const weatherEl = document.getElementById("weather");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const reload = document.getElementById("reload");
const errorEl = document.getElementById("error-message");

/* -------------- STATE -------------- */
let defaultIPData = null;

/* -------------- MAP -------------- */
let map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = null;

/* -------------- HELPERS -------------- */
function isIPAddress(input) {
  if (!input) return false;
  const ipRegex = /^(([0-9]{1,3}\.){3}[0-9]{1,3}|([a-f0-9:]+:+)+[a-f0-9]+)$/i;
  return ipRegex.test(input);
}

function showError(msg) {
  errorEl.textContent = msg;
  console.error(msg);
}

function clearError() {
  errorEl.textContent = "";
}

function setMarker(lat, lng, popup) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (marker) {
    marker.setLatLng([lat, lng]);
    marker.setPopupContent(popup || "");
  } else {
    marker = L.marker([lat, lng]).addTo(map);
    if (popup) marker.bindPopup(popup);
  }
  if (popup) marker.openPopup();
}

/* -------------- UI UPDATERS -------------- */
function updateFromIPApiData(data) {
  ipEl.textContent = data.ip || "N/A";
  locationEl.textContent = `${data.city || "N/A"}, ${data.region || ""} ${data.postal || ""}`.trim();
  timezoneEl.textContent = data.timezone || "N/A";
  ispEl.textContent = data.org || "N/A";
  const lat = (data.latitude !== undefined) ? Number(data.latitude) : (data.lat !== undefined ? Number(data.lat) : null);
  const lng = (data.longitude !== undefined) ? Number(data.longitude) : (data.lon !== undefined ? Number(data.lon) : null);
  if (lat && lng) {
    map.setView([lat, lng], 13);
    setMarker(lat, lng, `<b>${data.ip || ""}</b><br>${(data.city || "")}, ${(data.country_name || "")}`);
  }
  // weather will be fetched separately
}

function updateFromWeatherCity(weather) {
  ipEl.textContent = "N/A";
  locationEl.textContent = `${weather.name || "N/A"}, ${weather.sys?.country || ""}`.trim();
  // build timezone string from offset (seconds)
  const tzOffset = weather.timezone ?? 0;
  const sign = tzOffset >= 0 ? "+" : "-";
  const absOff = Math.abs(tzOffset);
  const hours = Math.floor(absOff / 3600);
  const mins = Math.floor((absOff % 3600) / 60);
  timezoneEl.textContent = `UTC${sign}${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
  ispEl.textContent = "N/A";
  const lat = weather.coord?.lat;
  const lng = weather.coord?.lon;
  if (lat && lng) {
    map.setView([lat, lng], 13);
    setMarker(lat, lng, `<b>${weather.name}</b><br>${weather.sys?.country || ""}`);
  }
  weatherEl.textContent = `${Math.round(weather.main.temp)}°C, ${weather.weather[0].description}`;
}

/* -------------- API CALLS -------------- */
async function getIPData(ip = "") {
  clearError();
  const url = ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : `https://ipapi.co/json/`;
  try {
    console.log("Fetching IP data from:", url);
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text().catch(()=>null);
      throw new Error(`ipapi error ${res.status} ${res.statusText} ${errBody || ""}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.reason || JSON.stringify(data));

    // Save default IP data only the first time (when no ip arg passed)
    if (!ip && !defaultIPData) {
      defaultIPData = data;
      console.log("Saved default IP data:", defaultIPData);
    }

    updateFromIPApiData(data);

    // Fetch weather if coordinates available
    const lat = Number(data.latitude ?? data.lat);
    const lon = Number(data.longitude ?? data.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      await getWeather(lat, lon);
    } else {
      showError("No coordinates available for this IP.");
    }
  } catch (err) {
    showError("Error fetching IP details. See console.");
    console.error(err);
  }
}

async function getWeather(lat, lon) {
  clearError();
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Invalid coordinates for weather");
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric`;
    console.log("Fetching weather from:", url);
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text().catch(()=>null);
      throw new Error(`openweather error ${res.status} ${res.statusText} ${errBody || ""}`);
    }
    const weather = await res.json();
    if (weather.cod && weather.cod !== 200) throw new Error(weather.message || "Weather error");
    weatherEl.textContent = `${Math.round(weather.main.temp)}°C, ${weather.weather[0].description}`;
  } catch (err) {
    weatherEl.textContent = "Weather unavailable";
    showError("Weather fetch failed. See console.");
    console.error(err);
  }
}

async function getWeatherByCity(city) {
  clearError();
  try {
    const q = encodeURIComponent(city);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${WEATHER_KEY}&units=metric`;
    console.log("Fetching weather by city from:", url);
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text().catch(()=>null);
      throw new Error(`openweather error ${res.status} ${res.statusText} ${errBody || ""}`);
    }
    const weather = await res.json();
    if (weather.cod && weather.cod !== 200) throw new Error(weather.message || "City not found");
    updateFromWeatherCity(weather);
  } catch (err) {
    showError("City not found or weather fetch failed.");
    console.error(err);
  }
}

/* -------------- INTERACTIONS -------------- */
function doSearch() {
  const input = searchInput.value.trim();
  if (!input) return;
  if (isIPAddress(input)) {
    getIPData(input);
  } else {
    getWeatherByCity(input);
  }
}

// button click
searchBtn.addEventListener("click", () => doSearch());

// Enter key on input
searchInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") doSearch();
});

// reload to default IP (no network call if default stored)
reload.addEventListener("click", (ev) => {
  ev.preventDefault();
  if (defaultIPData) {
    console.log("Restoring saved default IP data");
    updateFromIPApiData(defaultIPData);
    const lat = Number(defaultIPData.latitude ?? defaultIPData.lat);
    const lon = Number(defaultIPData.longitude ?? defaultIPData.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) getWeather(lat, lon);
  } else {
    console.log("No saved default data found; fetching now");
    getIPData(); // fallback: re-detect and save
  }
});

/* -------------- START: detect user's IP on load -------------- */
window.addEventListener("load", () => {
  getIPData(); // detect and save defaultIPData
});