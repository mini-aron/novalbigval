import { decrypt, encrypt } from "../db/crypto.js";
import { fetchEntitlementsToken } from "../riot/account.js";
import { reauthenticate } from "../riot/authClient.js";

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

// 저장된 ssid 쿠키로 무음 재인증 후, API 호출에 필요한 토큰 세트를 만든다.
// RiotAccount(개인 상점용)와 ServiceAccount(전적 조회용 공용 계정)가 이 함수를 공유하므로
// 어느 테이블에 저장할지는 persist 콜백으로 분리한다.
export async function getValidSession(
  holder: SessionHolder,
  persist: (id: string, encryptedCookie: string) => Promise<void>
): Promise<RiotSession> {
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
