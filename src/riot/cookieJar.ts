// fetch()는 브라우저처럼 쿠키를 자동으로 들고 다니지 않으므로,
// Riot 인증 흐름(여러 요청에 걸쳐 세션 쿠키를 유지해야 함)을 위해 직접 관리한다.
export class CookieJar {
  private cookies = new Map<string, string>();

  updateFromResponse(response: Response): void {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) continue;
      const name = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();
      this.cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  set(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  toHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}
