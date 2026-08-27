import { buildPdHeaders, type PdAuth } from "./pdHeaders.js";

// mmr/v1은 공식 문서가 없는 클라이언트 전용 엔드포인트라 필드명은 커뮤니티 문서 기준.
// Riot이 응답 구조를 바꾸면 이 파일만 손보면 된다.
interface MmrResponse {
  LatestCompetitiveUpdate?: {
    TierAfterUpdate: number;
    RankedRatingAfterUpdate: number;
  } | null;
}

export interface RankInfo {
  tier: number;
  rr: number;
  hasCompetitiveData: boolean;
}

export async function fetchRank(
  session: PdAuth & { shard: string },
  puuid: string
): Promise<RankInfo> {
  const headers = await buildPdHeaders(session);
  const response = await fetch(`https://pd.${session.shard}.a.pvp.net/mmr/v1/players/${puuid}`, {
    headers,
  });
  if (!response.ok) throw new Error(`MMR_FAILED:${response.status}`);

  const body = (await response.json()) as MmrResponse;
  const latest = body.LatestCompetitiveUpdate;
  if (!latest || !latest.TierAfterUpdate) {
    return { tier: 0, rr: 0, hasCompetitiveData: false };
  }
  return { tier: latest.TierAfterUpdate, rr: latest.RankedRatingAfterUpdate, hasCompetitiveData: true };
}
