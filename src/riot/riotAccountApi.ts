// 닉네임#태그 -> PUUID 조회는 Riot 공식 개발자 API(account-v1)를 쓴다.
// 이건 val-match-v1/val-ranked-v1과 달리 별도 상품 승인 없이 개인 API 키로도 접근 가능하다.
// (developer.riotgames.com에서 발급받는 개인 키는 24시간마다 재발급이 필요하다는 점은 운영상 제약사항으로 남겨둔다.)
export interface RiotAccountInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export async function resolvePuuidByRiotId(
  gameName: string,
  tagLine: string
): Promise<RiotAccountInfo | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error("RIOT_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const response = await fetch(
    `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`,
    { headers: { "X-Riot-Token": apiKey } }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`RIOT_ACCOUNT_API_FAILED:${response.status}`);

  return (await response.json()) as RiotAccountInfo;
}

// 대상 플레이어의 발로란트 데이터가 어느 리전 서버(shard)에 있는지는 puuid만으로 알 수 없다.
// Riot의 active-shards API로 조회한다.
export async function resolveActiveRegion(puuid: string): Promise<string | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error("RIOT_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const response = await fetch(
    `https://americas.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${puuid}`,
    { headers: { "X-Riot-Token": apiKey } }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`RIOT_ACTIVE_SHARD_API_FAILED:${response.status}`);

  const body = (await response.json()) as { activeShard: string };
  return body.activeShard;
}
