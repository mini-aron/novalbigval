import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

// 슬래시커맨드가 아니라 평문 채팅에서 문구를 감지해 반응하는 재미용 기능(예: "세이지 날씨").
export interface TextTrigger {
  test(content: string): boolean;
  handle(message: Message): Promise<void>;
}
