-- Fix corporate_cards RLS policy to restrict access to admins and card holders only
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Tenant members can view corporate_cards" ON public.corporate_cards;

-- Create more restrictive SELECT policy - only admins and card holders can view
CREATE POLICY "Only admins and card holders can view corporate_cards"
  ON public.corporate_cards
  FOR SELECT
  USING (
    is_tenant_admin(tenant_id) 
    OR is_sys_super_admin() 
    OR holder_user_id = auth.uid()
  );

-- Add explicit policy to block anonymous access to profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
CREATE POLICY "Block anonymous access to profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (false);

-- Create a secure server-side function for invoice submission with validation
CREATE OR REPLACE FUNCTION public.submit_vendor_invoice(
  p_tenant_id uuid,
  p_vendor_name text,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_bank_name text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_account_holder text DEFAULT NULL,
  p_business_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  -- Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant';
  END IF;
  
  -- Validate vendor_name is not empty and within limits
  IF p_vendor_name IS NULL OR length(trim(p_vendor_name)) = 0 THEN
    RAISE EXCEPTION 'Vendor name is required';
  END IF;
  IF length(p_vendor_name) > 200 THEN
    RAISE EXCEPTION 'Vendor name is too long (max 200 characters)';
  END IF;
  
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  IF p_amount > 999999999999 THEN
    RAISE EXCEPTION 'Amount exceeds maximum allowed value';
  END IF;
  
  -- Validate description length if provided
  IF p_description IS NOT NULL AND length(p_description) > 2000 THEN
    RAISE EXCEPTION 'Description is too long (max 2000 characters)';
  END IF;
  
  -- Validate other fields length
  IF p_bank_name IS NOT NULL AND length(p_bank_name) > 100 THEN
    RAISE EXCEPTION 'Bank name is too long (max 100 characters)';
  END IF;
  IF p_account_number IS NOT NULL AND length(p_account_number) > 50 THEN
    RAISE EXCEPTION 'Account number is too long (max 50 characters)';
  END IF;
  IF p_account_holder IS NOT NULL AND length(p_account_holder) > 100 THEN
    RAISE EXCEPTION 'Account holder is too long (max 100 characters)';
  END IF;
  IF p_business_number IS NOT NULL AND length(p_business_number) > 20 THEN
    RAISE EXCEPTION 'Business number is too long (max 20 characters)';
  END IF;

  -- Insert the validated invoice
  INSERT INTO public.vendor_invoices (
    tenant_id,
    vendor_name,
    amount,
    description,
    bank_name,
    account_number,
    account_holder,
    business_number,
    status,
    submitted_at
  ) VALUES (
    p_tenant_id,
    trim(p_vendor_name),
    p_amount,
    trim(p_description),
    trim(p_bank_name),
    trim(p_account_number),
    trim(p_account_holder),
    trim(p_business_number),
    'pending',
    now()
  )
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.submit_vendor_invoice TO anon, authenticated;