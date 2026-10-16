/* ==========================================================================
   MÓDULO: api.js
   Responsabilidad: Realizar las peticiones HTTP asíncronas hacia OpenWeather
   y controlar los errores de red o códigos HTTP erróneos.
   ========================================================================== */

const API_KEY = "916e05b9e8dad442b357cfcdd538e5a4";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

/**
 * Consulta en paralelo el clima actual y el pronóstico de 5 días para una ciudad.
 * @param {string} city - Nombre de la localidad a consultar.
 * @returns {Promise<{current: object, forecast: object}>} - Datos crudos de la API.
 */
export async function fetchWeatherData(city) {
  // encodeURIComponent evita errores si el nombre incluye espacios o tildes (p. ej. "Las Rozas")
  const currentWeatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&lang=es&appid=${API_KEY}`;
  const forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&lang=es&appid=${API_KEY}`;

  // Ejecutamos ambas peticiones al mismo tiempo para no duplicar tiempos de espera
  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(currentWeatherUrl),
    fetch(forecastUrl),
  ]);

  // Si el tiempo actual no responde con éxito (HTTP 200-299)
  if (!currentResponse.ok) {
    const errorData = await currentResponse.json().catch(() => ({}));
    if (currentResponse.status === 404) {
      throw new Error(`La ciudad "${city}" no existe en el registro meteorológico.`);
    }
    throw new Error(`Error en el tiempo actual (${currentResponse.status}): ${errorData.message || "Fallo de conexión"}`);
  }

  // Si la previsión horaria no responde con éxito
  if (!forecastResponse.ok) {
    const errorData = await forecastResponse.json().catch(() => ({}));
    throw new Error(`Error en el pronóstico (${forecastResponse.status}): ${errorData.message || "Fallo de conexión"}`);
  }

  // Parseamos las dos respuestas a formato JSON utilizable
  const currentData = await currentResponse.json();
  const forecastData = await forecastResponse.json();

  return { current: currentData, forecast: forecastData };
}