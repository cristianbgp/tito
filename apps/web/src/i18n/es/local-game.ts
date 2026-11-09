export const localGameCopy = {
  title: "Conecta tu juego local",
  description:
    "Importa los héroes revelados de la selección mediante la integración del estado de juego de Dota cuando el juego los proporcione.",
  localOnly: "Solo en entorno local",
  hosted:
    "Este receptor está disponible al ejecutar Tito localmente. La versión alojada de Tito no acepta datos del juego.",
  setup: "Crear configuración del juego",
  settingUp: "Creando configuración…",
  download: "Descargar configuración",
  setupHelp:
    "Copia el archivo descargado en el directorio game/dota/cfg/gamestate_integration de Dota, agrega la opción de lanzamiento de abajo y reinicia el juego. Esta configuración no modifica los archivos del juego por ti.",
  tokenHelp:
    "La configuración contiene un token de conexión privado. Consérvalo en esta computadora. Vence después de cuatro horas o al reiniciar la API; crear un archivo nuevo revoca el token anterior.",
  check: "Comprobar conexión",
  connected: "Datos del juego recibidos",
  waiting: "Esperando al juego",
  stale: "Los últimos datos del juego están desactualizados",
  partial:
    "Falta información de la selección o aún no se ha revelado. La compatibilidad varía por modo; puedes seguir ingresando datos manualmente.",
  import: "Usar selecciones reveladas",
  imported:
    "Selecciones reveladas importadas. Revísalas antes de solicitar sugerencias.",
  importUnavailable:
    "Se requieren datos recientes de un equipo identificado. No se pueden importar de forma segura cinco selecciones aliadas sin identificar tu héroe.",
  noData:
    "Aún no se han recibido datos del juego. Los datos del menú principal y de la selección clasificatoria pueden omitir información de la selección.",
  setupLink: "Configurar integración del juego local",
  launchOption: "Opción de lanzamiento de Dota",
  receiver: "Receptor local",
  inspect: "Inspeccionar configuración privada",
  expires: "Vencimiento de la conexión",
  freshness:
    "La importación comprueba que se hayan recibido datos de un equipo identificado en los últimos 15 segundos. Solo completa la selección; debes solicitar las sugerencias de forma explícita.",
  checking: "Comprobando conexión local…",
  counts: (allies: number, enemies: number, bans: number) =>
    `${allies} aliados revelados · ${enemies} enemigos revelados · ${bans} vetos`,
  received: "Última recepción",
  importFailed:
    "No se pudo verificar el estado del juego local. Revisa la conexión e inténtalo de nuevo.",
  expired:
    "Esta configuración ya no está activa. Crea una nueva después de volver a conectarte.",
};
