import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../db/prisma.js";
import { MAX_ACCOUNTS_PER_USER } from "../services/accountService.js";
import type { Command } from "../types.js";
import { princessEmbed } from "./_embed.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("accounts")
    .setDescription("공주가 기억하고 있는 계정 목록을 보여줍니다."),

  async execute(interaction) {
    const accounts = await prisma.riotAccount.findMany({
      where: { userId: interaction.user.id },
      orderBy: { lastLoginAt: "desc" },
    });

    if (accounts.length === 0) {
      await interaction.reply({
        content: "아직 이어진 계정이 없는걸요. /login 부터 해주실래요?",
        ephemeral: true,
      });
      return;
    }

    const embed = princessEmbed()
      .setTitle("👑 공주가 기억하는 계정")
      .setDescription(`${accounts.length} / ${MAX_ACCOUNTS_PER_USER}개를 기억하고 있어요`)
      .addFields(
        accounts.map((a) => ({
          name: a.riotUsername,
          value: `리전: ${a.region.toUpperCase()} · 마지막 로그인: <t:${Math.floor(a.lastLoginAt.getTime() / 1000)}:R>`,
        }))
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
