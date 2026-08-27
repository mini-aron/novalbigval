import { PermissionFlagsBits, SlashCommandBuilder, type DMChannel } from "discord.js";
import { finalizeServiceLogin } from "../services/serviceAccountService.js";
import type { Command } from "../types.js";
import { runDmLogin } from "./_dmLogin.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("servicelogin")
    .setDescription("[관리자] 전적/랭크 조회(노발이)에 쓸 공용 라이엇 계정을 등록합니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      content: "DM으로 로그인 절차를 안내해드릴게요. 확인해주세요!",
      ephemeral: true,
    });

    let dm: DMChannel;
    try {
      dm = await interaction.user.createDM();
    } catch {
      await interaction.followUp({
        content: "DM을 열 수 없습니다. 이 서버에서 다이렉트 메시지 수신을 허용해주세요.",
        ephemeral: true,
      });
      return;
    }

    const outcome = await runDmLogin(dm, interaction.user.id);
    if (outcome.status === "aborted") return;

    try {
      await finalizeServiceLogin(outcome.tokens, outcome.ssid);
      await dm.send(
        "✅ 전적 조회용 공용 계정이 등록되었습니다. 이제 서버 유저들이 /rank, /matches 로 아무 플레이어나 조회할 수 있습니다."
      );
    } catch {
      await dm.send("계정 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  },
};
