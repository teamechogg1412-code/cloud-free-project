import type { Artist, Employee, TenantInfo, ExtraInfo } from "@/pages/ProfileManagement";

interface Props {
  type: "naver" | "daum" | "certificate";
  artist: Artist | null;
  employee: Employee | null;
  tenantInfo: TenantInfo;
  extraInfo: ExtraInfo;
}

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  backgroundColor: "white",
  color: "black",
  fontFamily: "'Malgun Gothic', 'Dotum', sans-serif",
  padding: "15mm 15mm",
  boxSizing: "border-box",
  position: "relative",
  lineHeight: "1.4",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "10pt",
  marginBottom: "5px",
  borderTop: "2px solid black",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  backgroundColor: "#e8e8e8",
  padding: "6px 2px",
  textAlign: "center",
  fontWeight: "bold",
  wordBreak: "keep-all",
  verticalAlign: "middle",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 5px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdLeftStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "left",
  verticalAlign: "middle",
  lineHeight: "1.6",
};

const SignatureInline = ({ url }: { url?: string | null }) => {
  if (!url) return null;
  return (
    <img
      src={url}
      alt="서명"
      style={{ maxHeight: "40px", maxWidth: "100px", verticalAlign: "middle", display: "inline-block" }}
    />
  );
};

// ========== NAVER ==========
const NaverTemplate = ({ artist, employee, tenantInfo, extraInfo }: Omit<Props, "type">) => {
  if (!artist || !employee) return <p style={{ padding: "40px", textAlign: "center" }}>배우와 담당자를 선택해주세요.</p>;
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
  const startDate = `${y}년 ${m}월 ${d}일`;
  const endObj = new Date(y + 3, today.getMonth(), today.getDate());
  const endDate = `${endObj.getFullYear()}년 ${endObj.getMonth() + 1}월 ${endObj.getDate()}일`;

  return (
    <>
      <div style={pageStyle}>
        <h1 style={{ fontSize: "22pt", fontWeight: "bold", textAlign: "center", marginBottom: "30px" }}>
          인물정보 등 관리 위임장
        </h1>

        {/* 위임인 테이블 */}
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={{ ...thStyle, width: "60px" }} rowSpan={5}>본인<br />(위임인)</th>
              <th style={{ ...thStyle, width: "80px" }}>본명</th>
              <td style={tdStyle}>{artist.name}</td>
              <th style={{ ...thStyle, width: "80px" }}>생년월일</th>
              <td style={tdStyle}>{artist.birth_date?.replace(/-/g, "")}</td>
              <th style={{ ...thStyle, width: "50px" }}>성별</th>
              <td style={tdStyle}>{artist.gender === "male" ? "남" : artist.gender === "female" ? "여" : ""}</td>
            </tr>
            <tr>
              <th style={thStyle}>전화번호</th>
              <td style={tdStyle} colSpan={2}>{artist.contact_phone}</td>
              <th style={thStyle}>이메일</th>
              <td style={tdStyle} colSpan={2}>{artist.email}</td>
            </tr>
            <tr>
              <th style={thStyle}>예명/그룹명</th>
              <td style={tdStyle} colSpan={5}>
                {artist.name} {artist.stage_name && artist.stage_name !== artist.name ? `(${artist.stage_name})` : ""}
              </td>
            </tr>
            <tr>
              <th style={thStyle}>위임내용</th>
              <td style={tdLeftStyle} colSpan={5}>
                <p>- 네이버 인물정보 서비스에서 본인의 인물정보가 제공되는 것과 관련, 네이버㈜를 상대로
                  그 인물정보의 등록, 수정 또는 삭제를 단독으로 신청하는 것에 관한 일체의 업무</p>
                <p style={{ marginTop: "6px" }}>- 네이버㈜를 상대로 본인의 명예, 사생활, 저작권 등 권리를 침해하는, 게시물 등 검색결과
                  의 제외(게시중단 포함) 또는 검색어의 제외를 단독으로 요청하는 것에 관한 일체의 업무</p>
              </td>
            </tr>
            <tr>
              <th style={thStyle}>위임기간</th>
              <td style={tdLeftStyle} colSpan={5}>
                <p>{startDate} ~ {endDate} (최단 1주일에서 최장 36개월)</p>
                <p style={{ fontSize: "8pt", color: "#555", marginTop: "4px" }}>
                  ※ 본 위임을 철회하신 경우 인물정보 고객센터로 알려주셔야 하며, 그 전까지는 기재된 위임기간이 경과하지 않은 한 대리인의 관리권한이 유효한 것으로 간주됩니다.
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: "16px" }} />

        {/* 대리인 테이블 */}
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={{ ...thStyle, width: "60px" }} rowSpan={6}>대리인<br />(수임인)</th>
              <th style={{ ...thStyle, width: "80px" }}>성명</th>
              <td style={tdStyle} colSpan={2}>{employee.full_name}</td>
              <th style={{ ...thStyle, width: "80px" }}>생년월일</th>
              <td style={tdStyle}>{extraInfo.empBirth?.replace(/-/g, "")}</td>
            </tr>
            <tr>
              <th style={thStyle}>전화번호</th>
              <td style={tdStyle} colSpan={2}>{employee.phone}</td>
              <th style={thStyle}>이메일</th>
              <td style={tdStyle}>{employee.email}</td>
            </tr>
            <tr>
              <th style={thStyle}>본인과의 관계</th>
              <td style={tdStyle} colSpan={4}>{extraInfo.relation} ({tenantInfo.name})</td>
            </tr>
            <tr>
              <th style={thStyle}>본인참여 ID</th>
              <td style={tdLeftStyle} colSpan={4}>
                <p>(관리권한을 행사할 네이버 ID로서, 실명 확인 필수)</p>
                <p style={{ fontSize: "8pt", color: "#d00", marginTop: "4px" }}>
                  ※ 신청자 정보(ID, 성명)와 동일하지 않을 시 권한신청이 보류될 수 있으니 작성 시 주의해주세요!
                </p>
              </td>
            </tr>
            <tr>
              <th style={thStyle}>정보수집 동의</th>
              <td style={tdLeftStyle} colSpan={4}>
                <p style={{ fontSize: "8.5pt" }}>
                  ※ 대리인(수임인)은 본 위임장 제출 과정에서 대리인의 이름, 생년월일, 전화번호,
                  이메일, 본인과의 관계, 네이버 ID, 아래 위임관계 증빙용 필수 제출 서류가 네이버
                  ㈜에 의해 수집되어, 상기 본인의 인물정보 등록, 수정, 삭제를 위해 이용되며, 위
                  임에 의한 신청 또는 요청 처리 이력, 불만 처리 이력 등은 분쟁 해결을 위해 필요
                  한 기록 보관을 목적으로 서비스 이용기간 또는 관련 법령에 따라 보관되는 것에 동의하십니까?
                </p>
                <p style={{ marginTop: "8px", fontWeight: "bold" }}>동의합니다. ( V )</p>
                <p style={{ fontSize: "8pt", color: "#d00", backgroundColor: "#ffff00", display: "inline-block", padding: "2px 4px", marginTop: "4px" }}>
                  괄호안에 동의체크 " V " 해주셔야 정상 처리됩니다.
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 본문 */}
        <div style={{ marginTop: "20px", fontSize: "9.5pt", lineHeight: "1.7" }}>
          <p>본인(위임인)은 네이버 인물정보 등 서비스에서의 본인의 인물정보 등의 관리에 관하여 상기 위임내용
            상의 일체의 업무를 상기 대리인(수임인)에게 위임합니다.</p>
          <p style={{ marginTop: "8px" }}>본인(위임인)은 대리인(수임인)이 그의 관리권한이 유효하게 존속하는 기간 중 네이버㈜를 상대로 신청
            또는 요청한 사항이 추후 사실이 아님이 밝혀질 경우 그로 인해 발생하는 책임을 본인이 부담할 것임
            을 확인합니다.</p>
        </div>

        {/* 날짜/서명 */}
        <div style={{ marginTop: "40px", fontSize: "16pt", fontWeight: "bold", textAlign: "center" }}>
          {y}  년    {m}  월    {d}  일
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12pt", gap: "10px", marginTop: "20px" }}>
          <span>본인(위임인)</span>
          <span style={{ position: "relative" }}>
            {artist.name} (인)
            <SignatureInline url={artist.signature_url} />
          </span>
          <span>(날인 또는 서명)</span>
        </div>
      </div>

      {/* 증빙 서류 페이지 */}
      <AttachmentPage artist={artist} />
    </>
  );
};

// ========== DAUM ==========
const DaumTemplate = ({ artist, employee, tenantInfo, extraInfo }: Omit<Props, "type">) => {
  if (!artist || !employee) return <p style={{ padding: "40px", textAlign: "center" }}>배우와 담당자를 선택해주세요.</p>;
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
  const startDate = `${y}년 ${m}월 ${d}일`;
  const endObj = new Date(y + 3, today.getMonth(), today.getDate());
  const endDate = `${endObj.getFullYear()}년 ${endObj.getMonth() + 1}월 ${endObj.getDate()}일`;

  return (
    <>
      <div style={pageStyle}>
        <h1 style={{ fontSize: "22pt", fontWeight: "bold", textAlign: "center", marginBottom: "30px", letterSpacing: "5px" }}>
          위 임 장(개인)
        </h1>

        {/* 위임인 */}
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={{ ...thStyle, width: "60px" }} rowSpan={5}>위임인</th>
              <th style={{ ...thStyle, width: "90px" }}>성명</th>
              <td style={tdStyle}>
                {artist.name} (인) <SignatureInline url={artist.signature_url} />
              </td>
              <th style={{ ...thStyle, width: "80px" }}>생년월일</th>
              <td style={tdStyle}>{artist.birth_date?.replace(/-/g, ". ")}</td>
            </tr>
            <tr>
              <th style={thStyle}>주소</th>
              <td style={tdStyle} colSpan={3}>{artist.address}</td>
            </tr>
            <tr>
              <th style={thStyle}>전화번호</th>
              <td style={tdStyle} colSpan={3}>{artist.contact_phone}</td>
            </tr>
            <tr>
              <th style={thStyle}>프로필 이름</th>
              <td style={tdStyle} colSpan={3}>{artist.name}</td>
            </tr>
            <tr>
              <th style={thStyle}>위임기간</th>
              <td style={tdLeftStyle} colSpan={3}>
                <p>{startDate} 부터 {endDate} (최장 3년 이내로 가능)</p>
                <p style={{ fontSize: "8pt", color: "#555", marginTop: "4px" }}>
                  (※ 기한을 명시하지 않았거나 3년이 넘는 경우, 위임일로부터 3년간으로 일괄 적용함
                  ※ 위임기간은 인물검색 등 kakao에서 운영하는 서비스에 프로필정보가 사용되는 기간과 상이할 수 있으며,
                  프로필 정보가 사용 및 보존되는 기간은 개인정보처리방침에 따름)
                </p>
              </td>
            </tr>
            <tr>
              <th style={thStyle} colSpan={1}>&nbsp;</th>
              <th style={thStyle}>이용서비스</th>
              <td style={tdStyle} colSpan={3}>마이프로필(인물검색 프로필 수정 서비스)</td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: "16px" }} />

        {/* 수임인 */}
        <table style={tableStyle}>
          <tbody>
            <tr>
              <th style={{ ...thStyle, width: "60px" }} rowSpan={4}>수임인<br />(대리인)</th>
              <th style={{ ...thStyle, width: "90px" }}>성명(법인명)</th>
              <td style={tdStyle}>{employee.full_name} (인)</td>
              <th style={{ ...thStyle, width: "100px" }}>생년월일<br />(법인인 경우 사업자등록번호)</th>
              <td style={tdStyle}>{extraInfo.empBirth?.replace(/-/g, ". ")}</td>
            </tr>
            <tr>
              <th style={thStyle}>주소</th>
              <td style={tdStyle} colSpan={3}>{extraInfo.empAddress}</td>
            </tr>
            <tr>
              <th style={thStyle}>위임인과의 관계</th>
              <td style={tdStyle} colSpan={3}>{extraInfo.relation} ({tenantInfo.name})</td>
            </tr>
          </tbody>
        </table>

        {/* 위임 본문 */}
        <div style={{ marginTop: "20px", fontSize: "9.5pt", lineHeight: "1.8", border: "1px solid #000", padding: "12px" }}>
          상기 위임인 <strong>{artist.name}</strong> 은 인물검색을 포함하여, kakao에서 운영하는 모든 서비스에서 사용되게 할 목적으로
          위임인의 프로필 정보를 마이프로필(인물검색 프로필 등록 및 수정 서비스)을 통하여 kakao에 제공함과 관련한
          모든 권한(개인정보의 열람, 제공, 등록·정정·삭제, 처리정지 요구 포함)을 수임인 <strong>{employee.full_name}</strong> 에게 위임합니다.
          위임 기간 중 수임인의 요청으로 수정, 등록, 삭제되는 프로필 정보로 인해 발생하는 문제는 위임인 본인이 모든 책임을 지고,
          kakao에 민, 형사상 어떠한 이의도 하지 않을 것을 확인하였습니다.
        </div>

        {/* 첨부서류 안내 */}
        <p style={{ fontSize: "10pt", fontWeight: "bold", marginTop: "20px" }}>*진위확인 및 관계증명을 위한 첨부서류</p>
        <table style={{ ...tableStyle, marginTop: "6px" }}>
          <thead>
            <tr>
              <th style={thStyle}>구분</th>
              <th style={thStyle}>본인(위임인)</th>
              <th style={thStyle}>가족</th>
              <th style={thStyle}>소속사</th>
              <th style={thStyle}>기타대리인</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style={thStyle}>첨부서류</th>
              <td style={{ ...tdLeftStyle, fontSize: "8pt" }}>-신분증 사본</td>
              <td style={{ ...tdLeftStyle, fontSize: "8pt" }}>-위임인의 신분증 사본<br />-가족관계증명서와 의료보험증 사본 중 택 1</td>
              <td style={{ ...tdLeftStyle, fontSize: "8pt" }}>-위임인의 신분증 사본<br />-사업자등록증, 수임인의 재직증명서, 위임인의 인감증명서 중 택 1</td>
              <td style={{ ...tdLeftStyle, fontSize: "8pt" }}>-위임인의 신분증 사본<br />-위임인의 인감증명서</td>
            </tr>
          </tbody>
        </table>

        {/* 날짜/서명 */}
        <div style={{ marginTop: "40px", textAlign: "right", fontSize: "11pt" }}>
          <p>{y} 년   {m} 월   {d} 일</p>
          <p style={{ marginTop: "12px" }}>
            위임인       {artist.name}       (인) <SignatureInline url={artist.signature_url} />
          </p>
        </div>
      </div>

      {/* 증빙 서류 페이지 */}
      <AttachmentPage artist={artist} />
    </>
  );
};

// ========== CERTIFICATE ==========
const CertificateTemplate = ({ employee, tenantInfo, extraInfo }: Omit<Props, "type" | "artist">) => {
  if (!employee) return <p style={{ padding: "40px", textAlign: "center" }}>직원을 선택해주세요.</p>;
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: "28pt", fontWeight: "bold", textAlign: "center", marginBottom: "50px", letterSpacing: "5px" }}>
        재 직 증 명 서
      </h1>

      <h3 style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "8px" }}>1. 인적사항</h3>
      <table style={tableStyle}>
        <tbody>
          <tr>
            <th style={{ ...thStyle, width: "100px" }}>성 명</th>
            <td style={tdStyle}>{employee.full_name}</td>
            <th style={{ ...thStyle, width: "100px" }}>생년월일</th>
            <td style={tdStyle}>{extraInfo.empBirth}</td>
          </tr>
          <tr>
            <th style={thStyle}>주 소</th>
            <td style={tdStyle} colSpan={3}>{extraInfo.empAddress}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ fontSize: "12pt", fontWeight: "bold", marginTop: "24px", marginBottom: "8px" }}>2. 재직사항</h3>
      <table style={tableStyle}>
        <tbody>
          <tr>
            <th style={{ ...thStyle, width: "100px" }}>소 속</th>
            <td style={tdStyle}>{tenantInfo.name}</td>
            <th style={{ ...thStyle, width: "100px" }}>부 서</th>
            <td style={tdStyle}>{employee.department || "-"}</td>
          </tr>
          <tr>
            <th style={thStyle}>직 위</th>
            <td style={tdStyle}>{employee.job_title || "매니저"}</td>
            <th style={thStyle}>재직기간</th>
            <td style={tdStyle}>
              {employee.join_date ? new Date(employee.join_date).toLocaleDateString() : "입사일 미상"} ~ 현재
            </td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ fontSize: "12pt", fontWeight: "bold", marginTop: "24px", marginBottom: "8px" }}>3. 발급용도</h3>
      <table style={tableStyle}>
        <tbody>
          <tr>
            <th style={{ ...thStyle, width: "100px" }}>용 도</th>
            <td style={tdStyle}>{extraInfo.usage}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "60px", textAlign: "center", fontSize: "12pt", lineHeight: "2" }}>
        <p>상기 인은 위와 같이 당사에 재직하고 있음을 증명합니다.</p>
      </div>

      <div style={{ marginTop: "60px", textAlign: "center" }}>
        <p style={{ fontSize: "16pt", fontWeight: "bold" }}>{y}년  {m}월  {d}일</p>
        <p style={{ fontSize: "14pt", fontWeight: "bold", marginTop: "30px" }}>{tenantInfo.name}</p>
        <p style={{ fontSize: "12pt", marginTop: "10px" }}>대표이사    {tenantInfo.rep_name || "(대표자명)"}    (인)</p>
        <p style={{ fontSize: "9pt", color: "#666", marginTop: "10px" }}>{tenantInfo.address}</p>
      </div>
    </div>
  );
};

// ========== 증빙 서류 첨부 페이지 ==========
const AttachmentPage = ({ artist }: { artist: Artist }) => (
  <div style={{ ...pageStyle }} className="page-break-before-always">
    <h2 style={{ fontSize: "16pt", fontWeight: "bold", textAlign: "center", marginBottom: "30px" }}>
      첨부 서류 (증빙)
    </h2>
    <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
      <div>
        <h3 style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "10px" }}>1. 위임인(배우) 신분증 사본</h3>
        <div style={{ border: "1px solid #ccc", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          {artist.id_card_masked_url || artist.id_card_url ? (
            <img
              src={artist.id_card_masked_url || artist.id_card_url}
              alt="신분증 사본"
              style={{ maxWidth: "100%", maxHeight: "400px" }}
            />
          ) : (
            <p style={{ color: "#999" }}>신분증 이미지가 등록되지 않았습니다.</p>
          )}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: "12pt", fontWeight: "bold", marginBottom: "10px" }}>2. 수임인(대리인) 신분증 사본</h3>
        <div style={{ border: "1px solid #ccc", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <p style={{ color: "#999" }}>이곳에 대리인 신분증을 부착하세요.</p>
        </div>
      </div>
    </div>
  </div>
);

// ========== MAIN EXPORT ==========
export const PortalDocTemplate = ({ type, artist, employee, tenantInfo, extraInfo }: Props) => {
  if (type === "certificate") {
    return <CertificateTemplate employee={employee} tenantInfo={tenantInfo} extraInfo={extraInfo} />;
  }
  if (type === "daum") {
    return <DaumTemplate artist={artist} employee={employee} tenantInfo={tenantInfo} extraInfo={extraInfo} />;
  }
  return <NaverTemplate artist={artist} employee={employee} tenantInfo={tenantInfo} extraInfo={extraInfo} />;
};
