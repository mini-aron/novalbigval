// entitlements token, PUUID, region 조회는 access token만 있으면 되는 단순 호출들이라 한 파일로 묶는다.

export async function fetchEntitlementsToken(accessToken: string): Promise<string> {
  const response = await fetch("https://entitlements.auth.riotgames.com/api/token/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = (await response.json()) as { entitlements_token: string };
  return body.entitlements_token;
}

export async function fetchPuuid(accessToken: string): Promise<string> {
  const response = await fetch("https://auth.riotgames.com/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as { sub: string };
  return body.sub;
}

// Riot의 지역 코드(na/eu/ap/kr/latam/br)를 상점 API가 쓰는 shard로 변환한다.
// latam/br은 자체 shard가 없고 na shard를 공유한다.
const REGION_TO_SHARD: Record<string, string> = {
  na: "na",
  latam: "na",
  br: "na",
  eu: "eu",
  ap: "ap",
  kr: "kr",
};

export async function fetchRegion(
  accessToken: string,
  idToken: string
): Promise<{ region: string; shard: string }> {
  const response = await fetch("https://riot-geo.pas.riotgames.com/pas/v1/product/valorant", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
  });
  const body = (await response.json()) as { affinities: { live: string } };
  const region = body.affinities.live;
  const shard = REGION_TO_SHARD[region] ?? region;
  return { region, shard };
}
