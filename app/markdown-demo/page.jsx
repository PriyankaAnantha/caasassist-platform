'use client';

import { useState } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function MarkdownDemoPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(5);
  
  const markdownContent = `# Markdown Demo

This is a demonstration of markdown rendering in Next.js with streaming support.

## Features

- **Bold** and *italic* text
- Code blocks with syntax highlighting
- [Links](https://example.com)
- Streaming markdown content
- Customizable streaming speed

### Code Example

\`\`\`javascript
function helloWorld() {
  console.log('Hello, world!');
  return (
    <div className=\"text-red-500\">
      This is a React component with streaming text
    </div>
  );
}
\`\`\`

### Table Example

| Feature | Description |
|---------|-------------|
| Markdown | Easy to write |
| React | Component-based |
| Next.js | Server-side rendering |
| Streaming | Real-time content display |

### Long Content Example

This is a longer piece of content that will demonstrate the streaming effect more noticeably. The text will appear character by character, creating a smooth reading experience. You can adjust the streaming speed using the controls above to make it faster or slower as per your preference.`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={isStreaming}
              onChange={(e) => setIsStreaming(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Enable Streaming</span>
          </label>
          
          {isStreaming && (
            <div className="flex items-center gap-2">
              <label>Speed:</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={streamSpeed}
                onChange={(e) => setStreamSpeed(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {streamSpeed} chars/frame
              </span>
            </div>
          )}
          
          {isStreaming && (
            <button
              onClick={() => {
                setIsStreaming(false);
                // Reset to show full content immediately
                setTimeout(() => setIsStreaming(true), 100);
              }}
              className="ml-auto text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded"
            >
              Restart Streaming
            </button>
          )}
        </div>
      </div>
      
      <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
        <MarkdownRenderer 
          content={markdownContent} 
          stream={isStreaming}
          streamSpeed={streamSpeed}
        />
      </div>
    </div>
  );
}
