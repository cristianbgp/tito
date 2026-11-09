import { lt, ne, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import { DataError } from "../dota/opendota";
import { providerBudget } from "./schema";

/** Reserve before sending: failed upstream calls conservatively consume quota. */
export async function claimProviderRequest(
  db: Database,
  limit: number,
  now = Date.now(),
) {
  const period = new Date(now).toISOString().slice(0, 10);
  const [claimed] = await db
    .insert(providerBudget)
    .values({ key: "opendota", period, used: 1 })
    .onConflictDoUpdate({
      target: providerBudget.key,
      set: {
        period,
        used: sql`case when ${providerBudget.period} = ${period} then ${providerBudget.used} + 1 else 1 end`,
      },
      setWhere: or(
        ne(providerBudget.period, period),
        lt(providerBudget.used, limit),
      ),
    })
    .returning();
  if (!claimed)
    throw new DataError(
      "Tito's daily match-data request budget is reached. Saved history remains available; try again after midnight UTC.",
      429,
      Math.ceil((Date.parse(`${period}T00:00:00Z`) + 86400000 - now) / 1000),
    );
}
