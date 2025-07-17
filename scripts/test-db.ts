import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Debug: Log loaded environment variables
console.log('Environment variables loaded from .env.local');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '***' : 'Not found');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' : 'Not found');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listDocuments() {
  console.log('=== LISTING ALL DOCUMENTS ===');
  
  // Get all documents
  const { data: allDocs, error: allError } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('Error fetching all documents:', allError);
    return;
  }

  console.log(`\n=== ALL DOCUMENTS (${allDocs?.length || 0}) ===`);
  console.table(allDocs?.map(doc => ({
    id: doc.id,
    name: doc.name,
    status: doc.status,
    user_id: doc.user_id,
    created_at: new Date(doc.created_at).toLocaleString(),
    chunks: doc.chunk_count || 0,
  })) || []);

  // Get processed documents with chunks
  const { data: processedDocs, error: processedError } = await supabase
    .from('documents')
    .select('*, document_chunks(count)')
    .eq('status', 'processed')
    .order('created_at', { ascending: false });

  if (processedError) {
    console.error('Error fetching processed documents:', processedError);
    return;
  }

  console.log(`\n=== PROCESSED DOCUMENTS WITH CHUNKS (${processedDocs?.length || 0}) ===`);
  console.table(processedDocs?.map(doc => ({
    id: doc.id,
    name: doc.name,
    chunks: doc.document_chunks?.[0]?.count || 0,
    user_id: doc.user_id,
  })) || []);

  // Check if any documents have chunks
  if (processedDocs && processedDocs.length > 0) {
    const sampleDoc = processedDocs[0];
    console.log(`\n=== SAMPLE DOCUMENT CHUNKS (${sampleDoc.name}) ===`);
    
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id, content, metadata')
      .eq('document_id', sampleDoc.id)
      .limit(3);

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
    } else if (chunks && chunks.length > 0) {
      console.log('Sample chunks:');
      chunks.forEach((chunk, i) => {
        console.log(`\n--- CHUNK ${i + 1} ---`);
        console.log('Content:', chunk.content?.substring(0, 200) + '...');
        console.log('Metadata:', chunk.metadata);
      });
    } else {
      console.log('No chunks found for this document');
    }
  }
}

// Run the function
listDocuments()
  .catch(console.error)
  .finally(() => {
    console.log('\n=== DATABASE CHECK COMPLETE ===');
    process.exit(0);
  });
