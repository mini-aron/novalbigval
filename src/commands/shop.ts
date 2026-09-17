import { SlashCommandBuilder } from "discord.js";
import { getShopForUser } from "../services/shopService.js";
import { SessionExpiredError } from "../services/riotSession.js";
import type { Command } from "../types.js";
import { princessEmbed } from "./_embed.js";
import { prisma } from "../db/prisma.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("오늘 공주가 봐줄 상점을 알려드립니다."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const shop = await getShopForUser(interaction.user.id);
      const account = await prisma.shopAccount.findUnique({ where: { userId: interaction.user.id } });
      const resetAt = Math.floor(Date.now() / 1000) + shop.secondsUntilReset;

      const embed = princessEmbed()
        .setTitle("👑 오늘의 상점")
        .setDescription(shop.skins.map((s) => `• ${s.name}`).join("\n"))
        .setThumbnail(shop.skins[0]?.icon ?? null);

      await interaction.editReply({
        content: `**${account?.riotUsername}**의 오늘 상점을 보여드릴게요 · 다음 갱신 <t:${resetAt}:R>`,
        embeds: [embed],
      });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        await interaction.editReply(
          "세션이 잠들어버렸어요. /shoplogin으로 다시 로그인해주실래요?"
        );
        return;
      }
      if (err instanceof Error && err.message.includes("등록한 계정이 없습니다")) {
        await interaction.editReply(
          "아직 계정을 등록하지 않으셨네요. /shoplogin으로 계정을 등록해주세요!"
        );
        return;
      }
      await interaction.editReply("상점을 보다가 조금 삐끗했어요. 잠시 후 다시 시도해주실래요?");
    }
  },
};
