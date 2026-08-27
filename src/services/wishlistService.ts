import { prisma } from "../db/prisma.js";

export async function addToWishlist(riotAccountId: string, skinUuid: string, skinName: string) {
  return prisma.wishlistItem.upsert({
    where: { riotAccountId_skinUuid: { riotAccountId, skinUuid } },
    update: {},
    create: { riotAccountId, skinUuid, skinName },
  });
}

export async function removeFromWishlist(riotAccountId: string, skinUuid: string) {
  await prisma.wishlistItem.deleteMany({ where: { riotAccountId, skinUuid } });
}

export async function listWishlist(riotAccountId: string) {
  return prisma.wishlistItem.findMany({ where: { riotAccountId }, orderBy: { addedAt: "asc" } });
}

// 오늘 상점에 뜬 스킨 UUID들과 위시리스트를 대조해 매칭되는 항목만 돌려준다.
export async function matchWishlist(riotAccountId: string, shopSkinUuids: string[]) {
  const wishlist = await listWishlist(riotAccountId);
  const shopSet = new Set(shopSkinUuids);
  return wishlist.filter((item) => shopSet.has(item.skinUuid));
}
