
const API_KEY = "40b8a4db0c974ef59e3ffe2488837905";



// DOM Elements
const ipEl = document.getElementById("ip");
const locationEl = document.getElementById("location");
const timezoneEl = document.getElementById("timezone");
const ispEl = document.getElementById("isp");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");

// Initialize Map
let map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker;

// Fetch IP Data
async function getIPData(ip = "") {
  let url = `https://geo.ipify.org/api/v2/country,city?apiKey=${API_KEY}`;
  if (ip) url += `&ipAddress=${ip}`;

  try {
    const res = await fetch(url);
    console.log(await res.text());
    const data = await res.json();

    // Update Info Box
    ipEl.textContent = data.ip;
    locationEl.textContent = `${data.location.city}, ${data.location.region} ${data.location.postalCode}`;
    timezoneEl.textContent = `UTC ${data.location.timezone}`;
    ispEl.textContent = data.isp;

    // Update Map
    const lat = data.location.lat;
    const lng = data.location.lng;

    map.setView([lat, lng], 13);

    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map)
      .bindPopup(`<b>${data.ip}</b><br>${data.location.city}, ${data.location.country}`)
      .openPopup();
  } catch (err) {
    alert("Unable to get IP details.");
    console.error(err);
  }
}

// Search Button Event
searchBtn.addEventListener("click", () => {
  const ip = searchInput.value.trim();
  if (ip) {
    getIPData(ip);
  }
});

// Load user's IP location on page load
window.addEventListener("load", () => {
  getIPData();
});
