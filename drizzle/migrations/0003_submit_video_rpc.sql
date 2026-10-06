CREATE OR REPLACE FUNCTION public.submit_video(p_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := btrim(coalesce(p_url,''));
  v_key text;
  v_provider text;
  v_source text;
  v_hash text;
  v_row public.videos;
BEGIN
  IF length(v_url) > 2000 OR v_url !~* '^https://' THEN
    RAISE EXCEPTION 'Please enter a valid YouTube or Facebook video link.';
  END IF;
  v_key := coalesce(
    substring(v_url from '^https://(?:www\.|m\.|music\.)?youtube\.com/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})'),
    substring(v_url from '^https://(?:www\.|m\.)?youtube\.com/(?:shorts|embed|live)/([A-Za-z0-9_-]{11})'),
    substring(v_url from '^https://youtu\.be/([A-Za-z0-9_-]{11})'));
  IF v_key IS NOT NULL THEN
    v_provider := 'youtube'; v_source := 'https://www.youtube.com/watch?v=' || v_key;
  ELSIF v_url ~* '^https://(www\.|m\.|web\.)?(facebook\.com|fb\.watch)/' THEN
    v_provider := 'facebook'; v_source := split_part(v_url, '#', 1);
  ELSE
    RAISE EXCEPTION 'Only YouTube and public Facebook video links are supported.';
  END IF;
  BEGIN
    v_hash := md5(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for','unknown'));
  EXCEPTION WHEN others THEN v_hash := 'unknown';
  END;
  IF (SELECT count(*) FROM public.videos WHERE submitter_hash = v_hash AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many submissions. Please try again later.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.videos WHERE source_url = v_source) THEN
    RAISE EXCEPTION 'This video has already been added.';
  END IF;
  INSERT INTO public.videos (source_url, provider, video_key, submitter_hash)
  VALUES (v_source, v_provider, v_key, v_hash) RETURNING * INTO v_row;
  RETURN json_build_object('id', v_row.id);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_video(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_video(text) TO anon, authenticated;
GRANT SELECT ON public.videos TO anon, authenticated;