// Using Ollama's local embedding model for free embeddings
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  try {
    // Use Ollama's local embedding model
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Free, open-source embedding model
        prompt: text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }
    
    const data = await response.json();
    
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding data returned from Ollama');
    }
    
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding with Ollama:', error);
    
    // Fallback to a simple TF-IDF like embedding if Ollama fails
    console.log('Falling back to simple embedding...');
    return generateSimpleEmbedding(text);
  }
}

// Simple fallback embedding function
function generateSimpleEmbedding(text: string): number[] {
  // Convert text to lowercase and split into words
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts: Record<string, number> = {};
  
  // Count word frequencies
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Get unique words and sort them
  const uniqueWords = Object.keys(wordCounts).sort();
  
  // Create a fixed-size embedding (1536 to match the expected size)
  const embedding: number[] = new Array(1536).fill(0);
  
  // Distribute word counts into the embedding dimensions
  uniqueWords.forEach((word, i) => {
    const index = i % embedding.length;
    embedding[index] = (embedding[index] || 0) + wordCounts[word];
  });
  
  // Normalize the embedding
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
  return embedding.map(val => val / norm);
}
