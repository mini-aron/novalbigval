import { prisma } from "../db/prisma.js";
import { getValidSession, type RiotSession } from "./riotSession.js";

// 노발이(전적 조회)는 유저별 로그인 없이, 운영자가 /servicelogin 으로 등록해둔
// 계정 하나의 세션으로 임의의 플레이어를 조회한다. row는 항상 하나만 유지한다.
export const SERVICE_ACCOUNT_ID = "service";

export class NoServiceAccountError extends Error {
  constructor() {
    super("아직 전적을 봐줄 계정이 없는걸요. 운영자님이 /servicelogin 으로 먼저 등록해주셔야 해요.");
    this.name = "NoServiceAccountError";
  }
}

export async function getServiceSession(): Promise<RiotSession> {
  const account = await prisma.serviceAccount.findUnique({ where: { id: SERVICE_ACCOUNT_ID } });
  if (!account) throw new NoServiceAccountError();

  return getValidSession(account, (id, encryptedCookie) =>
    prisma.serviceAccount
      .update({ where: { id }, data: { encryptedCookie, lastLoginAt: new Date() } })
      .then(() => {})
  );
}
