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
  const username = await ask(dm, userId, "라이엇 계정 아이디를 알려주실래요?");
  if (!username) {
    await dm.send("너무 오래 기다렸더니 깜빡 잠들 뻔했어요. 명령어부터 다시 실행해주세요.");
    return { status: "aborted" };
  }

  const password = await ask(
    dm,
    userId,
    "비밀번호도 알려주세요.\n(적고 나서 그 메시지는 직접 지워주셔야 해요 — 공주는 DM에서 남의 메시지를 지울 힘이 없거든요.)"
  );
  if (!password) {
    await dm.send("너무 오래 기다렸더니 깜빡 잠들 뻔했어요. 명령어부터 다시 실행해주세요.");
    return { status: "aborted" };
  }

  const result = await login(username, password);

  if (result.status === "invalid_credentials") {
    await dm.send("어머, 아이디나 비밀번호가 틀린 것 같아요.");
    return { status: "aborted" };
  }
  if (result.status === "rate_limited") {
    await dm.send("Riot 서버가 지금은 좀 까다롭게 구네요. 잠시 후 다시 시도해주실래요?");
    return { status: "aborted" };
  }

  if (result.status === "mfa_required") {
    await dm.send(
      `2단계 인증코드를 ${result.email || "등록된 이메일"}로 보내뒀어요. 2분 안에 알려주세요.`
    );
    const code = await ask(dm, userId, "인증코드를 알려주실래요?", 120_000);
    if (!code) {
      await dm.send("너무 오래 기다렸더니 깜빡 잠들 뻔했어요. 명령어부터 다시 실행해주세요.");
      return { status: "aborted" };
    }

    const mfaResult = await submitMfa(result.cookieHeader, code);
    if (mfaResult.status !== "success") {
      await dm.send(
        mfaResult.status === "invalid_code"
          ? "인증코드가 틀린 것 같아요. 명령어를 다시 실행해주세요."
          : "인증 세션이 잠들어버렸어요. 명령어를 다시 실행해주세요."
      );
      return { status: "aborted" };
    }
    return { status: "success", tokens: mfaResult.tokens, ssid: mfaResult.ssid };
  }

  return { status: "success", tokens: result.tokens, ssid: result.ssid };
}
