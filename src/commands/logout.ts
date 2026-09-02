import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../db/prisma.js";
import { cancelAccount } from "../scheduler/wishlistScheduler.js";
import type { Command } from "../types.js";
import { autocompleteAccounts, resolveAccount } from "./_shared.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("logout")
    .setDescription("이어둔 라이엇 계정을 정리합니다.")
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

    cancelAccount(resolved.account.id);
    await prisma.riotAccount.delete({ where: { id: resolved.account.id } });
    await interaction.reply({
      content: `**${resolved.account.riotUsername}**, 이제 놓아드릴게요. 저장해뒀던 세션도 깨끗이 지웠어요.`,
      ephemeral: true,
    });
  },
};
