# Uso de IA
Herramienta utilizada: Gemini.

## Partes desarrolladas con IA:

Planteamiento de la estructura semántica inicial en index.html.

Esqueleto de estilos CSS para maquetación con variables y efectos visuales de tarjeta meteorológica.

Generación de las funciones base de llamada a la API y el desglose de responsabilidades en módulos ES independientes.

#### Prompts reales relevantes:

"El proyecto debe ser con vite, tengo una rubrica la cual vamos a usar. Vamos a empezar definiendo la estructura del HTML, quiero que sea una pagina pues eso, que sirva para consultar el tiempo la humedad etc, quiero que sea solo la pagina principal, en el centro la temperatura de la ciudad que esta seleccionada, que abajo de la temperatura puedas elegir al ciudad (por defecto seria madrid) y que abajo te aparezcan las previsiones para el dia, y un poquito mas arriba te aparezcan los parametros de humedad, viento probabilidad de lluvia..."

"vale, ahora vamos a desglosar el js en modulos, como habiamos dicho"

### Verificación y validación de lo generado:

Comprobación manual de endpoints en el navegador para verificar la respuesta en JSON de OpenWeather (cod: 200).

Inspección en DevTools (pestaña Red/Network) para constatar que los parámetros units=metric y lang=es devolvían temperaturas en grados Celsius y textos en español.

Pruebas de estrés de robustez introduciendo ciudades inexistentes para validar que saltaba el error 404 sin congelar la interfaz.

Verificación del comportamiento del localStorage mediante localStorage.clear() en la consola para confirmar el guardado y la expiración a los 10 minutos.

### Partes escritas o ajustadas manualmente:

Inserción y configuración de la API Key propia.

Depuración del error de servidor meteorológico identificando la necesidad de activar la clave y gestionar individualmente los fallos de /weather y /forecast.

Ajustes de selectores y enlaces de ruta en index.html para cumplir con la estructura interna de Vite.

## Autopsia
1. Peticiones simultáneas con Promise.all vs. API One Call 3.0
Decisión adoptada: Consultar en paralelo dos endpoints de la versión 2.5 (/weather para las condiciones actuales y /forecast para las próximas horas) orquestados mediante un único Promise.all.

Alternativa descartada: Utilizar el endpoint unificado One Call API 3.0 de OpenWeather, el cual entrega clima actual y pronóstico horario en una única llamada HTTP.

Motivo del descarte: Aunque la API One Call 3.0 reduce la cantidad de peticiones y simplifica el consumo, requiere introducir una tarjeta de crédito en la cuenta de OpenWeather para su activación, limitando la portabilidad y reproducción del proyecto en entornos académicos. La alternativa de dos llamadas concurrentes con Promise.all resuelve la necesidad manteniendo la gratuidad total y optimizando el tiempo de respuesta frente a llamadas secuenciales.

2. Filtrado de datos en el cliente con .filter() vs. Paginación en servidor
Decisión adoptada: Descargar el paquete completo de predicción (40 tramos equivalentes a 5 días) y aplicar .filter((_, index) => index < 8) en logic.js para procesar únicamente las próximas 24 horas en el navegador.

Alternativa descartada: Solicitar al servidor únicamente las horas deseadas mediante parámetros de consulta (query params como cnt=8).

Motivo del descarte: El endpoint /forecast gratuito de OpenWeather 2.5 no siempre respeta de forma determinista el parámetro de recuento por horas según la documentación estándar sin alterar la granularidad. Al traer la serie completa, el cliente asume el control del pipeline de datos mediante métodos de array, asegurando el cumplimiento estricto de la rúbrica (manipulación funcional en memoria) y dejando la estructura preparada para ampliar la vista a varios días sin incurrir en nuevas llamadas de red.