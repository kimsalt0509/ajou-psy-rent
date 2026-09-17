# 아주대 심리학과 학생회 · 과방 대여 장부

과방 물품의 남은 수량 확인, 대여·반납 기록(사진 포함), 연체 알림 메일을 제공하는 웹앱입니다.

- **스택**: Next.js 16 (App Router) · React 19 · Tailwind 4 · Firebase (Auth / Firestore / Storage) · Nodemailer(Gmail) · Vercel(Cron)
- **학생**: Google 로그인 → 대여(사진 + 개인정보 동의) → 반납(사진)
- **관리자**: PIN 로그인 → 물품·공지·파비콘 관리, 현황, 창고, 전체 기록(사진)

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 라우트 타입 생성 + TypeScript 검사 |
| `npm test` | 시간/기한 계산 단위 테스트 (Node 22.6+) |
| `node scripts/test-late-return-email.mjs` | 지각 반납 메일 테스트 발송 |

## 환경변수

전체 목록과 설명은 [`.env.example`](.env.example)에 있습니다. 배포 시 **반드시** 설정할 것:

| 변수 | 없으면 |
|---|---|
| `ADMIN_PIN` | 관리자 로그인 불가 (기본값 없음) |
| `CRON_SECRET` | 연체 알림 크론이 실행되지 않음 |
| `FIREBASE_*` | 앱 전체 동작 안 함 |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAIL` | 메일 발송 안 함 |

권장: `ADMIN_SESSION_SECRET`, `RETENTION_DAYS=180`, `NEXT_PUBLIC_CONTACT_*`, (학교 계정 전용으로 전환 시) `ALLOWED_EMAIL_DOMAIN` + `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`

## Firebase 보안 규칙

모든 데이터 접근은 서버 API(Admin SDK)를 거치므로 브라우저 직접 접근은 막아 둡니다.

- Firestore → 규칙: [`firebase/firestore.rules`](firebase/firestore.rules)
- Storage → 규칙: [`firebase/storage.rules`](firebase/storage.rules) — 사진은 관리자만 `/api/photos/…` 로 열람

## 구조

```
app/
  page.tsx            재고 (홈)
  rent/ return/       대여 · 반납
  admin/ status/ storage/ records/   관리자 화면
  api/
    rentals/          POST 대여(로그인) · GET 전체(관리자)
    rentals/[id]/return  반납 (본인 또는 관리자)
    me/               내 대여 목록 + 지난 입력값
    items/ storage/ notice/ favicon/  관리자 CRUD
    storage/[id]/move 창고 → 재고 이동 (트랜잭션)
    photos/[filename] 사진 프록시 (관리자)
    admin/login       PIN 로그인 (서명 쿠키, 15분 5회 제한)
    cron/overdue      매일 09:00 KST 연체 알림 + 보관기간 지난 기록 삭제
lib/
  store.ts            Firestore 접근 (대여·반납·창고 이동은 트랜잭션)
  time.ts             KST 기준 기한 계산·표시 (서버/브라우저 동일 결과)
  admin.ts            관리자 세션 서명·검증, 로그인 시도 제한
  email.ts            메일 템플릿 (사용자 입력은 모두 이스케이프)
  photos.ts           업로드 검증(파일 헤더) · 비공개 저장 · 프록시 읽기
  image-compress.ts   업로드 전 브라우저에서 1600px JPEG로 축소
  validate.ts         서버 입력 검증
```

## 규칙 메모

- **반납 기한**: 대여일(KST) + N일의 **23:59:59**까지. 그 다음날 0시부터 "기한 초과".
- **연체 메일**: 기한 초과 1일차, 3일차, 이후 7일마다 (하루 한 번만).
- **소모품**: 반납 대상이 아니며 대여 수량만큼 재고에서 빠집니다. 채워 넣을 때는 보유 수량을 늘리세요.
