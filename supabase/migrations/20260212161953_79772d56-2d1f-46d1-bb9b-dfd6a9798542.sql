
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS resident_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS namuwiki_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS id_card_url text,
  ADD COLUMN IF NOT EXISTS id_card_masked_url text,
  ADD COLUMN IF NOT EXISTS signature_url text;
