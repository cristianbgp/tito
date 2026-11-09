import { z } from "zod";

export const catalogTtl = 24 * 60 * 60 * 1000;
export const heroCatalogSchema = z.record(
  z.string(),
  z.object({
    id: z.number().int(),
    localized_name: z.string(),
    roles: z.array(z.string()).max(20).nullish(),
    attack_type: z.string().nullish(),
    primary_attr: z.string().nullish(),
    img: z.string().nullish(),
  }),
);
export const itemCatalogSchema = z.record(
  z.string(),
  z.object({
    id: z.number().int(),
    dname: z.string().nullish(),
    img: z.string().nullish(),
  }),
);
export const clusterSchema = z.record(z.string(), z.number().int());
export const regionSchema = z.record(z.string(), z.string());

export function assetUrl(path: string | null | undefined) {
  return path?.startsWith("/apps/dota2/images/")
    ? new URL(path, "https://cdn.cloudflare.steamstatic.com").href
    : null;
}

export function itemSlot(
  id: number | null | undefined,
  items: Map<number, { dname?: string | null; img?: string | null }>,
) {
  const item = id ? items.get(id) : undefined;
  return {
    id: id ?? null,
    name: item?.dname ?? null,
    image: assetUrl(item?.img),
  };
}
