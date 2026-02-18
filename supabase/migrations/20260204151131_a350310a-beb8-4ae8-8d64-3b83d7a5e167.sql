
-- Create driving_logs table for GPS-based trip logging
CREATE TABLE public.driving_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_user_id UUID REFERENCES public.profiles(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  start_location_lat NUMERIC,
  start_location_lng NUMERIC,
  start_address TEXT,
  end_location_lat NUMERIC,
  end_location_lng NUMERIC,
  end_address TEXT,
  distance_km NUMERIC DEFAULT 0,
  purpose TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driving_log_waypoints for tracking route
CREATE TABLE public.driving_log_waypoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.driving_logs(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  speed_kmh NUMERIC,
  heading NUMERIC
);

-- Enable RLS
ALTER TABLE public.driving_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driving_log_waypoints ENABLE ROW LEVEL SECURITY;

-- RLS policies for driving_logs
CREATE POLICY "Tenant members can view driving_logs"
  ON public.driving_logs FOR SELECT
  USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can create driving_logs"
  ON public.driving_logs FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant members can update their driving_logs"
  ON public.driving_logs FOR UPDATE
  USING (is_tenant_member(tenant_id) OR is_sys_super_admin());

CREATE POLICY "Tenant admins can delete driving_logs"
  ON public.driving_logs FOR DELETE
  USING (is_tenant_admin(tenant_id) OR is_sys_super_admin());

-- RLS policies for driving_log_waypoints
CREATE POLICY "Members can view waypoints"
  ON public.driving_log_waypoints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.driving_logs dl
    WHERE dl.id = driving_log_waypoints.log_id
    AND (is_tenant_member(dl.tenant_id) OR is_sys_super_admin())
  ));

CREATE POLICY "Members can create waypoints"
  ON public.driving_log_waypoints FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.driving_logs dl
    WHERE dl.id = driving_log_waypoints.log_id
    AND (is_tenant_member(dl.tenant_id) OR is_sys_super_admin())
  ));

CREATE POLICY "Members can delete waypoints"
  ON public.driving_log_waypoints FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.driving_logs dl
    WHERE dl.id = driving_log_waypoints.log_id
    AND (is_tenant_admin(dl.tenant_id) OR is_sys_super_admin())
  ));

-- Triggers for updated_at
CREATE TRIGGER update_driving_logs_updated_at
  BEFORE UPDATE ON public.driving_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_driving_logs_tenant_id ON public.driving_logs(tenant_id);
CREATE INDEX idx_driving_logs_vehicle_id ON public.driving_logs(vehicle_id);
CREATE INDEX idx_driving_logs_driver_user_id ON public.driving_logs(driver_user_id);
CREATE INDEX idx_driving_log_waypoints_log_id ON public.driving_log_waypoints(log_id);
