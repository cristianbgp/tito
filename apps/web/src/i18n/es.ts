// Catálogo principal en español latinoamericano.
export const es = {
  common: {
    unavailable: "N/D",
    searchOptions: (label: string) => `Buscar ${label}`,
    searchOptionsPlaceholder: "Escribe para buscar…",
    noOptions: "No se encontraron opciones.",
    refineOptions: (shown: number, total: number) =>
      `Mostrando ${shown} de ${total}. Escribe para reducir la lista.`,
  },
  workspaceLabel: "DOTA 2 / ASISTENTE PERSONAL",
  toolkit: {
    signInHelp:
      "Inicia sesión para reunir tus herramientas personales y registros guardados.",
    steamHelp:
      "Conecta la cuenta de Steam con la que juegas para usar sus datos de partidas guardadas.",
  },
  brand: "tito",
  tagline: "TU PRÓXIMA PARTIDA, MEJOR.",
  appearance: {
    label: "Apariencia",
    light: "Apariencia clara",
    dark: "Apariencia oscura",
    system: "Usar apariencia del sistema",
  },
  shell: {
    loading: "Cargando…",
    navigation: "Navegación principal",
    connected: "Steam conectado",
    emailAccount: "Cuenta de correo",
    guest: "Tu próxima partida, mejor.",
    search: "Buscar partidas",
    account: "Tu cuenta",
    skip: "Saltar al contenido",
    collapseSidebar: "Contraer barra lateral",
    expandSidebar: "Expandir barra lateral",
    sidebarShortcut: "⌘B / Ctrl+B",
  },
  nav: {
    tools: "Herramientas",
    progress: "Progreso",
    matches: "Partidas",
    account: "Tu cuenta",
    inbox: "Bandeja local",
    templates: "Plantillas de correo",
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    home: "Volver a las partidas",
  },
  home: {
    stampTagline: "JUEGA. APRENDE. REPITE.",
    dataTagline: "DATOS ABIERTOS. MEJORES DECISIONES.",
    eyebrow: "LA MEJORA EMPIEZA CONTIGO",
    title: "Tus partidas",
    description: "Una mirada más de cerca a tus partidas recientes.",
    searchTitle: "Encuentra tus partidas recientes",
    id: "ID de amigo de Dota o SteamID64",
    placeholder: "p. ej. 70388657",
    search: "Buscar partidas",
    searching: "Buscando partidas…",
    hint: "Encuentra tu ID de amigo en tu perfil de Dota. El historial disponible depende de los datos públicos de partidas.",
    emptyTitle: "Tu próximo paso empieza aquí.",
    emptyText:
      "Ingresa un ID de jugador arriba para explorar hasta 20 partidas recientes disponibles.",
    recent: "Partidas recientes",
    noMatches: "No hay partidas recientes disponibles",
    noMatchesText:
      "Revisa el ID de jugador y la configuración de datos públicos de partidas. Las partidas nuevas pueden tardar en aparecer.",
    hero: "Héroe",
    result: "Resultado",
    kda: "K / D / A",
    duration: "Duración",
    played: "Fecha",
    open: "Abrir partida",
    retry: "Volver a intentar",
    win: "Victoria",
    loss: "Derrota",
    unknown: "No disponible",
    source: "Datos de partidas de OpenDota",
    refresh: "Actualizar partidas",
    preview: "Partida seleccionada",
    previewAction: (hero: string) => `Vista previa de la partida con ${hero}`,
    openAction: (hero: string) => `Abrir partida con ${hero}`,
    previewLoading: "Cargando vista previa de la partida…",
    previewUnavailable:
      "La vista previa completa no está disponible temporalmente. Puedes abrir la partida o volver a intentar.",
    previewTimelineUnavailable:
      "La evolución del oro no está disponible. Abre la partida para solicitar el análisis de la repetición.",
    accountTitle: "Hazlo tuyo.",
    accountText:
      "Crea tu cuenta para reunir tu identidad y preferencias. Conecta Steam cuando quieras.",
    noteTitle: "Una base para jugar mejor Dota",
    noteText:
      "Explora tus partidas, sigue tu progreso y solicita una revisión con IA cuando las revisiones estén habilitadas.",
  },
  progress: {
    eyebrow: "TU JUEGO A LO LARGO DEL TIEMPO",
    title: "Tu progreso",
    description: "Pequeñas señales de las partidas que guardaste.",
    refresh: "Actualizar progreso",
    signInTitle: "Tu progreso te pertenece.",
    connectTitle: "Conecta tu identidad de jugador.",
    ownOnly:
      "El progreso usa el historial de partidas guardadas de tu cuenta de Steam conectada.",
    connect: "Conectar Steam",
    emptyTitle: "Tu progreso empieza con partidas guardadas.",
    emptyText:
      "Primero importa tus partidas disponibles. Este panel usa resúmenes guardados y no consulta al proveedor de partidas.",
    cached:
      "Mostrando el progreso cargado anteriormente. No se pudieron actualizar las estadísticas guardadas.",
    period: (from: string, to: string, games: string) =>
      `Últimos 28 días · ${from}–${to} (UTC) · ${games} ${games === "1" ? "partida guardada" : "partidas guardadas"}`,
    scope: (count: string) =>
      `Basado en ${count} ${count === "1" ? "partida conservada" : "partidas conservadas"}, incluidas las que superan el límite actual de la lista.`,
    deaths: "Muertes por partida",
    gpm: "GPM promedio",
    xpm: "XPM promedio",
    validSamples: (count: string) =>
      `${count} ${count === "1" ? "muestra válida" : "muestras válidas"}`,
    previous: "28 días anteriores",
    change: "vs. período anterior",
    points: "pp",
    minimum: (count: string) =>
      `Se ${count === "1" ? "necesita" : "necesitan"} al menos ${count} ${count === "1" ? "muestra válida" : "muestras válidas"} en cada período para comparar.`,
    caveat:
      "Solo se incluyen partidas importadas. Los héroes, roles y modos de juego afectan los promedios. Los cambios usan valores sin redondear; cada métrica excluye sus propios valores faltantes.",
    weeklyTitle: "Ocho semanas de resultados",
    weeklyHint:
      "Las semanas empiezan el lunes en UTC. La semana actual está incompleta; los espacios pueden indicar partidas sin importar, aunque hayas jugado.",
    chartLabel:
      "Victorias, derrotas y resultados no disponibles importados por semana. Abre Ver cifras semanales para consultar cantidades y estadísticas exactas.",
    weekTooltip: (
      week: string,
      wins: string,
      losses: string,
      unknown: string,
    ) =>
      `${week}: ${wins} ${wins === "1" ? "victoria" : "victorias"}, ${losses} ${losses === "1" ? "derrota" : "derrotas"}, ${unknown} ${unknown === "1" ? "resultado no disponible" : "resultados no disponibles"}`,
    numbers: "Ver cifras semanales",
    table: "Estadísticas semanales de partidas",
    week: "Semana del (UTC)",
    partial: "Semana incompleta",
  },
  savedHistory: {
    myHistory: "Mi historial guardado",
    openDetails:
      "Abre la partida para cargar estadísticas detalladas y los datos disponibles de la repetición.",
    title: "Historial de partidas guardadas",
    description: "Tus partidas guardadas, listas cuando quieras.",
    intro:
      "Importa hasta 100 partidas disponibles de tu cuenta de Steam conectada. Sincroniza solo cuando lo decidas.",
    import: "Importar mis partidas",
    sync: "Sincronizar partidas nuevas",
    syncing: "Sincronizando partidas…",
    slowSync:
      "OpenDota está tardando más de lo habitual. Tus partidas guardadas siguen disponibles mientras termina esta solicitud.",
    older: "Cargar partidas anteriores",
    more: "Mostrar más partidas guardadas",
    synced: (date: string) => `Última sincronización: ${date}`,
    scope: (shown: number, total: number, limit: number) =>
      `Mostrando ${shown} de ${total} partidas guardadas. Se conservan tus ${limit} partidas importadas más recientes.`,
    capped: (limit: number) =>
      `Alcanzaste el límite de ${limit} partidas guardadas. Las nuevas sincronizaciones conservan las más recientes y reemplazan las más antiguas.`,
    available: (date: string) => `Próxima sincronización disponible: ${date}`,
    empty: "Tu historial empieza aquí.",
    emptyText:
      "Importa tus partidas disponibles para conservar sus resúmenes aquí, incluso cuando el proveedor de partidas no esté disponible.",
    cached:
      "Mostrando las partidas guardadas cargadas anteriormente. No se pudo actualizar el historial almacenado.",
    showing: (shown: number, total: number) =>
      `${shown} de ${total} partidas guardadas cargadas`,
    heroTitle: "Rendimiento guardado por héroe",
    heroScope: (count: number) =>
      `Basado en ${count} ${count === 1 ? "partida guardada cargada" : "partidas guardadas cargadas"}, antes de aplicar filtros. Esta es tu muestra importada, no tu historial completo.`,
  },
  history: {
    search: "Héroe o ID de partida",
    searchPlaceholder: "Buscar en estas partidas…",
    result: "Resultado",
    allResults: "Todos los resultados",
    queue: "Cola",
    allQueues: "Todas las colas",
    ranked: "Clasificatoria",
    normalQueue: "Emparejamiento sin clasificación",
    otherQueues: "Otras colas",
    unknownQueue: "Cola desconocida",
    gameMode: "Modo de juego",
    allModes: "Todos los modos de juego",
    unknownMode: "Modo desconocido",
    typeHint:
      "La cola y el modo de juego son distintos. Los filtros se aplican a las partidas cargadas.",
    missingTypes:
      "Algunas partidas guardadas no tienen información de cola o modo. Vuelve a importarlas para actualizarla o elige Desconocido para encontrarlas.",
    sort: "Ordenar por",
    newest: "Más recientes primero",
    oldest: "Más antiguas primero",
    longest: "Más largas primero",
    shortest: "Más cortas primero",
    reset: "Restablecer vista",
    showing: (shown: number, total: number) =>
      `${shown} de ${total} partidas recientes`,
    winRate: "Tasa de victorias",
    record: (wins: number, losses: number) => `${wins}V · ${losses}D`,
    recordLabel: (wins: number, losses: number, unknown: number) =>
      `${wins} ${wins === 1 ? "victoria" : "victorias"}, ${losses} ${losses === 1 ? "derrota" : "derrotas"}${unknown ? `, ${unknown} sin resultado disponible` : ""}`,
    unknownResults: (count: number) =>
      `${count} ${count === 1 ? "resultado no disponible" : "resultados no disponibles"}`,
    summaryHint:
      "La tasa de victorias usa solo partidas con resultado conocido.",
    noResults: "Ninguna partida coincide con esta vista",
    noResultsText:
      "Prueba otro héroe o ID de partida, cambia los filtros o restablece la vista.",
    loadFailed: "No se pudieron cargar las partidas recientes",
    loadFailedText:
      "Vuelve a intentar cuando el proveedor de datos de partidas esté disponible.",
    cached:
      "Mostrando las partidas cargadas anteriormente. Las actualizaciones en vivo no están disponibles temporalmente.",
    heroTitle: "Rendimiento reciente por héroe",
    heroScope: (count: number) =>
      `Basado en ${count} ${count === 1 ? "partida reciente disponible" : "partidas recientes disponibles"}, antes de aplicar filtros.`,
    heroHint:
      "La tasa de victorias excluye los resultados no disponibles. Los promedios de GPM y XPM usan solo partidas donde esas estadísticas están disponibles.",
    heroScrollHint:
      "Desplázate horizontalmente para ver resultados y estadísticas de farmeo.",
    games: "Partidas",
    recordTitle: "V / D",
    averageGpm: "GPM prom.",
    averageXpm: "XPM prom.",
    heroAction: (hero: string) => `Mostrar partidas con ${hero}`,
    heroIdentity: (id: number) => `Héroe #${id}`,
  },
  auth: {
    mapCaption: "01 / EL PRÓXIMO CAPÍTULO",
    eyebrow: "UNA CUENTA. TU CAMINO EN DOTA.",
    title: "Bienvenido a Tito.",
    description:
      "Crea una cuenta o continúa donde te quedaste. Te enviaremos un enlace de acceso por correo.",
    email: "Correo electrónico",
    placeholder: "tu@ejemplo.com",
    send: "Enviar enlace de acceso",
    sending: "Enviando tu enlace…",
    sentTitle: "Tu enlace está en camino.",
    sent: "Abre el enlace de acceso en tu correo. Vence en 10 minutos.",
    localSent:
      "Modo local: tu correo te espera en la bandeja local. No se envió nada al exterior.",
    inbox: "Abrir bandeja local",
    another: "Usar otro correo",
    steam: "Continuar con Steam",
    steamLink: "Conectar Steam",
    steamUnavailable:
      "El acceso con Steam aún no está disponible. Usa un enlace por correo para comenzar.",
    or: "o",
    failure:
      "No pudimos iniciar tu sesión. Solicita un enlace nuevo y vuelve a intentar.",
    footnote:
      "Sin contraseñas que recordar. Tu primer inicio de sesión crea tu cuenta.",
  },
  account: {
    loading: "Cargando tu cuenta…",
    steamError:
      "No se pudo conectar Steam. Vuelve a intentar o usa otra cuenta de Steam.",
    eyebrow: "TU CUENTA",
    title: "Tu espacio en Tito.",
    email: "Correo electrónico",
    steam: "Identidad de Steam",
    notLinked: "Sin conectar",
    connected: "Conectada",
    description:
      "Steam vincula tu identidad con tu perfil de Dota. La disponibilidad de partidas sigue dependiendo del proveedor de datos.",
    signInRequired: "Inicia sesión para ver tu cuenta.",
    locale: "Idioma",
    language: "Español",
    future: "Se pueden agregar más idiomas en el futuro.",
  },
  match: {
    eyebrow: "DETALLES DE LA PARTIDA",
    title: "Una mirada más de cerca a tu partida.",
    loading: "Cargando detalles de la partida…",
    radiant: "Radiant",
    dire: "Dire",
    winner: " gana",
    unknownWinner: "Ganador no disponible",
    parsed: "Datos de repetición disponibles",
    unparsed: "Datos básicos de la partida",
    unparsedText:
      "Los datos detallados de la repetición no están disponibles para esta partida. Las estadísticas faltantes se muestran como N/D.",
    gpm: "GPM",
    xpm: "XPM",
    lastHits: "Últimos golpes",
    detail: "Partida",
    error: "No se pudo cargar esta partida.",
    overview: "Resumen de la partida",
    scoreboard: "Tabla de resultados",
    scoreboardHint:
      "Desplázate horizontalmente para explorar todas las estadísticas y objetos. La columna de jugadores permanece visible.",
    gameMode: "Modo de juego",
    lobby: "Sala",
    region: "Región",
    player: "Jugador / héroe",
    level: "Nivel",
    lhDn: "LH / DN",
    lhDnTitle: "Últimos golpes / denegaciones",
    netWorth: "Valor neto",
    heroDamage: "Daño a héroes",
    healing: "Curación",
    towerDamage: "Daño a torres",
    items: "Objetos",
    inventory: "Inventario",
    backpack: "Mochila",
    neutral: "Objeto neutral",
    enhancement: "Mejora neutral",
    itemNames: "Nombres de objetos",
    emptySlot: "Espacio vacío",
    unavailableSlot: "Datos del espacio no disponibles",
    unknownItem: (id: number) => `Objeto desconocido #${id}`,
    slotLabel: (slot: number) => `Espacio ${slot}`,
    anonymous: "Jugador anónimo",
    yourPlayer: "Tu jugador",
    selectedPlayer: "Jugador seleccionado",
    profileAbsent:
      "Tu perfil no aparece en los datos públicos de jugadores de esta partida. Algunas identidades pueden estar ocultas.",
    profileFailed:
      "No se pudo identificar a tu jugador en este momento. Los detalles de la partida siguen disponibles.",
    personalResult: (hero: string, result: string) => `${hero} · ${result}`,
    metadataUnavailable:
      "Algunos nombres e imágenes de héroes u objetos no están disponibles en este momento. Las estadísticas de la partida siguen visibles.",
    performance: "Tu rendimiento",
    openDota: "Ver en OpenDota",
    goldAdvantage: "Ventaja de oro",
    experienceAdvantage: "Ventaja de XP",
    timelines: "Cómo se desarrolló la partida",
    momentum: "Evolución de la partida",
    momentumHelp: "Compara el oro y la XP en el mismo momento.",
    goldShort: "Oro",
    xpShort: "XP",
    timelineAbout: "Acerca de los datos de la gráfica",
    sampleMissing:
      "Las muestras que faltan se muestran como no disponibles, sin estimar valores.",
    keyMoments: "Momentos clave del oro",
    largestGoldSwing: "Mayor cambio de oro",
    goldLeadChanged: "Cambio en la ventaja de oro",
    teamGained: (team: string, amount: string) =>
      `${amount} a favor de ${team}`,
    teamTakesLead: (team: string) => `${team} toma la ventaja`,
    replayAnalysis: "Análisis de la repetición",
    replayHelp:
      "OpenDota tiene estadísticas básicas, pero faltan los datos detallados de la repetición. Solicita un análisis para intentar cargar la evolución del oro y la XP, además de otras estadísticas.",
    replayCaveat:
      "El análisis puede tardar unos minutos; las repeticiones antiguas pueden haber vencido. Conectar Steam y tener una clave de API no analiza automáticamente cada repetición.",
    requestReplay: "Solicitar análisis de la repetición",
    signInReplay: "Inicia sesión para solicitar un análisis",
    submittingReplay: "Solicitando análisis…",
    queuedReplay: "Análisis solicitado. Esperando a OpenDota…",
    waitingReplay:
      "OpenDota sigue procesando esta repetición. Las consultas automáticas se pausaron; puedes volver a consultar el progreso o ver la partida en OpenDota.",
    unavailableReplay:
      "OpenDota no pudo proporcionar todos los datos solicitados de la repetición. Puede haber vencido o no se pudo procesar. Las estadísticas disponibles de la partida siguen visibles.",
    completeReplay: "Análisis listo. Datos de la partida actualizados.",
    checkReplay: "Consultar progreso",
    timelineHelp:
      "Por encima de cero favorece a Radiant; por debajo de cero favorece a Dire. Explora un momento con el control deslizante o consulta los datos de la gráfica.",
    timelinesUnavailable:
      "La evolución del oro y la XP no está disponible para esta partida. Depende de los datos detallados de la repetición.",
    seriesUnavailable: "Esta gráfica no está disponible para esta partida.",
    exploreTime: "Explorar el tiempo de partida",
    exploreTimeline: "Explorar gráfica",
    matchTime: "Tiempo de partida",
    advantage: "Ventaja",
    even: "Empate",
    lead: (team: string, amount: string) =>
      `${team} lleva una ventaja de ${amount}`,
    viewGraphData: "Ver datos de la gráfica",
    sampleTime:
      "Las muestras de la gráfica terminan en el último dato disponible de la repetición.",
    unknownMode: (id: number) => `Modo de juego ${id}`,
    unknownLobby: (id: number) => `Sala ${id}`,
    gameModes: {
      0: "Desconocido",
      1: "All Pick",
      2: "Captains Mode",
      3: "Random Draft",
      4: "Single Draft",
      5: "All Random",
      6: "Introducción",
      7: "Diretide",
      8: "Reverse Captains Mode",
      9: "Greeviling",
      10: "Tutorial",
      11: "Solo Mid",
      12: "Menos jugados",
      13: "Héroes limitados",
      14: "Emparejamiento del Compendio",
      15: "Personalizado",
      16: "Captains Draft",
      17: "Balanced Draft",
      18: "Ability Draft",
      19: "Evento",
      20: "All Random Deathmatch",
      21: "1v1 Mid",
      22: "All Pick",
      23: "Turbo",
      24: "Mutación",
      25: "Desafío de entrenadores",
    } as Record<number, string>,
    lobbyTypes: {
      0: "Normal",
      1: "Práctica",
      2: "Torneo",
      3: "Tutorial",
      4: "Cooperativo contra bots",
      5: "Partida de equipos",
      6: "Cola en solitario",
      7: "Clasificatoria",
      8: "1v1 Mid",
      9: "Battle Cup",
    } as Record<number, string>,
  },
  tools: {
    eyebrow: "UNA AYUDA JUSTO CUANDO LA NECESITAS",
    title: "Tus herramientas",
    description: "Prepara tu draft y revisa tus partidas.",
    compare: "Comparar partidas",
    compareHelp:
      "Pon dos de tus partidas guardadas lado a lado y descubre qué cambió.",
    draftLabel: "DURANTE EL DRAFT",
    heroPicker: "Selector de héroes",
    heroPickerHelp:
      "Arma el draft, explora tus opciones y encuentra un héroe que encaje.",
  },
  context: {
    progress: "Explora tu progreso",
    coaching: "Entrenamiento",
    heroes: "Tus héroes",
    session: "Reflexión de la sesión",
    journal: "Cuaderno de partidas",
    patches: "Notas del parche",
    settings: "Ajustes de la app",
    settingsHelp:
      "Administra Tito en este dispositivo y consulta tu consumo personal.",
    usage: "Uso de IA",
    install: "Instalación y uso sin conexión",
    localGame: "Conexión local al juego",
  },
  draft: {
    eyebrow: "HERRAMIENTAS / SELECTOR DE HÉROES",
    title: "Elige con un plan más claro.",
    description:
      "Trae el draft. Encuentra héroes que valga la pena considerar.",
    loading: "Cargando el catálogo de héroes…",
    board: "Tu draft",
    manual: "DRAFT MANUAL",
    reset: "Nuevo draft",
    role: "Tu rol",
    chooseRole: "Elige tu rol",
    roleRequired: "Elige tu rol para recibir sugerencias.",
    groups: {
      allies: "Selecciones aliadas",
      enemies: "Selecciones enemigas",
      bans: "Bloqueos",
      pool: "Favoritos para este draft",
    },
    groupNames: {
      allies: "selecciones aliadas",
      enemies: "selecciones enemigas",
      bans: "bloqueos",
      pool: "favoritos para este draft",
    },
    emptyGroup: "Selecciona este grupo y agrega héroes abajo.",
    emptyPool:
      "Opcional. Agrega favoritos adicionales sin excluir otros héroes.",
    favoritesHelp:
      "Los favoritos guardados para tu rol se incluyen automáticamente. Los héroes marcados como Evitar se excluyen salvo que los agregues aquí; las selecciones y los bloqueos siempre se respetan.",
    useHistory: "Usar mi experiencia guardada con héroes",
    historyHelp:
      "Usa partidas del historial guardado de tu cuenta de Steam verificada. Las cantidades describen experiencia, no habilidad.",
    connectHistory:
      "Conecta Steam e importa tu historial para usar tu experiencia guardada con héroes. Los drafts manuales funcionan sin Steam.",
    localSave:
      "Los datos del draft se guardan en este navegador durante cuatro horas. Inicia un draft nuevo para cada partida.",
    localFailed:
      "El almacenamiento del navegador no está disponible. Mantén esta página abierta para conservar tu draft.",
    addingTo: "AGREGAR HÉROES A",
    catalog: "Catálogo de héroes",
    search: "Buscar un héroe",
    searchPlaceholder: "Buscar héroes o roles del catálogo…",
    visibleHeroes: (n: number) => `${n} ${n === 1 ? "héroe" : "héroes"}`,
    selectHelp:
      "Haz clic en un retrato para agregarlo o quitarlo. Un héroe no puede estar seleccionado y bloqueado a la vez.",
    noHeroes: "Ningún héroe coincide con esta búsqueda.",
    catalogDate: (date: string) =>
      `Catálogo de OpenDota incluido · obtenido el ${date}. Los datos de héroes pueden ir detrás de las actualizaciones del juego.`,
    add: (name: string, group: "allies" | "enemies" | "bans" | "pool") =>
      `Agregar ${name} a ${{ allies: "las selecciones aliadas", enemies: "las selecciones enemigas", bans: "los bloqueos", pool: "favoritos para este draft" }[group]}`,
    remove: (name: string, group: "allies" | "enemies" | "bans" | "pool") =>
      `Quitar ${name} de ${{ allies: "las selecciones aliadas", enemies: "las selecciones enemigas", bans: "los bloqueos", pool: "favoritos para este draft" }[group]}`,
    unknownHero: (id: number) => `Héroe ${id}`,
    options: "Tus opciones",
    decisions: "UNA SEGUNDA OPINIÓN RÁPIDA",
    intro:
      "Las mejores opciones disponibles según tu rol y draft, más alternativas entre tus favoritos cuando estén disponibles.",
    bestFits: "Mejores opciones para el draft",
    fromFavorites: "Entre tus favoritos",
    favorite: "Favorito",
    signIn: "Inicia sesión para recibir sugerencias",
    unconfigured: "Las sugerencias con IA aún no están disponibles.",
    unconfiguredHelp:
      "Puedes seguir preparando tu draft. Las sugerencias aparecerán aquí cuando se habilite la IA.",
    suggest: "Sugerir héroes",
    suggesting: "Evaluando tu draft…",
    busy: "Evaluando una lista de opciones en una solicitud de Decisions. Puedes seguir editando mientras se procesa.",
    previousSuggestions: "Sugerencias anteriores",
    failedHelp:
      "La última solicitud falló. Estas sugerencias guardadas no se han actualizado. Vuelve a intentar antes de basarte en ellas.",
    expiredHelp:
      "Estas sugerencias tienen más de quince minutos. Solicita una evaluación nueva para el draft actual.",
    outdated: "Draft anterior",
    outdatedHelp:
      "El draft cambió. Estas opciones corresponden al draft anterior; vuelve a solicitar sugerencias para las selecciones actuales.",
    assessed: (n: number) =>
      `${n === 1 ? "Evaluado" : "Evaluados"} ${n} ${n === 1 ? "héroe disponible" : "héroes disponibles"} · Evaluación del draft con IA`,
    experience: (n: number) =>
      `${n} ${n === 1 ? "partida guardada" : "partidas guardadas"} con este héroe`,
    historyUsed: (n: number) =>
      `Contexto de experiencia de ${n} ${n === 1 ? "partida guardada" : "partidas guardadas"}.`,
    noHistory: "No se usó experiencia guardada con héroes.",
    fit: {
      good: "Buena opción para el draft",
      possible: "Vale la pena considerarlo",
      limited: "Encaje limitado",
    },
    consider: "Considera:",
    reasons: {
      role_fit: "Podría encajar en el rol que seleccionaste.",
      team_balance: "Podría complementar los roles que ya tiene tu equipo.",
      matchup_fit:
        "Podría encajar contra los héroes enemigos revelados; esta es una inferencia de IA, no datos medidos de enfrentamientos.",
      comfort:
        "Tu experiencia registrada puede hacer que esta opción te resulte más familiar.",
      flexible:
        "Podría ofrecer flexibilidad mientras el draft sigue incompleto.",
      uncertain:
        "No hay suficiente contexto confiable para identificar una ventaja clara.",
    },
    tradeoffs: {
      farm_demand:
        "La necesidad de farmeo o el tiempo para volverse efectivo pueden ser importantes.",
      execution: "La ejecución y la coordinación pueden ser exigentes.",
      draft_overlap:
        "Revisa si hay roles que se superponen con los de tus compañeros.",
      matchup_risk:
        "Revisa los enemigos revelados y las interacciones actuales de habilidades.",
      limited_information:
        "Las selecciones faltantes y los detalles del parche actual limitan esta evaluación.",
      none_clear:
        "No se identificó una desventaja particular; vuelve a evaluar cuando se revelen más héroes.",
    },
    emptyResults: "Tus opciones aparecerán aquí cuando solicites sugerencias.",
    useEvidence: "Usar evidencia agregada de enfrentamientos",
    evidenceHelp:
      "Opcional. Consulta muestras almacenadas de hasta tres enemigos revelados. Puede tardar más; las fuentes faltantes se mantienen como desconocidas.",
    evidenceCoverage: (loaded: number, total: number, samples: number) =>
      `Fuentes de enfrentamientos: ${loaded} de ${total} enemigos; ${samples} muestras de candidatos. No se especifican el grupo ni el parche.`,
    evidenceSource: (hero: string) => `Muestras de OpenDota contra ${hero}`,
    loadPool: "Cargar favoritos guardados",
    saveSnapshot: "Guardar captura del draft",
    savedDrafts: "Drafts guardados",
    poolLoaded:
      "Favoritos guardados cargados. También se consideran los demás héroes disponibles.",
    noSavedPool:
      "No hay favoritos guardados para este rol. Marca héroes como Favorito en tus selecciones de héroes.",
    snapshotSaved:
      "Captura del draft guardada. Registra tu héroe elegido en Drafts guardados.",
    libraryHelp:
      "Carga solo los héroes marcados como Favorito para tu rol o guarda este draft. Guardarlo no solicita sugerencias con IA.",
    caveat:
      "El encaje es una evaluación de IA, no una probabilidad de victoria. Las muestras agregadas son opcionales y pueden abarcar distintos rangos o parches. Los detalles de habilidades del parche actual siguen sin verificar. Se envían para la evaluación las identidades de los héroes, sus características del catálogo, las cantidades opcionales de experiencia y las muestras agregadas solicitadas.",
  },
  review: {
    eyebrow: "UN MOMENTO PARA APRENDER",
    title: "La revisión de tu partida",
    generate: "Revisar esta partida",
    update: "Buscar actualizaciones",
    generating: "Revisando…",
    generatingHint:
      "Revisando tus estadísticas y partidas anteriores comparables…",
    loading: "Cargando tu revisión guardada…",
    signIn: "Inicia sesión para revisar",
    signInHint:
      "Descubre qué salió bien, qué merece más atención y cómo mejorar tu próxima partida.",
    connect: "Conectar Steam",
    connectHint:
      "Conecta la cuenta de Steam con la que juegas para revisar tus propias partidas. Buscar un jugador público no verifica que la cuenta sea tuya.",
    unconfigured: "Las revisiones con IA aún no están disponibles.",
    unconfiguredHint:
      "Las estadísticas de tus partidas y tu historial guardado siguen disponibles. Vuelve cuando se habiliten las revisiones.",
    intro:
      "Encuentra los aciertos, entiende los problemas y llévate acciones concretas para probar. Esta revisión sigue a tu jugador de Steam conectado, incluso cuando seleccionas a otra persona en la tabla de resultados.",
    privacy:
      "Solo se envían estadísticas seleccionadas de la partida y promedios personales para la revisión con IA. Se excluyen nombres, ID de cuentas y chat. Las revisiones se guardan; si la evidencia no cambia, se reutiliza el resultado anterior.",
    ownPlayer: (hero: string) => `Tu jugador de Steam conectado · ${hero}`,
    wentWell: "Qué salió bien",
    wentWrong: "Qué salió mal",
    improve: "Cómo mejorar",
    emptyPositive:
      "Las estadísticas disponibles no respaldan ningún acierto claro.",
    emptyNegative:
      "Las estadísticas disponibles no respaldan ningún problema claro.",
    observed: "Observado",
    toReview: "Revisar en la repetición",
    evidence: "Estadísticas de respaldo",
    personalAverage: "Tu promedio",
    samples: (n: number) => `${n} ${n === 1 ? "partida" : "partidas"}`,
    generated: (date: string) => `Guardado el ${date} · Interpretación de IA`,
    aiCaveat:
      "Las estadísticas muestran resultados, no cada decisión. Trata las revisiones de la repetición como preguntas por investigar. La IA puede cometer errores.",
    statistics: "Estadísticas utilizadas",
    coverage: {
      summary:
        "Esta revisión usa estadísticas de resumen guardadas. La información detallada de la repetición no está disponible.",
      details:
        "Esta revisión usa los totales disponibles del jugador. Estos totales no pueden explicar peleas o decisiones individuales.",
      timeline:
        "Esta revisión incluye los totales del jugador y muestras de la ventaja de oro o XP del equipo. Los cambios de ventaja del equipo no determinan tu impacto personal.",
    },
    baselineHint:
      "Los promedios personales usan hasta 20 partidas guardadas anteriores con el mismo héroe, con una duración que no difiera más del 25% de esta partida. Cada promedio requiere al menos 5 valores disponibles. El rol, rango, parche y modo de juego pueden variar.",
    metrics: {
      result: "Resultado",
      duration: "Duración",
      kills: "Asesinatos",
      deaths: "Muertes",
      assists: "Asistencias",
      goldPerMinute: "GPM",
      experiencePerMinute: "XPM",
      lastHits: "Últimos golpes",
      denies: "Denegaciones",
      level: "Nivel",
      netWorth: "Valor neto",
      heroDamage: "Daño a héroes",
      heroHealing: "Curación",
      towerDamage: "Daño a torres",
      teamGoldAdvantage: "Ventaja de oro de tu equipo",
      teamExperienceAdvantage: "Ventaja de XP de tu equipo",
    },
  },
  profile: {
    title: "Tus preferencias de jugador",
    description:
      "Guarda el perfil con el que juegas y cómo te gusta aprender. Estas preferencias le darán contexto a tu entrenador.",
    loading: "Cargando preferencias de jugador…",
    accountId: "Tu ID de amigo de Dota o SteamID64",
    manualHint:
      "Puedes guardar tu ID de amigo sin conectar Steam. Esto selecciona el historial de partidas; no verifica que la cuenta sea tuya.",
    connectedHint:
      "Déjalo vacío para usar tu cuenta de Steam conectada o ingresa otro perfil público de Dota.",
    role: "Rol preferido",
    experience: "Nivel de experiencia",
    chooseLater: "Elegir después",
    roles: [
      { value: "1", label: "1 · Carry" },
      { value: "2", label: "2 · Mid" },
      { value: "3", label: "3 · Offlane" },
      { value: "4", label: "4 · Soft support" },
      { value: "5", label: "5 · Hard support" },
    ],
    levels: [
      { value: "beginner", label: "Nuevo en Dota" },
      { value: "intermediate", label: "Conozco lo básico" },
      { value: "advanced", label: "Jugador con experiencia" },
    ],
    save: "Guardar preferencias",
    saving: "Guardando…",
    saved: "Tus preferencias de jugador están guardadas.",
    myMatches: "Mis partidas",
    setUp: "Configura tu perfil de jugador",
  },
  inbox: {
    eyebrow: "SOLO PARA DESARROLLO",
    title: "Tu bandeja local.",
    description:
      "Los correos generados por Tito se quedan en esta computadora. Abre un mensaje para ver su contenido y seguir su enlace de acceso.",
    emptyTitle: "Aún no hay correos.",
    emptyText:
      "Solicita un enlace de acceso para crear tu primer correo local.",
    unavailable: "La bandeja local no está disponible en este entorno.",
    refresh: "Actualizar bandeja",
    to: "Para",
    open: "Abrir enlace de acceso",
    back: "Todos los mensajes",
    preview: "Vista previa del correo",
  },
  errors: {
    generic: "Algo salió mal. Vuelve a intentar.",
    connection:
      "No se pudo conectar con el servidor. Revisa que la API esté en ejecución.",
  },
  footer: "Hecho para la próxima partida.",
};
