
-- Add new columns to corporate_cards
ALTER TABLE public.corporate_cards
  ADD COLUMN IF NOT EXISTS card_type text DEFAULT '일반',
  ADD COLUMN IF NOT EXISTS card_holder_name text,
  ADD COLUMN IF NOT EXISTS is_skypass boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cvc text,
  ADD COLUMN IF NOT EXISTS card_image_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.corporate_cards.card_type IS '카드 종류: 일반, 하이패스, 클린카드';
COMMENT ON COLUMN public.corporate_cards.card_holder_name IS '실제 카드 명의자';
COMMENT ON COLUMN public.corporate_cards.is_skypass IS '스카이패스 적립 여부';
COMMENT ON COLUMN public.corporate_cards.cvc IS 'CVC 번호';
COMMENT ON COLUMN public.corporate_cards.card_image_url IS '카드 이미지 URL';
