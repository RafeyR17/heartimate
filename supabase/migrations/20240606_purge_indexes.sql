CREATE INDEX IF NOT EXISTS idx_chat_rate_events_created_at ON public.chat_rate_events (created_at);
CREATE INDEX IF NOT EXISTS idx_api_rate_events_created_at ON public.api_rate_events (created_at);
