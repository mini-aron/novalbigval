# 세이지곤듀 (sage-gondyu)

세이지 공주님 컨셉의 발로란트 디스코드 봇. 기능은 두 갈래지만 말하는 인격은 하나(세이지곤듀)다.

- **개인 상점** — 라이엇 계정을 연동해 개인 데일리 상점을 조회하고, 위시리스트에 등록한 스킨이 뜨면 DM으로 알려준다. (`/login`, `/shop`, `/wishlist`)
- **전적/랭크 조회** — 닉네임#태그만으로 아무 플레이어의 랭크/최근 전적을 조회한다. (`/rank`, `/matches`) 로그인 불필요 — 운영자가 등록해둔 공용 계정 세션으로 대신 조회한다.

설계 배경과 전체 명세는 프로젝트 킥오프 시 정리한 명세 문서를 참고.

## 개발 환경 설정

```bash
npm install
cp .env.example .env   # 값 채우기 (DISCORD_TOKEN, TOKEN_ENCRYPTION_KEY, RIOT_API_KEY 등)
npx prisma migrate dev
npm run deploy-commands # DISCORD_DEV_GUILD_ID 설정 시 해당 길드에 즉시 반영
npm run dev
```

전적 조회를 쓰려면 봇 운영자가 한 번 `/servicelogin`(관리자 전용)으로 조회용 라이엇 계정을 등록해야 한다. 개인 상점 조회는 유저 각자 `/login`으로 자기 계정을 연동한다.

## 구조

```
src/
  index.ts            봇 진입점
  deployCommands.ts    슬래시 커맨드 등록 스크립트
  commands/            명령어 핸들러
    login/logout/accounts/shop/wishlist   개인 상점
    servicelogin/rank/matches             전적/랭크 조회
    princess                              세이지 공주님을 모시는 방법 (플레이버)
  riot/                Riot 인증(비공식) + 상점/전적 API 클라이언트, 공식 account-v1 조회
  db/                  Prisma 클라이언트, 암호화 유틸
  services/            DB ↔ Riot API를 잇는 서비스 레이어
  scheduler/           계정별 상점 리셋 타이머 및 위시리스트 체크
```

## 보안 원칙

- 비밀번호는 인증 단계에서만 사용하고 저장하지 않는다.
- 재인증용 세션 쿠키만 AES-256-GCM으로 암호화해 DB에 저장한다.
- 로그인 입력은 DM에서만 받는다.
- 전적 조회는 공개 정보이므로 유저 로그인 없이, 운영자가 등록한 별도 서비스 계정(ServiceAccount) 세션으로만 조회한다 — 다른 사람 계정 정보를 요구하지 않는다.

## 알려진 제약

- `RIOT_API_KEY`(개인 개발자 키)는 24시간마다 재발급이 필요하다. 서비스로 계속 운영하려면 Riot 프로덕션 키 신청을 고려해야 한다.
- `mmr/v1`, `match-history/v1`, `match-details/v1`, `store/v3`는 전부 Riot이 공식 문서화하지 않은 클라이언트 전용 엔드포인트라, 응답 필드가 바뀌면 해당 파일(`src/riot/*.ts`)만 고치면 되도록 구조를 분리해뒀다.
