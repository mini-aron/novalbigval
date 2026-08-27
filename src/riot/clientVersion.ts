// Store API 호출 시 X-Riot-ClientVersion 헤더가 필요한데, 하드코딩하면 Riot이 클라이언트를
// 업데이트할 때마다 봇이 깨진다. valorant-api.com이 최신 값을 제공해주므로 매번 그걸 물어보되,
// 자주 바뀌지 않으니 1시간 캐시한다.
let cached: { version: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function getClientVersion(): Promise<string> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.version;
  }
  const response = await fetch("https://valorant-api.com/v1/version");
  const body = (await response.json()) as { data: { riotClientVersion: string } };
  cached = { version: body.data.riotClientVersion, fetchedAt: Date.now() };
  return cached.version;
}

export function getClientPlatformHeader(): string {
  const platform = {
    platformType: "PC",
    platformOS: "Windows",
    platformOSVersion: "10.0.19042.1.256.64bit",
    platformChipset: "Unknown",
  };
  return Buffer.from(JSON.stringify(platform)).toString("base64");
}
