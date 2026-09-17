import nodemailer, { type Transporter } from "nodemailer";
import { CONTACT, SERVICE_NAME } from "./config";
import { formatKST, isOverdue } from "./time";

const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

// ─── 전송 ────────────────────────────────────────────────────────────────────

let transport: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  transport ??= nodemailer.createTransport({
    service: "gmail",
    pool: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transport;
}

/** 수신자별 개별 발송 (다른 수신자 주소 노출·대량 수신 제한 방지). 한 명 실패해도 계속 */
async function sendMail(recipients: string[], subject: string, html: string, text: string) {
  const t = getTransport();
  if (!t || recipients.length === 0) return;
  const results = await Promise.allSettled(
    recipients.map((to) =>
      t.sendMail({
        from: `"아주대 심리학과 물품 대여" <${process.env.GMAIL_USER}>`,
        to,
        subject: oneLine(subject),
        html,
        text,
        headers: {
          "List-Unsubscribe": `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
          "X-Mailer": "ajou-psy-rent",
        },
      }),
    ),
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[email] ${recipients[i]} 발송 실패:`, r.reason);
  });
}

// ─── 템플릿 ──────────────────────────────────────────────────────────────────

/** HTML에 사용자 입력을 넣기 전 반드시 이스케이프 (메일 내 HTML 주입 방지) */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

type Tone = "neutral" | "success" | "danger";
const TONES: Record<Tone, { bg: string; sub: string }> = {
  neutral: { bg: "#1a1a1a", sub: "#aaaaaa" },
  success: { bg: "#166534", sub: "#86efac" },
  danger: { bg: "#991b1b", sub: "#fca5a5" },
};

type Row = { label: string; value: string; strong?: boolean; color?: string };
type Box = { html: string; bg: string; border: string };

/** 모든 인자는 이미 이스케이프된 HTML 조각이어야 합니다. */
function renderMail(opts: {
  tone: Tone;
  title: string;
  intro?: string;
  highlight?: { label: string; title: string; sub: string };
  alert?: Box;
  rows: Row[];
  after?: Box;
  showContact?: boolean;
}) {
  const t = TONES[opts.tone];
  const box = (b: Box, margin: string) =>
    `<div style="background:${b.bg};border:1px solid ${b.border};border-radius:10px;padding:14px 16px;margin:${margin}">${b.html}</div>`;
  const rows = opts.rows
    .map(
      (r, i) => `
      <tr${i < opts.rows.length - 1 ? ' style="border-bottom:1px solid #f0f0f0"' : ""}>
        <td style="padding:10px 0;color:#888;width:100px">${r.label}</td>
        <td style="padding:10px 0;color:${r.color ?? "#111"}${r.strong ? ";font-weight:700" : ""}">${r.value}</td>
      </tr>`,
    )
    .join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff">
  <div style="background:${t.bg};padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:${t.sub};letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">${opts.title}</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    ${opts.alert ? box(opts.alert, "0 0 16px") : ""}
    ${opts.intro ? `<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6">${opts.intro}</p>` : ""}
    ${
      opts.highlight
        ? `<div style="background:#f8f8f8;border-radius:10px;padding:16px 20px;margin-bottom:16px;text-align:center">
      <p style="margin:0;font-size:13px;color:#888">${opts.highlight.label}</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111">${opts.highlight.title}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#555">${opts.highlight.sub}</p>
    </div>`
        : ""
    }
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    ${opts.after ? box(opts.after, "16px 0 0") : ""}
    ${
      opts.showContact
        ? `<p style="margin:20px 0 0;font-size:13px;color:#555">문제 발생 시 연락처: ${esc(CONTACT.label)} ${esc(CONTACT.phone)}</p>`
        : ""
    }
    <p style="margin:20px 0 0;font-size:12px;color:#bbb;text-align:center">${esc(SERVICE_NAME)}</p>
  </div>
</div>`;
}

const contactText = () => `\n\n문제 발생 시 연락처: ${CONTACT.label} ${CONTACT.phone}`;

type Base = {
  studentName: string;
  studentId: string;
  itemName: string;
  quantity: number;
  studentEmail?: string | null;
};

// ─── 대여 알림 ────────────────────────────────────────────────────────────────

export async function sendRentNotification(
  data: Base & { phone: string; dueDate: string | null; rentedAt: string },
) {
  const name = esc(data.studentName);
  const item = `${esc(data.itemName)} ${data.quantity}개`;
  const due = data.dueDate ? formatKST(data.dueDate, "date") : "기한 없음";
  const dueColor = data.dueDate ? "#2563eb" : "#888";
  const rentedAt = formatKST(data.rentedAt, "datetime");

  const tasks: Promise<void>[] = [];

  if (ADMIN_EMAILS.length) {
    tasks.push(
      sendMail(
        ADMIN_EMAILS,
        `[대여] ${data.studentName} - ${data.itemName} ${data.quantity}개`,
        renderMail({
          tone: "neutral",
          title: `${name}이(가) 대여했습니다`,
          intro: `<strong>${name}</strong>이(가) <strong>${item}</strong>를 대여했습니다.`,
          rows: [
            { label: "물품", value: item, strong: true },
            { label: "이름", value: name },
            { label: "학번", value: esc(data.studentId) },
            { label: "전화번호", value: esc(data.phone) },
            { label: "대여 일시", value: rentedAt },
            { label: "반납 기한", value: due, strong: true, color: dueColor },
          ],
        }),
        `[대여 접수] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n전화: ${data.phone}\n대여일시: ${rentedAt}\n반납기한: ${due}`,
      ),
    );
  }

  if (data.studentEmail && !isAdminEmail(data.studentEmail)) {
    tasks.push(
      sendMail(
        [data.studentEmail],
        `[대여 완료] ${data.itemName} ${data.quantity}개 (반납 기한: ${due})`,
        renderMail({
          tone: "neutral",
          title: "대여 접수 확인",
          intro: `안녕하세요, <strong>${name}</strong>님.<br>아래 물품 대여가 정상적으로 접수되었습니다.`,
          highlight: { label: "대여 물품", title: esc(data.itemName), sub: `${data.quantity}개` },
          rows: [
            { label: "반납 기한", value: due, strong: true, color: dueColor },
            { label: "대여 일시", value: formatKST(data.rentedAt, "short"), color: "#555" },
          ],
          showContact: true,
        }),
        `[대여 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 대여가 정상적으로 접수되었습니다.\n\n반납 기한: ${due}\n대여 일시: ${rentedAt}${contactText()}`,
      ),
    );
  }

  await Promise.all(tasks);
}

// ─── 반납 알림 ────────────────────────────────────────────────────────────────

export async function sendReturnNotification(
  data: Base & { returnedAt: string; dueDate?: string | null },
) {
  const name = esc(data.studentName);
  const item = `${esc(data.itemName)} ${data.quantity}개`;
  const returnedAt = formatKST(data.returnedAt, "datetime");
  const isLate = isOverdue(data.dueDate, data.returnedAt);
  const dueStr = data.dueDate ? formatKST(data.dueDate, "date") : "";

  const tasks: Promise<void>[] = [];

  if (ADMIN_EMAILS.length) {
    tasks.push(
      sendMail(
        ADMIN_EMAILS,
        `[반납] ${data.studentName} - ${data.itemName} ${data.quantity}개`,
        renderMail({
          tone: "success",
          title: `${name}이(가) 반납했습니다`,
          alert: isLate
            ? {
                bg: "#fff7f7",
                border: "#fecaca",
                html: `<p style="margin:0;font-size:13px;color:#991b1b;font-weight:600">반납 기한(${dueStr}) 이후 반납되었습니다.</p>`,
              }
            : undefined,
          intro: `<strong>${name}</strong>이(가) <strong>${item}</strong>를 반납했습니다.`,
          rows: [
            { label: "물품", value: item, strong: true },
            { label: "이름", value: name },
            { label: "학번", value: esc(data.studentId) },
            { label: "반납 일시", value: returnedAt },
          ],
        }),
        `[반납 완료] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n반납일시: ${returnedAt}${isLate ? `\n※ 반납 기한(${dueStr}) 이후 반납되었습니다.` : ""}`,
      ),
    );
  }

  if (data.studentEmail && !isAdminEmail(data.studentEmail)) {
    const lateMsg =
      "같은 물품을 기다리는 다른 학우들도 있을 수 있으니,<br>다음에는 반납 기한을 맞춰서 반납 부탁드립니다.<br>이용해 주셔서 감사합니다.";
    tasks.push(
      sendMail(
        [data.studentEmail],
        `[반납 완료] ${data.itemName} ${data.quantity}개`,
        renderMail({
          tone: "success",
          title: "반납이 완료되었습니다",
          intro: `안녕하세요, <strong>${name}</strong>님.<br>아래 물품 반납이 정상적으로 처리되었습니다.`,
          highlight: { label: "반납 물품", title: esc(data.itemName), sub: `${data.quantity}개` },
          rows: [{ label: "반납 일시", value: returnedAt, color: "#555" }],
          after: isLate
            ? {
                bg: "#fffbeb",
                border: "#fde68a",
                html: `<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">${lateMsg}</p>`,
              }
            : undefined,
        }),
        isLate
          ? `[반납 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 반납이 완료되었습니다.\n\n${lateMsg.replace(/<br>/g, " ")}\n\n반납 일시: ${returnedAt}`
          : `[반납 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 반납이 정상적으로 처리되었습니다. 감사합니다!\n\n반납 일시: ${returnedAt}`,
      ),
    );
  }

  await Promise.all(tasks);
}

// ─── 반납 기한 초과 알림 ──────────────────────────────────────────────────────

export async function sendOverdueNotification(
  data: Base & { studentEmail: string | null; phone: string; dueDate: string; daysPast: number },
) {
  const name = esc(data.studentName);
  const item = `${esc(data.itemName)} ${data.quantity}개`;
  const due = formatKST(data.dueDate, "date");
  const d = data.daysPast;

  const tasks: Promise<void>[] = [];

  if (ADMIN_EMAILS.length) {
    tasks.push(
      sendMail(
        ADMIN_EMAILS,
        `[반납 기한 초과] ${data.studentName} - ${data.itemName} (${d}일 경과)`,
        renderMail({
          tone: "danger",
          title: "반납 기한 초과 알림",
          alert: {
            bg: "#fff7f7",
            border: "#fecaca",
            html: `<p style="margin:0;font-size:15px;color:#991b1b;font-weight:600">반납 기한으로부터 <strong>${d}일</strong>이 경과했습니다.</p>
      <p style="margin:6px 0 0;font-size:13px;color:#b91c1c">연락하여 반납을 요청해 주세요.</p>`,
          },
          rows: [
            { label: "물품", value: item, strong: true },
            { label: "이름", value: name },
            { label: "학번", value: esc(data.studentId) },
            { label: "전화번호", value: esc(data.phone) },
            { label: "반납 기한", value: `${due} 초과`, strong: true, color: "#dc2626" },
          ],
        }),
        `[반납 기한 초과] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n전화: ${data.phone}\n반납기한: ${due} (${d}일 경과)`,
      ),
    );
  }

  if (data.studentEmail) {
    tasks.push(
      sendMail(
        [data.studentEmail],
        `[반납 요청] ${data.itemName} 반납 기한이 ${d}일 지났습니다`,
        renderMail({
          tone: "danger",
          title: "반납 기한이 지났습니다",
          intro: `안녕하세요, <strong>${name}</strong>님.<br>대여하신 물품의 반납 기한이 <strong>${d}일</strong> 지났습니다.<br>빠른 시일 내에 반납해 주시기 바랍니다.`,
          rows: [
            { label: "물품", value: item, strong: true },
            { label: "반납 기한", value: due, strong: true, color: "#dc2626" },
          ],
          showContact: true,
        }),
        `[반납 요청] ${data.itemName} 반납 기한이 ${d}일 지났습니다\n\n안녕하세요, ${data.studentName}님.\n대여하신 물품의 반납 기한이 ${d}일 지났습니다.\n빠른 시일 내에 반납해 주시기 바랍니다.\n\n물품: ${data.itemName} ${data.quantity}개\n반납 기한: ${due}${contactText()}`,
      ),
    );
  }

  await Promise.all(tasks);
}
