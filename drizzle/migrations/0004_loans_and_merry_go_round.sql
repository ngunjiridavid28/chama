-- Migration 0004: Enhanced loans with guarantors, interest, and Merry-Go-Round rotation

-- 1. Enhance loans table
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS guarantor_id uuid REFERENCES public.chama_members(id);
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_rate numeric NOT NULL DEFAULT 10.0;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 1;

-- 2. Enhance loan_repayments table
ALTER TABLE public.loan_repayments ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'mpesa';
ALTER TABLE public.loan_repayments ADD COLUMN IF NOT EXISTS mpesa_reference text;

-- 3. Create merry_go_round_slots table
CREATE TABLE IF NOT EXISTS public.merry_go_round_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL DEFAULT 1,
  rotation_order integer NOT NULL,
  payout_month text NOT NULL,
  payout_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mgr_chama_cycle ON public.merry_go_round_slots(chama_id, cycle_number, rotation_order);
