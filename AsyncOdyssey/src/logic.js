/* ==========================================================================
   MÓDULO: logic.js
   Responsabilidad: Procesamiento de datos meteorológicos mediante programación
   funcional (filter, map, reduce) y gestión de la caché en localStorage.
   ========================================================================== */

const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // Validez de la caché: 10 minutos

/**
 * Transforma la lista de pronósticos crudos devuelta por OpenWeather.
 * @param {Array} rawForecastList - Array con las mediciones cada 3 horas.
 * @returns {object} - Objeto con las tarjetas procesadas y la probabilidad máxima de lluvia.
 */
export function processForecastData(rawForecastList = []) {
  // 1. FILTER: OpenWeather entrega 40 slots (5 días). Filtramos únicamente
  // los 8 primeros tramos, correspondientes a las próximas 24 horas del día.
  const next24Hours = rawForecastList.filter((_, index) => index < 8);

  // 2. MAP: Mapeamos los objetos crudos de la API a una estructura limpia con
  // solo lo que la interfaz necesita renderizar.
  const formattedCards = next24Hours.map((slot) => {
    // slot.dt es un timestamp Unix en segundos; lo multiplicamos por 1000 para Date
    const dateObj = new Date(slot.dt * 1000);
    const hour = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      hour: hour,
      temp: Math.round(slot.main.temp),
      description: slot.weather[0]?.description || "Sin descripción",
      icon: slot.weather[0]?.icon || "01d",
      // slot.pop (Probability of Precipitation) viene entre 0.0 y 1.0; lo convertimos a %
      rainProbability: Math.round((slot.pop || 0) * 100),
    };
  });

  // 3. REDUCE: Calculamos de forma agregada el valor pico de lluvia previsto
  // en las próximas horas recorriendo el array sin necesidad de bucles tradicionales.
  const maxRainProbability = formattedCards.reduce((highest, currentSlot) => {
    return currentSlot.rainProbability > highest ? currentSlot.rainProbability : highest;
  }, 0);

  return {
    cards: formattedCards,
    maxRainProbability: maxRainProbability,
  };
}

/**
 * Recupera datos de localStorage si existen y no han caducado.
 * @param {string} city - Nombre de la ciudad.
 * @returns {object|null}
 */
export function getCachedWeather(city) {
  const cacheKey = `weather_${city.trim().toLowerCase()}`;
  const rawData = localStorage.getItem(cacheKey);

  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData);
    const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRATION_MS;

    if (isExpired) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch {
    // Si los datos guardados están corruptos, limpiamos y evitamos que la app explote
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Guarda los datos meteorológicos en localStorage con timestamp actual.
 * @param {string} city - Nombre de la ciudad.
 * @param {object} data - Datos agrupados para persistir.
 */
export function setCachedWeather(city, data) {
  const cacheKey = `weather_${city.trim().toLowerCase()}`;
  const record = {
    timestamp: Date.now(),
    data: data,
  };
  localStorage.setItem(cacheKey, JSON.stringify(record));
}