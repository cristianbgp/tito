export const companionCopy = {
  installTitle: "Keep Tito close.",
  installDescription:
    "Install the companion and keep public hero references available offline.",
  installApp: "Install Tito",
  installHelp:
    "Installation opens Tito in its own app window where supported. Browser support varies.",
  installManual:
    "Use your browser’s Install app, Add to Dock, or Add to Home Screen command when available.",
  installUnsupported: "This browser cannot enable offline references here.",
  offlineTitle: "Public references, offline",
  offlineHelp:
    "Save the public hero catalog and app assets on this device. Account, authentication, match history, notes and AI responses are never added to the offline cache.",
  enableOffline: "Enable offline references",
  removeOffline: "Remove offline references",
  openOffline: "Open public reference",
  offlineReady: "Public offline references are ready on this device.",
  offlineRemoved:
    "Offline references removed. Reload to stop the current service worker.",
  offlineFailed:
    "Offline references could not be prepared. Check your connection and try again.",
  journalTitle: "Your match notebook",
  journalDescription:
    "Revisit your saved observations, confirmed roles and bookmarked moments.",
  journalEmpty: "No saved notes or bookmarks yet.",
  bookmarksOnly: "Only bookmarked moments",
  notesCount: (n: number) => `${n} saved notes`,
  openMatch: "Open match",
  noText: "Bookmarked match",
  role: "Confirmed role",
  moment: "Replay bookmark",
  delete: "Delete",
  deleting: "Deleting…",
  draftsTitle: "Your draft history",
  draftsDescription:
    "Revisit your options and what you chose. A match result does not prove draft quality.",
  draftsEmpty: "No saved drafts yet. Save a snapshot from the hero picker.",
  chooseHero: "Chosen hero",
  noChoice: "Not recorded",
  linkMatch: "Link your match",
  matchId: "Your match ID",
  save: "Save",
  saving: "Saving…",
  saved: "Saved.",
  chosenHelp:
    "Record what you played, then link a retained match from your verified Steam account.",
  compareTitle: "Two games, side by side.",
  compareDescription:
    "Compare your retained match summaries and optionally load replay evidence.",
  firstMatch: "First match",
  secondMatch: "Second match",
  chooseMatch: "Choose a saved match",
  loadDetails: "Load replay comparison",
  compareEmpty: "Import saved history to compare your own games.",
  compareCaution:
    "Different patches, roles, modes and durations can affect these numbers. Unknown values stay unavailable.",
  sameMatch: "Choose two different matches.",
  summary: "Summary",
  stat: "Statistic",
  game: "Game",
  mode: "Mode",
  patch: "Patch",
  unknown: "Unavailable",
  dataCoverage: "Replay coverage",
  purchaseTiming: "Item purchase timings",
  minuteSamples: "Minute samples",
  itemsHelp:
    "Purchase timings describe recorded purchases, not an optimal build. Missing replay data is not zero.",
  localTitle: "Connect your local game",
  localDescription:
    "Import revealed draft heroes from Dota’s game-state integration when the game supplies them.",
  localOnly: "Local environment only",
  localHosted:
    "This receiver is available when running Tito locally. Hosted Tito does not accept game payloads.",
  setup: "Create game configuration",
  download: "Download configuration",
  setupHelp:
    "Copy the downloaded file into Dota’s game/dota/cfg/gamestate_integration directory, add the launch option below, and restart the game. This setup does not edit game files for you.",
  tokenHelp:
    "The configuration contains a private connection token. Keep it on this computer. It expires after four hours or an API restart; creating a new file revokes the old token.",
  checkConnection: "Check connection",
  connected: "Game payload received",
  waiting: "Waiting for the game",
  stale: "Last game payload is stale",
  partial:
    "Some draft information is missing or not revealed. Mode support varies; manual input remains available.",
  importPicks: "Use revealed picks",
  imported:
    "Revealed picks imported. Review them before requesting suggestions.",
  importUnavailable:
    "A fresh team-specific payload is required. Five allied picks without an identified own hero cannot be imported safely.",
  noGameData:
    "No game payload has arrived yet. Main-menu and ranked draft payloads may omit draft information.",
};
