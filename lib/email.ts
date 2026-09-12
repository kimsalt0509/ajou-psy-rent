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

const FROM = `"아주대 심리학과 학생회" <${process.env.GMAIL_USER}>`;

// 수신자별 개별 발송 (Gmail 대량 수신 제한 방지)
async function sendMail(recipients: string[], subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transport = createTransport();
  for (const to of recipients) {
    await transport.sendMail({ from: FROM, to, subject, html });
  }
}

// ─── 대여 알림 (관리자 전원에게) ──────────────────────────────────────────────
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
    ? new Date(data.dueDate).toLocaleString("ko-KR", { month: "long", day: "numeric" })
    : "기한 없음";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111">📦 새 대여가 접수됐습니다</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#666;width:90px">이름</td><td style="padding:8px 0;font-weight:600">${data.studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">학번</td><td style="padding:8px 0">${data.studentId}</td></tr>
        <tr><td style="padding:8px 0;color:#666">전화번호</td><td style="padding:8px 0">${data.phone}</td></tr>
        <tr><td style="padding:8px 0;color:#666">물품</td><td style="padding:8px 0;font-weight:600">${data.itemName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">수량</td><td style="padding:8px 0">${data.quantity}개</td></tr>
        <tr><td style="padding:8px 0;color:#666">반납 기한</td><td style="padding:8px 0">${due}</td></tr>
        <tr><td style="padding:8px 0;color:#666">대여 시각</td><td style="padding:8px 0">${new Date(data.rentedAt).toLocaleString("ko-KR")}</td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#999">아주대 심리학과 학생회 대여 시스템</p>
    </div>
  `;

  await sendMail(
    ADMIN_EMAILS,
    `📦 [대여] ${data.studentName}(${data.studentId}) — ${data.itemName} ${data.quantity}개`,
    html,
  );
}

// ─── 반납 알림 (관리자 전원에게) ──────────────────────────────────────────────
export async function sendReturnNotification(data: {
  studentName: string;
  studentId: string;
  itemName: string;
  quantity: number;
  returnedAt: string;
}) {
  if (!ADMIN_EMAILS.length) return;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111">✅ 반납이 완료됐습니다</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#666;width:90px">이름</td><td style="padding:8px 0;font-weight:600">${data.studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">학번</td><td style="padding:8px 0">${data.studentId}</td></tr>
        <tr><td style="padding:8px 0;color:#666">물품</td><td style="padding:8px 0;font-weight:600">${data.itemName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">수량</td><td style="padding:8px 0">${data.quantity}개</td></tr>
        <tr><td style="padding:8px 0;color:#666">반납 시각</td><td style="padding:8px 0">${new Date(data.returnedAt).toLocaleString("ko-KR")}</td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#999">아주대 심리학과 학생회 대여 시스템</p>
    </div>
  `;

  await sendMail(
    ADMIN_EMAILS,
    `✅ [반납] ${data.studentName}(${data.studentId}) — ${data.itemName} ${data.quantity}개`,
    html,
  );
}

// ─── 기한 초과 알림 (관리자 전원 + 대여자 본인) ───────────────────────────────
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

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#dc2626">⚠️ 반납 기한이 지났습니다</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#555">
        반납 기한이 <strong>${data.daysPast}일</strong> 지났습니다. 빠른 시일 내에 반납 부탁드립니다.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#666;width:90px">이름</td><td style="padding:8px 0;font-weight:600">${data.studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">학번</td><td style="padding:8px 0">${data.studentId}</td></tr>
        <tr><td style="padding:8px 0;color:#666">물품</td><td style="padding:8px 0;font-weight:600">${data.itemName}</td></tr>
        <tr><td style="padding:8px 0;color:#666">수량</td><td style="padding:8px 0">${data.quantity}개</td></tr>
        <tr><td style="padding:8px 0;color:#dc2626">반납 기한</td><td style="padding:8px 0;color:#dc2626;font-weight:600">${new Date(data.dueDate).toLocaleDateString("ko-KR")}</td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#999">아주대 심리학과 학생회 대여 시스템</p>
    </div>
  `;

  await sendMail(
    recipients,
    `⚠️ [반납 기한 초과] ${data.studentName}(${data.studentId}) — ${data.itemName} (${data.daysPast}일 경과)`,
    html,
  );
}
