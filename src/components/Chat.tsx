import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { marked } from 'marked';
import { useChat } from '../contexts/ChatContext';

const Chat: React.FC = () => {
  const { messages, addMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    inputRef.current?.focus();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);
    const userMessage = { role: 'user' as const, content: input };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message. Please try again.');
      }

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('No response received');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response format');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.choices?.[0]?.message) {
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.choices[0].message.content
        };
        addMessage(assistantMessage);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    clearChat();
    setInput('');
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl shadow-lg border border-secondary-200">
      <div className="p-4 border-b border-secondary-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-secondary-900">Chat with Us</h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-secondary-500 hover:text-secondary-700 transition-colors p-2 rounded-lg hover:bg-secondary-50"
            title="Clear chat"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary-50">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {messages.length === 0 && !error && (
          <div className="text-center text-secondary-500 py-4">
            Send a message to start the conversation
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            ref={index === messages.length - 1 ? lastMessageRef : null}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-secondary-900 shadow-sm border border-secondary-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div 
                  className="prose prose-sm max-w-none prose-headings:text-secondary-900 prose-p:text-secondary-800 prose-a:text-primary-600"
                  dangerouslySetInnerHTML={{ 
                    __html: marked(message.content, { breaks: true }) 
                  }} 
                />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-secondary-200">
              <Loader2 className="w-5 h-5 animate-spin text-secondary-600" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t border-secondary-200 bg-white">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 input-field bg-secondary-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn btn-primary !py-2"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
