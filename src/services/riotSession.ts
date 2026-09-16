import { decrypt, encrypt } from "../db/crypto.js";
import { fetchEntitlementsToken } from "../riot/account.js";
import { reauthenticate } from "../riot/authClient.js";
import type { RiotTokens } from "../riot/types.js";

export interface RiotSession {
  accessToken: string;
  entitlementsToken: string;
  puuid: string;
  shard: string;
}

export interface SessionHolder {
  id: string;
  puuid: string;
  shard: string;
  encryptedCookie: string;
}

export class SessionExpiredError extends Error {
  constructor(readonly holderId: string) {
    super("저장된 세션이 만료되어 재로그인이 필요합니다.");
    this.name = "SessionExpiredError";
  }
}

// 링크 로그인(ssid 없이 access_token/id_token만 얻는 대체 경로)으로 받은 토큰을
// 잠깐 재사용하기 위한 메모리 캐시. ssid가 없어서 reauthenticate()로 갱신이
// 불가능한 계정도, 로그인 직후 토큰이 살아있는 동안만큼은 상점 조회가 되게 해준다.
// 재시작하면 사라지지만, 애초에 재로그인이 필요한 임시 세션이라 문제 없다.
const freshTokenCache = new Map<string, { tokens: RiotTokens; expiresAt: number }>();

export function cacheFreshTokens(holderId: string, tokens: RiotTokens): void {
  freshTokenCache.set(holderId, {
    tokens,
    expiresAt: Date.now() + tokens.expiresIn * 1000 - 60_000, // 만료 1분 전까지만 신뢰
  });
}

// 저장된 ssid 쿠키로 무음 재인증 후, API 호출에 필요한 토큰 세트를 만든다.
// RiotAccount(개인 상점용)와 ServiceAccount(전적 조회용 공용 계정)가 이 함수를 공유하므로
// 어느 테이블에 저장할지는 persist 콜백으로 분리한다.
export async function getValidSession(
  holder: SessionHolder,
  persist: (id: string, encryptedCookie: string) => Promise<void>
): Promise<RiotSession> {
  const cached = freshTokenCache.get(holder.id);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      const entitlementsToken = await fetchEntitlementsToken(cached.tokens.accessToken);
      return {
        accessToken: cached.tokens.accessToken,
        entitlementsToken,
        puuid: holder.puuid,
        shard: holder.shard,
      };
    }
    freshTokenCache.delete(holder.id);
  }

  const ssid = decrypt(holder.encryptedCookie);

  let reauth;
  try {
    reauth = await reauthenticate(ssid);
  } catch {
    throw new SessionExpiredError(holder.id);
  }

  await persist(holder.id, encrypt(reauth.ssid));

  const entitlementsToken = await fetchEntitlementsToken(reauth.tokens.accessToken);

  return {
    accessToken: reauth.tokens.accessToken,
    entitlementsToken,
    puuid: holder.puuid,
    shard: holder.shard,
  };
}
