export interface SkinLevelMeta {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
}

interface SkinLevelsResponse {
  data: Array<{ uuid: string; displayName: string; displayIcon: string | null }>;
}

let cache: { map: Map<string, SkinLevelMeta>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function loadSkinLevels(): Promise<Map<string, SkinLevelMeta>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map;
  }
  const response = await fetch("https://valorant-api.com/v1/weapons/skinlevels?language=ko-KR");
  const body = (await response.json()) as SkinLevelsResponse;
  const map = new Map(body.data.map((item) => [item.uuid, item]));
  cache = { map, fetchedAt: Date.now() };
  return map;
}

export async function getSkinLevel(uuid: string): Promise<SkinLevelMeta | undefined> {
  const map = await loadSkinLevels();
  return map.get(uuid);
}

export async function getSkinLevels(uuids: string[]): Promise<SkinLevelMeta[]> {
  const map = await loadSkinLevels();
  return uuids.map((uuid) => map.get(uuid)).filter((v): v is SkinLevelMeta => Boolean(v));
}

// /wishlist add 자동완성용 이름 검색.
export async function searchSkinLevels(query: string, limit = 25): Promise<SkinLevelMeta[]> {
  const map = await loadSkinLevels();
  const needle = query.trim().toLowerCase();
  const results: SkinLevelMeta[] = [];
  for (const meta of map.values()) {
    if (!needle || meta.displayName.toLowerCase().includes(needle)) {
      results.push(meta);
      if (results.length >= limit) break;
    }
  }
  return results;
}
