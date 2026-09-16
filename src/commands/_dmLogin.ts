import type { DMChannel } from "discord.js";
import { LINK_LOGIN_NO_SESSION, buildLinkLoginUrl, login, parseTokensFromUri, submitMfa } from "../riot/authClient.js";
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

// 캡차·모바일 푸시 보호가 걸린 계정은 아이디/비번을 직접 넣어도 항상
// invalid_credentials로 막힌다 (비밀번호가 맞아도 그렇다). 이런 계정을 위한 대체
// 경로: 사용자를 Riot의 실제 RSO 로그인 페이지로 보내서 캡차/2FA/모바일 승인을
// 본인이 직접 처리하게 하고, 도착한 리다이렉트 URL에서 토큰만 파싱한다.
// 대가로 ssid(HttpOnly 쿠키)는 못 얻으므로 무음 재인증(자동 알림)은 지원되지 않는다
// — LINK_LOGIN_NO_SESSION을 저장해두면 다음 재인증 시도 때 자연스럽게
// SessionExpiredError로 이어져 재로그인을 안내하게 된다.
async function runLinkFallback(dm: DMChannel, userId: string): Promise<DmLoginOutcome> {
  const redirectedUrl = await ask(
    dm,
    userId,
    [
      "어머, 아이디나 비밀번호가 틀린 것 같아요.",
      "계정은 맞는데 안 된다면, 이 링크로 직접 로그인해보시겠어요? (riotgames.com 진짜 링크예요)",
      buildLinkLoginUrl(),
      "",
      "로그인하시면 하얀 빈 화면으로 넘어가는데, 그때 브라우저 주소창에 있는 URL 전체를 복사해서 여기 붙여넣어주세요.",
      "(캡차나 추가 인증이 뜨면 그 화면에서 직접 처리해주시면 돼요)",
      "",
      "⚠️ 이 방법으로 이으면, 상점을 볼 때마다 이 절차를 다시 밟아야 해요 — 자동 알림은 안 걸려요.",
    ].join("\n"),
    300_000
  );
  if (!redirectedUrl) {
    await dm.send("너무 오래 기다렸더니 깜빡 잠들 뻔했어요. 명령어부터 다시 실행해주세요.");
    return { status: "aborted" };
  }

  try {
    const tokens = parseTokensFromUri(redirectedUrl.trim());
    return { status: "success", tokens, ssid: LINK_LOGIN_NO_SESSION };
  } catch {
    await dm.send(
      "어머, 그 주소에서 로그인 정보를 못 찾겠어요. 링크로 다시 로그인해서 도착한 화면의 주소창 URL을 통째로 복사해주세요."
    );
    return { status: "aborted" };
  }
}

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
    return runLinkFallback(dm, userId);
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
