CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.courses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 description text NOT NULL DEFAULT '', drive_folder_id text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS courses_title_lower_unique ON public.courses(lower(title));
CREATE TABLE IF NOT EXISTS public.certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 full_name text NOT NULL, document_id text NOT NULL DEFAULT '',
 course_id uuid NOT NULL REFERENCES public.courses(id), hours text NOT NULL DEFAULT '',
 issue_date date NOT NULL, status text NOT NULL DEFAULT 'VALIDO' CHECK(status IN('VALIDO','ANULADO')),
 drive_file_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS certificates_code_idx ON public.certificates(code);
CREATE INDEX IF NOT EXISTS certificates_name_idx ON public.certificates(full_name);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.integration_settings (
 key text PRIMARY KEY,
 value text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.activity_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor text NOT NULL DEFAULT 'administrador',
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log(created_at DESC);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS template_file_id text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS template_name text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS spreadsheet_tab_name text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS signatures jsonb NOT NULL DEFAULT '[]'::jsonb;
-- El servidor usa SUPABASE_SERVICE_ROLE_KEY. Nunca publique esa clave en GitHub.
