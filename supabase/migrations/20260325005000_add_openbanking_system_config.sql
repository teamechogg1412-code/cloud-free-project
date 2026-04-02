-- OpenBanking system config keys를 슈퍼어드민 설정으로 추가
INSERT INTO public.system_configs (key, value, description, category) VALUES
  ('OPENBANK_CLIENT_ID', '', 'OpenBanking API Client ID', 'OpenBanking'),
  ('OPENBANK_CLIENT_SECRET', '', 'OpenBanking API Client Secret', 'OpenBanking'),
  ('OPENBANK_BASE_URL', 'https://openapi.openbanking.or.kr', 'OpenBanking API Base URL', 'OpenBanking');
