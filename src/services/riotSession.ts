import type { RiotAccount } from "@prisma/client";
import { decrypt, encrypt } from "../db/crypto.js";
import { prisma } from "../db/prisma.js";
import { reauthenticate } from "../riot/authClient.js";
import { fetchEntitlementsToken } from "../riot/account.js";

export interface RiotSession {
  accessToken: string;
  entitlementsToken: string;
  puuid: string;
  shard: string;
}

export class SessionExpiredError extends Error {
  constructor(readonly riotAccountId: string) {
    super("저장된 세션이 만료되어 재로그인이 필요합니다.");
    this.name = "SessionExpiredError";
  }
}

// 저장된 ssid 쿠키로 무음 재인증 후, 상점 API 호출에 필요한 토큰 세트를 만든다.
// 재인증에 성공하면 새로 발급된 ssid로 DB를 갱신한다(쿠키는 매 사용마다 로테이션됨).
export async function getValidSession(account: RiotAccount): Promise<RiotSession> {
  const ssid = decrypt(account.encryptedCookie);

  let reauth;
  try {
    reauth = await reauthenticate(ssid);
  } catch {
    throw new SessionExpiredError(account.id);
  }

  await prisma.riotAccount.update({
    where: { id: account.id },
    data: { encryptedCookie: encrypt(reauth.ssid), lastLoginAt: new Date() },
  });

  const entitlementsToken = await fetchEntitlementsToken(reauth.tokens.accessToken);

  return {
    accessToken: reauth.tokens.accessToken,
    entitlementsToken,
    puuid: account.puuid,
    shard: account.shard,
  };
}
