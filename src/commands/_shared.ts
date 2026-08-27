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
    return { error: "연동된 라이엇 계정이 없습니다. /login 으로 먼저 연동해주세요." };
  }

  const specifiedId = interaction.options.getString(optionName);
  if (specifiedId) {
    const account = accounts.find((a) => a.id === specifiedId);
    if (!account) return { error: "해당 계정을 찾을 수 없습니다. /accounts 로 확인해주세요." };
    return { account };
  }

  if (accounts.length === 1) return { account: accounts[0] };

  return {
    error: `연동된 계정이 여러 개입니다. account 옵션으로 지정해주세요: ${accounts
      .map((a) => a.riotUsername)
      .join(", ")}`,
  };
}

// /rank, /matches가 공유하는 에러 → 사용자 메시지 변환.
export function resolveStatsErrorMessage(err: unknown): string {
  if (err instanceof InvalidRiotIdError || err instanceof PlayerNotFoundError) return err.message;
  if (err instanceof NoServiceAccountError) return err.message;
  if (err instanceof SessionExpiredError) {
    return "전적 조회용 계정 세션이 만료되었습니다. 관리자가 /servicelogin 으로 다시 연동해야 합니다.";
  }
  console.error(err);
  return "조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}
