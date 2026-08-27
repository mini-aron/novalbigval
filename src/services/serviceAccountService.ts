import { encrypt } from "../db/crypto.js";
import { prisma } from "../db/prisma.js";
import { fetchPuuid, fetchRegion } from "../riot/account.js";
import type { RiotTokens } from "../riot/types.js";
import { SERVICE_ACCOUNT_ID } from "./serviceAccountSession.js";

export async function finalizeServiceLogin(tokens: RiotTokens, ssid: string) {
  const puuid = await fetchPuuid(tokens.accessToken);
  const { region, shard } = await fetchRegion(tokens.accessToken, tokens.idToken);

  return prisma.serviceAccount.upsert({
    where: { id: SERVICE_ACCOUNT_ID },
    update: { puuid, region, shard, encryptedCookie: encrypt(ssid), lastLoginAt: new Date() },
    create: {
      id: SERVICE_ACCOUNT_ID,
      puuid,
      region,
      shard,
      encryptedCookie: encrypt(ssid),
    },
  });
}
