import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getShopForAccount } from "../services/shopService.js";
import { SessionExpiredError } from "../services/riotSession.js";
import type { Command } from "../types.js";
import { autocompleteAccounts, resolveAccount } from "./_shared.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("오늘 공주가 봐줄 개인 상점을 알려드립니다.")
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
        content: `**${resolved.account.riotUsername}**의 오늘 상점, 공주가 챙겨왔어요 · 다음 갱신 <t:${resetAt}:R>`,
        embeds,
      });
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        await interaction.editReply(
          "세션이 잠들어버렸어요. /logout 후 /login 으로 다시 깨워주실래요?"
        );
        return;
      }
      await interaction.editReply("상점을 보다가 조금 삐끗했어요. 잠시 후 다시 시도해주실래요?");
    }
  },
};
