-- Add provider column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'openai';

-- Update existing sessions to have a default provider
UPDATE public.chat_sessions 
SET provider = 'openai' 
WHERE provider IS NULL;
