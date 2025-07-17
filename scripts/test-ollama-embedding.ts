import { generateEmbedding } from '../lib/embeddings';
import dotenv from 'dotenv';
import path from 'path';

async function testEmbedding() {
  // Load environment variables
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  
  const testText = "This is a test sentence for embedding generation.";
  
  try {
    console.log('Testing Ollama embedding generation...');
    console.log('Input text:', testText);
    
    const embedding = await generateEmbedding(testText);
    
    console.log('\nEmbedding generated successfully!');
    console.log('Embedding length:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5).map(v => v.toFixed(4)).join(', '), '...');
    
    // Verify the embedding looks reasonable
    if (embedding.length === 0) {
      console.error('Error: Empty embedding returned');
      return;
    }
    
    // Check for NaN or extreme values
    const hasInvalidValues = embedding.some(val => !Number.isFinite(val) || Math.abs(val) > 10);
    if (hasInvalidValues) {
      console.warn('Warning: Embedding contains unusual values');
    }
    
    console.log('\nEmbedding test completed successfully!');
    
  } catch (error) {
    console.error('Error testing embedding generation:', error);
    
    // Check if Ollama is running
    try {
      console.log('\nChecking Ollama server status...');
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        console.error(`Ollama server returned ${response.status}: ${response.statusText}`);
        console.log('\nIs Ollama running? Start it with: ollama serve');
      } else {
        const data = await response.json();
        console.log('Ollama is running. Available models:', data.models?.map((m: any) => m.name).join(', ') || 'none');
        console.log('Make sure you have the nomic-embed-text model installed. Run: ollama pull nomic-embed-text');
      }
    } catch (ollamaError) {
      console.error('Could not connect to Ollama server. Make sure it is running.');
      console.log('Start Ollama with: ollama serve');
    }
  }
}

// Run the test
testEmbedding().catch(console.error);
