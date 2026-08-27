import { encrypt } from "../db/crypto.js";
import { prisma } from "../db/prisma.js";
import { fetchEntitlementsToken, fetchPuuid, fetchRegion } from "../riot/account.js";
import { fetchDisplayName } from "../riot/nameService.js";
import type { RiotTokens } from "../riot/types.js";

export const MAX_ACCOUNTS_PER_USER = 3;

export class AccountLimitError extends Error {
  constructor() {
    super(`계정은 유저당 최대 ${MAX_ACCOUNTS_PER_USER}개까지 연동할 수 있습니다. /accounts 로 기존 계정을 확인 후 /logout 으로 정리해주세요.`);
    this.name = "AccountLimitError";
  }
}

export class AccountOwnedByAnotherUserError extends Error {
  constructor() {
    super("이미 다른 디스코드 계정에 연동되어 있는 라이엇 계정입니다.");
    this.name = "AccountOwnedByAnotherUserError";
  }
}

// 로그인/2FA 성공 후 토큰으로 puuid/region을 알아내고, 계정 상한을 검사한 뒤 DB에 반영한다.
export async function finalizeLogin(discordId: string, tokens: RiotTokens, ssid: string) {
  const [entitlementsToken, puuid] = await Promise.all([
    fetchEntitlementsToken(tokens.accessToken),
    fetchPuuid(tokens.accessToken),
  ]);
  const { region, shard } = await fetchRegion(tokens.accessToken, tokens.idToken);

  await prisma.user.upsert({ where: { discordId }, update: {}, create: { discordId } });

  const existing = await prisma.riotAccount.findUnique({ where: { puuid } });
  if (!existing) {
    const count = await prisma.riotAccount.count({ where: { userId: discordId } });
    if (count >= MAX_ACCOUNTS_PER_USER) {
      throw new AccountLimitError();
    }
  } else if (existing.userId !== discordId) {
    throw new AccountOwnedByAnotherUserError();
  }

  const displayName = await fetchDisplayName({
    accessToken: tokens.accessToken,
    entitlementsToken,
    shard,
    puuid,
  }).catch(() => null);

  return prisma.riotAccount.upsert({
    where: { puuid },
    update: {
      encryptedCookie: encrypt(ssid),
      lastLoginAt: new Date(),
      riotUsername: displayName ?? existing?.riotUsername ?? "알 수 없음",
      region,
      shard,
    },
    create: {
      userId: discordId,
      puuid,
      region,
      shard,
      riotUsername: displayName ?? "알 수 없음",
      encryptedCookie: encrypt(ssid),
    },
  });
}
