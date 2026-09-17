import type { RiotAccount, ShopAccount } from "@prisma/client";
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

// ShopAccount를 사용한 상점 조회 (편의성 우선)
export async function getShopForUser(userId: string): Promise<ShopResult> {
  const account = await prisma.shopAccount.findUnique({ where: { userId } });
  if (!account) {
    throw new Error(`사용자 ${userId}가 등록한 계정이 없습니다. 먼저 /shoplogin으로 계정을 등록해주세요.`);
  }

  const session = await getValidSession(account, (id, encryptedCookie) =>
    prisma.shopAccount.update({ where: { id }, data: { encryptedCookie, lastLoginAt: new Date() } }).then(() => {})
  );
  const storefront = await fetchStorefront(session);
  const skins = await getSkinLevels(storefront.skinLevelUuids);
  return {
    skins: skins.map((s) => ({ uuid: s.uuid, name: s.displayName, icon: s.displayIcon })),
    secondsUntilReset: storefront.secondsUntilReset,
  };
}

// RiotAccount를 사용한 상점 조회 (레거시 - 위시리스트용)
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
