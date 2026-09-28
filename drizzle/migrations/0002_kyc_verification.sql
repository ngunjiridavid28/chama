-- Migration 0002: KYC & Member Verification

-- 1. Add KYC verification tracking to chama_members
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;
ALTER TABLE public.chama_members ADD COLUMN IF NOT EXISTS kyc_verified_by uuid REFERENCES auth.users(id);

-- 2. Create storage bucket for member ID documents if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('member-ids', 'member-ids', false)
    ON CONFLICT (id) DO NOTHING;

    -- Policy: Users can upload their own ID documents
    DROP POLICY IF EXISTS "Authenticated users can upload member ID documents" ON storage.objects;
    CREATE POLICY "Authenticated users can upload member ID documents"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'member-ids' AND (storage.foldername(name))[1] = auth.uid()::text);

    -- Policy: Users can view their own ID documents
    DROP POLICY IF EXISTS "Users can view own ID documents" ON storage.objects;
    CREATE POLICY "Users can view own ID documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'member-ids' AND (storage.foldername(name))[1] = auth.uid()::text);

    -- Policy: Officials can view all ID documents in their chama
    DROP POLICY IF EXISTS "Officials can view chama member ID documents" ON storage.objects;
    CREATE POLICY "Officials can view chama member ID documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'member-ids' AND
        EXISTS (
          SELECT 1 FROM public.chama_members om
          JOIN public.chama_members tm ON om.chama_id = tm.chama_id
          WHERE om.user_id = auth.uid()
            AND om.role IN ('chairperson', 'secretary', 'treasurer')
            AND tm.user_id::text = (storage.foldername(name))[1]
        )
      );
  END IF;
END $$;
