import { resolve } from "node:path";
import { z } from "zod";
import { reviewModels } from "./review/models";

const developmentSecret =
  "tito-local-development-only-secret-do-not-use-in-production";
const root = resolve(import.meta.dirname, "../../..");
export const migrationsDirectory = resolve(import.meta.dirname, "../drizzle");

export function isLocalUrl(value: string) {
  const hostname = new URL(value).hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

export function readConfig(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === "production";
  const webUrl = z
    .url()
    .parse(env.WEB_URL ?? "http://localhost:5173")
    .replace(/\/$/, "");
  const emailTransport = z
    .enum(["disabled", "local", "resend"])
    .parse(env.EMAIL_TRANSPORT ?? (production ? "disabled" : "local"));
  const steamApiKey = env.STEAM_API_KEY?.trim() || undefined;
  const authSecret = env.BETTER_AUTH_SECRET ?? developmentSecret;
  if (emailTransport === "resend" && !env.RESEND_API_KEY)
    throw new Error("RESEND_API_KEY is required for Resend");
  if (!production && emailTransport === "local" && !isLocalUrl(webUrl))
    throw new Error("The local email inbox requires a local WEB_URL");
  if (production) {
    if (!env.DATABASE_URL) throw new Error("Production requires DATABASE_URL");
    if (!steamApiKey)
      throw new Error("Production requires STEAM_API_KEY for Steam sign-in");
    if (emailTransport === "local")
      throw new Error("Local email delivery is not allowed in production");
    if (emailTransport === "resend" && !env.EMAIL_FROM)
      throw new Error(
        "EMAIL_FROM is required when Resend is enabled in production",
      );
    if (authSecret.length < 32 || authSecret === developmentSecret)
      throw new Error(
        "Production requires a private BETTER_AUTH_SECRET of at least 32 characters",
      );
    if (!webUrl.startsWith("https://") || isLocalUrl(webUrl))
      throw new Error("Production WEB_URL must be a public HTTPS origin");
  }
  if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL))
    throw new Error("DATABASE_URL must use PostgreSQL");
  return {
    production,
    webUrl,
    emailTransport,
    authSecret,
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .parse(env.PORT ?? 3001),
    databaseUrl: env.DATABASE_URL || undefined,
    dataDir: resolve(env.DATA_DIR ?? resolve(root, ".data")),
    replayParserJar: resolve(
      env.REPLAY_PARSER_JAR ?? resolve(root, ".data/replay-parser/parser.jar"),
    ),
    replayJavaBin:
      env.REPLAY_JAVA_BIN ?? resolve(root, ".data/replay-parser/java/bin/java"),
    replayUserDailyLimit: z.coerce
      .number()
      .int()
      .min(0)
      .max(100)
      .parse(env.REPLAY_USER_DAILY_LIMIT ?? 5),
    replayDailyLimit: z.coerce
      .number()
      .int()
      .min(0)
      .max(1000)
      .parse(env.REPLAY_DAILY_LIMIT ?? 50),
    resendApiKey: env.RESEND_API_KEY,
    emailFrom: env.EMAIL_FROM ?? "Tito <hello@tito.localhost>",
    steamApiKey,
    openDotaApiKey: env.OPENDOTA_API_KEY || undefined,
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    draftUserDailyLimit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(env.AI_DRAFT_USER_DAILY_LIMIT ?? 30),
    reviewModel: z
      .enum(reviewModels)
      .parse(env.OPENAI_REVIEW_MODEL ?? reviewModels[0]),
    reviewDailyBudgetCents: z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(env.AI_REVIEW_DAILY_BUDGET_CENTS ?? 50),
    reviewMonthlyBudgetCents: z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(env.AI_REVIEW_MONTHLY_BUDGET_CENTS ?? 500),
    reviewUserDailyLimit: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .parse(env.AI_REVIEW_USER_DAILY_LIMIT ?? 5),
    reviewRetention: z.coerce
      .number()
      .int()
      .min(25)
      .max(200)
      .parse(env.AI_REVIEW_RETENTION ?? 100),
    historyMaxMatches: z.coerce
      .number()
      .int()
      .min(100)
      .max(1000)
      .parse(env.HISTORY_MAX_MATCHES ?? 1000),
    historyCooldownSeconds: z.coerce
      .number()
      .int()
      .min(30)
      .max(3600)
      .parse(env.HISTORY_SYNC_COOLDOWN_SECONDS ?? 60),
    openDotaDailyRequestLimit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(env.OPENDOTA_DAILY_REQUEST_LIMIT ?? 1000),
  };
}

export type Config = ReturnType<typeof readConfig>;
