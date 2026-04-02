-- Add business registration fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN biz_number text,
ADD COLUMN corp_number text,
ADD COLUMN rep_name text,
ADD COLUMN opening_date text,
ADD COLUMN tax_email text,
ADD COLUMN biz_type text,
ADD COLUMN biz_item text,
ADD COLUMN address text;