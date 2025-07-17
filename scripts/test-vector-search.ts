import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVectorSearch() {
  // Load environment variables
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Testing vector search function...');
    
    // First, check if we have any documents in the database
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);

    if (docsError) throw docsError;
    
    if (!documents || documents.length === 0) {
      console.log('No documents found in the database. Please upload documents first.');
      return;
    }

    console.log('Found documents in the database. Testing vector search...');
    
    // Test the match_document_chunks function with a simple query
    const testQuery = 'test';
    const { data: chunks, error: searchError } = await supabase
      .rpc('match_document_chunks', {
        query_embedding: Array(1536).fill(0), // Dummy embedding for test
        match_threshold: 0.1, // Very low threshold for testing
        match_count: 3,
        user_id: documents[0].user_id // Use the user_id from the first document
      });

    if (searchError) {
      console.error('Error testing vector search:', searchError);
      
      // Check if the function exists
      const { data: funcExists, error: funcError } = await supabase
        .rpc('pg_get_functiondef', { funcname: 'match_document_chunks' });
        
      if (funcError) {
        console.error('The match_document_chunks function does not exist in the database.');
        console.log('Please run the SQL to create the function in your Supabase SQL editor:');
        console.log('\n' + `
-- Create a function for semantic search using pgvector
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity,
    document_chunks.metadata
  FROM document_chunks
  JOIN documents ON document_chunks.document_id = documents.id
  WHERE 
    documents.user_id = match_document_chunks.user_id AND
    documents.status = 'completed' AND
    1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;`);
      }
      return;
    }

    console.log('Vector search test successful! Found chunks:', chunks);
    
  } catch (error) {
    console.error('Error during vector search test:', error);
  }
}

// Only run if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testVectorSearch().catch(console.error);
}
