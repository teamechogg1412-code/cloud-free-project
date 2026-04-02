
-- Add is_suspended column to tenant_memberships
ALTER TABLE public.tenant_memberships
ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;

-- Add suspended_at timestamp
ALTER TABLE public.tenant_memberships
ADD COLUMN suspended_at timestamp with time zone DEFAULT NULL;

-- Add suspended_by (who suspended)
ALTER TABLE public.tenant_memberships
ADD COLUMN suspended_by uuid DEFAULT NULL;

-- Add suspension_reason
ALTER TABLE public.tenant_memberships
ADD COLUMN suspension_reason text DEFAULT NULL;
