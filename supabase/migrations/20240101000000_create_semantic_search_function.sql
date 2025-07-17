-- Create a function for semantic search using pgvector
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.metadata
  from document_chunks
  join documents on document_chunks.document_id = documents.id
  where 
    documents.user_id = match_document_chunks.user_id and
    documents.status = 'completed' and
    1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
