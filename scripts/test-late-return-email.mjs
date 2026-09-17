// 기한 초과 반납 이메일 테스트 스크립트
// 실행: node scripts/test-late-return-email.mjs  (받는 주소: TEST_EMAIL_TO, 없으면 GMAIL_USER)

import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local 파싱
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    let val = m[2].trim();
    // 앞뒤 따옴표 제거
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const TEST_TO = process.env.TEST_EMAIL_TO || GMAIL_USER; // .env.local 에 TEST_EMAIL_TO 로 지정 가능

function baseStyle() {
  return `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff`;
}

const returnedAt = new Date().toLocaleString("ko-KR", {
  year: "numeric", month: "long", day: "numeric",
  hour: "2-digit", minute: "2-digit",
});
const dueDateStr = "9월 10일";

const lateNotice = `
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:16px 0">
  <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">
    같은 물품을 기다리는 다른 학우들도 있을 수 있으니,<br>
    다음에는 반납 기한을 맞춰서 반납 부탁드립니다.<br>
    이용해 주셔서 감사합니다.
  </p>
</div>`;

const html = `
<div style="${baseStyle()}">
  <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#86efac;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">반납이 완료되었습니다</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px;font-size:15px;color:#333">
      안녕하세요, <strong>테스터</strong>님.<br>
      물품 반납이 정상적으로 처리되었습니다.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">우산 1개</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 일시</td>
        <td style="padding:10px 0;color:#111">${returnedAt}</td>
      </tr>
    </table>
    ${lateNotice}
    <p style="margin:4px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;

const text = `[반납 완료] 우산 1개\n\n안녕하세요, 테스터님.\n물품 반납이 완료되었습니다.\n\n이번에 반납 기한이 ${dueDateStr}이었는데 조금 늦어졌네요.\n같은 물품을 기다리는 다른 학우들도 있을 수 있으니, 다음에는 반납 기한을 맞춰서 반납 부탁드립니다.\n이용해 주셔서 감사합니다.\n\n반납 일시: ${returnedAt}`;

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

console.log(`발송 중... ${GMAIL_USER} → ${TEST_TO}`);
transport.sendMail({
  from: `"아주대 심리학과 물품 대여" <${GMAIL_USER}>`,
  to: TEST_TO,
  subject: `[반납 완료] 우산 1개 (테스트)`,
  html,
  text,
  headers: {
    "List-Unsubscribe": `<mailto:${GMAIL_USER}?subject=unsubscribe>`,
    "X-Mailer": "ajou-psy-rent",
  },
}).then(() => {
  console.log("✅ 발송 완료!");
}).catch((err) => {
  console.error("❌ 발송 실패:", err.message);
});
