-- 텔레그램 방별 알림 설정 컬럼 추가
ALTER TABLE public.telegram_rooms
  ADD COLUMN IF NOT EXISTS alert_schedule_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_schedule_days INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS alert_contract_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_contract_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_settlement_enabled BOOLEAN DEFAULT true;
