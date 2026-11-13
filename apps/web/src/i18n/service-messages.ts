import { traitLabel } from "./traits";
import { getLocale } from "./index";

// Exact server-owned messages only. Unknown, external, user, and AI prose stays intact.
const spanish: Readonly<Record<string, string>> = {
  "This replay has incomplete or unsupported match data.":
    "La repetición contiene datos incompletos o no compatibles.",
  "Your linked Steam account is not a player in this replay.":
    "Tu cuenta de Steam conectada no participó en esta repetición.",
  "Replay processing stopped or took too long. Try importing again.":
    "El procesamiento se detuvo o tardó demasiado. Vuelve a importar la repetición.",
  "This replay could not be read. Download the complete .dem file from Dota and try again.":
    "No se pudo leer la repetición. Descarga el archivo .dem completo desde Dota e inténtalo de nuevo.",
  "Replay import was cancelled.": "Se canceló la importación de la repetición.",
  "Wait for match sync to finish before importing this replay.":
    "Espera a que termine la sincronización antes de importar esta repetición.",
  "This replay is older than your retained match history.":
    "Esta repetición es anterior al historial de partidas que conservas.",
  "Replay import is not available on this server yet.":
    "La importación de repeticiones aún no está disponible en este servidor.",
  "Another replay import is running. Try again shortly.":
    "Hay otra importación en curso. Vuelve a intentarlo en un momento.",
  "Wait one minute before starting another replay import.":
    "Espera un minuto antes de iniciar otra importación de repetición.",
  "Replay upload expired or was not found. Import the file again.":
    "La carga venció o no se encontró. Vuelve a importar el archivo.",
  "The replay upload is out of sequence. Import the file again.":
    "Los fragmentos de la repetición llegaron fuera de orden. Vuelve a importar el archivo.",
  "Choose an uncompressed Dota 2 .dem replay file.":
    "Elige un archivo de repetición .dem de Dota 2 sin comprimir.",
  "The replay upload is incomplete. Import the full file again.":
    "La carga está incompleta. Vuelve a importar el archivo completo.",
  "Replay import failed. Try again shortly.":
    "No se pudo importar la repetición. Vuelve a intentarlo en un momento.",
  "Temporary replay cleanup failed. Try again shortly.":
    "No se pudo limpiar el archivo temporal de la repetición. Vuelve a intentarlo en un momento.",
  "The daily replay import limit has been reached. Try again tomorrow.":
    "Se alcanzó el límite diario de importaciones de repeticiones. Vuelve a intentarlo mañana.",
  "Sign in to import your replays.":
    "Inicia sesión para importar tus repeticiones.",
  "Connect Steam to import your own replays.":
    "Conecta Steam para importar tus propias repeticiones.",
  "Reload Tito and try importing again.":
    "Recarga Tito y vuelve a importar la repetición.",
  "No heroes are available for this draft. Remove a pick, ban or saved Avoid preference.":
    "No hay héroes disponibles para este draft. Quita una selección, un bloqueo o una preferencia guardada de Evitar.",
  "Only your own match can be reviewed. Connect the Steam account that played this game or sync its saved history.":
    "Solo puedes analizar tus propias partidas. Conecta la cuenta de Steam con la que jugaste esta partida o sincroniza su historial guardado.",
  "Unable to complete this request.": "No se pudo completar esta solicitud.",
  "Check the supplied values and try again.":
    "Revisa los valores ingresados e inténtalo de nuevo.",
  "Request too large.": "La solicitud es demasiado grande.",
  "Something went wrong. Please try again.":
    "Algo salió mal. Inténtalo de nuevo.",
  "Not found.": "No se encontró.",
  "Steam sign-in is not available right now. Try again later.":
    "El acceso con Steam no está disponible en este momento. Vuelve a intentarlo más tarde.",
  "Sign in to request hero suggestions.":
    "Inicia sesión para solicitar sugerencias de héroes.",
  "Reload Tito and try suggesting heroes again.":
    "Recarga Tito y vuelve a solicitar sugerencias de héroes.",
  "Hero suggestions are temporarily unavailable.":
    "Las sugerencias de héroes no están disponibles temporalmente.",
  "A hero can only appear once in each group.":
    "Un héroe solo puede aparecer una vez en cada grupo.",
  "A hero cannot be both picked and banned or appear on both teams.":
    "Un héroe no puede estar seleccionado y vetado a la vez ni aparecer en ambos equipos.",
  "This draft contains an unknown hero. Remove it and try again.":
    "Esta selección contiene un héroe desconocido. Elimínalo e inténtalo de nuevo.",
  "No heroes in your pool are still available. Expand your pool or remove a pick or ban.":
    "No quedan héroes disponibles en tu lista. Amplía tu lista o elimina una selección o un veto.",
  "This draft has too much information to assess. Reduce your hero pool and try again.":
    "Esta selección contiene demasiada información para evaluar. Reduce tu lista de héroes e inténtalo de nuevo.",
  "The hero suggestions could not be validated. Try again later.":
    "No se pudieron validar las sugerencias de héroes. Inténtalo más tarde.",
  "The hero suggestions could not be completed. Your draft is still available; try again later.":
    "No se pudieron completar las sugerencias de héroes. Tu selección sigue disponible; inténtalo más tarde.",
  "This draft request expired. Try suggesting heroes again.":
    "Esta solicitud de selección venció. Vuelve a solicitar sugerencias de héroes.",
  "AI hero suggestions are not configured yet. Your draft can still be prepared.":
    "Las sugerencias de héroes con IA aún no están configuradas. Puedes seguir preparando tu selección.",
  "Hero suggestions are already running or were just requested. Wait a moment and try again.":
    "Las sugerencias de héroes ya están en proceso o se acaban de solicitar. Espera un momento e inténtalo de nuevo.",
  "Sign in to use your personal library.":
    "Inicia sesión para usar tu biblioteca personal.",
  "Reload Tito and try saving again.":
    "Recarga Tito e intenta guardar de nuevo.",
  "Connect Steam to use your own saved matches.":
    "Conecta Steam para usar tus partidas guardadas.",
  "Library storage is temporarily unavailable.":
    "El almacenamiento de la biblioteca no está disponible temporalmente.",
  "Invalid match ID": "ID de partida no válido",
  "Unknown hero": "Héroe desconocido",
  "Duplicate hero": "Héroe duplicado",
  "Duplicate tag": "Etiqueta duplicada",
  "Unknown hero in draft": "Héroe desconocido en la selección",
  "Chosen hero is unavailable in this draft":
    "El héroe elegido no está disponible en esta selección",
  "Provide a choice or match": "Indica una elección o una partida",
  "Choose a valid UTC day": "Elige un día UTC válido",
  "No retained matches in this session. Import your own match history to reflect on a session.":
    "No hay partidas conservadas en esta sesión. Importa tu historial de partidas para reflexionar sobre una sesión.",
  "Invalid library input.": "Los datos de la biblioteca no son válidos.",
  "Your account is unavailable.": "Tu cuenta no está disponible.",
  "Your Steam connection changed. Reload Tito.":
    "Tu conexión de Steam cambió. Recarga Tito.",
  "This match is not in your linked account's saved history.":
    "Esta partida no está en el historial guardado de tu cuenta vinculada.",
  "A saved annotation for this match belongs to a previous Steam account. Relink that account to manage its notes or feedback.":
    "Una anotación guardada de esta partida pertenece a una cuenta de Steam anterior. Vuelve a vincular esa cuenta para gestionar sus notas u opiniones.",
  "Your 200 saved match annotations are full. Relink your previous Steam account to manage its notes or feedback, or delete a current note or clear review feedback.":
    "Alcanzaste el límite de 200 anotaciones de partidas guardadas. Vuelve a vincular tu cuenta de Steam anterior para gestionar sus notas u opiniones, elimina una nota actual o borra una opinión de un análisis.",
  "Your 200 saved match annotations are full. Delete a note or clear review feedback before saving another.":
    "Alcanzaste el límite de 200 anotaciones de partidas guardadas. Elimina una nota o borra una opinión de un análisis antes de guardar otra.",
  "The bookmark must be within this match's saved duration.":
    "El marcador debe estar dentro de la duración guardada de esta partida.",
  "Save your own match review before leaving feedback.":
    "Guarda el análisis de tu partida antes de dejar una opinión.",
  "Your 50 saved drafts are full. Delete a snapshot before saving another.":
    "Alcanzaste el límite de 50 selecciones guardadas. Elimina una captura antes de guardar otra.",
  "This saved draft is unavailable.":
    "Esta selección guardada no está disponible.",
  "Unknown hero.": "Héroe desconocido.",
  "Aggregates use retained summaries; match details show up to 100 recent games. Missing values are excluded from averages. Results do not establish that a hero choice caused an outcome.":
    "Los datos agregados usan resúmenes conservados; los detalles muestran hasta 100 partidas recientes. Los promedios excluyen los valores faltantes. Los resultados no demuestran que elegir un héroe haya causado un desenlace.",
  "Sign in to use local game integration.":
    "Inicia sesión para usar la integración del juego local.",
  "Sign in to create a local game configuration.":
    "Inicia sesión para crear una configuración del juego local.",
  "Game integration setup is available only in your local Tito environment.":
    "La configuración de la integración del juego solo está disponible en tu entorno local de Tito.",
  "Local game input only.": "Solo se aceptan datos del juego local.",
  "Invalid game payload.": "Los datos del juego no son válidos.",
  "Wait a moment before creating another game configuration.":
    "Espera un momento antes de crear otra configuración del juego.",
  "Local game connections are full. Try again later.":
    "Se alcanzó el límite de conexiones del juego local. Inténtalo más tarde.",
  "Invalid game connection token.":
    "El token de conexión del juego no es válido.",
  "Game connection expired or unrecognized. Create a new configuration.":
    "La conexión del juego venció o no se reconoce. Crea una configuración nueva.",
  "Sign in to view your player profile.":
    "Inicia sesión para ver tu perfil de jugador.",
  "Player profiles are temporarily unavailable.":
    "Los perfiles de jugador no están disponibles temporalmente.",
  "Sign in to save your player profile.":
    "Inicia sesión para guardar tu perfil de jugador.",
  "Sign in to view your match review.":
    "Inicia sesión para ver el análisis de tu partida.",
  "Connect Steam to review your own matches.":
    "Conecta Steam para analizar tus partidas.",
  "Review storage is temporarily unavailable.":
    "El almacenamiento de análisis no está disponible temporalmente.",
  "Sign in to generate your match review.":
    "Inicia sesión para generar el análisis de tu partida.",
  "Reload Tito and try generating again.":
    "Recarga Tito e intenta generar el análisis de nuevo.",
  "This match does not have enough valid statistics to review yet.":
    "Esta partida aún no tiene suficientes estadísticas válidas para analizarla.",
  "This match does not have enough player statistics to review yet.":
    "Esta partida aún no tiene suficientes estadísticas de jugadores para analizarla.",
  "The AI review could not be validated. Your previous review is still available.":
    "No se pudo validar el análisis de IA. Tu análisis anterior sigue disponible.",
  "The AI review cited unavailable evidence. Your previous review is still available.":
    "El análisis de IA citó evidencia no disponible. Tu análisis anterior sigue disponible.",
  "The AI budget or daily coaching limit is reached. Saved coaching remains available. Try again after the current UTC day or month ends.":
    "Se alcanzó el presupuesto de IA o el límite diario de entrenamiento. El entrenamiento guardado sigue disponible. Inténtalo cuando termine el día o mes UTC actual.",
  "The AI budget or daily hero-picker limit is reached. Your draft is still available. Try again after the current UTC day or month ends.":
    "Se alcanzó el presupuesto de IA o el límite diario del selector de héroes. Tu selección sigue disponible. Inténtalo cuando termine el día o mes UTC actual.",
  "The AI review budget or daily review limit is reached. Saved reviews remain available. Try again after the current UTC day or month ends.":
    "Se alcanzó el presupuesto o el límite diario de análisis de IA. Los análisis guardados siguen disponibles. Inténtalo cuando termine el día o mes UTC actual.",
  "There is too much evidence to review safely. Try another match.":
    "Hay demasiada evidencia para analizarla de forma fiable. Prueba con otra partida.",
  "AI review is temporarily unavailable. Try again later.":
    "El análisis de IA no está disponible temporalmente. Inténtalo más tarde.",
  "The AI review could not be completed. Your previous review is still available.":
    "No se pudo completar el análisis de IA. Tu análisis anterior sigue disponible.",
  "The review request expired. Reload to see the latest saved result.":
    "La solicitud de análisis venció. Recarga para ver el último resultado guardado.",
  "AI reviews are not configured yet. Add OPENAI_API_KEY to the API environment to enable them.":
    "Los análisis de IA aún no están configurados. Agrega OPENAI_API_KEY al entorno de la API para habilitarlos.",
  "A review is already running, or you requested one recently. Wait a moment and try again.":
    "Ya hay un análisis en proceso o solicitaste uno hace poco. Espera un momento e inténtalo de nuevo.",
  "Sign in to view your progress.": "Inicia sesión para ver tu progreso.",
  "Connect Steam to view your own progress.":
    "Conecta Steam para ver tu progreso.",
  "History storage is temporarily unavailable.":
    "El almacenamiento del historial no está disponible temporalmente.",
  "Sign in to view saved history.":
    "Inicia sesión para ver el historial guardado.",
  "Connect Steam to save your own match history.":
    "Conecta Steam para guardar tu historial de partidas.",
  "Sign in to sync match history.":
    "Inicia sesión para sincronizar el historial de partidas.",
  "Reload Tito and try syncing again.":
    "Recarga Tito e intenta sincronizar de nuevo.",
  "Tito's daily match-data request budget is reached. Saved history remains available; try again after midnight UTC.":
    "Se alcanzó el presupuesto diario de solicitudes de datos de partidas de Tito. El historial guardado sigue disponible; inténtalo después de la medianoche UTC.",
  "Wait before syncing again. Your saved matches are still available.":
    "Espera antes de volver a sincronizar. Tus partidas guardadas siguen disponibles.",
  "Your saved history is up to date or has reached its retention limit.":
    "Tu historial guardado está actualizado o alcanzó su límite de conservación.",
  "This sync expired. Sync again to get the latest matches.":
    "Esta sincronización venció. Vuelve a sincronizar para obtener las últimas partidas.",
  "Sign in to request replay analysis.":
    "Inicia sesión para solicitar el análisis de la repetición.",
  "Reload Tito and try again.": "Recarga Tito e inténtalo de nuevo.",
  "Wait 15 seconds before requesting another replay.":
    "Espera 15 segundos antes de solicitar otra repetición.",
  "Sign in to check replay analysis.":
    "Inicia sesión para consultar el análisis de la repetición.",
  "Wait a moment before checking replay analysis again.":
    "Espera un momento antes de volver a consultar el análisis de la repetición.",
  "Enter a valid Dota friend ID or SteamID64.":
    "Ingresa un ID de amigo de Dota o un SteamID64 válido.",
  "Enter a valid match ID.": "Ingresa un ID de partida válido.",
  "Too many match-data requests are running. Try again shortly.":
    "Hay demasiadas solicitudes de datos de partidas en proceso. Inténtalo en unos momentos.",
  "OpenDota took too long. Try again.":
    "OpenDota tardó demasiado. Inténtalo de nuevo.",
  "Unable to reach OpenDota. Try again shortly.":
    "No se pudo conectar con OpenDota. Inténtalo en unos momentos.",
  "OpenDota could not find a replay for this match.":
    "OpenDota no pudo encontrar una repetición de esta partida.",
  "OpenDota has no data for this player or match.":
    "OpenDota no tiene datos de este jugador o partida.",
  "OpenDota is busy. Wait a moment before trying again.":
    "OpenDota está ocupado. Espera un momento antes de intentarlo de nuevo.",
  "OpenDota is temporarily unavailable. Try again shortly.":
    "OpenDota no está disponible temporalmente. Inténtalo en unos momentos.",
  "OpenDota returned incomplete or unexpected data.":
    "OpenDota devolvió datos incompletos o inesperados.",
  "Invalid history page.": "La página del historial no es válida.",
  "Enter a valid hero ID.": "Ingresa un ID de héroe válido.",
  "Catalog roles": "Roles del catálogo",
  "Attack type": "Tipo de ataque",
  "Enter a valid patch and up to ten hero IDs.":
    "Ingresa un parche válido y hasta diez ID de héroes.",
  "Too many replay requests. Try again later.":
    "Hay demasiadas solicitudes de repetición. Inténtalo más tarde.",
  "Invalid replay request.": "La solicitud de repetición no es válida.",
  "Sign in to view your coaching.": "Inicia sesión para ver tu entrenamiento.",
  "Coaching storage is temporarily unavailable.":
    "El almacenamiento del entrenamiento no está disponible temporalmente.",
  "Sign in to request coaching.": "Inicia sesión para solicitar entrenamiento.",
  "Connect Steam to summarize your own saved games.":
    "Conecta Steam para resumir tus partidas guardadas.",
  "Sign in to view your follow-up.":
    "Inicia sesión para ver tu respuesta de seguimiento.",
  "Connect Steam to view your own follow-up.":
    "Conecta Steam para ver tu respuesta de seguimiento.",
  "Sign in to ask a follow-up.":
    "Inicia sesión para hacer una pregunta de seguimiento.",
  "Connect Steam to ask about your own saved review.":
    "Conecta Steam para preguntar sobre tu análisis guardado.",
  "What should I focus on next?": "¿En qué debería enfocarme ahora?",
  "How does this compare with my saved games?":
    "¿Cómo se compara esto con mis partidas guardadas?",
  "What should I check in the replay?":
    "¿Qué debería revisar en la repetición?",
  "Provide one question or selected questionId.":
    "Escribe una pregunta o elige una pregunta de la lista.",
  "What can the saved evidence establish about causes, and what needs replay verification?":
    "¿Qué puede demostrar la evidencia guardada sobre las causas y qué se debe verificar en la repetición?",
  "The coaching response could not be validated. Saved answers remain available.":
    "No se pudo validar la respuesta de entrenamiento. Las respuestas guardadas siguen disponibles.",
  "The coaching response cited unavailable evidence.":
    "La respuesta de entrenamiento citó evidencia no disponible.",
  "The coaching response included unsupported numbers.":
    "La respuesta de entrenamiento incluyó cifras sin respaldo.",
  "The coaching response included unsupported external information.":
    "La respuesta de entrenamiento incluyó información externa sin respaldo.",
  "There is too much saved evidence for one answer.":
    "Hay demasiada evidencia guardada para una sola respuesta.",
  "The AI answer could not be completed. Saved coaching remains available.":
    "No se pudo completar la respuesta de IA. El entrenamiento guardado sigue disponible.",
  "AI coaching is not configured yet. Your saved observations remain available.":
    "El entrenamiento con IA aún no está configurado. Tus observaciones guardadas siguen disponibles.",
  "Connect Steam and sync its saved history to summarize your own games.":
    "Conecta Steam y sincroniza su historial guardado para resumir tus partidas.",
  "There are not enough comparable saved samples for an AI summary yet. Your latest-day reflection remains available.":
    "Aún no hay suficientes muestras guardadas comparables para un resumen de IA. La reflexión de tu último día sigue disponible.",
  "AI coaching is not configured yet. Saved reviews remain available.":
    "El entrenamiento con IA aún no está configurado. Los análisis guardados siguen disponibles.",
  "Save a review of your own match before asking a follow-up.":
    "Guarda el análisis de tu partida antes de hacer una pregunta de seguimiento.",
  "This coaching request expired. Reload to see your latest saved answer.":
    "Esta solicitud de entrenamiento venció. Recarga para ver tu última respuesta guardada.",
  "Coaching is already running or was just requested. Wait a moment and try again.":
    "El entrenamiento ya está en proceso o se acaba de solicitar. Espera un momento e inténtalo de nuevo.",
  "Do not include names, contact details, account IDs, or other private information. Free text selects a bounded evidence question; your original text is never stored or sent to AI.":
    "No incluyas nombres, datos de contacto, identificadores de cuentas ni otra información privada. El texto libre selecciona una pregunta de alcance limitado sobre la evidencia; tu texto original nunca se guarda ni se envía a la IA.",
  "Comparisons use saved games on the same hero with durations within 25%; at least five valid samples per window.":
    "Las comparaciones usan partidas guardadas con el mismo héroe y duraciones con una diferencia máxima del 25%; se requieren al menos cinco muestras válidas por período.",
  "Role, rank, patch, mode and causes are unknown. Team results do not establish personal performance.":
    "Se desconocen el rol, el rango, el parche, el modo y las causas. Los resultados del equipo no determinan el rendimiento personal.",
  "Connect Steam and sync its saved history to see your own observations.":
    "Conecta Steam y sincroniza su historial guardado para ver tus observaciones.",
  "Review one decision from your latest saved UTC day. Outcomes alone cannot explain what caused them; check a replay before changing your play.":
    "Revisa una decisión de tu último día UTC guardado. Los resultados por sí solos no explican sus causas; revisa una repetición antes de cambiar tu forma de jugar.",
  "Recorded events are observations, not explanations of why a match was won or lost.":
    "Los eventos registrados son observaciones, no explicaciones de por qué se ganó o perdió una partida.",
  "Coverage means a source field was present; replay data may be partial. Item purchases do not establish completed builds.":
    "La cobertura indica que un campo estaba presente en la fuente; los datos de la repetición pueden estar incompletos. Las compras de objetos no confirman combinaciones de objetos completas.",
  "This view includes at most 100 recorded moments, 100 purchases and 121 minute samples per player.":
    "Esta vista incluye como máximo 100 momentos registrados, 100 compras y 121 muestras por minuto de cada jugador.",
  "OpenDota aggregates do not identify a rank or patch cohort here. Matchup win rates describe the available sample, not a counter-pick guarantee.":
    "Los datos agregados de OpenDota no identifican aquí un grupo por rango o parche. Las tasas de victoria de los enfrentamientos describen la muestra disponible, no garantizan una elección favorable.",
  "Item counts show popularity, not success rates or a recommended build. Early, mid and late item groups use OpenDota time and cost thresholds.":
    "Las cantidades de objetos indican popularidad, no tasas de éxito ni una combinación recomendada. Los grupos de objetos iniciales, intermedios y finales usan los umbrales de tiempo y costo de OpenDota.",
  "Retrieved timestamps describe cache freshness, not the age of every match in an aggregate. Missing sections remain unavailable.":
    "Las fechas de consulta indican la vigencia de la caché, no la antigüedad de cada partida de un conjunto agregado. Las secciones faltantes siguen sin estar disponibles.",
  "Dated patch references are fetched from Valve when available; the OpenDota fallback may omit letter patches. Freshness describes retrieval time, not verification of the currently installed game version.":
    "Las referencias de parches con fecha se obtienen de Valve cuando están disponibles; la alternativa de OpenDota puede omitir parches con letras. La vigencia indica el momento de consulta, no verifica la versión del juego instalada.",
  "Official source text is bounded to 40 notes per hero and 30 general notes. Hero filtering does not include indirect effects from item or general changes.":
    "El texto de la fuente oficial se limita a 40 notas por héroe y 30 notas generales. El filtro de héroes no incluye efectos indirectos de cambios en objetos o cambios generales.",
  "These are dated changes for the requested version, not AI matchup advice or a claim about the current installed patch.":
    "Estos son cambios con fecha de la versión solicitada, no consejos de IA sobre enfrentamientos ni una afirmación sobre el parche instalado.",
};

const insightMetrics = {
  deaths: "las muertes",
  goldPerMinute: "el oro por minuto",
  experiencePerMinute: "la experiencia por minuto",
} as const;

/** Translate only known API presentation text, never arbitrary prose. */
export function serviceText(message: string): string {
  if (getLocale() !== "es") return message;
  if (Object.hasOwn(spanish, message)) return spanish[message]!;

  const trait = traitLabel(message);
  if (trait !== message) return trait;

  const hero = /^Hero (\d+)$/.exec(message);
  if (hero && hero[0] === message) return `Héroe ${hero[1]}`;

  const insight =
    /^Hero (\d+): (deaths|goldPerMinute|experiencePerMinute) averaged (\d+(?:\.\d+)?) in the latest five comparable saved games and (\d+(?:\.\d+)?) in the prior five\. This is a personal sample, not proof of impact or cause\.$/.exec(
      message,
    );
  if (insight && insight[0] === message) {
    const metric = insight[2] as keyof typeof insightMetrics;
    return `Héroe ${insight[1]}: el promedio de ${insightMetrics[metric]} fue ${insight[3]} en las últimas cinco partidas guardadas comparables y ${insight[4]} en las cinco anteriores. Es una muestra personal, no demuestra impacto ni causas.`;
  }

  const session =
    /^(\d+) retained games: (\d+) wins and (\d+) losses across (\d+) known results\. Match summaries describe outcomes; they do not explain why they happened\.$/.exec(
      message,
    );
  if (session && session[0] === message)
    return `${session[1]} partidas conservadas: ${session[2]} victorias y ${session[3]} derrotas de ${session[4]} resultados conocidos. Los resúmenes de partidas describen los resultados; no explican por qué ocurrieron.`;

  const attackCard =
    /^([A-Za-z][A-Za-z' .-]{0,79}) is listed as (melee|ranged)\.$/.exec(
      message,
    );
  if (attackCard && attackCard[0] === message)
    return `${attackCard[1]} figura con ataque ${attackCard[2] === "melee" ? "cuerpo a cuerpo" : "a distancia"}.`;

  const roleCard =
    /^([A-Za-z][A-Za-z' .-]{0,79}): ((?:Carry|Support|Nuker|Disabler|Jungler|Durable|Escape|Pusher|Initiator)(?:, (?:Carry|Support|Nuker|Disabler|Jungler|Durable|Escape|Pusher|Initiator))*)\. These are catalog tags, not the role played in a particular match\.$/.exec(
      message,
    );
  if (roleCard && roleCard[0] === message)
    return `${roleCard[1]}: ${roleCard[2]!
      .split(", ")
      .map(traitLabel)
      .join(
        ", ",
      )}. Estas son etiquetas del catálogo, no el rol jugado en una partida específica.`;

  return message;
}
