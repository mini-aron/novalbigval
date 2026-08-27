import { CookieJar } from "./cookieJar.js";
import type { LoginResult, MfaResult, ReauthResult, RiotTokens } from "./types.js";

const AUTH_BASE = "https://auth.riotgames.com";
const CLIENT_ID = "play-valorant-web-prod";
const REDIRECT_URI = "https://playvalorant.com/opt_in";

function parseTokensFromUri(uri: string): RiotTokens {
  const fragment = uri.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  if (!accessToken || !idToken) {
    throw new Error("토큰 URI 파싱 실패: access_token 또는 id_token이 없습니다.");
  }
  return { accessToken, idToken, expiresIn };
}

async function initSession(jar: CookieJar): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/api/v1/authorization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      nonce: "1",
      redirect_uri: REDIRECT_URI,
      response_type: "token id_token",
      scope: "account openid",
    }),
  });
  jar.updateFromResponse(response);
}

// 1단계 로그인. 2FA가 걸려있으면 mfa_required를 반환하고, 이후 submitMfa()로 이어간다.
export async function login(username: string, password: string): Promise<LoginResult> {
  const jar = new CookieJar();
  await initSession(jar);

  const response = await fetch(`${AUTH_BASE}/api/v1/authorization`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: jar.toHeader(),
    },
    body: JSON.stringify({
      type: "auth",
      username,
      password,
      remember: true,
      language: "en_US",
    }),
  });
  jar.updateFromResponse(response);

  if (response.status === 429) {
    return { status: "rate_limited" };
  }

  const body = (await response.json()) as any;

  if (body.type === "response") {
    const tokens = parseTokensFromUri(body.response.parameters.uri);
    const ssid = jar.get("ssid");
    if (!ssid) throw new Error("로그인 성공했지만 ssid 쿠키를 찾지 못했습니다.");
    return { status: "success", tokens, ssid };
  }

  if (body.type === "multifactor") {
    return {
      status: "mfa_required",
      cookieHeader: jar.toHeader(),
      email: body.multifactor?.email ?? "",
    };
  }

  return { status: "invalid_credentials" };
}

// 2단계: 이메일로 온 코드 제출. cookieHeader는 login()의 mfa_required 응답에서 그대로 전달받는다.
export async function submitMfa(cookieHeader: string, code: string): Promise<MfaResult> {
  const jar = new CookieJar();
  const response = await fetch(`${AUTH_BASE}/api/v1/authorization`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ type: "multifactor", code, rememberDevice: true }),
  });
  jar.updateFromResponse(response);

  if (response.status === 429) {
    return { status: "expired" };
  }

  const body = (await response.json()) as any;

  if (body.type === "response") {
    const tokens = parseTokensFromUri(body.response.parameters.uri);
    const ssid = jar.get("ssid");
    if (!ssid) throw new Error("MFA 성공했지만 ssid 쿠키를 찾지 못했습니다.");
    return { status: "success", tokens, ssid };
  }

  if (body.error === "multifactor_attempt_failed" || body.type === "multifactor") {
    return { status: "invalid_code" };
  }

  return { status: "expired" };
}

// 저장된 ssid 쿠키로 무음 재인증. 비밀번호 재입력 없이 토큰을 갱신한다.
export async function reauthenticate(ssid: string): Promise<ReauthResult> {
  const params = new URLSearchParams({
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    response_type: "token id_token",
    scope: "account openid",
    nonce: "1",
  });

  const response = await fetch(`${AUTH_BASE}/authorize?${params.toString()}`, {
    headers: { Cookie: `ssid=${ssid}` },
    redirect: "manual",
  });

  const location = response.headers.get("location");
  if (!location || !location.includes("access_token")) {
    throw new Error("REAUTH_FAILED");
  }

  const jar = new CookieJar();
  jar.updateFromResponse(response);
  const newSsid = jar.get("ssid") ?? ssid;

  return { tokens: parseTokensFromUri(location), ssid: newSsid };
}
