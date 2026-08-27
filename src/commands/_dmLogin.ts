import type { DMChannel } from "discord.js";
import { login, submitMfa } from "../riot/authClient.js";
import type { RiotTokens } from "../riot/types.js";

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

export type DmLoginOutcome =
  | { status: "success"; tokens: RiotTokens; ssid: string }
  | { status: "aborted" };

// /login, /servicelogin이 공유하는 "DM에서 아이디/비번/2FA 받아서 토큰까지 발급받기" 절차.
// 실패/타임아웃 시 DM에 안내 메시지까지 보내고 aborted를 반환한다.
export async function runDmLogin(dm: DMChannel, userId: string): Promise<DmLoginOutcome> {
  const username = await ask(dm, userId, "라이엇 계정 아이디를 입력해주세요.");
  if (!username) {
    await dm.send("시간이 초과되었습니다. 명령어를 다시 실행해주세요.");
    return { status: "aborted" };
  }

  const password = await ask(
    dm,
    userId,
    "비밀번호를 입력해주세요.\n(입력 후 이 메시지는 직접 삭제해주세요 — 봇은 DM에서 다른 사람의 메시지를 삭제할 권한이 없습니다.)"
  );
  if (!password) {
    await dm.send("시간이 초과되었습니다. 명령어를 다시 실행해주세요.");
    return { status: "aborted" };
  }

  const result = await login(username, password);

  if (result.status === "invalid_credentials") {
    await dm.send("아이디 또는 비밀번호가 올바르지 않습니다.");
    return { status: "aborted" };
  }
  if (result.status === "rate_limited") {
    await dm.send("Riot 서버가 요청을 제한하고 있습니다. 잠시 후 다시 시도해주세요.");
    return { status: "aborted" };
  }

  if (result.status === "mfa_required") {
    await dm.send(
      `2단계 인증코드가 ${result.email || "등록된 이메일"}로 발송되었습니다. 2분 이내에 입력해주세요.`
    );
    const code = await ask(dm, userId, "인증코드를 입력해주세요.", 120_000);
    if (!code) {
      await dm.send("시간이 초과되었습니다. 명령어를 다시 실행해주세요.");
      return { status: "aborted" };
    }

    const mfaResult = await submitMfa(result.cookieHeader, code);
    if (mfaResult.status !== "success") {
      await dm.send(
        mfaResult.status === "invalid_code"
          ? "인증코드가 올바르지 않습니다. 명령어를 다시 실행해주세요."
          : "인증 세션이 만료되었습니다. 명령어를 다시 실행해주세요."
      );
      return { status: "aborted" };
    }
    return { status: "success", tokens: mfaResult.tokens, ssid: mfaResult.ssid };
  }

  return { status: "success", tokens: result.tokens, ssid: result.ssid };
}
