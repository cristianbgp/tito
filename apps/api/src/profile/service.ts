import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { parseAccountId } from "../dota/opendota";
import type { Profile, ProfileInput } from "./contracts";
import { playerProfile } from "./schema";

export function resolveProfile(
  profile: ProfileInput | undefined,
  steamId?: string | null,
): Profile {
  const linkedAccountId = steamId ? parseAccountId(steamId) : null;
  return {
    accountId: profile?.accountId ?? linkedAccountId,
    linkedAccountId,
    role: profile?.role ?? null,
    experience: profile?.experience ?? null,
  };
}

export async function getPlayerProfile(
  db: Database,
  userId: string,
  steamId?: string | null,
) {
  const [profile] = await db
    .select()
    .from(playerProfile)
    .where(eq(playerProfile.userId, userId));
  return resolveProfile(profile, steamId);
}

export async function savePlayerProfile(
  db: Database,
  userId: string,
  input: ProfileInput,
  steamId?: string | null,
) {
  const preferences = {
    ...input,
    accountId: input.accountId == null ? null : parseAccountId(input.accountId),
  };
  const [profile] = await db
    .insert(playerProfile)
    .values({ userId, ...preferences })
    .onConflictDoUpdate({
      target: playerProfile.userId,
      set: { ...preferences, updatedAt: new Date() },
    })
    .returning();
  return resolveProfile(profile, steamId);
}
