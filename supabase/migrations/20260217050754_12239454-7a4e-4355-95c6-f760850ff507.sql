-- Allow tenant_id to be NULL for system defaults in leave_groups and leave_types
ALTER TABLE public.leave_groups ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.leave_types ALTER COLUMN tenant_id DROP NOT NULL;