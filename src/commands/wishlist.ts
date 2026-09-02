import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../db/prisma.js";
import { getSkinLevel, searchSkinLevels } from "../riot/skinMetadata.js";
import { addToWishlist, listWishlist, removeFromWishlist } from "../services/wishlistService.js";
import type { Command } from "../types.js";
import { princessEmbed } from "./_embed.js";
import { resolveAccount } from "./_shared.js";

function accountOption(opt: import("discord.js").SlashCommandStringOption) {
  return opt
    .setName("account")
    .setDescription("대상 계정 (미지정 시 계정이 1개면 자동 선택)")
    .setAutocomplete(true);
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("wishlist")
    .setDescription("공주에게 관심 스킨을 맡기고 살펴봅니다.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("관심 스킨을 공주에게 맡깁니다.")
        .addStringOption((opt) =>
          opt.setName("skin").setDescription("스킨 이름").setAutocomplete(true).setRequired(true)
        )
        .addStringOption(accountOption)
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("맡긴 스킨을 다시 거둡니다.")
        .addStringOption((opt) =>
          opt.setName("skin").setDescription("스킨 이름").setAutocomplete(true).setRequired(true)
        )
        .addStringOption(accountOption)
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("공주가 맡아둔 스킨 목록을 봅니다.")
        .addStringOption(accountOption)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "account") {
      const accounts = await prisma.riotAccount.findMany({ where: { userId: interaction.user.id } });
      const filtered = accounts.filter((a) =>
        a.riotUsername.toLowerCase().includes(focused.value.toLowerCase())
      );
      await interaction.respond(filtered.slice(0, 25).map((a) => ({ name: a.riotUsername, value: a.id })));
      return;
    }

    if (focused.name === "skin") {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === "remove") {
        const items = await prisma.wishlistItem.findMany({
          where: { riotAccount: { userId: interaction.user.id } },
          distinct: ["skinUuid"],
        });
        const filtered = items.filter((i) =>
          i.skinName.toLowerCase().includes(focused.value.toLowerCase())
        );
        await interaction.respond(
          filtered.slice(0, 25).map((i) => ({ name: i.skinName, value: i.skinUuid }))
        );
        return;
      }

      const results = await searchSkinLevels(focused.value);
      await interaction.respond(results.map((s) => ({ name: s.displayName, value: s.uuid })));
    }
  },

  async execute(interaction) {
    const resolved = await resolveAccount(interaction);
    if ("error" in resolved) {
      await interaction.reply({ content: resolved.error, ephemeral: true });
      return;
    }
    const { account } = resolved;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const skinUuid = interaction.options.getString("skin", true);
      const skin = await getSkinLevel(skinUuid);
      const skinName = skin?.displayName ?? skinUuid;

      await addToWishlist(account.id, skinUuid, skinName);
      await interaction.reply({
        content: `**${skinName}**, 공주가 잘 기억해둘게요. **${account.riotUsername}**에 뜨면 바로 알려드릴게요!`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "remove") {
      const skinUuid = interaction.options.getString("skin", true);
      await removeFromWishlist(account.id, skinUuid);
      await interaction.reply({ content: "네, 이제 그건 잊어드릴게요.", ephemeral: true });
      return;
    }

    const items = await listWishlist(account.id);
    if (items.length === 0) {
      await interaction.reply({
        content: `**${account.riotUsername}**엔 아직 맡아둔 스킨이 없는걸요.`,
        ephemeral: true,
      });
      return;
    }

    const embed = princessEmbed()
      .setTitle(`👑 ${account.riotUsername}을 위해 공주가 맡아둔 것들`)
      .setDescription(items.map((i) => `• ${i.skinName}`).join("\n"));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
