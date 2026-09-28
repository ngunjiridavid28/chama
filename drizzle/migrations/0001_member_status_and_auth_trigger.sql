-- Migration 0001: Add member status, created_by, ID fields, and Google OAuth trigger compatibility

-- 1. Add created_by to chamas
ALTER TABLE public.chamas ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Add status & identity fields to chama_members
ALTER TABLE public.chamas ADD COLUMN IF NOT EXISTS meeting_day text DEFAULT 'Jumapili ya kwanza ya mwezi';

ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS id_type text DEFAULT 'national_id';
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS dob text;
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS sex text;
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS id_document_url text;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chama_members_status_check'
  ) THEN
    ALTER TABLE public.chama_members 
    ADD CONSTRAINT chama_members_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 3. Update is_member function to only consider approved members
CREATE OR REPLACE FUNCTION public.is_member(_chama uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chama_members 
    WHERE chama_id = _chama 
      AND user_id = auth.uid() 
      AND status = 'approved'
  );
$$;

-- 4. Enable chama creation by authenticated users
GRANT INSERT ON public.chamas TO authenticated;
DROP POLICY IF EXISTS "authenticated can create chama" ON public.chamas;
CREATE POLICY "authenticated can create chama" ON public.chamas 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Allow users to submit join requests to chama_members
GRANT INSERT ON public.chama_members TO authenticated;
DROP POLICY IF EXISTS "authenticated can request to join" ON public.chama_members;
CREATE POLICY "authenticated can request to join" ON public.chama_members 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "members can read own pending request" ON public.chama_members;
CREATE POLICY "members can read own pending request" ON public.chama_members 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- 6. Update handle_new_user to properly handle Google OAuth profile data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  extracted_name text;
  extracted_phone text;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, 'Mwanachama'), '@', 1)
  );
  extracted_phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, extracted_name, extracted_phone)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = COALESCE(EXCLUDED.phone, profiles.phone);

  RETURN NEW;
END; $$;
