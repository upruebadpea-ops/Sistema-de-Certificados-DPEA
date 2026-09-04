-- Ejecute este contenido una sola vez en Supabase > SQL Editor.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS template_file_id text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS template_name text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS spreadsheet_tab_name text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS signatures jsonb NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
