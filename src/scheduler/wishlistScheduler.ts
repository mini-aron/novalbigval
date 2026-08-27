import type { Client } from "discord.js";
import { prisma } from "../db/prisma.js";
import { SessionExpiredError } from "../services/riotSession.js";
import { getShopForAccount } from "../services/shopService.js";
import { matchWishlist } from "../services/wishlistService.js";

// setTimeout은 32비트 정수 한계(~24.8일)를 넘기면 즉시 실행되어 버리므로 상한을 둔다.
const MAX_TIMEOUT_MS = 2_000_000_000;
const RESET_BUFFER_MS = 15_000; // 리셋 직후 상점이 아직 안 바뀐 경우를 피하기 위한 여유시간
const RETRY_DELAY_MS = 10 * 60 * 1000;

let botClient: Client | null = null;
const timers = new Map<string, NodeJS.Timeout>();

export function initScheduler(client: Client): void {
  botClient = client;
}

export function cancelAccount(riotAccountId: string): void {
  const existing = timers.get(riotAccountId);
  if (existing) clearTimeout(existing);
  timers.delete(riotAccountId);
}

function reschedule(riotAccountId: string, delayMs: number): void {
  cancelAccount(riotAccountId);
  const timer = setTimeout(() => void checkAndReschedule(riotAccountId), Math.min(delayMs, MAX_TIMEOUT_MS));
  timers.set(riotAccountId, timer);
}

async function checkAndReschedule(riotAccountId: string): Promise<void> {
  if (!botClient) return;

  const account = await prisma.riotAccount.findUnique({ where: { id: riotAccountId } });
  if (!account) return; // 계정이 그 사이 삭제됨 — 재스케줄하지 않음

  let shop;
  try {
    shop = await getShopForAccount(account);
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      console.warn(`[wishlist] ${account.riotUsername} 세션 만료 — 재로그인 전까지 스케줄 중단`);
      return;
    }
    console.error(`[wishlist] ${account.riotUsername} 상점 조회 실패, ${RETRY_DELAY_MS / 60000}분 후 재시도`, err);
    reschedule(riotAccountId, RETRY_DELAY_MS);
    return;
  }

  const matches = await matchWishlist(account.id, shop.skins.map((s) => s.uuid));
  if (matches.length > 0) {
    try {
      const user = await botClient.users.fetch(account.userId);
      await user.send(
        `🔔 **${account.riotUsername}** 상점에 위시리스트 스킨이 떴습니다!\n` +
          matches.map((m) => `• ${m.skinName}`).join("\n")
      );
    } catch (err) {
      console.error(`[wishlist] ${account.riotUsername} DM 발송 실패`, err);
    }
  }

  reschedule(riotAccountId, shop.secondsUntilReset * 1000 + RESET_BUFFER_MS);
}

export function scheduleAccount(riotAccountId: string): void {
  void checkAndReschedule(riotAccountId);
}

export async function startAllSchedules(): Promise<void> {
  const accounts = await prisma.riotAccount.findMany({ select: { id: true } });
  for (const account of accounts) {
    scheduleAccount(account.id);
  }
}
