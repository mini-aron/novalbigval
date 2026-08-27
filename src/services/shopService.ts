import type { RiotAccount } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { getSkinLevels } from "../riot/skinMetadata.js";
import { fetchStorefront } from "../riot/store.js";
import { getValidSession } from "./riotSession.js";

export interface ShopSkin {
  uuid: string;
  name: string;
  icon: string | null;
}

export interface ShopResult {
  skins: ShopSkin[];
  secondsUntilReset: number;
}

export async function getShopForAccount(account: RiotAccount): Promise<ShopResult> {
  const session = await getValidSession(account, (id, encryptedCookie) =>
    prisma.riotAccount.update({ where: { id }, data: { encryptedCookie, lastLoginAt: new Date() } }).then(() => {})
  );
  const storefront = await fetchStorefront(session);
  const skins = await getSkinLevels(storefront.skinLevelUuids);
  return {
    skins: skins.map((s) => ({ uuid: s.uuid, name: s.displayName, icon: s.displayIcon })),
    secondsUntilReset: storefront.secondsUntilReset,
  };
}
