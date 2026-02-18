
-- Create a SECURITY DEFINER function so employees can update their own job_title/department during onboarding
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _tenant_id uuid,
  _department text,
  _job_title text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow updating own membership
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a member of this tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships 
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this tenant';
  END IF;

  UPDATE public.tenant_memberships
  SET department = _department, 
      job_title = _job_title, 
      updated_at = now()
  WHERE user_id = auth.uid() AND tenant_id = _tenant_id;
END;
$$;
