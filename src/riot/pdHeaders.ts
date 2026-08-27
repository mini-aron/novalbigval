import { getClientPlatformHeader, getClientVersion } from "./clientVersion.js";

export interface PdAuth {
  accessToken: string;
  entitlementsToken: string;
}

// pd.{shard}.a.pvp.net 아래 엔드포인트들(storefront, mmr, match-history, match-details)이
// 공통으로 요구하는 인증 헤더 세트.
export async function buildPdHeaders(auth: PdAuth): Promise<Record<string, string>> {
  const [clientVersion, clientPlatform] = await Promise.all([
    getClientVersion(),
    Promise.resolve(getClientPlatformHeader()),
  ]);
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "X-Riot-Entitlements-JWT": auth.entitlementsToken,
    "X-Riot-ClientVersion": clientVersion,
    "X-Riot-ClientPlatform": clientPlatform,
    "Content-Type": "application/json",
  };
}
