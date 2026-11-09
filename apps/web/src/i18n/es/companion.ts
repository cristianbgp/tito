export const companionCopy = {
  installTitle: "Ten a Tito a mano.",
  installDescription:
    "Instala la app y consulta las referencias públicas de héroes sin conexión.",
  installApp: "Instalar Tito",
  installHelp:
    "La instalación abre Tito en su propia ventana cuando es compatible. La compatibilidad varía según el navegador.",
  installManual:
    "Usa la opción de tu navegador para instalar la app, agregarla al Dock o agregarla a la pantalla de inicio cuando esté disponible.",
  installUnsupported:
    "Este navegador no puede habilitar las referencias sin conexión aquí.",
  offlineTitle: "Referencias públicas sin conexión",
  offlineHelp:
    "Guarda el catálogo público de héroes y los recursos de la app en este dispositivo. La cuenta, la autenticación, el historial de partidas, las notas y las respuestas de IA nunca se agregan a la caché sin conexión.",
  enableOffline: "Habilitar referencias sin conexión",
  removeOffline: "Eliminar referencias sin conexión",
  openOffline: "Abrir referencia pública",
  offlineReady:
    "Las referencias públicas sin conexión están listas en este dispositivo.",
  offlineRemoved:
    "Referencias sin conexión eliminadas. Recarga para detener el service worker actual.",
  offlineFailed:
    "No se pudieron preparar las referencias sin conexión. Revisa tu conexión e inténtalo de nuevo.",
  journalTitle: "Tu cuaderno de partidas",
  journalDescription:
    "Revisa tus observaciones guardadas, roles confirmados y momentos marcados.",
  journalEmpty: "Aún no tienes notas ni marcadores guardados.",
  bookmarksOnly: "Solo momentos marcados",
  notesCount: (n: number) =>
    `${n} ${n === 1 ? "nota guardada" : "notas guardadas"}`,
  openMatch: "Abrir partida",
  noText: "Partida marcada",
  role: "Rol confirmado",
  moment: "Marcador de repetición",
  delete: "Eliminar",
  deleting: "Eliminando…",
  draftsTitle: "Tu historial de selecciones",
  draftsDescription:
    "Revisa tus opciones y lo que elegiste. El resultado de una partida no demuestra la calidad de la selección.",
  draftsEmpty:
    "Aún no hay selecciones guardadas. Guarda una captura desde el selector de héroes.",
  chooseHero: "Héroe elegido",
  noChoice: "Sin registrar",
  linkMatch: "Vincular tu partida",
  matchId: "ID de tu partida",
  save: "Guardar",
  saving: "Guardando…",
  saved: "Guardado.",
  chosenHelp:
    "Registra el héroe con el que jugaste y luego vincula una partida conservada de tu cuenta de Steam verificada.",
  compareTitle: "Dos partidas, lado a lado.",
  compareDescription:
    "Compara tus resúmenes de partidas conservados y, si quieres, carga la evidencia de las repeticiones.",
  firstMatch: "Primera partida",
  secondMatch: "Segunda partida",
  chooseMatch: "Elige una partida guardada",
  loadDetails: "Cargar comparación de repeticiones",
  compareEmpty: "Importa tu historial guardado para comparar tus partidas.",
  compareCaution:
    "Los distintos parches, roles, modos y duraciones pueden afectar estas cifras. Los valores desconocidos siguen sin estar disponibles.",
  sameMatch: "Elige dos partidas distintas.",
  summary: "Resumen",
  stat: "Estadística",
  game: "Partida",
  mode: "Modo",
  patch: "Parche",
  unknown: "No disponible",
  dataCoverage: "Cobertura de la repetición",
  purchaseTiming: "Tiempos de compra de objetos",
  minuteSamples: "Muestras por minuto",
  itemsHelp:
    "Los tiempos de compra describen compras registradas, no una combinación óptima de objetos. La falta de datos de repetición no equivale a cero.",
  localTitle: "Conecta tu juego local",
  localDescription:
    "Importa los héroes revelados de la selección mediante la integración del estado de juego de Dota cuando el juego los proporcione.",
  localOnly: "Solo en entorno local",
  localHosted:
    "Este receptor está disponible al ejecutar Tito localmente. La versión alojada de Tito no acepta datos del juego.",
  setup: "Crear configuración del juego",
  download: "Descargar configuración",
  setupHelp:
    "Copia el archivo descargado en el directorio game/dota/cfg/gamestate_integration de Dota, agrega la opción de lanzamiento de abajo y reinicia el juego. Esta configuración no modifica los archivos del juego por ti.",
  tokenHelp:
    "La configuración contiene un token de conexión privado. Consérvalo en esta computadora. Vence después de cuatro horas o al reiniciar la API; crear un archivo nuevo revoca el token anterior.",
  checkConnection: "Comprobar conexión",
  connected: "Datos del juego recibidos",
  waiting: "Esperando al juego",
  stale: "Los últimos datos del juego están desactualizados",
  partial:
    "Falta información de la selección o aún no se ha revelado. La compatibilidad varía por modo; puedes seguir ingresando datos manualmente.",
  importPicks: "Usar selecciones reveladas",
  imported:
    "Selecciones reveladas importadas. Revísalas antes de solicitar sugerencias.",
  importUnavailable:
    "Se requieren datos recientes de un equipo identificado. No se pueden importar de forma segura cinco selecciones aliadas sin identificar tu héroe.",
  noGameData:
    "Aún no se han recibido datos del juego. Los datos del menú principal y de la selección clasificatoria pueden omitir información de la selección.",
};
