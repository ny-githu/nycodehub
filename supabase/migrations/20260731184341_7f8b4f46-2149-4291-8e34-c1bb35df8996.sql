CREATE TABLE public.momo_sms (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  transaction_id text,
  amount_rwf integer,
  sender text,
  payer_name text,
  status text not null default 'pending',
  linked_request_id uuid,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
CREATE UNIQUE INDEX momo_sms_txid_key ON public.momo_sms (transaction_id) WHERE transaction_id IS NOT NULL;
GRANT SELECT ON public.momo_sms TO authenticated;
GRANT ALL ON public.momo_sms TO service_role;
ALTER TABLE public.momo_sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage momo sms" ON public.momo_sms FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));