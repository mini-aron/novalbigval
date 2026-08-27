# 대발이 (daebal)

라이엇 계정을 연동해 개인 데일리 상점을 조회하고, 위시리스트에 등록한 스킨이 뜨면 DM으로 알려주는 디스코드 봇.

전적/랭크 조회를 담당하는 자매 봇은 별도인 **노발이**.

설계 배경과 전체 명세는 프로젝트 킥오프 시 정리한 명세 문서를 참고.

## 개발 환경 설정

```bash
npm install
cp .env.example .env   # 값 채우기
npx prisma migrate dev --name init
npm run deploy-commands # DISCORD_DEV_GUILD_ID 설정 시 해당 길드에 즉시 반영
npm run dev
```

## 구조

```
src/
  index.ts            봇 진입점
  deployCommands.ts    슬래시 커맨드 등록 스크립트
  commands/            명령어 핸들러 (/login, /shop, /wishlist ...)
  riot/                Riot 비공식 인증 및 상점 API 클라이언트
  db/                  Prisma 클라이언트, 암호화 유틸
  scheduler/           계정별 상점 리셋 타이머 및 위시리스트 체크
```

## 보안 원칙

- 비밀번호는 인증 단계에서만 사용하고 저장하지 않는다.
- 재인증용 세션 쿠키만 AES-256-GCM으로 암호화해 DB에 저장한다.
- 로그인 입력은 DM에서만 받는다.
