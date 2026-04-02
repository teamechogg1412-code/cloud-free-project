
-- Notifications table for in-app alerts
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Function to auto-create notification when external invoice is submitted
CREATE OR REPLACE FUNCTION public.notify_invoice_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, tenant_id, type, title, message, link, metadata)
  VALUES (
    NEW.assigned_to,
    NEW.tenant_id,
    'invoice_received',
    '새 외부 청구서 수신',
    COALESCE(NEW.vendor_company, NEW.vendor_name) || '로부터 ₩' || COALESCE(NEW.total_amount, 0)::text || ' 청구서가 도착했습니다.',
    '/apps/finance/billing',
    jsonb_build_object('invoice_id', NEW.id, 'vendor_name', NEW.vendor_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_invoice_received
  AFTER INSERT ON public.external_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_received();
