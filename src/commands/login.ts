import { SlashCommandBuilder, type DMChannel } from "discord.js";
import { LINK_LOGIN_NO_SESSION } from "../riot/authClient.js";
import { scheduleAccount } from "../scheduler/wishlistScheduler.js";
import { AccountLimitError, AccountOwnedByAnotherUserError, finalizeLogin } from "../services/accountService.js";
import { cacheFreshTokens } from "../services/riotSession.js";
import type { Command } from "../types.js";
import { runDmLogin } from "./_dmLogin.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("라이엇 계정을 DM으로 공주에게 알려줍니다 (개인 상점 조회용)."),

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
      const account = await finalizeLogin(interaction.user.id, outcome.tokens, outcome.ssid);
      cacheFreshTokens(account.id, outcome.tokens);

      if (outcome.ssid === LINK_LOGIN_NO_SESSION) {
        await dm.send(
          `✅ **${account.riotUsername}**, 이제 공주와 인연이 닿았어요. 지금 바로 /shop 은 볼 수 있는데, ` +
            "이 방식으로 이었기 때문에 자동 알림은 안 걸려있고, 시간이 지나면 다시 /login 해주셔야 해요."
        );
      } else {
        scheduleAccount(account.id);
        await dm.send(
          `✅ **${account.riotUsername}**, 이제 공주와 인연이 닿았어요. /shop 으로 오늘 상점부터 보여드릴까요?`
        );
      }
    } catch (err) {
      if (err instanceof AccountLimitError || err instanceof AccountOwnedByAnotherUserError) {
        await dm.send(err.message);
      } else {
        await dm.send("이런, 계정을 잇다가 문제가 생겼어요. 잠시 후 다시 시도해주실래요?");
      }
    }
  },
};
