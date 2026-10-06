CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'facebook')),
  video_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(source_url) BETWEEN 10 AND 2000),
  CHECK (
    (provider = 'youtube' AND video_key IS NOT NULL AND video_key ~ '^[A-Za-z0-9_-]{11}$')
    OR (provider = 'facebook' AND video_key IS NULL)
  )
);
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view videos"
ON public.videos
FOR SELECT
TO anon, authenticated
USING (true);
CREATE INDEX videos_created_at_idx ON public.videos (created_at DESC);