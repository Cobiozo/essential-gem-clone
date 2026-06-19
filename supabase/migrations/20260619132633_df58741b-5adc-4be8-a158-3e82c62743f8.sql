DELETE FROM public.challenge_user_access
WHERE user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);