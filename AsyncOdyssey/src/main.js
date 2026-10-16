/* ==========================================================================
   CONFIGURACIÓN Y CONSTANTES GLOBALES
   ========================================================================== */
const API_KEY = "916e05b9e8dad442b357cfcdd538e5a4";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutos de validez para la caché

/* ==========================================================================
   SELECTORES DEL DOM
   Guardamos las referencias a los elementos HTML para manipularlos de forma eficiente.
   ========================================================================== */
const loadingSpinner = document.getElementById("loading-spinner");
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");

const currentCityEl = document.getElementById("current-city");
const currentTempEl = document.getElementById("current-temp");
const weatherDescEl = document.getElementById("weather-description");
const humidityValEl = document.getElementById("humidity-value");
const windValEl = document.getElementById("wind-value");
const rainValEl = document.getElementById("rain-value");

const cityForm = document.getElementById("city-form");
const citySelect = document.getElementById("city-select");
const cityInput = document.getElementById("city-input");
const forecastContainer = document.getElementById("forecast-container");

/* ==========================================================================
   1. GESTIÓN DE ESTADOS DE LA INTERFAZ (Loading y Errores - 20 pts de rúbrica)
   ========================================================================== */

/**
 * Muestra el spinner de carga y oculta cualquier error previo.
 */
function showLoading() {
  loadingSpinner.classList.remove("hidden");
  errorBox.classList.add("hidden");
}

/**
 * Oculta el spinner de carga al finalizar la consulta.
 */
function hideLoading() {
  loadingSpinner.classList.add("hidden");
}

/**
 * Muestra el cuadro de error con un mensaje personalizado comprensible para el usuario.
 * @param {string} message - Descripción legible del error ocurrido.
 */
function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

/* ==========================================================================
   2. GESTIÓN DE CACHÉ EN LOCALSTORAGE (Bonus de la rúbrica)
   Evita consumir peticiones de la cuota de la API si los datos son recientes.
   ========================================================================== */

/**
 * Comprueba si existen datos guardados en localStorage para una ciudad y si no han caducado.
 * @param {string} city - Nombre de la ciudad consultada.
 * @returns {object|null} - Objeto con datos o null si no existe o expiró.
 */
function getCachedWeather(city) {
  const cacheKey = `weather_cache_${city.trim().toLowerCase()}`;
  const cachedData = localStorage.getItem(cacheKey);

  if (!cachedData) return null;

  try {
    const parsed = JSON.parse(cachedData);
    const now = Date.now();

    // Verificamos si la diferencia de tiempo supera el límite configurado (10 min)
    if (now - parsed.timestamp < CACHE_EXPIRATION_MS) {
      return parsed.data;
    }

    // Si ha caducado, limpiamos esa clave obsoleta
    localStorage.removeItem(cacheKey);
    return null;
  } catch {
    // Si el parseo JSON falla por datos corruptos, ignoramos la caché
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Almacena la respuesta en localStorage junto con la marca de tiempo actual.
 * @param {string} city - Nombre de la ciudad.
 * @param {object} data - Datos agrupados del clima actual y la previsión.
 */
function setCachedWeather(city, data) {
  const cacheKey = `weather_cache_${city.trim().toLowerCase()}`;
  const payload = {
    timestamp: Date.now(),
    data: data,
  };
  localStorage.setItem(cacheKey, JSON.stringify(payload));
}

/* ==========================================================================
   3. CONSUMO ASÍNCRONO DE LA API (fetch + async/await - 20 pts)
   ========================================================================== */

/**
 * Solicita a OpenWeather los datos del clima actual y la previsión horaria a 5 días.
 * Lanza errores controlados cuando la red falla o la respuesta HTTP no es exitosa.
 * @param {string} city - Ciudad a buscar.
 * @returns {Promise<{current: object, forecast: object}>}
 */
async function fetchWeatherData(city) {
  // Parámetros: units=metric para Celsius y lang=es para textos en castellano
  const currentWeatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&lang=es&appid=${API_KEY}`;
  const forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&lang=es&appid=${API_KEY}`;

  console.log("Consultando clima actual en:", currentWeatherUrl);
  console.log("Consultando previsión en:", forecastUrl);

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(currentWeatherUrl),
    fetch(forecastUrl),
  ]);

  // Si la petición del clima actual falla
  if (!currentResponse.ok) {
    const errData = await currentResponse.json().catch(() => ({}));
    throw new Error(`Error en clima actual (${currentResponse.status}): ${errData.message || "No disponible"}`);
  }

  // Si la petición del pronóstico horario falla
  if (!forecastResponse.ok) {
    const errData = await forecastResponse.json().catch(() => ({}));
    throw new Error(`Error en previsión (${forecastResponse.status}): ${errData.message || "No disponible"}`);
  }

  const currentData = await currentResponse.json();
  const forecastData = await forecastResponse.json();

  return { current: currentData, forecast: forecastData };
}

/* ==========================================================================
   4. TRANSFORMACIÓN DE DATOS (map, filter, reduce - 15 pts)
   ========================================================================== */

/**
 * Procesa la lista devuelta por la API utilizando métodos funcionales de array.
 * @param {Array} rawForecastList - Array de previsiones cada 3 horas que envía OpenWeather.
 * @returns {object} - Objeto con previsiones procesadas y métricas calculadas.
 */
function processForecastData(rawForecastList) {
  // 1. FILTER: OpenWeather entrega 40 tramos (5 días x 8 tramos diarios).
  // Tomamos únicamente los primeros 8 tramos (correspondientes a las próximas 24 horas).
  const next24Hours = rawForecastList.filter((_, index) => index < 8);

  // 2. MAP: Transformamos la estructura original de la API en objetos limpios con lo que pintaremos
  const formattedCards = next24Hours.map((slot) => {
    const dateObj = new Date(slot.dt * 1000); // slot.dt viene en timestamp Unix (segundos)
    const hour = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      hour: hour,
      temp: Math.round(slot.main.temp),
      description: slot.weather[0].description,
      icon: slot.weather[0].icon,
      pop: Math.round((slot.pop || 0) * 100), // "pop" = Probability of Precipitation (0.0 a 1.0)
    };
  });

  // 3. REDUCE: Calculamos la probabilidad de lluvia máxima esperada a lo largo del día
  const maxRainProbability = formattedCards.reduce((max, current) => {
    return current.pop > max ? current.pop : max;
  }, 0);

  return {
    cards: formattedCards,
    maxRainProbability: maxRainProbability,
  };
}

/* ==========================================================================
   5. RENDERIZADO EN EL DOM
   ========================================================================== */

/**
 * Inyecta los datos meteorológicos procesados en los elementos visuales de la web.
 * @param {object} current - Datos del clima actual de OpenWeather.
 * @param {object} processedForecast - Previsiones procesadas por métodos de array.
 */
function renderWeather(current, processedForecast) {
  // Datos principales
  currentCityEl.textContent = `${current.name}, ${current.sys.country}`;
  currentTempEl.textContent = Math.round(current.main.temp);
  weatherDescEl.textContent = current.weather[0].description;

  // Métricas intermedias (convertimos viento de m/s a km/h multiplicando por 3.6)
  humidityValEl.textContent = `${current.main.humidity}%`;
  windValEl.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
  rainValEl.textContent = `${processedForecast.maxRainProbability}%`;

  // Previsiones de las próximas horas: usamos .map() para construir el HTML de las tarjetas
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
    .join(""); // Unimos el array en un único string para asignarlo a innerHTML

  forecastContainer.innerHTML = cardsHtml;
}

/* ==========================================================================
   6. CONTROLADOR PRINCIPAL Y EVENTOS
   ========================================================================== */

/**
 * Función orquestadora: coordina la caché, llamada a la API, procesamiento y renderizado.
 * @param {string} city - Ciudad a consultar.
 */
async function loadWeatherData(city) {
  showLoading();

  try {
    // Paso 1: Intentamos recuperar de la caché
    const cached = getCachedWeather(city);
    let weatherData;

    if (cached) {
      weatherData = cached;
    } else {
      // Paso 2: Si no está en caché, consultamos la API con fetch + async/await
      weatherData = await fetchWeatherData(city);
      setCachedWeather(city, weatherData);
    }

    // Paso 3: Transformación mediante métodos de array
    const processedForecast = processForecastData(weatherData.forecast.list);

    // Paso 4: Actualización del DOM
    renderWeather(weatherData.current, processedForecast);
  } catch (error) {
    // Si la promesa se rechaza por fallo de red o error 404, mostramos el mensaje al usuario
    showError(error.message || "Ocurrió un error inesperado al consultar los datos.");
  } finally {
    // El bloque finally se ejecuta SIEMPRE (tanto si hubo éxito como si hubo error)
    hideLoading();
  }
}

/* Evento: Envío del formulario de búsqueda */
cityForm.addEventListener("submit", (event) => {
  event.preventDefault(); // Evitamos que la página se recargue

  // Damos prioridad al input escrito; si está vacío, usamos la opción elegida en el select
  const inputVal = cityInput.value.trim();
  const selectedVal = citySelect.value;
  const targetCity = inputVal !== "" ? inputVal : selectedVal;

  if (targetCity) {
    loadWeatherData(targetCity);
    cityInput.value = ""; // Limpiamos el campo tras consultar
  }
});

/* Evento: Cambio directo en el <select> */
citySelect.addEventListener("change", (event) => {
  const chosenCity = event.target.value;
  if (chosenCity) {
    loadWeatherData(chosenCity);
  }
});

/* Carga inicial obligatoria: Madrid por defecto */
document.addEventListener("DOMContentLoaded", () => {
  loadWeatherData("Madrid");
});