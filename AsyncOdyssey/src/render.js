/* ==========================================================================
   MÓDULO: render.js
   Responsabilidad: Manipulación del DOM, inyección de HTML y actualización
   de los estados de retroalimentación (loading / error) exigidos en la rúbrica.
   ========================================================================== */

// Referencias a los elementos del DOM
const loadingSpinner = document.getElementById("loading-spinner");
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");

const currentCityEl = document.getElementById("current-city");
const currentTempEl = document.getElementById("current-temp");
const weatherDescEl = document.getElementById("weather-description");
const humidityValEl = document.getElementById("humidity-value");
const windValEl = document.getElementById("wind-value");
const rainValEl = document.getElementById("rain-value");
const forecastContainer = document.getElementById("forecast-container");

/**
 * Muestra el spinner de carga y oculta errores previos.
 */
export function showLoading() {
  loadingSpinner.classList.remove("hidden");
  errorBox.classList.add("hidden");
}

/**
 * Oculta el mensaje/spinner de carga.
 */
export function hideLoading() {
  loadingSpinner.classList.add("hidden");
}

/**
 * Muestra el cuadro de alerta con el texto descriptivo del fallo.
 * @param {string} message - Mensaje comprensible del error.
 */
export function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

/**
 * Renderiza todos los datos meteorológicos en la tarjeta principal.
 * @param {object} current - Datos del clima actual procedentes de OpenWeather.
 * @param {object} processedForecast - Datos procesados por logic.js.
 */
export function renderWeather(current, processedForecast) {
  // 1. Datos centrales
  currentCityEl.textContent = `${current.name}, ${current.sys.country}`;
  currentTempEl.textContent = Math.round(current.main.temp);
  weatherDescEl.textContent = current.weather[0]?.description || "";

  // 2. Parámetros secundarios (multiplicamos viento de m/s por 3.6 para km/h)
  humidityValEl.textContent = `${current.main.humidity}%`;
  windValEl.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
  rainValEl.textContent = `${processedForecast.maxRainProbability}%`;

  // 3. Previsiones horarias: generamos las tarjetas con .map()
  const cardsHtml = processedForecast.cards
    .map(
      (slot) => `
      <article class="forecast-card">
        <span class="forecast-time">${slot.hour}</span>
        <img 
          class="forecast-icon" 
          src="https://openweathermap.org/img/wn/${slot.icon}.png" 
          alt="${slot.description}" 
          title="${slot.description}" 
        />
        <span class="forecast-temp">${slot.temp}°C</span>
      </article>
    `
    )
    .join("");

  forecastContainer.innerHTML = cardsHtml;
}