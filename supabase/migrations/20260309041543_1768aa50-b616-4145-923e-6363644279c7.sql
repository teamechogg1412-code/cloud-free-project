ALTER TABLE public.casting_offers 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone NULL;