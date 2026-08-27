import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getRankInfo } from "../services/statsService.js";
import type { Command } from "../types.js";
import { resolveStatsErrorMessage } from "./_shared.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("닉네임#태그로 현재 랭크를 조회합니다.")
    .addStringOption((opt) =>
      opt.setName("riotid").setDescription("닉네임#태그 (예: Player#KR1)").setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction) {
    const riotId = interaction.options.getString("riotid", true);
    await interaction.deferReply();

    try {
      const rank = await getRankInfo(riotId);
      const embed = new EmbedBuilder()
        .setTitle(`${rank.gameName}#${rank.tagLine}`)
        .setColor(0xd81f30);

      if (!rank.hasCompetitiveData) {
        embed.setDescription("경쟁전 기록이 없습니다.");
      } else {
        embed.setDescription(`**${rank.tierName}** · ${rank.rr} RR`);
        if (rank.tierIcon) embed.setThumbnail(rank.tierIcon);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(resolveStatsErrorMessage(err));
    }
  },
};
