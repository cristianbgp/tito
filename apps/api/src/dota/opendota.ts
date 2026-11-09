import { heroCatalog as bundledHeroes } from "../draft/catalog";
import { z } from "zod";
import type {
  recentMatchSchema,
  matchDetailSchema,
  parseStatusSchema,
} from "./schemas";
import {
  advantagePoints,
  detailSchema,
  recentSchema,
  minuteSamples,
} from "./upstream";
import {
  matchupsUpstream,
  benchmarksUpstream,
  popularityUpstream,
  patchesUpstream,
  valvePatchListUpstream,
  valvePatchUpstream,
} from "../intelligence/upstream";
import type { Section } from "../intelligence/contracts";
import {
  assetUrl,
  catalogTtl,
  clusterSchema,
  heroCatalogSchema,
  itemCatalogSchema,
  itemSlot,
  regionSchema,
} from "./assets";

export class DataError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 429 | 502 | 504,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function parseAccountId(input: string) {
  const value = input.trim();
  if (!/^[1-9]\d{0,16}$/.test(value))
    throw new DataError("Enter a valid Dota friend ID or SteamID64.", 400);
  let id = BigInt(value);
  if (id >= 76561197960265728n) id -= 76561197960265728n;
  if (id < 1n || id >= 4294967295n)
    throw new DataError("Enter a valid Dota friend ID or SteamID64.", 400);
  return id.toString();
}

type HttpFetch = (url: string, init?: RequestInit) => Promise<Response>;
const jobIdSchema = z
  .union([
    z.string().regex(/^[1-9]\d{0,15}$/),
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  ])
  .transform(String);

function validateMatchId(id: string) {
  if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw new DataError("Enter a valid match ID.", 400);
}

const summaryHeroes = new Map(bundledHeroes.map((hero) => [hero.id, hero]));

export class OpenDota {
  private cache = new Map<
    string,
    { until: number; fetchedAt: number; value: unknown; bytes: number }
  >();
  private cacheBytes = 0;
  private pending = new Map<string, Promise<unknown>>();
  private active = 0;
  private parseRequests = new Map<
    string,
    { until: number; work: Promise<{ jobId: string }>; jobId?: string }
  >();
  constructor(
    private apiKey?: string,
    private request: HttpFetch = fetch,
    private now = Date.now,
    private beforeRequest?: () => Promise<void>,
  ) {}

  private forget(path: string) {
    this.cacheBytes -= this.cache.get(path)?.bytes ?? 0;
    this.cache.delete(path);
  }

  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    ttl = 60_000,
    method: "GET" | "POST" = "GET",
    timeout = 10_000,
  ): Promise<T> {
    for (const [key, entry] of this.cache)
      if (entry.until <= this.now()) this.forget(key);
    const cached = this.cache.get(path);
    if (method === "GET" && cached && cached.until > this.now())
      return schema.parse(cached.value);
    if (method === "GET" && this.pending.has(path))
      return (await this.pending.get(path)) as T;
    if (this.active >= 20)
      throw new DataError(
        "Too many match-data requests are running. Try again shortly.",
        429,
      );
    this.active++;
    const work: Promise<T> = this.load(
      path,
      schema,
      ttl,
      method,
      timeout,
      () => this.pending.get(path) === work,
    );
    if (method === "GET") this.pending.set(path, work);
    try {
      return await work;
    } finally {
      this.active--;
      if (method === "GET" && this.pending.get(path) === work)
        this.pending.delete(path);
    }
  }

  private async load<T>(
    path: string,
    schema: z.ZodType<T>,
    ttl: number,
    method: "GET" | "POST",
    timeout: number,
    currentRead: () => boolean,
  ): Promise<T> {
    const url = this.sourceUrl(path);
    if (this.apiKey && url.hostname === "api.opendota.com")
      url.searchParams.set("api_key", this.apiKey);
    await this.beforeRequest?.();
    let response: Response;
    try {
      response = await this.request(url.toString(), {
        method,
        signal: AbortSignal.timeout(timeout),
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      throw new DataError(
        error instanceof Error && /timeout|abort/i.test(error.name)
          ? "OpenDota took too long. Try again."
          : "Unable to reach OpenDota. Try again shortly.",
        error instanceof Error && /timeout|abort/i.test(error.name) ? 504 : 502,
      );
    }
    if (!response.ok) {
      if (method === "POST" && response.status === 400)
        throw new DataError(
          "OpenDota could not find a replay for this match.",
          400,
        );
      if (response.status === 404)
        throw new DataError(
          "OpenDota has no data for this player or match.",
          404,
        );
      if (response.status === 429)
        throw new DataError(
          "OpenDota is busy. Wait a moment before trying again.",
          429,
        );
      throw new DataError(
        "OpenDota is temporarily unavailable. Try again shortly.",
        502,
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof Error && /timeout|abort/i.test(error.name))
        throw new DataError("OpenDota took too long. Try again.", 504);
      throw new DataError(
        "OpenDota returned incomplete or unexpected data.",
        502,
      );
    }
    const result = schema.safeParse(body);
    if (!result.success)
      throw new DataError(
        "OpenDota returned incomplete or unexpected data.",
        502,
      );
    if (method === "GET" && ttl > 0 && currentRead()) {
      const bytes = Buffer.byteLength(JSON.stringify(result.data));
      if (bytes <= 2 * 1024 * 1024) {
        this.forget(path);
        while (
          this.cache.size >= 200 ||
          this.cacheBytes + bytes > 16 * 1024 * 1024
        )
          this.forget(this.cache.keys().next().value!);
        this.cache.set(path, {
          until: this.now() + ttl,
          fetchedAt: this.now(),
          value: result.data,
          bytes,
        });
        this.cacheBytes += bytes;
      }
    }
    return result.data;
  }

  async recentMatches(
    accountId: string,
    refresh = false,
  ): Promise<z.infer<typeof recentMatchSchema>[]> {
    const id = parseAccountId(accountId);
    const path = `/players/${id}/recentMatches`;
    if (refresh) this.forget(path);
    const matches = await this.get(path, recentSchema);
    return this.summaries(id, matches.slice(0, 20), this.cachedHeroes());
  }

  async historyMatches(
    accountId: string,
    offset: number,
  ): Promise<z.infer<typeof recentMatchSchema>[]> {
    const id = parseAccountId(accountId);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw new DataError("Invalid history page.", 400);
    const query = new URLSearchParams({
      limit: "100",
      offset: String(offset),
      sort: "match_id",
      significant: "0",
    });
    // OpenDota's project parameter selects the response columns rather than
    // adding fields to its defaults. Include the whole retained summary.
    for (const column of [
      "match_id",
      "start_time",
      "duration",
      "hero_id",
      "player_slot",
      "radiant_win",
      "kills",
      "deaths",
      "assists",
      "gold_per_min",
      "xp_per_min",
      "game_mode",
      "lobby_type",
      "patch",
    ])
      query.append("project", column);
    // Archive queries can exceed the normal 10s deadline; keep their full wait
    // below the history writer lease without retrying or adding more requests.
    const matches = await this.get(
      `/players/${id}/matches?${query}`,
      recentSchema.max(100),
      0,
      "GET",
      20_000,
    );
    return this.summaries(id, matches, this.cachedHeroes());
  }

  private cachedHeroes() {
    const cached = this.cache.get("/constants/heroes");
    return cached && cached.until > this.now()
      ? heroCatalogSchema.parse(cached.value)
      : null;
  }

  private summaries(
    id: string,
    matches: z.infer<typeof recentSchema>,
    heroes: z.infer<typeof heroCatalogSchema> | null,
  ): z.infer<typeof recentMatchSchema>[] {
    return matches.map((match) => ({
      id: String(match.match_id),
      accountId: id,
      heroId: match.hero_id,
      hero:
        heroes?.[String(match.hero_id)]?.localized_name ??
        summaryHeroes.get(match.hero_id)?.name ??
        `Hero ${match.hero_id}`,
      heroImage:
        assetUrl(heroes?.[String(match.hero_id)]?.img) ??
        summaryHeroes.get(match.hero_id)?.image ??
        null,
      result:
        match.radiant_win == null
          ? null
          : match.radiant_win === match.player_slot < 128
            ? "win"
            : "loss",
      startedAt: match.start_time,
      duration: match.duration,
      kills: match.kills ?? null,
      deaths: match.deaths ?? null,
      assists: match.assists ?? null,
      goldPerMinute: match.gold_per_min ?? null,
      experiencePerMinute: match.xp_per_min ?? null,
      gameMode: match.game_mode ?? null,
      lobbyType: match.lobby_type ?? null,
      patch: match.patch ?? null,
      actualRole: null,
    }));
  }

  async match(matchId: string): Promise<z.infer<typeof matchDetailSchema>> {
    validateMatchId(matchId);
    const [match, heroes, itemCatalog, clusters, regions] = await Promise.all([
      this.get(`/matches/${matchId}`, detailSchema),
      this.get("/constants/heroes", heroCatalogSchema, catalogTtl).catch(
        () => null,
      ),
      this.get("/constants/items", itemCatalogSchema, catalogTtl).catch(
        () => null,
      ),
      this.get("/constants/cluster", clusterSchema, catalogTtl).catch(
        () => null,
      ),
      this.get("/constants/region", regionSchema, catalogTtl).catch(() => null),
    ]);
    const items = new Map(
      Object.values(itemCatalog ?? {}).map((item) => [item.id, item]),
    );
    const regionId =
      match.region ??
      (match.cluster == null ? null : clusters?.[String(match.cluster)]);
    return {
      id: String(match.match_id),
      startedAt: match.start_time,
      duration: match.duration,
      winner:
        match.radiant_win == null
          ? null
          : match.radiant_win
            ? "radiant"
            : "dire",
      parsed: (match.version ?? 0) > 0,
      gameMode: match.game_mode ?? null,
      lobbyType: match.lobby_type ?? null,
      patch: match.patch ?? null,
      objectives:
        match.objectives == null
          ? null
          : match.objectives
              .filter((e) => e.time <= match.duration)
              .slice(0, 100)
              .map((e) => ({
                time: e.time,
                type: e.type,
                playerSlot: e.player_slot ?? null,
                target: e.key == null ? null : String(e.key),
              })),
      teamfights:
        match.teamfights == null
          ? null
          : match.teamfights
              .filter((e) => e.start >= 0 && e.start <= match.duration)
              .slice(0, 50)
              .map((e) => ({
                time: e.start,
                endTime:
                  e.end != null && e.end >= e.start && e.end <= match.duration
                    ? e.end
                    : null,
                deaths: e.deaths ?? null,
              })),
      region: regionId == null ? null : (regions?.[String(regionId)] ?? null),
      radiantScore: match.radiant_score ?? null,
      direScore: match.dire_score ?? null,
      metadataAvailable: heroes != null && itemCatalog != null,
      goldAdvantage: advantagePoints(
        match.radiant_gold_adv,
        match.players,
        match.duration,
      ),
      experienceAdvantage: advantagePoints(
        match.radiant_xp_adv,
        match.players,
        match.duration,
      ),
      players: match.players.slice(0, 10).map((player) => ({
        heroId: player.hero_id,
        hero:
          heroes?.[String(player.hero_id)]?.localized_name ??
          `Hero ${player.hero_id}`,
        heroImage: assetUrl(heroes?.[String(player.hero_id)]?.img),
        slot: player.player_slot,
        accountId:
          player.account_id && player.account_id < 4294967295
            ? String(player.account_id)
            : null,
        name: player.personaname || player.name || null,
        team: player.player_slot < 128 ? "radiant" : "dire",
        kills: player.kills ?? null,
        deaths: player.deaths ?? null,
        assists: player.assists ?? null,
        goldPerMinute: player.gold_per_min ?? null,
        experiencePerMinute: player.xp_per_min ?? null,
        lastHits: player.last_hits ?? null,
        denies: player.denies ?? null,
        level: player.level ?? null,
        netWorth: player.net_worth ?? null,
        heroDamage: player.hero_damage ?? null,
        heroHealing: player.hero_healing ?? null,
        towerDamage: player.tower_damage ?? null,
        inventory: [
          player.item_0,
          player.item_1,
          player.item_2,
          player.item_3,
          player.item_4,
          player.item_5,
        ].map((id) => itemSlot(id, items)),
        backpack: [player.backpack_0, player.backpack_1, player.backpack_2].map(
          (id) => itemSlot(id, items),
        ),
        neutralItem: itemSlot(player.item_neutral, items),
        neutralEnhancement: itemSlot(player.item_neutral2, items),
        actualRole: null,
        purchases:
          player.purchase_log == null
            ? null
            : player.purchase_log
                .filter((e) => e.time <= match.duration)
                .slice(0, 100)
                .map((event) => {
                  const item = itemCatalog?.[event.key];
                  return {
                    time: event.time,
                    key: event.key,
                    itemId: item?.id ?? null,
                    name: item?.dname ?? null,
                    image: assetUrl(item?.img),
                  };
                }),
        minuteSamples: minuteSamples(player, match.duration),
        killEvents:
          player.kills_log == null
            ? null
            : player.kills_log
                .filter((e) => e.time <= match.duration)
                .slice(0, 100)
                .map((e) => ({ time: e.time, target: e.key })),
      })),
    };
  }

  private sourceUrl(path: string) {
    return path.startsWith("/valve/")
      ? new URL(`https://www.dota2.com/datafeed/${path.slice(7)}`)
      : new URL(`https://api.opendota.com/api${path}`);
  }

  private async evidenceSection<T, R>(
    path: string,
    schema: z.ZodType<T>,
    ttl: number,
    map: (data: T) => R,
    empty: (data: R) => boolean,
  ): Promise<Section<R>> {
    const sourceUrl = this.sourceUrl(path).toString();
    try {
      const raw = await this.get(path, schema, ttl);
      const data = map(raw);
      const entry = this.cache.get(path);
      return {
        status: empty(data) ? "empty" : "available",
        data,
        fetchedAt: entry ? new Date(entry.fetchedAt).toISOString() : null,
        expiresAt: entry ? new Date(entry.until).toISOString() : null,
        sourceUrl,
      };
    } catch {
      return {
        status: "unavailable",
        data: null,
        fetchedAt: null,
        expiresAt: null,
        sourceUrl,
      };
    }
  }

  async heroMatchups(heroId: number) {
    if (!Number.isSafeInteger(heroId) || heroId < 1 || heroId > 10000)
      throw new DataError("Enter a valid hero ID.", 400);
    return this.evidenceSection(
      `/heroes/${heroId}/matchups`,
      matchupsUpstream,
      60 * 60_000,
      (rows) =>
        rows
          .sort((a, b) => b.games_played - a.games_played)
          .slice(0, 150)
          .map((r) => ({
            heroId: r.hero_id,
            gamesPlayed: r.games_played,
            wins: r.wins,
            winRate: r.games_played ? r.wins / r.games_played : null,
          })),
      (data) => data.length === 0,
    );
  }
  async heroEvidence(heroId: number) {
    if (!Number.isSafeInteger(heroId) || heroId < 1 || heroId > 10000)
      throw new DataError("Enter a valid hero ID.", 400);
    const ttl = 60 * 60_000;
    const [catalog, matchups, benchmarks, itemPopularity, itemCatalog] =
      await Promise.all([
        this.evidenceSection(
          "/constants/heroes",
          heroCatalogSchema,
          catalogTtl,
          (heroes) => {
            const hero = heroes[String(heroId)];
            return hero
              ? {
                  id: hero.id,
                  name: hero.localized_name,
                  image: assetUrl(hero.img),
                  roles: hero.roles ?? [],
                  attackType: hero.attack_type ?? null,
                  primaryAttribute: hero.primary_attr ?? null,
                }
              : null;
          },
          (data) => data == null,
        ),
        this.evidenceSection(
          `/heroes/${heroId}/matchups`,
          matchupsUpstream,
          ttl,
          (rows) =>
            rows
              .sort((a, b) => b.games_played - a.games_played)
              .slice(0, 150)
              .map((r) => ({
                heroId: r.hero_id,
                gamesPlayed: r.games_played,
                wins: r.wins,
                winRate: r.games_played ? r.wins / r.games_played : null,
              })),
          (data) => data.length === 0,
        ),
        this.evidenceSection(
          `/benchmarks?hero_id=${heroId}`,
          benchmarksUpstream,
          ttl,
          (value) => {
            if (value.hero_id !== heroId)
              throw new Error("Hero identity mismatch");
            return Object.entries(value.result)
              .slice(0, 12)
              .map(([metric, values]) => ({
                metric,
                percentiles: values.slice(0, 20),
              }));
          },
          (data) => data.length === 0,
        ),
        this.evidenceSection(
          `/heroes/${heroId}/itemPopularity`,
          popularityUpstream,
          ttl,
          (value) => {
            const phases = ["start", "early", "mid", "late"] as const;
            return phases.flatMap((phase) => {
              const items = value[`${phase}_game_items`];
              return items == null
                ? []
                : [
                    {
                      phase,
                      items: Object.entries(items)
                        .filter(([id]) => Number(id) > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 30)
                        .map(([id, count]) => ({ itemId: Number(id), count })),
                    },
                  ];
            });
          },
          (data) => data.length === 0,
        ),
        this.get("/constants/items", itemCatalogSchema, catalogTtl).catch(
          () => null,
        ),
      ]);
    const itemsById = new Map(
      Object.values(itemCatalog ?? {}).map((item) => [item.id, item]),
    );
    const popularItems = {
      ...itemPopularity,
      data:
        itemPopularity.data?.map((phase) => ({
          ...phase,
          items: phase.items.map((item) => ({
            ...item,
            name: itemsById.get(item.itemId)?.dname?.trim() || null,
            image: assetUrl(itemsById.get(item.itemId)?.img),
          })),
        })) ?? null,
    };
    const referenceCards: { title: string; body: string; sourceUrl: string }[] =
      [];
    if (catalog.data?.roles.length)
      referenceCards.push({
        title: "Catalog roles",
        body: `${catalog.data.name}: ${catalog.data.roles.join(", ")}. These are catalog tags, not the role played in a particular match.`,
        sourceUrl: catalog.sourceUrl,
      });
    if (catalog.data?.attackType)
      referenceCards.push({
        title: "Attack type",
        body: `${catalog.data.name} is listed as ${catalog.data.attackType.toLowerCase()}.`,
        sourceUrl: catalog.sourceUrl,
      });
    return {
      heroId,
      catalog,
      matchups,
      benchmarks,
      itemPopularity: popularItems,
      referenceCards,
      limitations: [
        "OpenDota aggregates do not identify a rank or patch cohort here. Matchup win rates describe the available sample, not a counter-pick guarantee.",
        "Item counts show popularity, not success rates or a recommended build. Early, mid and late item groups use OpenDota time and cost thresholds.",
        "Retrieved timestamps describe cache freshness, not the age of every match in an aggregate. Missing sections remain unavailable.",
      ],
    };
  }

  async patchReferences() {
    const official = await this.evidenceSection(
      "/valve/patchnoteslist?language=english",
      valvePatchListUpstream,
      catalogTtl,
      (value) =>
        value.patches
          .slice()
          .sort((a, b) => b.patch_timestamp - a.patch_timestamp)
          .slice(0, 30)
          .map((p) => ({
            id: null,
            name: p.patch_number,
            releasedAt: new Date(p.patch_timestamp * 1000).toISOString(),
            sourceUrl: `https://www.dota2.com/patches/${p.patch_number}`,
          })),
      (data) => data.length === 0,
    );
    const section =
      official.status !== "unavailable"
        ? official
        : await this.evidenceSection(
            "/constants/patch",
            patchesUpstream,
            catalogTtl,
            (rows) =>
              rows
                .slice()
                .sort(
                  (a, b) =>
                    (Date.parse(b.date ?? "") || 0) -
                    (Date.parse(a.date ?? "") || 0),
                )
                .slice(0, 30)
                .map((p) => ({
                  id: p.id ?? null,
                  name: p.name,
                  releasedAt: p.date ?? null,
                  sourceUrl: `https://www.dota2.com/patches/${encodeURIComponent(p.name)}`,
                })),
            (data) => data.length === 0,
          );
    return {
      ...section,
      limitations: [
        "Dated patch references are fetched from Valve when available; the OpenDota fallback may omit letter patches. Freshness describes retrieval time, not verification of the currently installed game version.",
      ],
    };
  }

  async patchChanges(version: string, heroIds?: number[]) {
    if (
      !/^\d{1,2}\.\d{1,2}[a-z]?$/.test(version) ||
      (heroIds &&
        (heroIds.length > 10 ||
          heroIds.some(
            (id) => !Number.isSafeInteger(id) || id < 1 || id > 10000,
          )))
    )
      throw new DataError("Enter a valid patch and up to ten hero IDs.", 400);
    const plain = (text: string) =>
      text
        .replace(/<br\s*\/?\s*>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
        .slice(0, 2000);
    const section = await this.evidenceSection(
      `/valve/patchnotes?version=${version}&language=english`,
      valvePatchUpstream,
      catalogTtl,
      (patch) => {
        if (patch.patch_number !== version)
          throw new Error("Patch identity mismatch");
        return {
          version,
          releasedAt: new Date(patch.patch_timestamp * 1000).toISOString(),
          sourceUrl: `https://www.dota2.com/patches/${version}`,
          heroChanges: (patch.heroes ?? [])
            .filter((h) => !heroIds || heroIds.includes(h.hero_id))
            .slice(0, 150)
            .map((hero) => ({
              heroId: hero.hero_id,
              notes: [
                ...(hero.hero_notes ?? []).map((n) => ({
                  kind: "hero" as const,
                  abilityId: null,
                  text: plain(n.note + (n.info ? ` ${n.info}` : "")),
                })),
                ...(hero.talent_notes ?? []).map((n) => ({
                  kind: "talent" as const,
                  abilityId: null,
                  text: plain(n.note + (n.info ? ` ${n.info}` : "")),
                })),
                ...(hero.abilities ?? []).flatMap((a) =>
                  (a.ability_notes ?? []).map((n) => ({
                    kind: "ability" as const,
                    abilityId: a.ability_id,
                    text: plain(n.note + (n.info ? ` ${n.info}` : "")),
                  })),
                ),
              ]
                .filter((n) => n.text)
                .slice(0, 40),
            })),
          generalChanges: (patch.general_notes ?? [])
            .flatMap((group) => group.generic ?? [])
            .map((n) => plain(n.note + (n.info ? ` ${n.info}` : "")))
            .filter(Boolean)
            .slice(0, 30),
        };
      },
      (data) =>
        data.heroChanges.length === 0 && data.generalChanges.length === 0,
    );
    return {
      ...section,
      limitations: [
        "Official source text is bounded to 40 notes per hero and 30 general notes. Hero filtering does not include indirect effects from item or general changes.",
        "These are dated changes for the requested version, not AI matchup advice or a claim about the current installed patch.",
      ],
    };
  }

  async requestParse(matchId: string) {
    validateMatchId(matchId);
    const previous = this.parseRequests.get(matchId);
    if (previous && previous.until > this.now()) return previous.work;
    for (const [id, pending] of this.parseRequests)
      if (pending.until <= this.now()) this.parseRequests.delete(id);
    if (this.parseRequests.size >= 1000)
      throw new DataError("Too many replay requests. Try again later.", 429);
    const work = this.get(
      `/request/${matchId}`,
      z.object({ job: z.object({ jobId: jobIdSchema }) }),
      0,
      "POST",
    ).then((result) => result.job);
    this.parseRequests.set(matchId, { until: this.now() + 10 * 60_000, work });
    try {
      const result = await work;
      const pending = this.parseRequests.get(matchId);
      if (pending?.work === work) pending.jobId = result.jobId;
      return result;
    } catch (error) {
      if (this.parseRequests.get(matchId)?.work === work)
        this.parseRequests.delete(matchId);
      throw error;
    }
  }

  async parseStatus(
    matchId: string,
    jobId: string,
  ): Promise<z.infer<typeof parseStatusSchema>> {
    validateMatchId(matchId);
    if (!jobIdSchema.safeParse(jobId).success)
      throw new DataError("Invalid replay request.", 400);
    const job = await this.get(
      `/request/${jobId}`,
      z.object({ jobId: jobIdSchema }).nullable(),
      5000,
    );
    if (job) return { status: "queued" };
    const matchPath = `/matches/${matchId}`;
    // An earlier evidence read may still be in flight. Detach it so this
    // terminal poll starts fresh; only the current read may update the cache.
    this.pending.delete(matchPath);
    this.forget(matchPath);
    const match = await this.match(matchId);
    if (this.parseRequests.get(matchId)?.jobId === jobId)
      this.parseRequests.delete(matchId);
    const available =
      match.parsed &&
      match.goldAdvantage.some((point) => point.value != null) &&
      match.experienceAdvantage.some((point) => point.value != null);
    return { status: available ? "complete" : "unavailable", match };
  }
}
