CREATE OR REPLACE FUNCTION public.check_video_password(p_password text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT encode(sha256(convert_to(coalesce(p_password,''),'UTF8')),'hex') = '4e687b6430c9300176af3d26f855d2fa58f82c49d1132ca34ceb9d2aa45db36b'
$$;
REVOKE ALL ON FUNCTION public.check_video_password(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_video_password(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_video_secure(p_url text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.check_video_password(p_password) THEN
    RAISE EXCEPTION 'Wrong password';
  END IF;
  RETURN public.submit_video(p_url);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_video_secure(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_video_secure(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_video_secure(p_id uuid, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.check_video_password(p_password) THEN
    RAISE EXCEPTION 'Wrong password';
  END IF;
  DELETE FROM public.videos WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_video_secure(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_video_secure(uuid, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_video(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_video(uuid) FROM anon, authenticated, public;