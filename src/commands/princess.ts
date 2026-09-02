import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { princessEmbed } from "./_embed.js";

const RULES = [
  "스파이크는 좋아하지 않으니 억지로 드리지 마세요. 뱉어버린답니다.",
  "같은 부탁을 자꾸자꾸 반복하면 삐질 수 있어요. 한 번만 얘기해주세요.",
  "욕설이나 비난은 공주의 귀를 닫게 만든답니다.",
  "위시리스트에 스킨 하나쯤 맡겨두면 은근히 기뻐하실 거예요. /wishlist add",
  "상점이 궁금하면 그냥 /shop 이라고만 불러주세요, 그거면 충분해요.",
];

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("princess")
    .setDescription("세이지 공주님을 모시는 방법을 알려드립니다."),

  async execute(interaction) {
    const embed = princessEmbed()
      .setTitle("👑 세이지 공주님을 모시는 방법")
      .setThumbnail(
        "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png"
      )
      .setDescription(RULES.map((r, i) => `${i + 1}. ${r}`).join("\n"));

    await interaction.reply({ embeds: [embed] });
  },
};
