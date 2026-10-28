ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS credits_spent integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.spend_attempt_credits(_attempt_id uuid, _amount integer, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining integer; spent integer; today_spent integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT credits_spent INTO spent FROM public.attempts
   WHERE id = _attempt_id AND user_id = auth.uid() AND status = 'in_progress' FOR UPDATE;
  IF spent IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF spent + _amount > 20 THEN RAISE EXCEPTION 'ATTEMPT_CAP: This attempt has used its 20-credit AI budget.'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  SELECT COALESCE(-SUM(delta), 0) INTO today_spent FROM public.credit_ledger
   WHERE user_id = auth.uid() AND delta < 0 AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF today_spent + _amount > 40 THEN RAISE EXCEPTION 'DAILY_CAP: Daily AI limit of 40 credits reached. It resets at midnight UTC.'; END IF;
  UPDATE public.profiles SET credits = credits - _amount
   WHERE id = auth.uid() AND credits >= _amount RETURNING credits INTO remaining;
  IF remaining IS NULL THEN RAISE EXCEPTION 'Not enough credits'; END IF;
  UPDATE public.attempts SET credits_spent = credits_spent + _amount WHERE id = _attempt_id;
  INSERT INTO public.credit_ledger (user_id, delta, reason) VALUES (auth.uid(), -_amount, _reason);
  RETURN remaining;
END $$;
REVOKE EXECUTE ON FUNCTION public.spend_attempt_credits(uuid, integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spend_attempt_credits(uuid, integer, text) TO authenticated;