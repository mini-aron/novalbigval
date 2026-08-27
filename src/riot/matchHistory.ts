import { buildPdHeaders, type PdAuth } from "./pdHeaders.js";

// match-history/match-details도 mmr과 마찬가지로 비공식 엔드포인트. 필드명은 커뮤니티 문서 기준.
interface MatchHistoryResponse {
  History: Array<{ MatchID: string }>;
}

export async function fetchMatchIds(
  session: PdAuth & { shard: string },
  puuid: string,
  count: number
): Promise<string[]> {
  const headers = await buildPdHeaders(session);
  const response = await fetch(
    `https://pd.${session.shard}.a.pvp.net/match-history/v1/history/${puuid}?startIndex=0&endIndex=${count}`,
    { headers }
  );
  if (!response.ok) throw new Error(`MATCH_HISTORY_FAILED:${response.status}`);

  const body = (await response.json()) as MatchHistoryResponse;
  return body.History.map((h) => h.MatchID);
}

interface MatchDetailsResponse {
  MatchInfo: { MapID: string; GameStartMillis: number; QueueID: string };
  Players: Array<{
    Subject: string;
    CharacterID: string;
    TeamID: string;
    Stats: { Kills: number; Deaths: number; Assists: number };
  }>;
  Teams: Array<{ TeamID: string; Won: boolean }>;
}

export interface MatchSummary {
  matchId: string;
  mapUrl: string;
  queueId: string;
  playedAt: number;
  agentUuid: string;
  kills: number;
  deaths: number;
  assists: number;
  result: "win" | "loss" | "unknown";
}

export async function fetchMatchDetail(
  session: PdAuth & { shard: string },
  matchId: string,
  puuid: string
): Promise<MatchSummary | null> {
  const headers = await buildPdHeaders(session);
  const response = await fetch(
    `https://pd.${session.shard}.a.pvp.net/match-details/v1/matches/${matchId}`,
    { headers }
  );
  if (!response.ok) throw new Error(`MATCH_DETAILS_FAILED:${response.status}`);

  const body = (await response.json()) as MatchDetailsResponse;
  const player = body.Players.find((p) => p.Subject === puuid);
  if (!player) return null;

  const team = body.Teams.find((t) => t.TeamID === player.TeamID);
  const result: MatchSummary["result"] = team ? (team.Won ? "win" : "loss") : "unknown";

  return {
    matchId,
    mapUrl: body.MatchInfo.MapID,
    queueId: body.MatchInfo.QueueID,
    playedAt: body.MatchInfo.GameStartMillis,
    agentUuid: player.CharacterID,
    kills: player.Stats.Kills,
    deaths: player.Stats.Deaths,
    assists: player.Stats.Assists,
    result,
  };
}
