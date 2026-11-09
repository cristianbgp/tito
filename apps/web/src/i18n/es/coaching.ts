export const coachingCopy = {
  title: "Cuaderno de entrenamiento",
  description:
    "Reflexiones breves basadas en la evidencia de tus partidas guardadas. Revisa las repeticiones para entender las decisiones detrás de los números.",
  strengths: "Patrones que puedes reforzar",
  concerns: "Patrones por revisar",
  latest: "Último día guardado",
  evidence: "Evidencia guardada",
  summary: "Reflexión de IA",
  followUp: "Pregunta sobre este análisis",
  notConfigured:
    "El entrenamiento con IA no está configurado. Tus observaciones guardadas y respuestas anteriores siguen disponibles.",
  empty: "Importa tus partidas guardadas para comenzar.",
  insufficient:
    "Se necesitan al menos cinco muestras válidas en cada período de comparación del mismo héroe. Guardar más partidas puede permitir una comparación.",
  noStrengths: "Aún no hay una comparación positiva respaldada por evidencia.",
  noConcerns: "Aún no hay un problema respaldado por evidencia.",
  generate: "Generar reflexión de IA",
  generating: "Preparando una reflexión con alcance limitado…",
  ask: "Preguntar sobre la evidencia guardada",
  asking: "Revisando la evidencia guardada…",
  question: "Tu pregunta",
  questionHint:
    "Hasta 500 caracteres. El texto libre define un enfoque limitado sobre prioridades, comparaciones, repeticiones o causas.",
  followUpDescription:
    "Las respuestas usan solo tu análisis guardado y su evidencia. Primero guarda un análisis de partida. No pueden reconstruir lo que ocurrió en una pelea.",
  noAnswer:
    "Aún no hay una respuesta guardada. Elige una pregunta cuando quieras.",
  noSummary:
    "La reflexión de IA es opcional. Tus observaciones guardadas de arriba ya están disponibles.",
  needsReplay: "Las causas y decisiones deben verificarse en la repetición.",
  cached:
    "Se muestra el entrenamiento cargado anteriormente. No se pudo actualizar.",
  privacy:
    "No incluyas nombres, datos de contacto, identificadores de cuentas ni otra información privada. Tu pregunta original nunca se guarda ni se envía a la IA.",
  import: "Importar mis partidas",
  refresh: "Actualizar observaciones guardadas",
  saved: "Guardado",
  source: "Pregunta de origen",
  limits:
    "Hasta 10 intentos de entrenamiento por día UTC. Las preguntas idénticas sobre la evidencia reutilizan una respuesta guardada.",
  samples: (n: number) =>
    `${n} ${n === 1 ? "muestra válida" : "muestras válidas"}`,
  match: (id: string) => `Partida ${id}`,
  day: (
    date: string,
    games: number,
    wins: number,
    losses: number,
    unknown: number,
  ) =>
    `${date} UTC · ${games} ${games === 1 ? "partida guardada" : "partidas guardadas"} · ${wins} ${wins === 1 ? "victoria" : "victorias"} · ${losses} ${losses === 1 ? "derrota" : "derrotas"}${unknown ? ` · ${unknown} ${unknown === 1 ? "resultado desconocido" : "resultados desconocidos"}` : ""}`,
  metrics: {
    result: "Resultado",
    duration: "Duración",
    kills: "Asesinatos",
    deaths: "Muertes",
    assists: "Asistencias",
    goldPerMinute: "Oro por minuto",
    experiencePerMinute: "Experiencia por minuto",
    lastHits: "Últimos golpes",
    denies: "Denegaciones",
    level: "Nivel",
    netWorth: "Patrimonio neto",
    heroDamage: "Daño a héroes",
    heroHealing: "Curación a héroes",
    towerDamage: "Daño a torres",
    teamGoldAdvantage: "Ventaja de oro del equipo",
    teamExperienceAdvantage: "Ventaja de experiencia del equipo",
  } as Record<string, string>,
};
export const usageCopy = {
  title: "Mi uso de IA",
  description: "Tus intentos y uso estimado del día UTC actual.",
  reviews: "Análisis de partidas",
  drafts: "Sugerencias de héroes",
  coaching: "Entrenamiento",
  refresh: "Actualizar mi uso",
  loading: "Cargando tu uso…",
  unavailable:
    "La generación con IA no está configurada. Tus resultados guardados y contadores personales siguen disponibles.",
  estimate:
    "Los costos son estimaciones basadas en el uso contabilizado y las reservas pendientes, no una factura. Las solicitudes fallidas pueden contar como intentos. Leer un resultado guardado no inicia una solicitud de IA.",
  attempts: (used: number, total: number) => `${used} de ${total} intentos`,
  remaining: (n: number) => `${n} ${n === 1 ? "restante" : "restantes"}`,
  cost: "Costo estimado",
  resets: (when: string) =>
    `Los intentos diarios se restablecen a las ${when}.`,
  day: (day: string) => `Día UTC: ${day}`,
  cached:
    "Se muestra el uso personal cargado anteriormente. No se pudo actualizar.",
};
export const sessionCopy = {
  title: "Reflexión de la sesión",
  description:
    "Revisa los resúmenes de partidas conservados de tu última sesión o de un día UTC. No se necesita una solicitud de IA.",
  scope:
    "La última sesión agrupa las partidas guardadas hasta que hay una pausa de más de dos horas después de la partida anterior. Las importaciones faltantes pueden cambiar la agrupación.",
  latest: "Última sesión guardada",
  day: "Día UTC",
  viewDay: "Ver día",
  loading: "Leyendo resúmenes guardados…",
  refresh: "Actualizar reflexión",
  summary: "Sesión guardada",
  games: "Partidas guardadas",
  results: "Resultados conocidos",
  duration: "Tiempo total de partidas",
  kills: "Promedio de asesinatos",
  deaths: "Promedio de muertes",
  assists: "Promedio de asistencias",
  reviewed: "Partidas analizadas",
  noted: "Partidas con notas",
  matches: "Partidas de esta reflexión",
  coaching: "Abrir cuaderno de entrenamiento",
  optional:
    "La reflexión de IA se solicita de forma explícita en el cuaderno de entrenamiento.",
  empty:
    "No hay partidas guardadas en esta selección. Importa tu historial o elige otro día UTC.",
  import: "Importar mis partidas",
  caveat:
    "Estos son resúmenes de partidas conservados. Los valores faltantes se excluyen de los promedios. Los resultados y totales del equipo no determinan causas ni impacto personal.",
  cached:
    "Se muestra la reflexión cargada anteriormente. No se pudo actualizar.",
  outcomes: (wins: number, losses: number, unknown: number) =>
    `${wins} ${wins === 1 ? "victoria" : "victorias"} · ${losses} ${losses === 1 ? "derrota" : "derrotas"} · ${unknown} ${unknown === 1 ? "desconocido" : "desconocidos"}`,
};
