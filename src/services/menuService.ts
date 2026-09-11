import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

// 동시에 같은 메뉴를 추가하는 경쟁 상황에서도 unique 제약 위반을 "이미 있음"으로 처리한다.
export async function addMenuItem(guildKey: string, name: string): Promise<boolean> {
  try {
    await prisma.menuItem.create({ data: { guildKey, name } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

export async function removeMenuItem(guildKey: string, name: string): Promise<boolean> {
  const result = await prisma.menuItem.deleteMany({ where: { guildKey, name } });
  return result.count > 0;
}

export async function listMenuItems(guildKey: string) {
  return prisma.menuItem.findMany({ where: { guildKey }, orderBy: { addedAt: "asc" } });
}

export async function pickRandomMenuItem(guildKey: string) {
  const items = await listMenuItems(guildKey);
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
