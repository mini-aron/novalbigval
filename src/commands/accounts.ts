import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { prisma } from "../db/prisma.js";
import { MAX_ACCOUNTS_PER_USER } from "../services/accountService.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("accounts")
    .setDescription("연동된 라이엇 계정 목록을 확인합니다."),

  async execute(interaction) {
    const accounts = await prisma.riotAccount.findMany({
      where: { userId: interaction.user.id },
      orderBy: { lastLoginAt: "desc" },
    });

    if (accounts.length === 0) {
      await interaction.reply({
        content: "연동된 라이엇 계정이 없습니다. /login 으로 먼저 연동해주세요.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("연동된 계정")
      .setColor(0xd81f30)
      .setDescription(`${accounts.length} / ${MAX_ACCOUNTS_PER_USER}개 사용 중`)
      .addFields(
        accounts.map((a) => ({
          name: a.riotUsername,
          value: `리전: ${a.region.toUpperCase()} · 마지막 로그인: <t:${Math.floor(a.lastLoginAt.getTime() / 1000)}:R>`,
        }))
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
