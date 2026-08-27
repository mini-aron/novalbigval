export interface AgentMeta {
  displayName: string;
  displayIcon: string | null;
}

export interface MapMeta {
  displayName: string;
}

interface AgentsResponse {
  data: Array<{ uuid: string; displayName: string; displayIcon: string | null; isPlayableCharacter: boolean }>;
}

interface MapsResponse {
  data: Array<{ mapUrl: string; displayName: string }>;
}

let agentCache: { map: Map<string, AgentMeta>; fetchedAt: number } | null = null;
let mapCache: { map: Map<string, MapMeta>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function loadAgents(): Promise<Map<string, AgentMeta>> {
  if (agentCache && Date.now() - agentCache.fetchedAt < CACHE_TTL_MS) return agentCache.map;
  const response = await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=ko-KR");
  const body = (await response.json()) as AgentsResponse;
  const map = new Map(body.data.map((a) => [a.uuid, { displayName: a.displayName, displayIcon: a.displayIcon }]));
  agentCache = { map, fetchedAt: Date.now() };
  return map;
}

// matchInfo.mapId는 uuid가 아니라 "/Game/Maps/Ascent/Ascent" 같은 mapUrl 형식으로 온다.
async function loadMaps(): Promise<Map<string, MapMeta>> {
  if (mapCache && Date.now() - mapCache.fetchedAt < CACHE_TTL_MS) return mapCache.map;
  const response = await fetch("https://valorant-api.com/v1/maps?language=ko-KR");
  const body = (await response.json()) as MapsResponse;
  const map = new Map(body.data.map((m) => [m.mapUrl, { displayName: m.displayName }]));
  mapCache = { map, fetchedAt: Date.now() };
  return map;
}

export async function getAgent(uuid: string): Promise<AgentMeta> {
  const map = await loadAgents();
  return map.get(uuid) ?? { displayName: "알 수 없음", displayIcon: null };
}

export async function getMapName(mapUrl: string): Promise<string> {
  const map = await loadMaps();
  return map.get(mapUrl)?.displayName ?? "알 수 없음";
}
