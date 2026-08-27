interface NameServiceEntry {
  GameName?: string;
  TagLine?: string;
  Subject: string;
}

// /accounts, /shop 등에서 "이름#태그" 형태로 표시하기 위한 조회. 실패해도 치명적이지 않으므로 호출부에서 폴백 처리.
export async function fetchDisplayName(params: {
  accessToken: string;
  entitlementsToken: string;
  shard: string;
  puuid: string;
}): Promise<string | null> {
  const response = await fetch(`https://pd.${params.shard}.a.pvp.net/name-service/v2/players`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "X-Riot-Entitlements-JWT": params.entitlementsToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([params.puuid]),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as NameServiceEntry[];
  const entry = body.find((e) => e.Subject === params.puuid);
  if (!entry?.GameName) return null;
  return entry.TagLine ? `${entry.GameName}#${entry.TagLine}` : entry.GameName;
}
