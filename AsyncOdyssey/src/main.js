/* ==========================================================================
   MÓDULO: main.js
   Responsabilidad: Punto de entrada principal (ES Module). Conecta eventos
   del usuario con la API, la lógica y el renderizado.
   ========================================================================== */

// Importación de módulos específicos respetando la separación de responsabilidades
import { fetchWeatherData } from "./api.js";
import { processForecastData, getCachedWeather, setCachedWeather } from "./logic.js";
import { showLoading, hideLoading, showError, renderWeather } from "./render.js";

// Referencias a los controles del formulario
const cityForm = document.getElementById("city-form");
const citySelect = document.getElementById("city-select");
const cityInput = document.getElementById("city-input");

/**
 * Flujo principal de la aplicación:
 * 1. Muestra estado de carga.
 * 2. Comprueba caché en localStorage.
 * 3. Si no hay caché, ejecuta fetchWeatherData con async/await.
 * 4. Transforma los datos con processForecastData (filter, map, reduce).
 * 5. Pinta en el DOM con renderWeather.
 * 6. Captura y muestra cualquier error que surja en el camino.
 * @param {string} city - Ciudad a consultar.
 */
async function loadWeather(city) {
  showLoading();

  try {
    let weatherData = getCachedWeather(city);

    // Si no está en caché o expiró, hacemos la petición HTTP
    if (!weatherData) {
      weatherData = await fetchWeatherData(city);
      setCachedWeather(city, weatherData);
    }

    // Transformación con métodos de array
    const processedForecast = processForecastData(weatherData.forecast.list);

    // Pintado en pantalla
    renderWeather(weatherData.current, processedForecast);
  } catch (error) {
    // Si la promesa es rechazada (error de red, 404, etc.), capturamos el mensaje
    showError(error.message || "Ha ocurrido un error inesperado al cargar los datos.");
  } finally {
    // El spinner siempre se oculta al finalizar, haya tenido éxito o fallo
    hideLoading();
  }
}

/* ==========================================================================
   EVENTOS DE USUARIO
   ========================================================================== */

// Evento 1: Envío del formulario (por botón o pulsando Enter)
cityForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const customCity = cityInput.value.trim();
  const selectedCity = citySelect.value;
  const target = customCity !== "" ? customCity : selectedCity;

  if (target) {
    loadWeather(target);
    cityInput.value = "";
  }
});

// Evento 2: Selección directa en el menú desplegable
citySelect.addEventListener("change", (e) => {
  if (e.target.value) {
    loadWeather(e.target.value);
  }
});

// Evento 3: Carga inicial de la aplicación (Madrid por defecto)
document.addEventListener("DOMContentLoaded", () => {
  loadWeather("Madrid");
});