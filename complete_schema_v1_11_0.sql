-- =====================================================
-- AGENCYFLOW - MASTER INSTALLATION SCRIPT v1.11.0
-- =====================================================
-- This script reconstructs the entire database from scratch.
-- It includes:
-- 1. Enum Types
-- 2. Tables (Profiles, Projects, Finance, Service Catalog v2)
-- 3. Indexes & Performance Tuning
-- 4. Helper Functions & Triggers
-- 5. Row Level Security (RLS) Policies (Granular)
-- 6. Essential Seed Data (Service Modules, Seniority Levels)
--
-- DATE: 2026-01-21
-- VERSION: 1.11.0 (Integration & Export Release)
-- =====================================================

-- =====================================================
-- 0. CLEANUP (Optional - Use with Caution)
-- =====================================================
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- 1. ENUMS (Custom Types)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'employee', 'freelancer', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.project_category AS ENUM (
      'web_design', 'app_dev', 'social_campaign', 'tv_commercial', 'on_air_promotion',
      'event', 'user_experience', 'consulting', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.project_status AS ENUM ('planned', 'active', 'on_hold', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.asset_type AS ENUM ('design', 'video', 'document', 'image', 'audio', 'code', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.asset_status AS ENUM ('upload', 'internal_review', 'client_review', 'approved', 'rejected', 'final');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.doc_type AS ENUM ('quote', 'invoice', 'credit_note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.doc_status AS ENUM ('draft', 'sent', 'approved', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.time_status AS ENUM ('submitted', 'approved', 'rejected', 'billed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.service_category_enum AS ENUM ('CONSULTING', 'CREATION', 'PRODUCTION', 'MANAGEMENT', 'LOGISTICS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

-- 2.1 CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_name TEXT NOT NULL,
  address_line1 TEXT,
  zip_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Germany',
  vat_id TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  website TEXT
);

-- 2.2 PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'employee',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  internal_cost_per_hour NUMERIC DEFAULT 0,
  billable_hourly_rate NUMERIC DEFAULT 0,
  weekly_hours NUMERIC DEFAULT 40
);

-- 2.3 SERVICE CATALOG V2
CREATE TABLE IF NOT EXISTS public.service_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category service_category_enum NOT NULL,
  service_module TEXT NOT NULL,
  description TEXT,
  default_unit TEXT NOT NULL DEFAULT 'hour',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(category, service_module)
);

CREATE TABLE IF NOT EXISTS public.seniority_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level_name TEXT NOT NULL UNIQUE,
  level_order INT NOT NULL UNIQUE,
  description TEXT,
  experience_years_min INT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  service_module_id UUID NOT NULL REFERENCES public.service_modules(id) ON DELETE CASCADE,
  seniority_level_id UUID NOT NULL REFERENCES public.seniority_levels(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL,
  internal_cost NUMERIC DEFAULT 0,
  margin_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN rate > 0 THEN ((rate - internal_cost) / rate * 100) ELSE 0 END
  ) STORED,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(service_module_id, seniority_level_id, valid_from)
);

-- 2.4 PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_number SERIAL NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category project_category DEFAULT 'other',
  status project_status DEFAULT 'planned',
  color_code TEXT DEFAULT '#3b82f6',
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  main_contact_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE,
  deadline DATE,
  budget_total NUMERIC DEFAULT 0
);

-- 2.5 PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT,
  PRIMARY KEY (project_id, profile_id)
);

-- 2.6 TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  position NUMERIC DEFAULT 1000,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  planned_minutes INTEGER DEFAULT 0,
  is_visible_to_client BOOLEAN DEFAULT false,
  -- V2 Integration
  service_module_id UUID REFERENCES public.service_modules(id) ON DELETE SET NULL,
  seniority_level_id UUID REFERENCES public.seniority_levels(id) ON DELETE SET NULL,
  estimated_hours NUMERIC DEFAULT 0,
  estimated_rate NUMERIC DEFAULT 0
);

-- 2.7 ASSETS
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category asset_type DEFAULT 'other',
  status asset_status DEFAULT 'upload',
  feedback_note TEXT,
  storage_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  is_physical BOOLEAN DEFAULT false,
  location TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_visible_to_client BOOLEAN DEFAULT false
);

-- 2.8 FINANCIAL DOCUMENTS
CREATE TABLE IF NOT EXISTS public.financial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  type doc_type NOT NULL,
  status doc_status DEFAULT 'draft',
  document_number TEXT,
  date_issued DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  total_net NUMERIC DEFAULT 0,
  vat_percent NUMERIC DEFAULT 19,
  total_gross NUMERIC DEFAULT 0
);

-- 2.9 FINANCIAL ITEMS
CREATE TABLE IF NOT EXISTS public.financial_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  position_title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  -- V2 Integration
  service_module_id UUID REFERENCES public.service_modules(id) ON DELETE SET NULL,
  seniority_level_id UUID REFERENCES public.seniority_levels(id) ON DELETE SET NULL
);

-- 2.10 COSTS
CREATE TABLE IF NOT EXISTS public.costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  invoice_document_path TEXT,
  category TEXT,
  is_estimated BOOLEAN DEFAULT false
);

-- 2.11 TIME ENTRIES
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status time_status DEFAULT 'submitted',
  rejection_reason TEXT,
  billable BOOLEAN DEFAULT true,
  billed_in_invoice_id UUID REFERENCES public.financial_documents(id) ON DELETE SET NULL
);

-- 2.12 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  related_entity_id UUID,
  related_entity_type TEXT
);

-- =====================================================
-- 3. INDEXING
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_module ON public.service_pricing(service_module_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- =====================================================
-- 4. FUNCTIONS & RPCs
-- =====================================================

-- is_internal helper
CREATE OR REPLACE FUNCTION public.is_internal()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'employee', 'freelancer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- client_id helper
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure Team View RPC
CREATE OR REPLACE FUNCTION public.get_team_directory()
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role,
  weekly_hours NUMERIC
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.created_at,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role,
    p.weekly_hours
  FROM public.profiles p
  WHERE p.role IN ('admin', 'employee', 'freelancer')
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. RLS POLICIES (Comprehensive)
-- =====================================================

-- Enable RLS everywhere
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seniority_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5.1 CLIENTS
DROP POLICY IF EXISTS "Internal users can view all clients" ON public.clients;
CREATE POLICY "Internal users can view all clients" ON public.clients FOR SELECT USING (public.is_internal());

DROP POLICY IF EXISTS "Client users can view own client" ON public.clients;
CREATE POLICY "Client users can view own client" ON public.clients FOR SELECT USING (id = public.get_my_client_id());

DROP POLICY IF EXISTS "Internal users can manage clients" ON public.clients;
CREATE POLICY "Internal users can manage clients" ON public.clients FOR ALL USING (public.is_internal());

-- 5.2 PROJECTS
DROP POLICY IF EXISTS "Internal see all projects" ON public.projects;
CREATE POLICY "Internal see all projects" ON public.projects FOR SELECT USING (public.is_internal());

DROP POLICY IF EXISTS "Clients see own projects" ON public.projects;
CREATE POLICY "Clients see own projects" ON public.projects FOR SELECT USING (client_id = public.get_my_client_id());

DROP POLICY IF EXISTS "Internal manage projects" ON public.projects;
CREATE POLICY "Internal manage projects" ON public.projects FOR ALL USING (public.is_internal());

-- 5.3 TASKS
DROP POLICY IF EXISTS "Internal see all tasks" ON public.tasks;
CREATE POLICY "Internal see all tasks" ON public.tasks FOR SELECT USING (public.is_internal());

DROP POLICY IF EXISTS "Clients see visible tasks" ON public.tasks;
CREATE POLICY "Clients see visible tasks" ON public.tasks FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE client_id = public.get_my_client_id())
  AND is_visible_to_client = true
);

DROP POLICY IF EXISTS "Internal manage tasks" ON public.tasks;
CREATE POLICY "Internal manage tasks" ON public.tasks FOR ALL USING (public.is_internal());

-- 5.4 ASSETS
DROP POLICY IF EXISTS "Internal see all assets" ON public.assets;
CREATE POLICY "Internal see all assets" ON public.assets FOR SELECT USING (public.is_internal());

DROP POLICY IF EXISTS "Clients see visible assets" ON public.assets;
CREATE POLICY "Clients see visible assets" ON public.assets FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE client_id = public.get_my_client_id())
  AND is_visible_to_client = true 
  AND status NOT IN ('upload', 'internal_review')
);

DROP POLICY IF EXISTS "Internal manage assets" ON public.assets;
CREATE POLICY "Internal manage assets" ON public.assets FOR ALL USING (public.is_internal());

-- 5.5 PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5.6 NOTIFICATIONS
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Internal create notifications" ON public.notifications;
CREATE POLICY "Internal create notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_internal());

-- =====================================================
-- 6. SEED DATA (Essential)
-- =====================================================

-- Seniority Levels
INSERT INTO public.seniority_levels (level_name, level_order, description, experience_years_min) VALUES
  ('Junior', 1, '0–2 Jahre Erfahrung', 0),
  ('Professional', 2, '2–5 Jahre Erfahrung', 2),
  ('Senior', 3, '5+ Jahre Erfahrung', 5),
  ('Director', 4, '8+ Jahre Erfahrung', 8)
ON CONFLICT (level_name) DO NOTHING;

-- Service Categories (Examples)
INSERT INTO public.service_modules (category, service_module, default_unit) VALUES
  ('CONSULTING', 'STRATEGY', 'hour'),
  ('CREATION', 'DESIGN', 'hour'),
  ('PRODUCTION', 'EDITING', 'hour'),
  ('MANAGEMENT', 'PROJECT LEAD', 'hour')
ON CONFLICT (category, service_module) DO NOTHING;

-- =====================================================
-- END OF SCRIPT
-- =====================================================
