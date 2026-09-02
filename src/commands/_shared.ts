import type { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import type { RiotAccount } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { NoServiceAccountError } from "../services/serviceAccountSession.js";
import { SessionExpiredError } from "../services/riotSession.js";
import { InvalidRiotIdError, PlayerNotFoundError } from "../services/statsService.js";

export async function autocompleteAccounts(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const accounts = await prisma.riotAccount.findMany({ where: { userId: interaction.user.id } });
  const filtered = accounts.filter((a) => a.riotUsername.toLowerCase().includes(focused));
  await interaction.respond(filtered.slice(0, 25).map((a) => ({ name: a.riotUsername, value: a.id })));
}

// account 옵션이 없으면 유저의 유일한 계정을 자동 선택하고, 여러 개면 지정하라고 안내한다.
export async function resolveAccount(
  interaction: ChatInputCommandInteraction,
  optionName = "account"
): Promise<{ account: RiotAccount } | { error: string }> {
  const accounts = await prisma.riotAccount.findMany({ where: { userId: interaction.user.id } });
  if (accounts.length === 0) {
    return { error: "아직 이어진 계정이 없는걸요. /login 부터 해주실래요?" };
  }

  const specifiedId = interaction.options.getString(optionName);
  if (specifiedId) {
    const account = accounts.find((a) => a.id === specifiedId);
    if (!account) return { error: "그 계정은 공주 목록에 없어요. /accounts 로 다시 확인해주세요." };
    return { account };
  }

  if (accounts.length === 1) return { account: accounts[0] };

  return {
    error: `계정이 여러 개라 헷갈리는걸요. account 옵션으로 콕 집어주세요: ${accounts
      .map((a) => a.riotUsername)
      .join(", ")}`,
  };
}

// /rank, /matches가 공유하는 에러 → 사용자 메시지 변환.
export function resolveStatsErrorMessage(err: unknown): string {
  if (err instanceof InvalidRiotIdError || err instanceof PlayerNotFoundError) return err.message;
  if (err instanceof NoServiceAccountError) return err.message;
  if (err instanceof SessionExpiredError) {
    return "조회용 세션이 잠들어버렸어요. 관리자님이 /servicelogin 으로 다시 깨워주셔야 해요.";
  }
  console.error(err);
  return "조회하다가 조금 삐끗했어요. 잠시 후 다시 시도해주실래요?";
}
