-- Enable RLS on document_chunks table
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Users can view their own document chunks
CREATE POLICY "Users can view their own document chunks" 
ON public.document_chunks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own document chunks
CREATE POLICY "Users can insert their own document chunks" 
ON public.document_chunks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own document chunks
CREATE POLICY "Users can delete their own document chunks" 
ON public.document_chunks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Users can update their own document chunks
CREATE POLICY "Users can update their own document chunks" 
ON public.document_chunks 
FOR UPDATE 
USING (auth.uid() = user_id);
