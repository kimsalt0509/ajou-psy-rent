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

const FROM = `"아주대 심리학과 물품 대여" <${process.env.GMAIL_USER}>`;

// 수신자별 개별 발송 (Gmail 대량 수신 제한 방지)
async function sendMail(
  recipients: string[],
  subject: string,
  html: string,
  text: string,
) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transport = createTransport();
  for (const to of recipients) {
    await transport.sendMail({
      from: FROM,
      to,
      subject,
      html,
      text,
      // 스팸 필터 개선: 수신 거부 헤더 명시
      headers: {
        "List-Unsubscribe": `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
        "X-Mailer": "ajou-psy-rent",
      },
    });
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
  studentEmail?: string | null;
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
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">대여 접수 알림</h1>
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

  const text = `[대여 접수] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n전화: ${data.phone}\n대여일시: ${rentedAt}\n반납기한: ${due}`;

  await sendMail(
    ADMIN_EMAILS,
    `[대여] ${data.studentName} - ${data.itemName} ${data.quantity}개`,
    html,
    text,
  );

  // 대여자 본인에게 확인 메일 (관리자 목록에 없는 경우)
  if (data.studentEmail && !ADMIN_EMAILS.includes(data.studentEmail)) {
    const studentHtml = `
<div style="${baseStyle()}">
  <div style="background:#1a1a1a;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#aaa;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">대여 접수 확인</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px;font-size:15px;color:#333">
      안녕하세요, <strong>${data.studentName}</strong>님.<br>
      아래 물품 대여가 정상적으로 접수되었습니다.
    </p>
    <div style="background:#f8f8f8;border-radius:10px;padding:16px 20px;margin-bottom:16px;text-align:center">
      <p style="margin:0;font-size:13px;color:#888">대여 물품</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111">${data.itemName}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#555">${data.quantity}개</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:90px">반납 기한</td>
        <td style="padding:10px 0;font-weight:600;color:${data.dueDate ? "#2563eb" : "#888"}">${due}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">대여 일시</td>
        <td style="padding:10px 0;color:#555">${new Date(data.rentedAt).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#555">
      반납 문의: 심리학과 부학생회장 김가람 010-6409-3370
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;
    const studentText = `[대여 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 대여가 정상적으로 접수되었습니다.\n\n반납 기한: ${due}\n대여 일시: ${rentedAt}\n\n반납 문의: 김가람 010-6409-3370`;
    await sendMail(
      [data.studentEmail],
      `[대여 완료] ${data.itemName} ${data.quantity}개 (반납 기한: ${due})`,
      studentHtml,
      studentText,
    );
  }
}

// ─── 반납 알림 ────────────────────────────────────────────────────────────────
export async function sendReturnNotification(data: {
  studentName: string;
  studentId: string;
  itemName: string;
  quantity: number;
  returnedAt: string;
  dueDate?: string | null;
  studentEmail?: string | null;
}) {
  if (!ADMIN_EMAILS.length) return;

  const returnedAt = new Date(data.returnedAt).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // 기한 초과 여부 계산
  const isLate = (() => {
    if (!data.dueDate) return false;
    const grace = new Date(data.dueDate);
    grace.setDate(grace.getDate() + 1);
    grace.setHours(0, 0, 0, 0);
    return new Date(data.returnedAt) >= grace;
  })();

  const dueDateStr = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : null;

  const html = `
<div style="${baseStyle()}">
  <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#86efac;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">반납 완료 알림</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    ${isLate ? `<div style="background:#fff7f7;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:20px"><p style="margin:0;font-size:13px;color:#991b1b;font-weight:600">반납 기한(${dueDateStr}) 이후 반납되었습니다.</p></div>` : ""}
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

  const text = `[반납 완료] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n반납일시: ${returnedAt}${isLate ? `\n※ 반납 기한(${dueDateStr}) 이후 반납되었습니다.` : ""}`;

  await sendMail(
    ADMIN_EMAILS,
    `[반납] ${data.studentName} - ${data.itemName} ${data.quantity}개`,
    html,
    text,
  );

  // 대여자 본인에게 확인 메일
  if (data.studentEmail && !ADMIN_EMAILS.includes(data.studentEmail)) {
    // 기한 초과 시 따뜻한 안내 문구
    const lateNotice = isLate ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">
        같은 물품을 기다리는 다른 학우들도 있을 수 있으니,<br>
        다음에는 반납 기한을 맞춰서 반납 부탁드립니다.<br>
        이용해 주셔서 감사합니다.
      </p>
    </div>` : "";

    const studentHtml = `
<div style="${baseStyle()}">
  <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#86efac;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">반납이 완료되었습니다</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px;font-size:15px;color:#333">
      안녕하세요, <strong>${data.studentName}</strong>님.<br>
      물품 반납이 정상적으로 처리되었습니다.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">${data.itemName} ${data.quantity}개</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 일시</td>
        <td style="padding:10px 0;color:#111">${returnedAt}</td>
      </tr>
    </table>
    ${lateNotice}
    <p style="margin:${isLate ? "4px" : "20px"} 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;
    const studentText = isLate
      ? `[반납 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 반납이 완료되었습니다.\n\n같은 물품을 기다리는 다른 학우들도 있을 수 있으니, 다음에는 반납 기한을 맞춰서 반납 부탁드립니다.\n이용해 주셔서 감사합니다.\n\n반납 일시: ${returnedAt}`
      : `[반납 완료] ${data.itemName} ${data.quantity}개\n\n안녕하세요, ${data.studentName}님.\n물품 반납이 정상적으로 처리되었습니다. 감사합니다!\n\n반납 일시: ${returnedAt}`;
    await sendMail(
      [data.studentEmail],
      `[반납 완료] ${data.itemName} ${data.quantity}개`,
      studentHtml,
      studentText,
    );
  }
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
  if (!ADMIN_EMAILS.length && !data.studentEmail) return;

  const dueDate = new Date(data.dueDate).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  const adminSubject = `[반납 기한 초과] ${data.studentName} - ${data.itemName} (${data.daysPast}일 경과)`;
  const studentSubject = `[반납 요청] ${data.itemName} 반납 기한이 ${data.daysPast}일 지났습니다`;

  // 관리자용 메일 (학생 정보 포함)
  const adminHtml = `
<div style="${baseStyle()}">
  <div style="background:#991b1b;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#fca5a5;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">반납 기한 초과 알림</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <div style="background:#fff7f7;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:20px">
      <p style="margin:0;font-size:15px;color:#991b1b;font-weight:600">
        반납 기한으로부터 <strong>${data.daysPast}일</strong>이 경과했습니다.
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#b91c1c">연락하여 반납을 요청해 주세요.</p>
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

  const adminText = `[반납 기한 초과] ${data.itemName} ${data.quantity}개\n이름: ${data.studentName}\n학번: ${data.studentId}\n반납기한: ${dueDate} (${data.daysPast}일 경과)`;

  // 대여자용 메일 (학생 본인에게 - 간결하고 친절한 안내)
  const studentHtml = `
<div style="${baseStyle()}">
  <div style="background:#991b1b;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:13px;color:#fca5a5;letter-spacing:1px">아주대 심리학과 학생회</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff">반납 기한이 지났습니다</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px;font-size:15px;color:#333">
      안녕하세요, <strong>${data.studentName}</strong>님.<br>
      대여하신 물품의 반납 기한이 <strong>${data.daysPast}일</strong> 지났습니다.<br>
      빠른 시일 내에 반납해 주시기 바랍니다.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:100px">물품</td>
        <td style="padding:10px 0;font-weight:700;color:#111">${data.itemName} ${data.quantity}개</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888">반납 기한</td>
        <td style="padding:10px 0;font-weight:700;color:#dc2626">${dueDate}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#555">
      반납 문의: 심리학과 부학생회장 김가람 010-6409-3370
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#bbb;text-align:center">
      아주대학교 심리학과 학생회 물품 대여 시스템
    </p>
  </div>
</div>`;

  const studentText = `[반납 요청] ${data.itemName} 반납 기한이 ${data.daysPast}일 지났습니다\n\n안녕하세요, ${data.studentName}님.\n대여하신 물품의 반납 기한이 ${data.daysPast}일 지났습니다.\n빠른 시일 내에 반납해 주시기 바랍니다.\n\n물품: ${data.itemName} ${data.quantity}개\n반납 기한: ${dueDate}\n\n반납 문의: 김가람 010-6409-3370`;

  // 관리자에게 발송
  if (ADMIN_EMAILS.length) {
    await sendMail(ADMIN_EMAILS, adminSubject, adminHtml, adminText);
  }

  // 대여자 본인에게 발송 (관리자 목록에 없는 경우)
  if (data.studentEmail && !ADMIN_EMAILS.includes(data.studentEmail)) {
    await sendMail([data.studentEmail], studentSubject, studentHtml, studentText);
  }
}
