import nodemailer from "nodemailer";

const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const FROM = `"아주대 심리학과 학생회 대여" <${process.env.GMAIL_USER}>`;

// 수신자별 개별 발송 (Gmail 대량 수신 제한 방지)
async function sendMail(recipients: string[], subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transport = createTransport();
  for (const to of recipients) {
    await transport.sendMail({ from: FROM, to, subject, html });
  }
}

function baseStyle() {
  return `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff`;
}

// ─── 대여 알림 ────────────────────────────────────────────────────────────────
export async function sendRentNotification(data: {
  studentName: string;
  studentId: string;
  phone: string;
  itemName: string;
  quantity: number;
  dueDate: string | null;
  rentedAt: string;
}) {
  if (!ADMIN_EMAILS.length) return;

  const due = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "기한 없음";

  const rentedAt = new Date(data.rentedAt).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const html = `
<div style="${baseStyle()}">
  <div style="background:#1a1a1a;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#aaa;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">📦 대여 접수 알림</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 20px;font-size:15px;color:#333">
      새 대여가 접수되었습니다. 아래 내용을 확인해 주세요.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">${data.itemName} ${data.quantity}개</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">이름</td>
        <td style="padding:10px 0;color:#111">${data.studentName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">학번</td>
        <td style="padding:10px 0;color:#111">${data.studentId}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">전화번호</td>
        <td style="padding:10px 0;color:#111">${data.phone}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">대여 일시</td>
        <td style="padding:10px 0;color:#111">${rentedAt}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 기한</td>
        <td style="padding:10px 0;font-weight:600;color:${data.dueDate ? "#2563eb" : "#888"}">${due}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;

  await sendMail(
    ADMIN_EMAILS,
    `📦 대여 | ${data.studentName} — ${data.itemName} ${data.quantity}개`,
    html,
  );
}

// ─── 반납 알림 ────────────────────────────────────────────────────────────────
export async function sendReturnNotification(data: {
  studentName: string;
  studentId: string;
  itemName: string;
  quantity: number;
  returnedAt: string;
}) {
  if (!ADMIN_EMAILS.length) return;

  const returnedAt = new Date(data.returnedAt).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const html = `
<div style="${baseStyle()}">
  <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#86efac;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">✅ 반납 완료 알림</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 20px;font-size:15px;color:#333">
      반납이 정상적으로 처리되었습니다.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">${data.itemName} ${data.quantity}개</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">이름</td>
        <td style="padding:10px 0;color:#111">${data.studentName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">학번</td>
        <td style="padding:10px 0;color:#111">${data.studentId}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 일시</td>
        <td style="padding:10px 0;color:#111">${returnedAt}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;

  await sendMail(
    ADMIN_EMAILS,
    `✅ 반납 | ${data.studentName} — ${data.itemName} ${data.quantity}개`,
    html,
  );
}

// ─── 반납 기한 초과 알림 ──────────────────────────────────────────────────────
export async function sendOverdueNotification(data: {
  studentName: string;
  studentId: string;
  studentEmail: string | null;
  itemName: string;
  quantity: number;
  dueDate: string;
  daysPast: number;
}) {
  const recipients = [...ADMIN_EMAILS];
  if (data.studentEmail && !recipients.includes(data.studentEmail)) {
    recipients.push(data.studentEmail);
  }
  if (!recipients.length) return;

  const dueDate = new Date(data.dueDate).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  const html = `
<div style="${baseStyle()}">
  <div style="background:#991b1b;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#fca5a5;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">⚠️ 반납 기한 초과 알림</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <div style="background:#fff7f7;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:20px">
      <p style="margin:0;font-size:15px;color:#991b1b;font-weight:600">
        반납 기한으로부터 <strong>${data.daysPast}일</strong>이 경과했습니다.
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#b91c1c">
        빠른 시일 내에 반납해 주시기 바랍니다.
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">${data.itemName} ${data.quantity}개</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">이름</td>
        <td style="padding:10px 0;color:#111">${data.studentName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888">학번</td>
        <td style="padding:10px 0;color:#111">${data.studentId}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 기한</td>
        <td style="padding:10px 0;font-weight:700;color:#dc2626">${dueDate} 초과</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;

  await sendMail(
    recipients,
    `⚠️ 반납 기한 초과 | ${data.studentName} — ${data.itemName} (${data.daysPast}일 경과)`,
    html,
  );
}
