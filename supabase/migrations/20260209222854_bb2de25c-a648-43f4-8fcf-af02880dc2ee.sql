
-- Create artist_schedules table
CREATE TABLE public.artist_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  schedule_type TEXT DEFAULT 'schedule',
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_schedules ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_artist_schedules_updated_at
  BEFORE UPDATE ON public.artist_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_artist_schedules_tenant ON public.artist_schedules(tenant_id);
CREATE INDEX idx_artist_schedules_artist ON public.artist_schedules(artist_id);
CREATE INDEX idx_artist_schedules_time ON public.artist_schedules(start_time, end_time);

-- RLS: Tenant members full access
CREATE POLICY "Tenant members can view schedules"
  ON public.artist_schedules FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers can insert schedules"
  ON public.artist_schedules FOR INSERT
  WITH CHECK (is_tenant_manager_or_admin(tenant_id));

CREATE POLICY "Tenant managers can update schedules"
  ON public.artist_schedules FOR UPDATE
  USING (is_tenant_manager_or_admin(tenant_id));

CREATE POLICY "Tenant managers can delete schedules"
  ON public.artist_schedules FOR DELETE
  USING (is_tenant_manager_or_admin(tenant_id));

-- Partner view: only shows availability (no title/description/location)
CREATE VIEW public.artist_schedule_availability
WITH (security_invoker = on) AS
  SELECT 
    id,
    artist_id,
    tenant_id,
    start_time,
    end_time,
    is_all_day,
    schedule_type,
    created_at
  FROM public.artist_schedules;

-- Partners can view schedule availability (not full details)
CREATE POLICY "Partners can view schedule availability"
  ON public.artist_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
      AND has_partner_scope(tm.tenant_id, artist_schedules.tenant_id, 'artists')
    )
  );
