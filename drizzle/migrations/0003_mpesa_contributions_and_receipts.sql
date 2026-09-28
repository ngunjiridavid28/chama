-- Migration 0003: M-Pesa reference and payment tracking on contributions

ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS mpesa_reference text;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS phone_number text;

-- Index to quickly look up M-Pesa transactions and prevent double recording
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_chama_mpesa_ref 
  ON public.contributions(chama_id, mpesa_reference) 
  WHERE mpesa_reference IS NOT NULL;
