import { EmbedBuilder } from "discord.js";

export const PRINCESS_COLOR = 0xe07a9e;
export const SAGE_ICON_URL =
  "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png";

// 모든 임베드가 공통으로 갖는 공주님 브랜딩(색상/푸터/타임스탬프).
export function princessEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(PRINCESS_COLOR)
    .setFooter({ text: "세이지 공주님", iconURL: SAGE_ICON_URL })
    .setTimestamp();
}
