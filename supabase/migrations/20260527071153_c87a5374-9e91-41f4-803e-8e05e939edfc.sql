
-- 1. Expiry on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. payment_plans
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  amount_rwf integer NOT NULL CHECK (amount_rwf >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_plans TO anon, authenticated;
GRANT ALL ON public.payment_plans TO service_role;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans public read" ON public.payment_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.payment_plans FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. payment_settings (singleton)
CREATE TABLE public.payment_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mobile_code text NOT NULL DEFAULT '1940525',
  instructions text NOT NULL DEFAULT 'Dial *182*1*1# on your phone, enter the code above, then enter the amount of your chosen plan. After paying, submit your MoMo transaction ID below — your account will be re-enabled once the admin approves it.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.payment_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. payment_requests
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  transaction_id text NOT NULL,
  amount_rwf integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own requests" ON public.payment_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own requests" ON public.payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage requests" ON public.payment_requests FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. seed
INSERT INTO public.payment_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.payment_plans (name, duration_days, amount_rwf, sort_order) VALUES
  ('Weekly', 7, 2000, 1),
  ('2 Weeks', 14, 3500, 2),
  ('Monthly', 30, 6000, 3)
ON CONFLICT DO NOTHING;
