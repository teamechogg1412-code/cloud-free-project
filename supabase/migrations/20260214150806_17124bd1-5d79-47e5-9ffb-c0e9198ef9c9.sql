
-- Add missing columns to vehicles table for the vehicle master form
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT '휘발유';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS initial_mileage numeric DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS usage_category text DEFAULT '비영업용승용차';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT '리스';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS contract_manager text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS contact_number text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS payment_day integer DEFAULT 1;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '카드 결제';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS primary_driver uuid REFERENCES public.profiles(id);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS requires_log boolean DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_start_date date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_end_date date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_driver_age text DEFAULT '만 26세 이상';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS contract_start_date date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS contract_end_date date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS annual_contract_mileage integer DEFAULT 20000;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS excess_mileage_fee numeric DEFAULT 0;

-- Make plate_number nullable since the form uses vehicle_number instead
ALTER TABLE public.vehicles ALTER COLUMN plate_number DROP NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN plate_number SET DEFAULT '';
