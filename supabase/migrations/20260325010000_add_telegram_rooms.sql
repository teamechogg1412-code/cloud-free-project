-- 전역 텔레그램 봇 토큰을 system_configs에 추가
INSERT INTO public.system_configs (key, value, description, category)
VALUES ('TELEGRAM_BOT_TOKEN', '', '텔레그램 봇 토큰 (BotFather에서 발급)', 'Telegram')
ON CONFLICT (key) DO NOTHING;

-- 텔레그램 방 매핑 테이블
CREATE TABLE IF NOT EXISTS public.telegram_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  chat_title TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  room_type TEXT DEFAULT 'general', -- general, finance, artist, hr
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_rooms ENABLE ROW LEVEL SECURITY;

-- 슈퍼어드민만 전체 조회 가능
CREATE POLICY "sys_super_admin can manage telegram_rooms"
  ON public.telegram_rooms FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND system_role = 'sys_super_admin'
  ));

-- 테넌트 어드민은 자기 테넌트 방만 조회
CREATE POLICY "tenant_admin can view own telegram_rooms"
  ON public.telegram_rooms FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('company_admin', 'manager')
    )
  );

CREATE TRIGGER update_telegram_rooms_updated_at
  BEFORE UPDATE ON public.telegram_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
