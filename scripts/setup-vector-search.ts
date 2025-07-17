import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVectorSearch() {
  // Load environment variables from both .env and .env.local
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Initialize Supabase client with the correct headers
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    },
  });

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../supabase/migrations/20240101000000_create_semantic_search_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Setting up vector search function...');
    
    // Execute the SQL using the SQL editor API
    const { data, error } = await supabase
      .from('sql')
      .select()
      .single()
      .eq('query', sql);
    
    if (error) {
      // Check if this is a "function already exists" error
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key value violates unique constraint')) {
        console.log('Function already exists, continuing...');
      } else {
        console.error('Error executing SQL:', error);
        process.exit(1);
      }
    } else {
      console.log('✅ Vector search function created successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up vector search:', error);
    process.exit(1);
  }
}

// Only run if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupVectorSearch().catch(console.error);
}
