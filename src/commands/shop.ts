import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getShopForAccount } from "../services/shopService.js";
import { SessionExpiredError } from "../services/riotSession.js";
import type { Command } from "../types.js";
import { autocompleteAccounts, resolveAccount } from "./_shared.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("오늘의 개인 상점을 조회합니다.")
    .addStringOption((opt) =>
      opt
        .setName("account")
        .setDescription("조회할 계정 (미지정 시 계정이 1개면 자동 선택)")
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

    await interaction.deferReply({ ephemeral: true });

    try {
      const shop = await getShopForAccount(resolved.account);
      const resetAt = Math.floor(Date.now() / 1000) + shop.secondsUntilReset;

      const embeds = shop.skins.map((skin) =>
        new EmbedBuilder()
          .setTitle(skin.name)
          .setColor(0xd81f30)
          .setThumbnail(skin.icon)
      );

      await interaction.editReply({
        content: `**${resolved.account.riotUsername}**의 오늘 상점 · 다음 갱신 <t:${resetAt}:R>`,
        embeds,
      });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        await interaction.editReply(
          "저장된 세션이 만료되었습니다. /logout 후 /login 으로 다시 연동해주세요."
        );
        return;
      }
      await interaction.editReply("상점 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  },
};
