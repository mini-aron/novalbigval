import { PermissionFlagsBits, SlashCommandBuilder, type DMChannel } from "discord.js";
import { finalizeServiceLogin } from "../services/serviceAccountService.js";
import type { Command } from "../types.js";
import { runDmLogin } from "./_dmLogin.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("servicelogin")
    .setDescription("[관리자] 전적/랭크 조회에 쓸 공용 계정을 공주에게 맡깁니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      content: "공주가 DM으로 절차를 알려드릴 테니, 꼭 확인해주셔야 해요!",
      ephemeral: true,
    });

    let dm: DMChannel;
    try {
      dm = await interaction.user.createDM();
    } catch {
      await interaction.followUp({
        content: "어머, 편지가 안 가네요. 이 서버에서 다이렉트 메시지 수신을 허용해주셔야 공주가 연락할 수 있어요.",
        ephemeral: true,
      });
      return;
    }

    const outcome = await runDmLogin(dm, interaction.user.id);
    if (outcome.status === "aborted") return;

    try {
      await finalizeServiceLogin(outcome.tokens, outcome.ssid);
      await dm.send(
        "✅ 이제 공주가 전적 조회용 계정을 맡아뒀어요. 다들 /rank, /matches 로 아무나 살펴볼 수 있어요."
      );
    } catch {
      await dm.send("계정을 맡다가 문제가 생겼어요. 잠시 후 다시 시도해주실래요?");
    }
  },
};
