-- 오픈뱅킹을 위한 finance_accounts business_type 확장
ALTER TABLE public.finance_accounts DROP CONSTRAINT IF EXISTS finance_accounts_business_type_check;
ALTER TABLE public.finance_accounts
  ADD CONSTRAINT finance_accounts_business_type_check CHECK (business_type IN ('BK', 'CD', 'OB'));
