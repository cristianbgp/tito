// English is the default catalog and the type contract for every supported language.
export const en = {
  common: {
    unavailable: "N/A",
    searchOptions: (label: string) => `Search ${label}`,
    searchOptionsPlaceholder: "Type to search…",
    noOptions: "No options found.",
    refineOptions: (shown: number, total: number) =>
      `Showing ${shown} of ${total}. Type to narrow the list.`,
  },
  workspaceLabel: "DOTA 2 / PERSONAL COMPANION",
  toolkit: {
    signInHelp:
      "Sign in to keep your personal tools and saved records together.",
    steamHelp:
      "Connect the Steam account you play on to use its saved match data.",
  },
  brand: "tito",
  tagline: "YOUR NEXT GAME, BETTER.",
  appearance: {
    label: "Appearance",
    light: "Light appearance",
    dark: "Dark appearance",
    system: "Use system appearance",
  },
  shell: {
    loading: "Loading…",
    navigation: "Main navigation",
    connected: "Steam connected",
    emailAccount: "Email account",
    guest: "Your next game, better.",
    search: "Find matches",
    account: "Your account",
    skip: "Skip to content",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    sidebarShortcut: "⌘B / Ctrl+B",
  },
  nav: {
    tools: "Tools",
    progress: "Progress",
    matches: "Matches",
    account: "Your account",
    inbox: "Local inbox",
    templates: "Email templates",
    signIn: "Sign in",
    signOut: "Sign out",
    home: "Back to matches",
  },
  home: {
    stampTagline: "PLAY. LEARN. REPEAT.",
    dataTagline: "OPEN DATA. BETTER DECISIONS.",
    eyebrow: "THE IMPROVEMENT STARTS WITH YOU",
    title: "Your matches",
    description: "A closer look at your recent games.",
    searchTitle: "Find your recent matches",
    id: "Dota friend ID or SteamID64",
    placeholder: "e.g. 70388657",
    search: "Find matches",
    searching: "Finding matches…",
    hint: "Find your friend ID on your Dota profile. Available history depends on public match data.",
    emptyTitle: "Your next step starts here.",
    emptyText:
      "Enter a player ID above to explore up to 20 available recent matches.",
    recent: "Recent matches",
    noMatches: "No recent matches available",
    noMatchesText:
      "Check the player ID and public match data settings. New matches may take time to appear.",
    hero: "Hero",
    result: "Result",
    kda: "K / D / A",
    duration: "Duration",
    played: "Played",
    open: "Open match",
    retry: "Try again",
    win: "Victory",
    loss: "Defeat",
    unknown: "Unavailable",
    source: "Match data from OpenDota",
    replaySource: "Match data from your replay imports",
    mixedSource: "Match data from OpenDota and your replay imports",
    refresh: "Refresh matches",
    preview: "Selected match",
    previewAction: (hero: string) => `Preview ${hero} match`,
    openAction: (hero: string) => `Open ${hero} match`,
    previewLoading: "Loading match preview…",
    previewUnavailable:
      "The full preview is temporarily unavailable. You can still open the match or try again.",
    previewTimelineUnavailable:
      "Gold timeline is unavailable. Open the match to request replay analysis.",
    accountTitle: "Make it your own.",
    accountText:
      "Sign in with Steam to keep your matches, preferences and progress together.",
    noteTitle: "A foundation for better Dota",
    noteText:
      "Explore your matches, follow your progress, and request an AI review when reviews are enabled.",
  },
  progress: {
    eyebrow: "YOUR GAME OVER TIME",
    title: "Your progress",
    description: "Small signals from the games you’ve saved.",
    refresh: "Refresh progress",
    signInTitle: "Your progress belongs to you.",
    connectTitle: "Connect your player identity.",
    ownOnly:
      "Progress uses the saved match history of your connected Steam account.",
    connect: "Connect Steam",
    emptyTitle: "Your progress starts with saved matches.",
    emptyText:
      "Import your available matches first. This dashboard uses saved summaries and makes no match-provider requests.",
    cached:
      "Showing previously loaded progress. Saved statistics could not be refreshed.",
    period: (from: string, to: string, games: string) =>
      `Last 28 days · ${from}–${to} (UTC) · ${games} saved games`,
    scope: (count: string) =>
      `Based on ${count} retained matches, including those beyond the list’s current display limit.`,
    deaths: "Deaths per game",
    gpm: "Average GPM",
    xpm: "Average XPM",
    validSamples: (count: string) => `${count} valid samples`,
    previous: "Previous 28 days",
    change: "vs. previous period",
    points: "pp",
    minimum: (count: string) =>
      `At least ${count} valid samples in each period are needed to compare.`,
    caveat:
      "Only imported matches are included. Heroes, roles and game modes affect averages. Changes use unrounded values; each metric excludes its own missing values.",
    weeklyTitle: "Eight weeks of results",
    weeklyHint:
      "Weeks start Monday in UTC. Current week is partial; gaps may reflect missing imports rather than no games played.",
    chartLabel:
      "Imported wins, losses and unavailable results by week. Open View weekly numbers for exact counts and statistics.",
    weekTooltip: (
      week: string,
      wins: string,
      losses: string,
      unknown: string,
    ) =>
      `${week}: ${wins} victories, ${losses} defeats, ${unknown} unavailable results`,
    numbers: "View weekly numbers",
    table: "Weekly match statistics",
    week: "Week of (UTC)",
    partial: "Partial week",
  },
  savedHistory: {
    myHistory: "My saved history",
    openDetails:
      "Open the match to load detailed statistics and available replay data.",
    title: "Saved match history",
    description: "Your saved games, ready when you are.",
    intro:
      "Import up to 100 available matches from your connected Steam account. Sync only when you choose.",
    import: "Import my matches",
    sync: "Sync new matches",
    syncing: "Syncing matches…",
    slowSync:
      "OpenDota is taking longer than usual. Your saved matches remain available while this request finishes.",
    older: "Load older matches",
    more: "Show more saved matches",
    synced: (date: string) => `Last synced ${date}.`,
    scope: (shown: number, total: number, limit: number) =>
      `Showing ${shown} of ${total} saved matches. Keeps your newest ${limit} imported matches.`,
    capped: (limit: number) =>
      `Your ${limit}-match retention limit is reached. New syncs keep the newest matches and replace the oldest.`,
    available: (date: string) => `Next sync available ${date}.`,
    empty: "Your history starts here.",
    emptyText:
      "Import your available matches to keep summaries here, even when the match provider is unavailable.",
    cached:
      "Showing previously loaded saved matches. History storage could not be refreshed.",
    showing: (shown: number, total: number) =>
      `${shown} of ${total} loaded saved matches`,
    heroTitle: "Saved hero performance",
    heroScope: (count: number) =>
      `Based on ${count} loaded saved ${count === 1 ? "match" : "matches"}, before filters. This is your imported sample, not your complete lifetime history.`,
  },
  replayImport: {
    action: "Import replay",
    title: "Keep your lobby games, too.",
    description:
      "Download the replay from Dota and choose its .dem file. Your linked Steam account must be a player in the match.",
    file: "Replay file (.dem)",
    submit: "Import this replay",
    cancel: "Cancel import",
    uploading: "Uploading replay…",
    processing: "Reading your replay…",
    progress: "Replay upload progress",
    processingHelp:
      "You can leave this page. Your imported match will be saved when processing finishes.",
    success: "Your replay is saved in match history.",
    open: "Open imported match",
    source: "Replay import",
    unavailable: "Replay import is not available on this server yet.",
    invalid: "Choose a complete .dem replay within the size limit.",
    limits: (megabytes: number, retention: number, daily: number) =>
      `Up to ${megabytes} MB per file and ${daily} import attempts per day (UTC). Keeps your newest ${retention} imported replays.`,
    privacy:
      "Replay files are deleted after processing. Extracted match statistics are saved privately in your account.",
  },
  history: {
    search: "Hero or match ID",
    searchPlaceholder: "Search these matches…",
    result: "Result",
    allResults: "All results",
    queue: "Queue",
    allQueues: "All queues",
    ranked: "Ranked",
    normalQueue: "Unranked matchmaking",
    otherQueues: "Other queues",
    unknownQueue: "Unknown queue",
    gameMode: "Game mode",
    allModes: "All game modes",
    unknownMode: "Unknown mode",
    typeHint:
      "Queue and game mode are separate. Filters apply to loaded matches.",
    missingTypes:
      "Some saved matches have no queue or mode information. Re-import those matches to update it, or choose Unknown to find them.",
    sort: "Sort by",
    newest: "Newest first",
    oldest: "Oldest first",
    longest: "Longest first",
    shortest: "Shortest first",
    reset: "Reset view",
    showing: (shown: number, total: number) =>
      `${shown} of ${total} recent matches`,
    winRate: "Win rate",
    record: (wins: number, losses: number) => `${wins}W · ${losses}L`,
    recordLabel: (wins: number, losses: number, unknown: number) =>
      `${wins} ${wins === 1 ? "victory" : "victories"}, ${losses} ${losses === 1 ? "defeat" : "defeats"}${unknown ? `, ${unknown} with no result available` : ""}`,
    unknownResults: (count: number) =>
      `${count} ${count === 1 ? "result" : "results"} unavailable`,
    summaryHint: "Win rate uses only matches with a known result.",
    noResults: "No matches fit this view",
    noResultsText:
      "Try another hero or match ID, change the filters, or reset the view.",
    loadFailed: "Recent matches couldn’t be loaded",
    loadFailedText: "Try again when the match data provider is available.",
    cached:
      "Showing previously loaded matches. Live updates are temporarily unavailable.",
    heroTitle: "Recent hero performance",
    heroScope: (count: number) =>
      `Based on ${count} available recent ${count === 1 ? "match" : "matches"}, before filters.`,
    heroHint:
      "Win rate excludes unavailable results. GPM and XPM averages use only games where those statistics are available.",
    heroScrollHint: "Scroll horizontally for results and farming statistics.",
    games: "Games",
    recordTitle: "W / L",
    averageGpm: "Avg GPM",
    averageXpm: "Avg XPM",
    heroAction: (hero: string) => `Show ${hero} games`,
    heroIdentity: (id: number) => `Hero #${id}`,
  },
  auth: {
    mapCaption: "01 / THE NEXT CHAPTER",
    eyebrow: "ONE ACCOUNT. YOUR DOTA JOURNEY.",
    title: "Welcome to Tito.",
    description:
      "Sign in with Steam to connect your Dota profile and keep your matches together.",
    steamHeading: "Your player, connected.",
    steamHelp:
      "Your first Steam sign-in creates your Tito account and connects your player profile.",
    connecting: "Connecting to Steam…",
    steam: "Continue with Steam",
    steamLink: "Connect Steam",
    steamUnavailable:
      "Steam sign-in is temporarily unavailable. Please try again later.",
    failure: "Steam sign-in didn’t finish. Please try again.",
    footnote:
      "Steam handles your login. Tito never receives your Steam password.",
  },
  account: {
    loading: "Loading your account…",
    steamError:
      "Steam could not be connected. Try connecting again, or use a different Steam account.",
    eyebrow: "YOUR ACCOUNT",
    title: "Your corner of Tito.",
    email: "Email",
    steam: "Steam identity",
    notLinked: "Not connected",
    connected: "Connected",
    description:
      "Steam connects your identity to your Dota profile. Match availability still depends on the data provider.",
    signInRequired: "Sign in to view your account.",
    locale: "Language",
    language: "English",
    future: "More languages can be added later.",
  },
  match: {
    eyebrow: "MATCH DETAILS",
    title: "A closer look at your game.",
    loading: "Loading match details…",
    radiant: "Radiant",
    dire: "Dire",
    winner: " wins",
    unknownWinner: "Winner unavailable",
    parsed: "Replay data available",
    unparsed: "Basic match data",
    unparsedText:
      "Detailed replay data is unavailable for this match. Missing statistics are shown as N/A.",
    gpm: "GPM",
    xpm: "XPM",
    lastHits: "Last hits",
    detail: "Match",
    error: "Unable to load this match.",
    overview: "Match overview",
    scoreboard: "Scoreboard",
    scoreboardHint:
      "Scroll horizontally to explore all stats and items. The player column stays in view.",
    gameMode: "Game mode",
    lobby: "Lobby",
    region: "Region",
    player: "Player / hero",
    level: "Level",
    lhDn: "LH / DN",
    lhDnTitle: "Last hits / denies",
    netWorth: "Net worth",
    heroDamage: "Hero damage",
    healing: "Healing",
    towerDamage: "Tower damage",
    items: "Items",
    inventory: "Inventory",
    backpack: "Backpack",
    neutral: "Neutral item",
    enhancement: "Neutral enhancement",
    itemNames: "Item names",
    emptySlot: "Empty slot",
    unavailableSlot: "Slot data unavailable",
    unknownItem: (id: number) => `Unknown item #${id}`,
    slotLabel: (slot: number) => `Slot ${slot}`,
    anonymous: "Anonymous player",
    yourPlayer: "Your player",
    selectedPlayer: "Selected player",
    profileAbsent:
      "Your profile does not appear in the public player data for this match. Some player identities may be hidden.",
    profileFailed:
      "Your player could not be identified right now. Match details are still available.",
    personalResult: (hero: string, result: string) => `${hero} · ${result}`,
    metadataUnavailable:
      "Some hero or item names and images are unavailable right now. Match statistics are still shown.",
    performance: "Your performance",
    openDota: "View on OpenDota",
    goldAdvantage: "Gold advantage",
    experienceAdvantage: "XP advantage",
    timelines: "How the match unfolded",
    momentum: "Match momentum",
    momentumHelp: "Compare gold and XP at the same moment.",
    goldShort: "Gold",
    xpShort: "XP",
    timelineAbout: "About timeline data",
    sampleMissing:
      "Missing samples are shown as unavailable, without estimating values.",
    keyMoments: "Key gold moments",
    largestGoldSwing: "Largest gold swing",
    goldLeadChanged: "Gold lead changed",
    teamGained: (team: string, amount: string) => `${amount} toward ${team}`,
    teamTakesLead: (team: string) => `${team} takes the lead`,
    replayAnalysis: "Replay analysis",
    replayHelp:
      "OpenDota has basic match stats, but detailed replay data is missing. Request analysis to try to load gold/XP timelines and additional stats.",
    replayCaveat:
      "Analysis can take a few minutes; older replays may have expired. Steam linking and an API key do not automatically analyze every replay.",
    requestReplay: "Request replay analysis",
    signInReplay: "Sign in to request analysis",
    submittingReplay: "Requesting analysis…",
    queuedReplay: "Analysis requested. Waiting for OpenDota…",
    waitingReplay:
      "OpenDota is still processing this replay. Automatic checks have paused; you can check progress again or view the match on OpenDota.",
    unavailableReplay:
      "OpenDota could not provide all requested replay data. The replay may have expired or could not be processed. Available match stats remain visible.",
    completeReplay: "Analysis ready. Match data refreshed.",
    checkReplay: "Check progress",
    timelineHelp:
      "Above zero favors Radiant; below zero favors Dire. Explore a moment with the slider or inspect the timeline data.",
    timelinesUnavailable:
      "Gold and XP timelines are unavailable for this match. They depend on detailed replay data.",
    seriesUnavailable: "This timeline is unavailable for this match.",
    exploreTime: "Explore match time",
    exploreTimeline: "Explore timeline",
    matchTime: "Match time",
    advantage: "Advantage",
    even: "Even",
    lead: (team: string, amount: string) => `${team} leads by ${amount}`,
    viewGraphData: "View timeline data",
    sampleTime: "Timeline samples stop at the last available replay sample.",
    unknownMode: (id: number) => `Game mode ${id}`,
    unknownLobby: (id: number) => `Lobby ${id}`,
    gameModes: {
      0: "Unknown",
      1: "All Pick",
      2: "Captains Mode",
      3: "Random Draft",
      4: "Single Draft",
      5: "All Random",
      6: "Intro",
      7: "Diretide",
      8: "Reverse Captains Mode",
      9: "Greeviling",
      10: "Tutorial",
      11: "Mid Only",
      12: "Least Played",
      13: "Limited Heroes",
      14: "Compendium Matchmaking",
      15: "Custom",
      16: "Captains Draft",
      17: "Balanced Draft",
      18: "Ability Draft",
      19: "Event",
      20: "All Random Deathmatch",
      21: "1v1 Mid",
      22: "All Pick",
      23: "Turbo",
      24: "Mutation",
      25: "Coaches Challenge",
    } as Record<number, string>,
    lobbyTypes: {
      0: "Normal",
      1: "Practice",
      2: "Tournament",
      3: "Tutorial",
      4: "Co-op bots",
      5: "Team match",
      6: "Solo queue",
      7: "Ranked",
      8: "1v1 Mid",
      9: "Battle Cup",
    } as Record<number, string>,
  },
  tools: {
    eyebrow: "A LITTLE HELP, RIGHT WHEN YOU NEED IT",
    title: "Your tools",
    description: "Prepare your draft and review your games.",
    compare: "Compare matches",
    compareHelp:
      "Put two of your saved games side by side and see what changed.",
    draftLabel: "DURING THE DRAFT",
    heroPicker: "Hero picker",
    heroPickerHelp:
      "Build the draft, explore your options, and find a hero that fits.",
  },
  context: {
    progress: "Explore your progress",
    coaching: "Coaching",
    heroes: "Your heroes",
    session: "Session reflection",
    journal: "Match notebook",
    patches: "Patch notes",
    settings: "App settings",
    settingsHelp: "Manage Tito on this device and check your personal usage.",
    usage: "AI usage",
    install: "Install and offline",
    localGame: "Local game connection",
  },
  draft: {
    eyebrow: "TOOLS / HERO PICKER",
    title: "Pick with a clearer plan.",
    description: "Bring the draft. Find a few heroes worth considering.",
    loading: "Loading the hero catalog…",
    board: "Your draft",
    manual: "MANUAL DRAFT",
    reset: "New draft",
    role: "Your role",
    chooseRole: "Choose your role",
    roleRequired: "Choose your role to get suggestions.",
    groups: {
      allies: "Allied picks",
      enemies: "Enemy picks",
      bans: "Bans",
      pool: "Favorites for this draft",
    },
    groupNames: {
      allies: "allied picks",
      enemies: "enemy picks",
      bans: "bans",
      pool: "favorites for this draft",
    },
    emptyGroup: "Select this group, then add heroes below.",
    emptyPool: "Optional. Add extra favorites without excluding other heroes.",
    favoritesHelp:
      "Saved favorites for your role are included automatically. Heroes marked Avoid are excluded unless added here; picks and bans always apply.",
    useHistory: "Use my saved hero experience",
    historyHelp:
      "Uses games from your verified Steam account’s saved history. Counts describe experience, not skill.",
    connectHistory:
      "Connect Steam and import history to use your saved hero experience. Manual drafts work without Steam.",
    localSave:
      "Draft input is saved on this browser for four hours. Start a new draft for each game.",
    localFailed:
      "Browser storage is unavailable. Keep this page open to retain your draft.",
    addingTo: "ADD HEROES TO",
    catalog: "Hero catalog",
    search: "Find a hero",
    searchPlaceholder: "Search heroes or catalog roles…",
    visibleHeroes: (n: number) => `${n} heroes`,
    selectHelp:
      "Click a portrait to add or remove it. Picks and bans stay exclusive.",
    noHeroes: "No heroes match this search.",
    catalogDate: (date: string) =>
      `Bundled OpenDota catalog · retrieved ${date}. Hero data may lag game updates.`,
    add: (name: string, group: "allies" | "enemies" | "bans" | "pool") =>
      `Add ${name} to ${{ allies: "allied picks", enemies: "enemy picks", bans: "bans", pool: "favorites for this draft" }[group]}`,
    remove: (name: string, group: "allies" | "enemies" | "bans" | "pool") =>
      `Remove ${name} from ${{ allies: "allied picks", enemies: "enemy picks", bans: "bans", pool: "favorites for this draft" }[group]}`,
    unknownHero: (id: number) => `Hero ${id}`,
    options: "Your options",
    decisions: "A QUICK SECOND OPINION",
    intro:
      "The best available fits for your role and draft, plus alternatives from your favorites when available.",
    bestFits: "Best draft fits",
    fromFavorites: "From your favorites",
    favorite: "Favorite",
    signIn: "Sign in for suggestions",
    unconfigured: "AI suggestions aren’t available yet.",
    unconfiguredHelp:
      "You can still prepare your draft. Suggestions will appear here once AI is enabled.",
    suggest: "Suggest heroes",
    suggesting: "Considering your draft…",
    busy: "Assessing a shortlist in one Decisions request. You can keep editing while it runs.",
    previousSuggestions: "Previous suggestions",
    failedHelp:
      "The latest request failed. These saved suggestions have not been refreshed. Try again before relying on them.",
    expiredHelp:
      "These suggestions are over fifteen minutes old. Request a fresh assessment for the current draft.",
    outdated: "Earlier draft",
    outdatedHelp:
      "The draft changed. These options belong to the earlier draft; request suggestions again for the current picks.",
    assessed: (n: number) =>
      `Assessed ${n} available ${n === 1 ? "hero" : "heroes"} · AI draft assessment`,
    experience: (n: number) =>
      `${n} saved ${n === 1 ? "game" : "games"} on this hero`,
    historyUsed: (n: number) => `Experience context from ${n} saved games.`,
    noHistory: "No saved hero experience was used.",
    fit: {
      good: "Good draft option",
      possible: "Worth considering",
      limited: "Limited fit",
    },
    consider: "Consider:",
    reasons: {
      role_fit: "A potential fit for the role you selected.",
      team_balance:
        "May complement the roles already represented on your team.",
      matchup_fit:
        "May fit against the revealed enemy heroes; this is an AI inference, not measured counter data.",
      comfort: "Your recorded experience may make this a more familiar option.",
      flexible: "May offer flexibility while the draft is still incomplete.",
      uncertain:
        "There isn’t enough reliable context to identify a clear advantage.",
    },
    tradeoffs: {
      farm_demand: "Farm demand or time to come online may matter.",
      execution: "Execution and coordination may be demanding.",
      draft_overlap: "Check for overlapping roles with your teammates.",
      matchup_risk:
        "Check the revealed enemies and current ability interactions.",
      limited_information:
        "Missing picks and current patch details limit this assessment.",
      none_clear:
        "No particular tradeoff was identified; reassess as more heroes are revealed.",
    },
    emptyResults: "Your options will appear here when you request suggestions.",
    useEvidence: "Use aggregate matchup evidence",
    evidenceHelp:
      "Optional. Check cached samples for up to three revealed enemies. This may take longer; missing sources remain unknown.",
    evidenceCoverage: (loaded: number, total: number, samples: number) =>
      `Matchup sources: ${loaded} of ${total} enemies; ${samples} candidate samples. Cohort and patch are unspecified.`,
    evidenceSource: (hero: string) => `OpenDota samples against ${hero}`,
    loadPool: "Load saved favorites",
    saveSnapshot: "Save draft snapshot",
    savedDrafts: "Saved drafts",
    poolLoaded:
      "Saved favorites loaded. Other available heroes are still considered.",
    noSavedPool:
      "No favorites are saved for this role. Mark heroes as Favorite in your hero pools.",
    snapshotSaved:
      "Draft snapshot saved. Record your chosen hero in Saved drafts.",
    libraryHelp:
      "Load only heroes marked Favorite for your role, or save this draft. Saving does not request AI suggestions.",
    caveat:
      "Fit is an AI assessment, not a chance of winning. Aggregate samples are optional and may cover different ranks or patches. Current-patch ability details remain unverified. Hero identities, catalog traits, optional experience counts and requested aggregate samples are sent for assessment.",
  },
  review: {
    eyebrow: "A MOMENT TO LEARN",
    title: "Your match review",
    generate: "Review this match",
    update: "Check for updates",
    generating: "Reviewing…",
    generatingHint: "Looking at your statistics and earlier comparable games…",
    loading: "Loading your saved review…",
    signIn: "Sign in to review",
    signInHint:
      "See what went well, what needs a closer look, and how to improve your next game.",
    connect: "Connect Steam",
    connectHint:
      "Connect the Steam account you play on to review your own matches. A public player lookup does not verify ownership.",
    unconfigured: "AI reviews aren’t available yet.",
    unconfiguredHint:
      "Your match statistics and saved history are still available. Come back when reviews are enabled.",
    intro:
      "Find the positives, understand the concerns, and leave with a few concrete things to try. This review follows your connected Steam player, even when you select someone else in the scoreboard.",
    privacy:
      "Only selected match statistics and personal averages are sent for AI review. Names, account IDs and chat are excluded. Reviews are saved; unchanged evidence reuses the previous result.",
    ownPlayer: (hero: string) => `Your connected Steam player · ${hero}`,
    wentWell: "What went well",
    wentWrong: "What went wrong",
    improve: "How to improve",
    emptyPositive:
      "No clear positive is supported by the available statistics.",
    emptyNegative: "No clear concern is supported by the available statistics.",
    observed: "Observed",
    toReview: "Replay check",
    evidence: "Supporting statistics",
    personalAverage: "Your average",
    samples: (n: number) => `${n} games`,
    generated: (date: string) => `Saved ${date} · AI interpretation`,
    aiCaveat:
      "Statistics show outcomes, not every decision. Treat replay checks as questions to investigate. AI can make mistakes.",
    statistics: "Statistics used",
    coverage: {
      summary:
        "This review uses saved summary statistics. Detailed replay information is unavailable.",
      details:
        "This review uses available player totals. These totals cannot explain individual fights or decisions.",
      timeline:
        "This review includes player totals and sampled team gold or XP advantage. Team swings do not establish your personal impact.",
    },
    baselineHint:
      "Personal averages use up to 20 earlier saved games on the same hero, within 25% of this match’s duration. Each average requires at least 5 available values. Role, rank, patch and game mode can differ.",
    metrics: {
      result: "Result",
      duration: "Duration",
      kills: "Kills",
      deaths: "Deaths",
      assists: "Assists",
      goldPerMinute: "GPM",
      experiencePerMinute: "XPM",
      lastHits: "Last hits",
      denies: "Denies",
      level: "Level",
      netWorth: "Net worth",
      heroDamage: "Hero damage",
      heroHealing: "Healing",
      towerDamage: "Tower damage",
      teamGoldAdvantage: "Your team’s gold lead",
      teamExperienceAdvantage: "Your team’s XP lead",
    },
  },
  profile: {
    title: "Your player preferences",
    description:
      "Save the profile you play on and how you like to learn. These preferences will give your coach context.",
    loading: "Loading player preferences…",
    accountId: "Your Dota friend ID or SteamID64",
    manualHint:
      "You can save your friend ID without connecting Steam. This selects match history; it does not verify account ownership.",
    connectedHint:
      "Leave this empty to use your connected Steam account, or enter another public Dota profile.",
    role: "Preferred role",
    experience: "Experience level",
    chooseLater: "Choose later",
    roles: [
      { value: "1", label: "1 · Carry" },
      { value: "2", label: "2 · Mid" },
      { value: "3", label: "3 · Offlane" },
      { value: "4", label: "4 · Soft support" },
      { value: "5", label: "5 · Hard support" },
    ],
    levels: [
      { value: "beginner", label: "New to Dota" },
      { value: "intermediate", label: "Comfortable with the basics" },
      { value: "advanced", label: "Experienced player" },
    ],
    save: "Save preferences",
    saving: "Saving…",
    saved: "Your player preferences are saved.",
    myMatches: "My matches",
    setUp: "Set up your player profile",
  },
  inbox: {
    eyebrow: "DEVELOPMENT ONLY",
    title: "Your local inbox.",
    description:
      "Emails generated by Tito stay on this computer. Open a message to preview it and follow its sign-in link.",
    emptyTitle: "No emails yet.",
    emptyText: "Request a sign-in link to create your first local email.",
    unavailable: "The local inbox is unavailable in this environment.",
    refresh: "Refresh inbox",
    to: "To",
    open: "Open sign-in link",
    back: "All messages",
    preview: "Email preview",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    connection: "Unable to reach the server. Check that the API is running.",
  },
  footer: "Built for the next game.",
};
