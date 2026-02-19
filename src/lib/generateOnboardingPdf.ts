import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface OnboardingData {
  fullName: string;
  email: string;
  tenantName: string;
  hire_date: string;
  resignation_date?: string;
  department: string;
  job_title: string;
  resident_number: string;
  is_foreigner: string;
  nationality: string;
  address: string;
  phone_mobile: string;
  phone_tel?: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  emergency_contacts: { relation: string; name: string; phone: string }[];
}

/**
 * Generate a PDF document containing all onboarding employee information.
 * Uses html2canvas to properly render Korean characters.
 * Returns a File object ready for upload/telegram sending.
 */
export async function generateOnboardingPdf(data: OnboardingData): Promise<File> {
  // Build HTML content with Korean labels
  const validContacts = data.emergency_contacts.filter(c => c.name || c.phone);
  const emergencyRows = validContacts.map((c, i) => `
    <tr><td class="label">#${i + 1} 관계</td><td>${c.relation || "-"}</td></tr>
    <tr><td class="label">이름</td><td>${c.name || "-"}</td></tr>
    <tr><td class="label">연락처</td><td>${c.phone || "-"}</td></tr>
  `).join("");

  const maskedResident = data.resident_number
    ? data.resident_number.replace(/(.{6}).+/, "$1-*******")
    : "-";

  const today = new Date().toISOString().split("T")[0];

  const html = `
    <div style="width:700px;padding:40px;font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif;color:#1e293b;background:#fff;">
      <!-- Header -->
      <div style="background:#0f172a;color:#fff;padding:20px 30px;border-radius:8px;margin-bottom:24px;text-align:center;">
        <div style="font-size:22px;font-weight:700;margin-bottom:6px;">인사 정보등록</div>
        <div style="font-size:14px;opacity:0.9;">${data.tenantName} | ${data.fullName}</div>
        <div style="font-size:11px;opacity:0.7;margin-top:4px;">생성일: ${today}</div>
      </div>

      <!-- 재직 정보 -->
      <div style="margin-bottom:20px;">
        <div style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:8px;">재직 정보</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td class="label">성명</td><td>${data.fullName || "-"}</td></tr>
          <tr><td class="label">이메일</td><td>${data.email || "-"}</td></tr>
          <tr><td class="label">입사일</td><td>${data.hire_date || "-"}</td></tr>
          ${data.resignation_date ? `<tr><td class="label">퇴사일</td><td>${data.resignation_date}</td></tr>` : ""}
          <tr><td class="label">부서</td><td>${data.department || "-"}</td></tr>
          <tr><td class="label">직책</td><td>${data.job_title || "-"}</td></tr>
        </table>
      </div>

      <!-- 개인 정보 -->
      <div style="margin-bottom:20px;">
        <div style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:8px;">개인 정보</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td class="label">주민등록번호</td><td>${maskedResident}</td></tr>
          <tr><td class="label">내/외국인</td><td>${data.is_foreigner || "-"}</td></tr>
          <tr><td class="label">국적</td><td>${data.nationality || "-"}</td></tr>
          <tr><td class="label">주소</td><td>${data.address || "-"}</td></tr>
          <tr><td class="label">휴대폰</td><td>${data.phone_mobile || "-"}</td></tr>
          ${data.phone_tel ? `<tr><td class="label">유선전화</td><td>${data.phone_tel}</td></tr>` : ""}
        </table>
      </div>

      <!-- 급여 계좌 -->
      <div style="margin-bottom:20px;">
        <div style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:8px;">급여 계좌</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td class="label">은행명</td><td>${data.bank_name || "-"}</td></tr>
          <tr><td class="label">계좌번호</td><td>${data.account_number || "-"}</td></tr>
          <tr><td class="label">예금주</td><td>${data.account_holder || "-"}</td></tr>
        </table>
      </div>

      ${validContacts.length > 0 ? `
      <!-- 비상 연락처 -->
      <div style="margin-bottom:20px;">
        <div style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:8px;">비상 연락처</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${emergencyRows}
        </table>
      </div>
      ` : ""}

      <!-- Footer -->
      <div style="border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;font-size:10px;color:#94a3b8;">
        본 문서는 사내 전용 기밀 문서입니다.
      </div>
    </div>

    <style>
      td.label {
        width: 130px;
        padding: 6px 12px;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      td {
        padding: 6px 12px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
    </style>
  `;

  // Create temporary off-screen element
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob");
    const fileName = `인사 정보등록_${data.fullName}_${today}.pdf`;
    return new File([blob], fileName, { type: "application/pdf" });
  } finally {
    document.body.removeChild(container);
  }
}
