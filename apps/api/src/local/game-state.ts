import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { heroCatalog } from "../draft/catalog";
export class LocalStateError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 429,
  ) {
    super(message);
  }
}
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const known = new Set(heroCatalog.map((h) => h.id));
const aliases = new Map(
  heroCatalog.map((h) => [
    `npc_dota_hero_${h.image?.split("/").at(-1)?.split(".")[0]}`,
    h.id,
  ]),
);
const heroId = (v: unknown) =>
  typeof v === "number" && known.has(v)
    ? v
    : typeof v === "string"
      ? (aliases.get(v) ?? null)
      : null;
export function parseGameState(value: unknown) {
  const p = record(value),
    map = record(p.map),
    player = record(p.player),
    hero = record(p.hero),
    draft = record(p.draft);
  const team =
    player.team_name === "radiant"
      ? "radiant"
      : player.team_name === "dire"
        ? "dire"
        : null;
  const rawId = map.matchid;
  const matchId =
    (typeof rawId === "string" ||
      (typeof rawId === "number" && Number.isSafeInteger(rawId))) &&
    /^[1-9]\d{0,15}$/.test(String(rawId))
      ? String(rawId)
      : null;
  const ownHeroId = heroId(hero.id) ?? heroId(hero.name);
  let unknown = false;
  function read(teamKey: string, kind: "pick" | "ban") {
    const entries = record(draft[teamKey]),
      ids: number[] = [];
    for (let i = 0; i < (kind === "pick" ? 5 : 10); i++) {
      const numeric = entries[`${kind}${i}_id`],
        name = entries[`${kind}${i}_class`];
      const id = heroId(numeric) ?? heroId(name);
      if (id) {
        if (!ids.includes(id)) ids.push(id);
        else unknown = true;
      } else if (
        (numeric !== undefined && numeric !== 0 && numeric !== -1) ||
        (typeof name === "string" &&
          name.length > 0 &&
          name !== "npc_dota_hero_none")
      )
        unknown = true;
    }
    return ids;
  }
  const radiant = read("team2", "pick"),
    dire = read("team3", "pick"),
    picks = new Set([...radiant, ...dire]);
  const bans = [
    ...new Set([...read("team2", "ban"), ...read("team3", "ban")]),
  ].filter((id) => {
    if (picks.has(id)) {
      unknown = true;
      return false;
    }
    return true;
  });
  const conflict =
    radiant.some((id) => dire.includes(id)) ||
    (ownHeroId != null &&
      team != null &&
      (team === "radiant" ? dire : radiant).includes(ownHeroId));
  const allies = team
    ? (team === "radiant" ? radiant : dire).filter((id) => id !== ownHeroId)
    : [];
  const enemies = team ? (team === "radiant" ? dire : radiant) : [];
  return {
    matchId,
    team: conflict ? null : team,
    ownHeroId,
    allies: conflict ? [] : allies,
    enemies: conflict ? [] : enemies,
    bans,
    partial: unknown || conflict || !team || picks.size < 10,
  };
}
type Snapshot = ReturnType<typeof parseGameState>;
type Connection = {
  userId: string;
  expires: number;
  issued: number;
  snapshot: Snapshot | null;
  received?: number;
};
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class LocalGameState {
  private connections = new Map<string, Connection>();
  constructor(
    private port: number,
    private now = Date.now,
  ) {}
  private prune() {
    for (const [key, c] of this.connections)
      if (c.expires <= this.now()) this.connections.delete(key);
  }
  setup(userId: string) {
    this.prune();
    const previous = [...this.connections.entries()].find(
      ([, c]) => c.userId === userId,
    );
    if (previous && this.now() - previous[1].issued < 10000)
      throw new LocalStateError(
        "Wait a moment before creating another game configuration.",
        429,
      );
    if (!previous && this.connections.size >= 100)
      throw new LocalStateError(
        "Local game connections are full. Try again later.",
        429,
      );
    if (previous) this.connections.delete(previous[0]);
    const token = randomBytes(32).toString("base64url"),
      expires = this.now() + 4 * 3600000;
    this.connections.set(hash(token), {
      userId,
      expires,
      issued: this.now(),
      snapshot: null,
    });
    const receiverUrl = `http://127.0.0.1:${this.port}/api/local/gsi`;
    return {
      filename: "gamestate_integration_tito.cfg",
      expiresAt: new Date(expires).toISOString(),
      receiverUrl,
      launchOption: "-gamestateintegration",
      configuration: `"Tito companion"\n{\n "uri" "${receiverUrl}"\n "timeout" "5.0"\n "buffer" "0.5"\n "throttle" "1.0"\n "heartbeat" "5.0"\n "data" { "provider" "1" "map" "1" "player" "1" "hero" "1" "draft" "1" }\n "auth" { "token" "${token}" }\n}\n`,
    };
  }
  ingest(value: unknown) {
    this.prune();
    const parsed = z
      .object({
        auth: z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
      })
      .safeParse(value);
    if (!parsed.success)
      throw new LocalStateError("Invalid game connection token.", 403);
    const c = this.connections.get(hash(parsed.data.auth.token));
    if (!c)
      throw new LocalStateError(
        "Game connection expired or unrecognized. Create a new configuration.",
        403,
      );
    c.snapshot = parseGameState(value);
    c.received = this.now();
    return { received: true };
  }
  status(userId: string) {
    this.prune();
    const c = [...this.connections.values()].find((c) => c.userId === userId);
    return {
      supported: true,
      configured: Boolean(c),
      expiresAt: c ? new Date(c.expires).toISOString() : null,
      receivedAt:
        c?.received === undefined ? null : new Date(c.received).toISOString(),
      stale: c?.received === undefined || this.now() - c.received > 15000,
      ...(c?.snapshot ?? {
        matchId: null,
        team: null,
        ownHeroId: null,
        allies: [],
        enemies: [],
        bans: [],
        partial: true,
      }),
    };
  }
}
