// 주민등록번호 포맷: 000000-0000000
export const formatResidentNumber = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
};

// 전화번호 포맷: 010-0000-0000 또는 02-000-0000 등
export const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

// 다음 주소 검색 팝업 호출
export const openDaumPostcode = (callback: (address: string) => void) => {
  const daum = (window as any).daum;
  if (!daum?.Postcode) {
    alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  new daum.Postcode({
    oncomplete: (data: any) => {
      let fullAddress = data.roadAddress || data.jibunAddress;
      let extraAddress = "";

      if (data.addressType === "R") {
        if (data.bname) extraAddress += data.bname;
        if (data.buildingName) {
          extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName;
        }
        if (extraAddress) fullAddress += ` (${extraAddress})`;
      }

      callback(fullAddress);
    },
  }).open();
};
