ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.guard_member_archive_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can archive or restore members.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_archive_admin_only ON public.members;
CREATE TRIGGER members_archive_admin_only
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_member_archive_admin_only();