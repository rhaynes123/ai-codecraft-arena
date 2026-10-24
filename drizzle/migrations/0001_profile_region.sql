ALTER TABLE public.profiles ADD COLUMN region text;
CREATE OR REPLACE FUNCTION public.set_region(_region text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _region IS NOT NULL AND _region <> 'detroit' THEN RAISE EXCEPTION 'Unknown region'; END IF;
  UPDATE public.profiles SET region = _region WHERE id = auth.uid();
  RETURN _region;
END $$;
REVOKE ALL ON FUNCTION public.set_region(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_region(text) TO authenticated;