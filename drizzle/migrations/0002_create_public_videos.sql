CREATE TABLE IF NOT EXISTS public.videos (
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='videos' AND policyname='Public can view videos') THEN
    CREATE POLICY "Public can view videos" ON public.videos FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos (created_at DESC);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS submitter_hash TEXT;
CREATE INDEX IF NOT EXISTS videos_submitter_rate_idx ON public.videos (submitter_hash, created_at DESC);
COMMENT ON COLUMN public.videos.submitter_hash IS 'One-way server-generated fingerprint used only for public submission rate limiting.';