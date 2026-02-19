export const COMPANY_TYPES = [
  { value: "talent_agency", label: "배우 매니지먼트사", emoji: "🎬" },
  { value: "pr_agency", label: "PR 에이전시", emoji: "📢" },
  { value: "finance_outsourcing", label: "재무 아웃소싱사", emoji: "💰" },
  { value: "marketing_agency", label: "마케팅 에이전시", emoji: "📊" },
  { value: "production_agency", label: "작품 에이전시", emoji: "🎭" },
  { value: "sales_agency", label: "영업 에이전시", emoji: "🤝" },
] as const;

export type CompanyType = typeof COMPANY_TYPES[number]["value"];

export const getCompanyTypeLabel = (value: string) => {
  const found = COMPANY_TYPES.find(t => t.value === value);
  return found ? `${found.emoji} ${found.label}` : value;
};

export const getCompanyTypeBadge = (value: string) => {
  const found = COMPANY_TYPES.find(t => t.value === value);
  return found ? found.label : value;
};
