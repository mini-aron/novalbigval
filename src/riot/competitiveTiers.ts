export interface TierMeta {
  tier: number;
  name: string;
  icon: string | null;
}

interface CompetitiveTiersResponse {
  data: Array<{
    tiers: Array<{ tier: number; tierName: string; smallIcon: string | null }>;
  }>;
}

let cache: { map: Map<number, TierMeta>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function loadTiers(): Promise<Map<number, TierMeta>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map;
  }
  const response = await fetch("https://valorant-api.com/v1/competitivetiers?language=ko-KR");
  const body = (await response.json()) as CompetitiveTiersResponse;
  // 마지막 원소가 현재 시즌의 티어 세트.
  const latest = body.data[body.data.length - 1];
  const map = new Map(
    latest.tiers.map((t) => [t.tier, { tier: t.tier, name: t.tierName, icon: t.smallIcon }])
  );
  cache = { map, fetchedAt: Date.now() };
  return map;
}

export async function getTier(tierNumber: number): Promise<TierMeta> {
  const map = await loadTiers();
  return map.get(tierNumber) ?? { tier: tierNumber, name: "알 수 없음", icon: null };
}
