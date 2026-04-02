
-- 1. 회사 유형 enum 생성
CREATE TYPE public.company_type AS ENUM (
  'talent_agency',       -- 배우 매니지먼트사
  'pr_agency',           -- PR 에이전시
  'finance_outsourcing', -- 재무 아웃소싱사
  'marketing_agency',    -- 마케팅 에이전시
  'production_agency',   -- 작품 에이전시
  'sales_agency'         -- 영업 에이전시
);

-- 2. tenants 테이블에 company_type 컬럼 추가
ALTER TABLE public.tenants
ADD COLUMN company_type public.company_type DEFAULT 'talent_agency';

-- 3. signup_requests에도 company_type 추가 (가입 신청 시 유형 선택)
ALTER TABLE public.signup_requests
ADD COLUMN company_type public.company_type DEFAULT 'talent_agency';
