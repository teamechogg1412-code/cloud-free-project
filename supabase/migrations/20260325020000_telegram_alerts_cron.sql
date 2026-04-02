-- 매일 오전 9시 (KST) = UTC 00:00 텔레그램 알림 실행
SELECT cron.schedule(
  'telegram-daily-alerts',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://matcnptzugnaisuhowbk.supabase.co/functions/v1/telegram-alerts',
    headers := '{"Content-Type": "application/json", "apikey": "' || (SELECT value FROM public.system_configs WHERE key = 'SUPABASE_ANON_KEY' LIMIT 1) || '"}'::jsonb,
    body := '{"action": "daily_check"}'::jsonb
  ) AS request_id;
  $$
);
