import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../db/prisma.js";
import type { Command } from "../types.js";
import { autocompleteAccounts, resolveAccount } from "./_shared.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("logout")
    .setDescription("연동된 라이엇 계정을 삭제합니다.")
    .addStringOption((opt) =>
      opt
        .setName("account")
        .setDescription("삭제할 계정 (미지정 시 계정이 1개면 자동 선택)")
        .setAutocomplete(true)
    ) as SlashCommandBuilder,

  async autocomplete(interaction) {
    await autocompleteAccounts(interaction);
  },

  async execute(interaction) {
    const resolved = await resolveAccount(interaction);
    if ("error" in resolved) {
      await interaction.reply({ content: resolved.error, ephemeral: true });
      return;
    }

    await prisma.riotAccount.delete({ where: { id: resolved.account.id } });
    await interaction.reply({
      content: `**${resolved.account.riotUsername}** 계정 연동이 해제되었습니다. 저장된 세션 정보도 함께 삭제되었습니다.`,
      ephemeral: true,
    });
  },
};
