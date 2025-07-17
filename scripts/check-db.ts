import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabase() {
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
    console.log('Checking database contents...');
    
    // Check documents table
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(5);

    if (docsError) throw docsError;
    
    console.log('\n=== DOCUMENTS ===');
    console.log(`Found ${documents?.length || 0} documents`);
    documents?.forEach((doc, i) => {
      console.log(`\nDocument ${i + 1}:`);
      console.log(`- ID: ${doc.id}`);
      console.log(`- Name: ${doc.name}`);
      console.log(`- Status: ${doc.status}`);
      console.log(`- Created: ${new Date(doc.created_at).toLocaleString()}`);
    });

    // Check document_chunks table
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(5);

    if (chunksError) throw chunksError;
    
    console.log('\n=== DOCUMENT CHUNKS ===');
    console.log(`Found ${chunks?.length || 0} document chunks`);
    chunks?.forEach((chunk, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log(`- ID: ${chunk.id}`);
      console.log(`- Document ID: ${chunk.document_id}`);
      console.log(`- Content length: ${chunk.content?.length || 0} characters`);
      console.log(`- Has embedding: ${!!chunk.embedding}`);
      console.log(`- Created: ${new Date(chunk.created_at).toLocaleString()}`);
    });

    // Check if the match_document_chunks function exists
    const { data: functionExists, error: funcError } = await supabase
      .rpc('pg_get_functiondef', { funcname: 'match_document_chunks' });
    
    console.log('\n=== VECTOR SEARCH FUNCTION ===');
    if (funcError || !functionExists) {
      console.log('The match_document_chunks function does not exist in the database.');
    } else {
      console.log('The match_document_chunks function exists in the database.');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

// Only run if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkDatabase().catch(console.error);
}
