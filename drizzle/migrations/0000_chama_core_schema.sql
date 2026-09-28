-- ENUMS
CREATE TYPE public.chama_role AS ENUM ('chairperson','treasurer','secretary','member');
CREATE TYPE public.contribution_status AS ENUM ('pending','confirmed','rejected');
CREATE TYPE public.loan_status AS ENUM ('pending','approved','rejected','repaid');
CREATE TYPE public.rsvp_response AS ENUM ('coming','not_coming');
CREATE TYPE public.ledger_kind AS ENUM ('in','out');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text,
  language text NOT NULL DEFAULT 'sw',
  pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CHAMAS
CREATE TABLE public.chamas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  monthly_contribution numeric(12,2) NOT NULL DEFAULT 500,
  currency text NOT NULL DEFAULT 'KSh',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chama_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id uuid UNIQUE,
  display_name text NOT NULL,
  phone text,
  role public.chama_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.my_member_id(_chama uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.chama_members WHERE chama_id = _chama AND user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_member(_chama uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chama_members WHERE chama_id = _chama AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_chama_role(_chama uuid, _roles public.chama_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chama_members
    WHERE chama_id = _chama AND user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

GRANT SELECT ON public.chamas TO authenticated;
GRANT ALL ON public.chamas TO service_role;
ALTER TABLE public.chamas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read chama" ON public.chamas FOR SELECT TO authenticated USING (public.is_member(id));

GRANT SELECT, UPDATE ON public.chama_members TO authenticated;
GRANT ALL ON public.chama_members TO service_role;
ALTER TABLE public.chama_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read members" ON public.chama_members FOR SELECT TO authenticated USING (public.is_member(chama_id));
CREATE POLICY "officials update members" ON public.chama_members FOR UPDATE TO authenticated
  USING (public.has_chama_role(chama_id, ARRAY['chairperson']::public.chama_role[]));

-- HELPERS (trusted helper)
CREATE TABLE public.trusted_helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  helper_member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_record boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, helper_member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_helpers TO authenticated;
GRANT ALL ON public.trusted_helpers TO service_role;
ALTER TABLE public.trusted_helpers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_member(_member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chama_members m WHERE m.id = _member AND m.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.trusted_helpers h
      JOIN public.chama_members hm ON hm.id = h.helper_member_id
      WHERE h.member_id = _member AND hm.user_id = auth.uid() AND h.can_view
    )
    OR EXISTS (
      SELECT 1 FROM public.chama_members m
      WHERE m.id = _member AND public.has_chama_role(m.chama_id,
        ARRAY['chairperson','treasurer','secretary']::public.chama_role[])
    );
$$;

CREATE POLICY "see own helper links" ON public.trusted_helpers FOR SELECT TO authenticated
  USING (public.can_view_member(member_id));
CREATE POLICY "manage own helpers" ON public.trusted_helpers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chama_members m WHERE m.id = member_id AND m.user_id = auth.uid()));
CREATE POLICY "delete own helpers" ON public.trusted_helpers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chama_members m WHERE m.id = member_id AND m.user_id = auth.uid()));

-- CONTRIBUTIONS
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  period text NOT NULL,
  kind text NOT NULL DEFAULT 'monthly',
  method text NOT NULL DEFAULT 'mpesa_mock',
  status public.contribution_status NOT NULL DEFAULT 'pending',
  note text,
  recorded_by uuid,
  confirmed_by uuid,
  paid_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read contributions" ON public.contributions FOR SELECT TO authenticated
  USING (public.is_member(chama_id));
CREATE POLICY "record contributions" ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member(chama_id) AND (
      member_id = public.my_member_id(chama_id)
      OR public.has_chama_role(chama_id, ARRAY['treasurer','chairperson']::public.chama_role[])
    )
  );
CREATE POLICY "officials confirm contributions" ON public.contributions FOR UPDATE TO authenticated
  USING (public.has_chama_role(chama_id, ARRAY['treasurer','chairperson']::public.chama_role[]));

-- LOANS
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text,
  status public.loan_status NOT NULL DEFAULT 'pending',
  due_date date,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read loans" ON public.loans FOR SELECT TO authenticated USING (public.is_member(chama_id));
CREATE POLICY "members request loans" ON public.loans FOR INSERT TO authenticated
  WITH CHECK (member_id = public.my_member_id(chama_id) AND status = 'pending');
CREATE POLICY "committee decides loans" ON public.loans FOR UPDATE TO authenticated
  USING (public.has_chama_role(chama_id, ARRAY['chairperson','treasurer']::public.chama_role[]));

CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loan_repayments TO authenticated;
GRANT ALL ON public.loan_repayments TO service_role;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read repayments" ON public.loan_repayments FOR SELECT TO authenticated
  USING (public.is_member(chama_id));
CREATE POLICY "officials record repayments" ON public.loan_repayments FOR INSERT TO authenticated
  WITH CHECK (public.has_chama_role(chama_id, ARRAY['treasurer','chairperson']::public.chama_role[]));

-- MEETINGS
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  title text NOT NULL,
  meet_on date NOT NULL,
  meet_at time NOT NULL DEFAULT '17:00',
  location text NOT NULL,
  agenda text,
  minutes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meetings" ON public.meetings FOR SELECT TO authenticated USING (public.is_member(chama_id));
CREATE POLICY "officials create meetings" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.has_chama_role(chama_id, ARRAY['secretary','chairperson']::public.chama_role[]));
CREATE POLICY "officials update meetings" ON public.meetings FOR UPDATE TO authenticated
  USING (public.has_chama_role(chama_id, ARRAY['secretary','chairperson']::public.chama_role[]));

CREATE TABLE public.meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.chama_members(id) ON DELETE CASCADE,
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  response public.rsvp_response,
  attended boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);
GRANT SELECT, INSERT, UPDATE ON public.meeting_attendance TO authenticated;
GRANT ALL ON public.meeting_attendance TO service_role;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read attendance" ON public.meeting_attendance FOR SELECT TO authenticated
  USING (public.is_member(chama_id));
CREATE POLICY "rsvp insert" ON public.meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (member_id = public.my_member_id(chama_id)
    OR public.has_chama_role(chama_id, ARRAY['secretary','chairperson']::public.chama_role[]));
CREATE POLICY "rsvp update" ON public.meeting_attendance FOR UPDATE TO authenticated
  USING (member_id = public.my_member_id(chama_id)
    OR public.has_chama_role(chama_id, ARRAY['secretary','chairperson']::public.chama_role[]));

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (public.is_member(chama_id));
CREATE POLICY "officials post announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_chama_role(chama_id, ARRAY['chairperson','secretary','treasurer']::public.chama_role[]));

-- LEDGER (money transparency)
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  kind public.ledger_kind NOT NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text,
  occurred_on date NOT NULL DEFAULT current_date,
  recorded_by uuid,
  approved_by uuid,
  source_table text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.is_member(chama_id));
CREATE POLICY "officials add ledger" ON public.ledger_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_chama_role(chama_id, ARRAY['treasurer','chairperson']::public.chama_role[]));

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid,
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_member(chama_id));

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (chama_id, actor_id, action, entity, entity_id, details)
  VALUES (NEW.chama_id, auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  RETURN NEW;
END; $$;

CREATE TRIGGER audit_contributions AFTER INSERT OR UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_loans AFTER INSERT OR UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_repayments AFTER INSERT ON public.loan_repayments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_ledger AFTER INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- DEMO DATA: Tupendane Women Group
INSERT INTO public.chamas (id, name, join_code, monthly_contribution) VALUES
  ('11111111-1111-1111-1111-111111111111','Tupendane Women Group','TUPENDANE',500);

INSERT INTO public.chama_members (id, chama_id, display_name, phone, role) VALUES
  ('21111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Mama Wanjiku','0722000001','chairperson'),
  ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Mama Akinyi','0722000002','treasurer'),
  ('23333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Mama Njeri','0722000003','secretary'),
  ('24444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','Mama Wambui','0722000004','member'),
  ('25555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Mama Atieno','0722000005','member');

INSERT INTO public.contributions (chama_id, member_id, amount, period, status, method, paid_on) VALUES
  ('11111111-1111-1111-1111-111111111111','21111111-1111-1111-1111-111111111111',500,'2026-07','confirmed','mpesa_mock','2026-07-04'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',500,'2026-07','confirmed','cash','2026-07-05'),
  ('11111111-1111-1111-1111-111111111111','23333333-3333-3333-3333-333333333333',500,'2026-07','confirmed','mpesa_mock','2026-07-06'),
  ('11111111-1111-1111-1111-111111111111','24444444-4444-4444-4444-444444444444',300,'2026-07','confirmed','cash','2026-07-08'),
  ('11111111-1111-1111-1111-111111111111','21111111-1111-1111-1111-111111111111',500,'2026-08','confirmed','mpesa_mock','2026-08-03'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',500,'2026-08','confirmed','mpesa_mock','2026-08-03'),
  ('11111111-1111-1111-1111-111111111111','25555555-5555-5555-5555-555555555555',500,'2026-08','confirmed','cash','2026-08-09');

INSERT INTO public.ledger_entries (chama_id, kind, category, amount, description, occurred_on) VALUES
  ('11111111-1111-1111-1111-111111111111','in','michango',86500,'Michango ya miezi iliyopita','2026-06-30'),
  ('11111111-1111-1111-1111-111111111111','in','michango',3300,'Michango Julai na Agosti','2026-08-09'),
  ('11111111-1111-1111-1111-111111111111','out','mkopo',20000,'Mkopo kwa Mama Wambui','2026-07-20'),
  ('11111111-1111-1111-1111-111111111111','in','marejesho',5000,'Marejesho ya mkopo - Mama Wambui','2026-08-20');

INSERT INTO public.loans (id, chama_id, member_id, amount, reason, status, due_date, decided_at) VALUES
  ('31111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','24444444-4444-4444-4444-444444444444',20000,'Biashara ya mboga','approved','2026-12-20','2026-07-20'),
  ('32222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','25555555-5555-5555-5555-555555555555',10000,'Karo ya shule','pending',NULL,NULL);

INSERT INTO public.loan_repayments (loan_id, chama_id, amount, paid_on) VALUES
  ('31111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111',5000,'2026-08-20');

INSERT INTO public.meetings (id, chama_id, title, meet_on, meet_at, location, agenda) VALUES
  ('41111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Mkutano wa mwezi','2026-10-14','17:00','Nyumbani kwa Mama Njeri','Michango ya mwezi, mikopo, na mradi wa maji');

INSERT INTO public.announcements (chama_id, message) VALUES
  ('11111111-1111-1111-1111-111111111111','Mikopo ya mwezi huu itafunguliwa tarehe 20. Tafadhali lipa michango kabla ya Jumapili.');
