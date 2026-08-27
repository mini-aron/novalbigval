import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getRecentMatches } from "../services/statsService.js";
import type { Command } from "../types.js";
import { resolveStatsErrorMessage } from "./_shared.js";

const RESULT_LABEL: Record<string, string> = { win: "🟢 승리", loss: "🔴 패배", unknown: "⚪ 알 수 없음" };

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("matches")
    .setDescription("닉네임#태그로 최근 전적을 조회합니다.")
    .addStringOption((opt) =>
      opt.setName("riotid").setDescription("닉네임#태그 (예: Player#KR1)").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("count").setDescription("조회할 경기 수 (기본 5, 최대 10)").setMinValue(1).setMaxValue(10)
    ) as SlashCommandBuilder,

  async execute(interaction) {
    const riotId = interaction.options.getString("riotid", true);
    const count = interaction.options.getInteger("count") ?? 5;
    await interaction.deferReply();

    try {
      const result = await getRecentMatches(riotId, count);

      if (result.matches.length === 0) {
        await interaction.editReply(`**${result.gameName}#${result.tagLine}**의 최근 전적이 없습니다.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${result.gameName}#${result.tagLine} 최근 전적`)
        .setColor(0xd81f30)
        .setDescription(
          result.matches
            .map((m) => {
              const playedAt = Math.floor(m.playedAt / 1000);
              return `${RESULT_LABEL[m.result]} · **${m.agentName}** · ${m.mapName} · ${m.kills}/${m.deaths}/${m.assists} · <t:${playedAt}:R>`;
            })
            .join("\n")
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(resolveStatsErrorMessage(err));
    }
  },
};
