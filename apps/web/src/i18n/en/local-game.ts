export const localGameCopy = {
  title: "Connect your local game",
  description:
    "Import revealed draft heroes from Dota’s game-state integration when the game supplies them.",
  localOnly: "Local environment only",
  hosted:
    "This receiver is available when running Tito locally. Hosted Tito does not accept game payloads.",
  setup: "Create game configuration",
  settingUp: "Creating configuration…",
  download: "Download configuration",
  setupHelp:
    "Copy the downloaded file into Dota’s game/dota/cfg/gamestate_integration directory, add the launch option below, and restart the game. This setup does not edit game files for you.",
  tokenHelp:
    "The configuration contains a private connection token. Keep it on this computer. It expires after four hours or an API restart; creating a new file revokes the old token.",
  check: "Check connection",
  connected: "Game payload received",
  waiting: "Waiting for the game",
  stale: "Last game payload is stale",
  partial:
    "Some draft information is missing or not revealed. Mode support varies; manual input remains available.",
  import: "Use revealed picks",
  imported:
    "Revealed picks imported. Review them before requesting suggestions.",
  importUnavailable:
    "A fresh team-specific payload is required. Five allied picks without an identified own hero cannot be imported safely.",
  noData:
    "No game payload has arrived yet. Main-menu and ranked draft payloads may omit draft information.",
  setupLink: "Set up local game integration",
  launchOption: "Dota launch option",
  receiver: "Local receiver",
  inspect: "Inspect private configuration",
  expires: "Connection expires",
  freshness:
    "Import checks for a team-specific payload received in the last 15 seconds. It fills the draft only; suggestions require your next explicit action.",
  checking: "Checking local connection…",
  counts: (allies: number, enemies: number, bans: number) =>
    `${allies} revealed allies · ${enemies} revealed enemies · ${bans} bans`,
  received: "Last received",
  importFailed:
    "The local game state could not be verified. Check the connection and try again.",
  expired:
    "This configuration is no longer active. Create a new one after reconnecting.",
};
