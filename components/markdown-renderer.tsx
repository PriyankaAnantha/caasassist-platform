'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  stream?: boolean;
  streamSpeed?: number;
}

export function MarkdownRenderer({ 
  content, 
  stream = false, 
  streamSpeed = 5 
}: MarkdownRendererProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!stream) {
      setDisplayedContent(content);
      return;
    }

    // Reset state when content changes
    if (displayedContent === '') {
      setIsStreaming(true);
    }

    let currentIndex = 0;
    const contentLength = content.length;
    let animationFrameId: number;

    const streamContent = () => {
      if (currentIndex < contentLength) {
        // Get the next chunk of content
        const chunkSize = Math.min(streamSpeed, contentLength - currentIndex);
        const nextChunk = content.substring(currentIndex, currentIndex + chunkSize);
        
        setDisplayedContent(prev => prev + nextChunk);
        currentIndex += chunkSize;
        
        // Schedule next chunk
        animationFrameId = requestAnimationFrame(streamContent);
      } else {
        setIsStreaming(false);
      }
    };

    // Start streaming after a small delay
    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(streamContent);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [content, stream, streamSpeed, displayedContent]);

  return (
    <div className="relative">
      {isStreaming && (
        <div className="absolute right-0 -top-6 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
          Streaming...
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        children={stream ? displayedContent : content}
        components={{
          // Custom components can be added here
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 mt-6" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline" 
              target="_blank" 
              rel="noopener noreferrer"
              {...props} 
            />
          ),
          code: (props) => {
            const { node, className, children } = props as { 
              node?: any; 
              className?: string; 
              children: React.ReactNode;
              [key: string]: any;
            };
            const isInline = !className?.includes('language-');
            const match = /language-(\w+)/.exec(className || '');
            
            return !isInline ? (
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
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-300 my-3" 
              {...props} 
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse my-3" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-700" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 px-4 py-2" {...props} />
          ),
        }}
      >
      </ReactMarkdown>
    </div>
  );
}
