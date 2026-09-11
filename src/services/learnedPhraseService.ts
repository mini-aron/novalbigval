import { prisma } from "../db/prisma.js";

export async function learnPhrase(guildKey: string, trigger: string, response: string) {
  return prisma.learnedPhrase.upsert({
    where: { guildKey_trigger: { guildKey, trigger } },
    update: { response },
    create: { guildKey, trigger, response },
  });
}

export async function forgetPhrase(guildKey: string, trigger: string): Promise<boolean> {
  const result = await prisma.learnedPhrase.deleteMany({ where: { guildKey, trigger } });
  return result.count > 0;
}

export async function findPhrase(guildKey: string, trigger: string) {
  return prisma.learnedPhrase.findUnique({ where: { guildKey_trigger: { guildKey, trigger } } });
}
