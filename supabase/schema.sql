-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create custom types
create type document_status as enum ('uploading', 'processing', 'completed', 'error');
create type message_role as enum ('user', 'assistant');

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  size bigint not null,
  type text not null,
  status document_status default 'uploading' not null,
  upload_progress integer default 0,
  chunk_count integer default 0,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Document chunks table with vector embeddings
create table public.document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  chunk_index integer not null,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat sessions table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'New Chat',
  model text not null default 'gpt-4o-mini',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat messages table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role message_role not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for better performance
create index documents_user_id_idx on public.documents(user_id);
create index documents_status_idx on public.documents(status);
create index document_chunks_document_id_idx on public.document_chunks(document_id);
create index document_chunks_user_id_idx on public.document_chunks(user_id);
create index chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index chat_messages_session_id_idx on public.chat_messages(session_id);
create index chat_messages_user_id_idx on public.chat_messages(user_id);

-- Vector similarity search index
create index document_chunks_embedding_idx on public.document_chunks 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Row Level Security (RLS) policies
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Documents policies
create policy "Users can view own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);

create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- Document chunks policies
create policy "Users can view own document chunks" on public.document_chunks
  for select using (auth.uid() = user_id);

create policy "Users can insert own document chunks" on public.document_chunks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own document chunks" on public.document_chunks
  for update using (auth.uid() = user_id);

create policy "Users can delete own document chunks" on public.document_chunks
  for delete using (auth.uid() = user_id);

-- Chat sessions policies
create policy "Users can view own chat sessions" on public.chat_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat sessions" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own chat sessions" on public.chat_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete own chat sessions" on public.chat_sessions
  for delete using (auth.uid() = user_id);

-- Chat messages policies
create policy "Users can view own chat messages" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can update own chat messages" on public.chat_messages
  for update using (auth.uid() = user_id);

create policy "Users can delete own chat messages" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- Functions and triggers
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.documents
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.chat_sessions
  for each row execute procedure public.handle_updated_at();

-- Function for vector similarity search
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 
    document_chunks.user_id = filter_user_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
