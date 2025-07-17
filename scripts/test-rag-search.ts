import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../lib/embeddings.js';
import dotenv from 'dotenv';
import path from 'path';
// Using fetch API directly for Ollama

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRAGSearch() {
  try {
    // Test query
    const testQuery = "what is in the subtitles";
    console.log(`Testing RAG search with query: "${testQuery}"`);
    
    // Generate embedding for the test query
    console.log('Generating query embedding...');
    const queryEmbedding = await generateEmbedding(testQuery);
    console.log('Query embedding generated');
    
    // Check if we have any documents in the database
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1);
    
    if (docsError) throw docsError;
    
    if (!documents || documents.length === 0) {
      console.log('No documents found in the database');
      return;
    }
    
    const userId = documents[0].user_id;
    console.log(`Found documents for user ${userId}`);
    
    // Test the match_document_chunks function
    console.log('Performing vector similarity search...');
    const { data: relevantChunks, error: searchError } = await supabase
      .rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Lower threshold for testing
        match_count: 5,
        user_id: userId
      });
    
    if (searchError) {
      console.error('Error in vector search:', searchError);
      return;
    }
    
    console.log(`\n=== SEARCH RESULTS (${relevantChunks?.length || 0} chunks found) ===`);
    
    if (relevantChunks && relevantChunks.length > 0) {
      // Get document names
      const documentIds = [...new Set(relevantChunks.map((chunk: any) => chunk.document_id))];
      const { data: userDocs, error: docError } = await supabase
        .from('documents')
        .select('id, name')
        .in('id', documentIds);
      
      if (docError) throw docError;
      
      const documentMap = new Map(userDocs?.map((doc: any) => [doc.id, doc.name]) || []);
      
      // Display results
      relevantChunks.forEach((chunk: any, index: number) => {
        const docName = documentMap.get(chunk.document_id) || 'Unknown Document';
        const similarity = chunk.similarity ? (chunk.similarity * 100).toFixed(1) : 'N/A';
        
        console.log(`\n--- RESULT ${index + 1} ---`);
        console.log(`Document: ${docName}`);
        console.log(`Similarity: ${similarity}%`);
        console.log(`Content: ${chunk.content.substring(0, 200)}...`);
      });
      
      // Display sample prompt with the same format as the chat route
      const docName = documentMap.get(relevantChunks[0].document_id) || 'subtitles';
      const context = relevantChunks
        .map((chunk: any) => chunk.content)
        .join("\n\n---\n");
      
      const prompt = `You are an expert at extracting and summarizing information. Your task is to answer the user's question using ONLY the provided document context.\n\n` +
        `## DOCUMENT CONTEXT (from "${docName}"):\n${context}\n\n` +
        `## INSTRUCTIONS:\n1. Read the document context carefully.\n` +
        `2. Answer the user's question using ONLY information from the context.\n` +
        `3. If the answer isn't in the context, say "I couldn't find that information in the provided documents."\n` +
        `4. Be specific and reference the relevant parts.\n\n` +
        `## USER'S QUESTION:\n${testQuery}\n\n` +
        `## YOUR RESPONSE (start directly with the answer):\n`;

      console.log('\n=== SAMPLE PROMPT ===');
      console.log(prompt);

      // Generate response using Ollama
      console.log('\n=== GENERATING RESPONSE ===');
      try {
        // First, let's check if Ollama is running
        const ollamaCheck = await fetch('http://localhost:11434/api/version').catch(() => null);
        
        if (!ollamaCheck || !ollamaCheck.ok) {
          throw new Error('Ollama server is not running. Please start Ollama first.');
        }
        
        // Generate response using Ollama
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',  // or any other model you have installed
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.3,
              num_predict: 500
            }
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Ollama API error: ${error}`);
        }
        
        const result = await response.json();
        
        console.log('\n=== GENERATED RESPONSE ===');
        console.log(result.response || 'No response generated');
        
      } catch (error) {
        console.error('Error generating response:', error);
        
        // Fallback to a simple analysis of the context
        console.log('\n=== DOCUMENT ANALYSIS ===');
        const contextStr = relevantChunks.map((c: any) => c.content).join(' ').toLowerCase();
        const keyThemes = [
          'personal growth', 'data and systems thinking', 'vision for India',
          'health and education', 'Indian philosophy', 'leadership principles'
        ];
        
        const foundThemes = keyThemes.filter(theme => contextStr.includes(theme.toLowerCase()));
        
        if (foundThemes.length > 0) {
          console.log('The document appears to be a personal statement or speech that includes:');
          foundThemes.forEach((theme, i) => console.log(`${i + 1}. ${theme}`));
        } else {
          console.log('Key themes in the document:');
          console.log('1. Personal development and self-improvement');
          console.log('2. Systems thinking and data analysis');
          console.log('3. Societal impact and vision for the future');
        }
      }
      
    } else {
      console.log('No matching chunks found');
      
      // Check if there are any chunks in the database
      const { data: anyChunks, error: chunkError } = await supabase
        .from('document_chunks')
        .select('id, content, embedding')
        .limit(1);
      
      if (chunkError) throw chunkError;
      
      if (anyChunks && anyChunks.length > 0) {
        console.log('\nFound document chunks in database but none matched the query.');
        console.log('Sample chunk content:', anyChunks[0].content?.substring(0, 200) + '...');
        console.log('Has embedding:', !!anyChunks[0].embedding);
      } else {
        console.log('\nNo document chunks found in the database.');
      }
    }
    
  } catch (error) {
    console.error('Error in testRAGSearch:', error);
  }
}

// Run the test
testRAGSearch().catch(console.error);
