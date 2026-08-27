import { regionToShard } from "../riot/account.js";
import { getTier } from "../riot/competitiveTiers.js";
import { getAgent, getMapName } from "../riot/gameMetadata.js";
import { fetchMatchDetail, fetchMatchIds, type MatchSummary } from "../riot/matchHistory.js";
import { fetchRank } from "../riot/mmr.js";
import { resolveActiveRegion, resolvePuuidByRiotId } from "../riot/riotAccountApi.js";
import { getServiceSession } from "./serviceAccountSession.js";

export class PlayerNotFoundError extends Error {
  constructor() {
    super("해당 닉네임#태그의 플레이어를 찾을 수 없습니다.");
    this.name = "PlayerNotFoundError";
  }
}

export class InvalidRiotIdError extends Error {
  constructor() {
    super("닉네임#태그 형식으로 입력해주세요. 예: Player#KR1");
    this.name = "InvalidRiotIdError";
  }
}

interface ResolvedPlayer {
  puuid: string;
  shard: string;
  gameName: string;
  tagLine: string;
}

async function resolvePlayer(riotId: string): Promise<ResolvedPlayer> {
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) throw new InvalidRiotIdError();

  const account = await resolvePuuidByRiotId(gameName, tagLine);
  if (!account) throw new PlayerNotFoundError();

  const region = await resolveActiveRegion(account.puuid);
  if (!region) throw new PlayerNotFoundError();

  return {
    puuid: account.puuid,
    shard: regionToShard(region),
    gameName: account.gameName,
    tagLine: account.tagLine,
  };
}

async function buildAuth(player: ResolvedPlayer) {
  const session = await getServiceSession();
  return {
    accessToken: session.accessToken,
    entitlementsToken: session.entitlementsToken,
    shard: player.shard,
  };
}

export interface RankResult {
  gameName: string;
  tagLine: string;
  tierName: string;
  tierIcon: string | null;
  rr: number;
  hasCompetitiveData: boolean;
}

export async function getRankInfo(riotId: string): Promise<RankResult> {
  const player = await resolvePlayer(riotId);
  const auth = await buildAuth(player);
  const rank = await fetchRank(auth, player.puuid);
  const tier = await getTier(rank.tier);

  return {
    gameName: player.gameName,
    tagLine: player.tagLine,
    tierName: tier.name,
    tierIcon: tier.icon,
    rr: rank.rr,
    hasCompetitiveData: rank.hasCompetitiveData,
  };
}

export interface MatchResult {
  mapName: string;
  agentName: string;
  agentIcon: string | null;
  kills: number;
  deaths: number;
  assists: number;
  result: MatchSummary["result"];
  playedAt: number;
}

export interface RecentMatchesResult {
  gameName: string;
  tagLine: string;
  matches: MatchResult[];
}

export async function getRecentMatches(riotId: string, count = 5): Promise<RecentMatchesResult> {
  const player = await resolvePlayer(riotId);
  const auth = await buildAuth(player);

  const matchIds = await fetchMatchIds(auth, player.puuid, count);
  const details = await Promise.all(matchIds.map((id) => fetchMatchDetail(auth, id, player.puuid)));

  const matches = await Promise.all(
    details
      .filter((d): d is MatchSummary => d !== null)
      .map(async (d) => {
        const [mapName, agent] = await Promise.all([getMapName(d.mapUrl), getAgent(d.agentUuid)]);
        return {
          mapName,
          agentName: agent.displayName,
          agentIcon: agent.displayIcon,
          kills: d.kills,
          deaths: d.deaths,
          assists: d.assists,
          result: d.result,
          playedAt: d.playedAt,
        };
      })
  );

  return { gameName: player.gameName, tagLine: player.tagLine, matches };
}
