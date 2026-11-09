import snapshot from "./heroes.snapshot.json";
import { assetUrl } from "../dota/assets";
import { heroRoles, heroSchema } from "./contracts";
export const catalogRetrievedAt = snapshot.retrievedAt;
// OpenDota dotaconstants snapshot; public source is recorded in the JSON.
export const heroCatalog = snapshot.heroes.map((h) =>
  heroSchema.parse({
    ...h,
    image: assetUrl(h.image),
    roles: h.roles.filter((r) =>
      heroRoles.includes(r as (typeof heroRoles)[number]),
    ),
  }),
);
