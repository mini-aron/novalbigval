import { SlashCommandBuilder, type DMChannel } from "discord.js";
import { login, submitMfa } from "../riot/authClient.js";
import { AccountLimitError, AccountOwnedByAnotherUserError, finalizeLogin } from "../services/accountService.js";
import { scheduleAccount } from "../scheduler/wishlistScheduler.js";
import type { Command } from "../types.js";

async function ask(
  dm: DMChannel,
  userId: string,
  prompt: string,
  timeoutMs = 120_000
): Promise<string | null> {
  await dm.send(prompt);
  try {
    const collected = await dm.awaitMessages({
      filter: (m) => m.author.id === userId,
      max: 1,
      time: timeoutMs,
      errors: ["time"],
    });
    return collected.first()?.content ?? null;
  } catch {
    return null;
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("라이엇 계정을 DM으로 연동합니다."),

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

    const userId = interaction.user.id;

    const username = await ask(dm, userId, "라이엇 계정 아이디를 입력해주세요.");
    if (!username) return void dm.send("시간이 초과되었습니다. /login 을 다시 실행해주세요.");

    const password = await ask(
      dm,
      userId,
      "비밀번호를 입력해주세요.\n(입력 후 이 메시지는 직접 삭제해주세요 — 봇은 DM에서 다른 사람의 메시지를 삭제할 권한이 없습니다.)"
    );
    if (!password) return void dm.send("시간이 초과되었습니다. /login 을 다시 실행해주세요.");

    const result = await login(username, password);

    if (result.status === "invalid_credentials") {
      await dm.send("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    if (result.status === "rate_limited") {
      await dm.send("Riot 서버가 요청을 제한하고 있습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    let tokens;
    let ssid;

    if (result.status === "mfa_required") {
      await dm.send(
        `2단계 인증코드가 ${result.email || "등록된 이메일"}로 발송되었습니다. 2분 이내에 입력해주세요.`
      );
      const code = await ask(dm, userId, "인증코드를 입력해주세요.", 120_000);
      if (!code) return void dm.send("시간이 초과되었습니다. /login 을 다시 실행해주세요.");

      const mfaResult = await submitMfa(result.cookieHeader, code);
      if (mfaResult.status !== "success") {
        await dm.send(
          mfaResult.status === "invalid_code"
            ? "인증코드가 올바르지 않습니다. /login 을 다시 실행해주세요."
            : "인증 세션이 만료되었습니다. /login 을 다시 실행해주세요."
        );
        return;
      }
      tokens = mfaResult.tokens;
      ssid = mfaResult.ssid;
    } else {
      tokens = result.tokens;
      ssid = result.ssid;
    }

    try {
      const account = await finalizeLogin(userId, tokens, ssid);
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
