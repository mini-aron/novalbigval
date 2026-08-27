export interface RiotTokens {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export type LoginResult =
  | { status: "success"; tokens: RiotTokens; ssid: string }
  | { status: "mfa_required"; cookieHeader: string; email: string }
  | { status: "invalid_credentials" }
  | { status: "rate_limited" };

export type MfaResult =
  | { status: "success"; tokens: RiotTokens; ssid: string }
  | { status: "invalid_code" }
  | { status: "expired" };

export interface ReauthResult {
  tokens: RiotTokens;
  ssid: string;
}
