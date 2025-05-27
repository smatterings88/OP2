import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

export type Role = 'user' | 'assistant';
export interface Message { role: Role; content: string }

interface ChatContextValue {
  sessionId: string;
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem('chatSessionId');
    if (existing) return existing;
    const newId = uuid();
    localStorage.setItem('chatSessionId', newId);
    return newId;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem(`chat_${sessionId}`);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
  }, [messages, sessionId]);

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`chat_${sessionId}`);
  };

  return (
    <ChatContext.Provider value={{ sessionId, messages, addMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};