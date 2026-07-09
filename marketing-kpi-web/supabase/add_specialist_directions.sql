-- Migration: add directions to public.people to support specialists by direction
-- Run this in Supabase Dashboard → SQL Editor

-- 1) Add directions column to people table
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS directions text[] NOT NULL DEFAULT '{}'::text[];

-- 2) Create GIN index for array search performance
CREATE INDEX IF NOT EXISTS people_directions_idx ON public.people USING gin(directions);

-- 3) Backfill directions from existing KPI records
WITH specialist_roles AS (
  SELECT specialist_person_id, array_agg(DISTINCT task_role) AS roles
  FROM public.kpi_records
  WHERE specialist_person_id IS NOT NULL
  GROUP BY specialist_person_id
)
UPDATE public.people p
SET directions = sr.roles
FROM specialist_roles sr
WHERE p.id = sr.specialist_person_id
  AND p.directions = '{}'::text[];
