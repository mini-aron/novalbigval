import { SlashCommandBuilder, type DMChannel } from "discord.js";
import { scheduleAccount } from "../scheduler/wishlistScheduler.js";
import { AccountLimitError, AccountOwnedByAnotherUserError, finalizeLogin } from "../services/accountService.js";
import type { Command } from "../types.js";
import { runDmLogin } from "./_dmLogin.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("라이엇 계정을 DM으로 연동합니다 (개인 상점 조회용)."),

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
      const account = await finalizeLogin(interaction.user.id, outcome.tokens, outcome.ssid);
      scheduleAccount(account.id);
      await dm.send(
        `✅ **${account.riotUsername}** 계정 연동이 완료되었습니다. /shop 명령어로 상점을 조회해보세요.`
      );
    } catch (err) {
      if (err instanceof AccountLimitError || err instanceof AccountOwnedByAnotherUserError) {
        await dm.send(err.message);
      } else {
        await dm.send("계정 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  },
};
