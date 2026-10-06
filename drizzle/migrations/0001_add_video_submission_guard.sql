ALTER TABLE public.videos ADD COLUMN submitter_hash TEXT;
CREATE INDEX videos_submitter_rate_idx ON public.videos (submitter_hash, created_at DESC);
COMMENT ON COLUMN public.videos.submitter_hash IS 'One-way server-generated fingerprint used only for public submission rate limiting.';