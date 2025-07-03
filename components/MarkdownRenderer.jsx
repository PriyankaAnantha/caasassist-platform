import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export function MarkdownRenderer({ content, stream = false, streamSpeed = 10 }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!stream) {
      setDisplayedContent(content);
      return;
    }

    setIsStreaming(true);
    setDisplayedContent('');
    let currentIndex = 0;
    const contentLength = content.length;

    const streamContent = () => {
      if (currentIndex < contentLength) {
        // Get the next chunk of content
        const chunkSize = Math.min(streamSpeed, contentLength - currentIndex);
        const nextChunk = content.substring(currentIndex, currentIndex + chunkSize);
        
        setDisplayedContent(prev => prev + nextChunk);
        currentIndex += chunkSize;
        
        // Schedule next chunk
        requestAnimationFrame(streamContent);
      } else {
        setIsStreaming(false);
      }
    };

    // Start streaming after a small delay
    const timeoutId = setTimeout(streamContent, 100);
    
    return () => {
      clearTimeout(timeoutId);
      // Cancel any pending animation frames
      cancelAnimationFrame(streamContent);
    };
  }, [content, stream, streamSpeed]);

  return (
    <div className="prose dark:prose-invert max-w-none relative">
      {isStreaming && (
        <div className="absolute right-0 top-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Streaming...
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components can be added here
          h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-3xl font-bold mt-8 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-2xl font-semibold mt-6 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline" 
              target="_blank" 
              rel="noopener noreferrer"
              {...props} 
            />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto my-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 text-sm" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {displayedContent}
      </ReactMarkdown>
    </div>
  );
}
